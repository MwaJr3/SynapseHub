"""Local WebSocket bridge server for Chrome/Edge (MV3) and Firefox (MV2) extensions."""

from __future__ import annotations

import asyncio
import json
import threading
import time
from dataclasses import asdict, dataclass
from typing import Any, Callable

from websockets.asyncio.server import Server, ServerConnection, serve

from ..core.url_handler import PlatformInfo, URLHandler
from ..utils.logger import get_logger

logger = get_logger("ws_bridge")


@dataclass(frozen=True)
class BrowserEvent:
    """Validated media detection event received from the companion browser extension."""

    url: str
    title: str
    thumbnail_url: str
    trigger: str  # playback | hover_button | popup_manual | clipboard
    platform: PlatformInfo
    duration_sec: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["platform"] = self.platform.to_dict()
        return data


class ExtensionWebSocketServer:
    """Runs an asynchronous WebSocket server in a dedicated daemon thread."""

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 8765,
        on_video_detected: Callable[[BrowserEvent], None] | None = None,
        telemetry: Any = None,
        dedup_cooldown_sec: float = 45.0,
    ) -> None:
        self.host = host
        self.port = port
        self._on_video = on_video_detected
        self._telemetry = telemetry
        self._cooldown = dedup_cooldown_sec

        self._loop: asyncio.AbstractEventLoop | None = None
        self._server: Server | None = None
        self._thread: threading.Thread | None = None
        self._ready_event = threading.Event()
        self._clients: set[ServerConnection] = set()
        self._recent_urls: dict[str, float] = {}
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def connected_count(self) -> int:
        return len(self._clients)

    def start(self, wait_timeout: float = 5.0) -> int:
        """Start the WebSocket bridge in a background thread and return the bound port."""
        if self._running:
            return self.port

        self._ready_event.clear()
        self._thread = threading.Thread(
            target=self._run_loop,
            name="vdl_ws_bridge",
            daemon=True,
        )
        self._thread.start()
        self._ready_event.wait(timeout=wait_timeout)
        return self.port

    def _run_loop(self) -> None:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        self._loop = loop
        try:
            loop.run_until_complete(self._serve_forever())
        except Exception as exc:
            logger.error("WebSocket server loop terminated with error: %s", exc)
        finally:
            self._running = False
            self._sync_telemetry()
            loop.close()

    async def _serve_forever(self) -> None:
        try:
            server = await serve(
                self._handle_client,
                host=self.host,
                port=self.port,
                origins=None,
                ping_interval=20,
                ping_timeout=20,
            )
        except OSError:
            logger.warning(
                "Port %d busy; binding WebSocket bridge to an available ephemeral port.",
                self.port,
            )
            server = await serve(
                self._handle_client,
                host=self.host,
                port=0,
                origins=None,
                ping_interval=20,
                ping_timeout=20,
            )

        self._server = server
        if server.sockets:
            sockname = server.sockets[0].getsockname()
            self.port = int(sockname[1])

        self._running = True
        self._sync_telemetry()
        self._ready_event.set()
        logger.info("Extension WebSocket server listening on ws://%s:%d", self.host, self.port)
        await server.serve_forever()

    async def _handle_client(self, websocket: ServerConnection) -> None:
        self._clients.add(websocket)
        self._sync_telemetry()
        logger.debug("Browser extension client connected (%d active).", len(self._clients))
        try:
            await websocket.send(
                json.dumps(
                    {
                        "type": "welcome",
                        "app": "VDownloader OS",
                        "version": "2.4.0",
                        "port": self.port,
                    }
                )
            )
            async for raw_msg in websocket:
                response = self.process_payload(raw_msg)
                await websocket.send(json.dumps(response))
        except Exception as exc:
            logger.debug("Extension client disconnected: %s", exc)
        finally:
            self._clients.discard(websocket)
            self._sync_telemetry()

    def process_payload(self, raw_msg: str | bytes | dict[str, Any]) -> dict[str, Any]:
        """Parse and validate an incoming extension JSON message synchronously."""
        try:
            data = json.loads(raw_msg) if isinstance(raw_msg, (str, bytes)) else dict(raw_msg)
        except Exception:
            return {"type": "error", "message": "Invalid JSON payload"}

        msg_type = str(data.get("type") or "")
        if msg_type == "ping":
            return {"type": "pong", "app": "VDownloader OS", "version": "2.4.0"}

        if msg_type not in {"video_detected", "download_request"}:
            return {"type": "error", "message": f"Unknown message type: {msg_type!r}"}

        raw_url = str(data.get("url") or "").strip()
        normalized = URLHandler.normalize_url(raw_url)
        trigger = str(data.get("trigger") or "playback")
        explicit_click = trigger in {"hover_button", "popup_manual"} or msg_type == "download_request"

        is_valid = (
            URLHandler.is_valid_http_url(normalized)
            if explicit_click
            else URLHandler.is_probable_video_page(normalized)
        )
        if not is_valid:
            return {
                "type": "ack",
                "accepted": False,
                "reason": "URL is not a supported video page",
            }

        now = time.time()
        last_seen = self._recent_urls.get(normalized, 0.0)
        if not explicit_click and (now - last_seen) < self._cooldown:
            return {
                "type": "ack",
                "accepted": False,
                "reason": "Duplicate URL suppressed within cooldown window",
            }
        self._recent_urls[normalized] = now

        platform = URLHandler.detect_platform(normalized)
        title = str(data.get("title") or "").strip() or f"{platform.display_name} Video Stream"
        thumbnail = str(data.get("thumbnail") or "").strip()
        duration = float(data.get("duration") or 0.0)

        event = BrowserEvent(
            url=normalized,
            title=title,
            thumbnail_url=thumbnail,
            trigger=trigger,
            platform=platform,
            duration_sec=duration,
        )
        logger.info(
            "Received browser video event [%s] (%s): %s",
            trigger,
            platform.display_name,
            normalized,
        )
        if self._telemetry is not None:
            self._telemetry.record_activity(
                "extension",
                f"Browser {trigger}: {platform.display_name}",
                title[:90],
            )
        if self._on_video is not None:
            try:
                self._on_video(event)
            except Exception as exc:
                logger.warning("on_video_detected handler raised %s", exc)

        return {
            "type": "ack",
            "accepted": True,
            "platform": platform.to_dict(),
            "url": normalized,
        }

    def stop(self) -> None:
        if not self._running or self._loop is None:
            return

        def _close() -> None:
            if self._server is not None:
                self._server.close()

        self._loop.call_soon_threadsafe(_close)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.5)
        self._running = False
        self._sync_telemetry()

    def _sync_telemetry(self) -> None:
        if self._telemetry is not None:
            self._telemetry.set_websocket_status(
                listening=self._running,
                port=self.port,
                connected_clients=len(self._clients),
            )
