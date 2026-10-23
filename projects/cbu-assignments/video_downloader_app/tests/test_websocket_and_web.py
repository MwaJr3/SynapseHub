"""Integration tests for the ExtensionWebSocketServer and WebDashboardServer APIs."""

from __future__ import annotations

import json
from pathlib import Path

import aiohttp
import pytest
from aiohttp import web
from websockets.asyncio.client import connect

from video_downloader_app.core.downloader import DownloadQueueManager
from video_downloader_app.core.telemetry import TelemetryStore
from video_downloader_app.server.dashboard_web import WebDashboardServer
from video_downloader_app.server.websocket_server import BrowserEvent, ExtensionWebSocketServer
from video_downloader_app.utils.config import ConfigManager


@pytest.mark.asyncio
async def test_websocket_bridge_roundtrip(tmp_path: Path) -> None:
    received: list[BrowserEvent] = []
    telemetry = TelemetryStore(db_path=tmp_path / "ws_telemetry.sqlite3")
    server = ExtensionWebSocketServer(
        host="127.0.0.1",
        port=0,
        on_video_detected=lambda ev: received.append(ev),
        telemetry=telemetry,
    )
    bound_port = server.start()
    try:
        async with connect(f"ws://127.0.0.1:{bound_port}") as ws:
            welcome = json.loads(await ws.recv())
            assert welcome["type"] == "welcome"

            await ws.send(json.dumps({"type": "ping"}))
            pong = json.loads(await ws.recv())
            assert pong["type"] == "pong"

            await ws.send(
                json.dumps(
                    {
                        "type": "video_detected",
                        "url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
                        "title": "Big Buck Bunny 4K",
                        "trigger": "playback",
                    }
                )
            )
            ack = json.loads(await ws.recv())
            assert ack["accepted"] is True
            assert ack["platform"]["slug"] == "youtube"
            assert len(received) == 1

            # Second automatic playback within cooldown is deduplicated
            await ws.send(
                json.dumps(
                    {
                        "type": "video_detected",
                        "url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
                        "title": "Big Buck Bunny 4K",
                        "trigger": "playback",
                    }
                )
            )
            ack_dup = json.loads(await ws.recv())
            assert ack_dup["accepted"] is False

            # Explicit IDM hover_button bypasses cooldown
            await ws.send(
                json.dumps(
                    {
                        "type": "download_request",
                        "url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
                        "title": "Big Buck Bunny 4K",
                        "trigger": "hover_button",
                    }
                )
            )
            ack_hover = json.loads(await ws.recv())
            assert ack_hover["accepted"] is True
            assert len(received) == 2
    finally:
        server.stop()


@pytest.mark.asyncio
async def test_web_dashboard_endpoints(tmp_path: Path) -> None:
    cfg = ConfigManager(config_path=tmp_path / "config.json")
    telemetry = TelemetryStore(db_path=tmp_path / "web_telemetry.sqlite3")
    ws_server = ExtensionWebSocketServer(host="127.0.0.1", port=0, telemetry=telemetry)
    ws_server.start()
    queue_mgr = DownloadQueueManager(config_manager=cfg, telemetry=telemetry)

    dash = WebDashboardServer(
        config_manager=cfg,
        telemetry=telemetry,
        queue_manager=queue_mgr,
        ws_server=ws_server,
    )
    runner = web.AppRunner(dash.app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]  # type: ignore[union-attr]

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"http://127.0.0.1:{port}/") as r_html:
                assert r_html.status == 200
                html_text = await r_html.text()
                assert "Your Analytical Media Board" in html_text

            async with session.get(f"http://127.0.0.1:{port}/api/snapshot") as r_snap:
                assert r_snap.status == 200
                snap = await r_snap.json()
                assert "insight_board" in snap
                assert "engine_health" in snap

            async with session.post(f"http://127.0.0.1:{port}/api/parse-vtt-demo") as r_vtt:
                assert r_vtt.status == 200
                vtt_json = await r_vtt.json()
                assert vtt_json["ok"] is True
                assert vtt_json["transcript"]["cue_count"] == 5

            async with session.get(f"http://127.0.0.1:{port}/api/docs") as r_docs:
                assert r_docs.status == 200
                docs_json = await r_docs.json()
                assert "01_PRD.md" in docs_json["files"]
    finally:
        await runner.cleanup()
        queue_mgr.shutdown()
        ws_server.stop()
