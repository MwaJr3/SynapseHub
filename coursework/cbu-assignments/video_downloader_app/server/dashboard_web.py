"""Interactive aiohttp Web Dashboard & API server mirroring VDownloader OS views."""

from __future__ import annotations

import os
import asyncio
from dataclasses import asdict
from pathlib import Path
from typing import Any

from aiohttp import web

from ..core.downloader import (
    DownloadOptions,
    DownloadQueueManager,
    FormatChoice,
    VideoDownloader,
)
from ..core.telemetry import TelemetryStore
from ..core.transcriptor import TranscriptExtractor, TranscriptResult
from ..core.url_handler import URLHandler
from ..utils.config import ConfigManager
from ..utils.logger import AppLogger, get_logger
from .web_ui_template import WEB_DASHBOARD_HTML
from .websocket_server import ExtensionWebSocketServer

logger = get_logger("web_dashboard")

SAMPLE_YOUTUBE_ROLLING_VTT = """WEBVTT
Kind: captions
Language: en

00:00:01.120 --> 00:00:04.080 align:start position:0%
Welcome<00:00:01.480><c> to</c><00:00:01.820><c> VDownloader</c><00:00:02.600><c> OS,</c>
the analytical video and transcript suite.

00:00:04.080 --> 00:00:07.650 align:start position:0%
the analytical video and transcript suite.
Whenever<00:00:04.900><c> you</c><00:00:05.120><c> play</c><00:00:05.500><c> a</c><00:00:05.700><c> stream</c> in Chrome, Edge, or Firefox,

00:00:07.650 --> 00:00:11.400 align:start position:0%
Whenever you play a stream in Chrome, Edge, or Firefox,
our local WebSocket bridge pops up the IDM-style mini-taskbar.

00:00:11.400 --> 00:00:15.800 align:start position:0%
our local WebSocket bridge pops up the IDM-style mini-taskbar.
You can download 144p up to 8K UHD, burn subtitles via FFmpeg,

00:00:15.800 --> 00:00:19.950 align:start position:0%
You can download 144p up to 8K UHD, burn subtitles via FFmpeg,
or copy clean timestamped transcripts with a single click!
"""


class WebDashboardServer:
    """Serves the adapted InsightOS + Founder Stack dashboards and REST endpoints."""

    def __init__(
        self,
        config_manager: ConfigManager,
        telemetry: TelemetryStore,
        queue_manager: DownloadQueueManager,
        ws_server: ExtensionWebSocketServer,
        docs_dir: Path | None = None,
    ) -> None:
        self._config = config_manager
        self._telemetry = telemetry
        self._queue = queue_manager
        self._ws_server = ws_server
        self._docs_dir = docs_dir or (Path(__file__).resolve().parent.parent / "docs")
        self.app = self._create_app()

    def _create_app(self) -> web.Application:
        @web.middleware
        async def cors_and_embed_middleware(
            request: web.Request, handler: Any
        ) -> web.StreamResponse:
            if request.method == "OPTIONS":
                resp: web.StreamResponse = web.Response(status=204)
            else:
                resp = await handler(request)
            origin = request.headers.get("Origin", "")
            allowed = {
                o.strip()
                for o in os.environ.get(
                    "DASHBOARD_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
                ).split(",")
                if o.strip()
            }
            if origin in allowed:
                resp.headers["Access-Control-Allow-Origin"] = origin
                resp.headers["Vary"] = "Origin"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
            return resp

        app = web.Application(middlewares=[cors_and_embed_middleware])
        app.router.add_get("/", self._handle_index)
        app.router.add_get("/health", self._handle_health)
        app.router.add_get("/api/snapshot", self._handle_snapshot)
        app.router.add_post("/api/detect-url", self._handle_detect_url)
        app.router.add_post("/api/fetch-info", self._handle_fetch_info)
        app.router.add_post("/api/enqueue", self._handle_enqueue)
        app.router.add_get("/api/queue", self._handle_queue)
        app.router.add_post("/api/transcript", self._handle_transcript)
        app.router.add_post("/api/parse-vtt-demo", self._handle_parse_vtt_demo)
        app.router.add_post("/api/simulate-extension", self._handle_simulate_extension)
        app.router.add_get("/api/docs", self._handle_docs)
        app.router.add_get("/api/logs", self._handle_logs)
        app.router.add_get("/api/config", self._handle_get_config)
        app.router.add_post("/api/config", self._handle_update_config)
        return app

    async def _handle_index(self, _request: web.Request) -> web.Response:
        return web.Response(text=WEB_DASHBOARD_HTML, content_type="text/html")

    async def _handle_health(self, _request: web.Request) -> web.Response:
        return web.json_response(
            {
                "ok": True,
                "app": "VDownloader OS",
                "ws_port": self._ws_server.port,
                "ws_running": self._ws_server.is_running,
            }
        )

    async def _handle_snapshot(self, _request: web.Request) -> web.Response:
        active_cnt = sum(
            1
            for t in self._queue.list_tasks()
            if t.progress.status in {"queued", "downloading", "postprocessing", "retrying"}
        )
        snap = self._telemetry.get_dashboard_snapshot(active_queue_count=active_cnt)
        snap["ws_port"] = self._ws_server.port
        return web.json_response(snap)

    async def _handle_detect_url(self, request: web.Request) -> web.Response:
        body = await request.json()
        raw_url = str(body.get("url") or "")
        info = URLHandler.detect_platform(raw_url)
        return web.json_response(info.to_dict())

    async def _handle_fetch_info(self, request: web.Request) -> web.Response:
        body = await request.json()
        raw_url = str(body.get("url") or "")
        loop = asyncio.get_running_loop()
        downloader = VideoDownloader(ffmpeg_path=self._config.get_ffmpeg_executable())
        try:
            meta = await loop.run_in_executor(None, downloader.fetch_info, raw_url)
            self._telemetry.record_latency("metadata_fetch", meta.fetch_elapsed_sec)
            return web.json_response({"ok": True, "metadata": meta.to_dict()})
        except Exception as exc:
            return web.json_response({"ok": False, "error": str(exc)}, status=400)

    async def _handle_enqueue(self, request: web.Request) -> web.Response:
        body = await request.json()
        url = URLHandler.normalize_url(str(body.get("url") or ""))
        if not URLHandler.is_valid_http_url(url):
            return web.json_response({"ok": False, "error": "Invalid URL"}, status=400)

        choice = FormatChoice(
            choice_id="web_selected",
            label=str(body.get("resolution") or "Best"),
            ydl_format=str(body.get("ydl_format") or "bestvideo+bestaudio/best"),
            container=str(body.get("container") or "mp4"),
            resolution=str(body.get("resolution") or "Best"),
            height=1080,
            fps=30.0,
            vcodec="auto",
            acodec="auto",
            audio_only=str(body.get("audio_only") or ""),
        )
        opts = DownloadOptions(
            url=url,
            output_dir=self._config.config.download_dir,
            format_choice=choice,
            audio_only=choice.audio_only,
            subtitle_lang=str(body.get("subtitle_lang") or "en"),
            embed_subtitles=bool(body.get("embed_subtitles")),
            hardcode_subtitles=bool(body.get("hardcode_subtitles")),
            save_separate_subtitles=bool(body.get("save_separate_subtitles")),
            include_auto_subtitles=bool(body.get("include_auto_subtitles", True)),
        )
        task = self._queue.enqueue(opts)
        return web.json_response({"ok": True, "task": task.to_dict()})

    async def _handle_queue(self, _request: web.Request) -> web.Response:
        tasks = [t.to_dict() for t in self._queue.list_tasks()]
        return web.json_response({"tasks": tasks})

    async def _handle_transcript(self, request: web.Request) -> web.Response:
        body = await request.json()
        url = str(body.get("url") or "")
        lang = str(body.get("lang") or "en")
        include_auto = bool(body.get("include_auto", True))
        extractor = TranscriptExtractor(ffmpeg_path=self._config.get_ffmpeg_executable())
        loop = asyncio.get_running_loop()
        try:
            result = await loop.run_in_executor(
                None, extractor.extract_transcript, url, lang, include_auto
            )
            data = result.to_dict()
            self._telemetry.record_transcript(
                url=result.url,
                title=result.video_title,
                language=result.language,
                is_auto=result.is_auto_generated,
                cue_count=len(result.cues),
                word_count=int(data["word_count"]),
                elapsed_sec=result.fetch_elapsed_sec,
            )
            return web.json_response({"ok": True, "transcript": data})
        except Exception as exc:
            return web.json_response({"ok": False, "error": str(exc)}, status=400)

    async def _handle_parse_vtt_demo(self, _request: web.Request) -> web.Response:
        cues = TranscriptExtractor.parse_subtitle_text(SAMPLE_YOUTUBE_ROLLING_VTT, fmt="vtt")
        demo = TranscriptResult(
            url="https://www.youtube.com/watch?v=aqz-KE-bpKQ",
            video_title="VDownloader OS Architecture Walkthrough (Rolling Auto-Captions Demo)",
            language="en",
            is_auto_generated=True,
            source_format="vtt",
            fetch_elapsed_sec=0.04,
            cues=cues,
        )
        return web.json_response({"ok": True, "transcript": demo.to_dict()})

    async def _handle_simulate_extension(self, request: web.Request) -> web.Response:
        body = await request.json()
        ack = self._ws_server.process_payload(
            {
                "type": "download_request",
                "url": body.get("url") or "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
                "title": body.get("title") or "YouTube 4K Stream",
                "trigger": "popup_manual",
            }
        )
        return web.json_response(ack)

    async def _handle_docs(self, request: web.Request) -> web.Response:
        files = (
            sorted(p.name for p in self._docs_dir.glob("*.md"))
            if self._docs_dir.is_dir()
            else []
        )
        requested = request.query.get("name", "")
        chosen = requested if requested in files else (files[0] if files else "")
        content = (
            (self._docs_dir / chosen).read_text(encoding="utf-8")
            if chosen and (self._docs_dir / chosen).is_file()
            else "No specification docs found."
        )
        return web.json_response({"files": files, "selected": chosen, "content": content})

    async def _handle_logs(self, _request: web.Request) -> web.Response:
        entries = AppLogger.instance().ring_handler.get_recent(limit=250)
        return web.json_response({"lines": [e.format_line() for e in entries]})

    async def _handle_get_config(self, _request: web.Request) -> web.Response:
        return web.json_response(asdict(self._config.config))

    async def _handle_update_config(self, request: web.Request) -> web.Response:
        body = await request.json()
        updated = self._config.update(**body)
        return web.json_response(asdict(updated))
