#!/usr/bin/env python3
"""Entry point for VDownloader OS — Desktop PyQt6 GUI, WebSocket Bridge & Live Dashboard."""

from __future__ import annotations

import argparse
import os
import signal
import sys
from pathlib import Path

# Support both `python main.py` inside `video_downloader_app/` and `python -m video_downloader_app.main`
if __package__ in (None, ""):
    _pkg_parent = Path(__file__).resolve().parent.parent
    if str(_pkg_parent) not in sys.path:
        sys.path.insert(0, str(_pkg_parent))
    __package__ = "video_downloader_app"

from aiohttp import web  # noqa: E402

from video_downloader_app.core.downloader import DownloadQueueManager  # noqa: E402
from video_downloader_app.core.telemetry import TelemetryStore  # noqa: E402
from video_downloader_app.server.dashboard_web import WebDashboardServer  # noqa: E402
from video_downloader_app.server.websocket_server import ExtensionWebSocketServer  # noqa: E402
from video_downloader_app.utils.config import ConfigManager, probe_ffmpeg_version  # noqa: E402
from video_downloader_app.utils.logger import get_logger  # noqa: E402

logger = get_logger("main")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="vdownloader-os",
        description="VDownloader OS — Universal Video Downloader, Transcript Extractor & Analytical Board",
    )
    parser.add_argument(
        "--web",
        action="store_true",
        help="Run the interactive Web Dashboard & WebSocket Bridge server (0.0.0.0:8080)",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Bind host for web dashboard mode (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Bind port for web dashboard mode (default: config web_dashboard_port / 8080)",
    )
    parser.add_argument(
        "--ws-port",
        type=int,
        default=None,
        help="Local WebSocket port for Chrome/Firefox browser extension (default: 8765)",
    )
    parser.add_argument(
        "--minimized",
        action="store_true",
        help="Start desktop GUI minimized to the system tray",
    )
    return parser.parse_args(argv)


def run_web_dashboard_mode(
    config_manager: ConfigManager,
    telemetry: TelemetryStore,
    host: str,
    port: int,
    ws_port: int,
) -> int:
    """Start the local WebSocket extension bridge + interactive aiohttp Web Dashboard."""
    ws_server = ExtensionWebSocketServer(
        host=config_manager.config.websocket_host,
        port=ws_port,
        telemetry=telemetry,
    )
    bound_ws = ws_server.start()
    queue_manager = DownloadQueueManager(config_manager=config_manager, telemetry=telemetry)
    dashboard = WebDashboardServer(
        config_manager=config_manager,
        telemetry=telemetry,
        queue_manager=queue_manager,
        ws_server=ws_server,
    )
    logger.info(
        "Starting VDownloader OS Web Control Center on http://%s:%d (Extension WS ws://127.0.0.1:%d)",
        host,
        port,
        bound_ws,
    )
    try:
        web.run_app(dashboard.app, host=host, port=port, print=None)
    finally:
        queue_manager.shutdown()
        ws_server.stop()
    return 0


def run_desktop_gui_mode(
    config_manager: ConfigManager,
    telemetry: TelemetryStore,
    ws_port: int,
    start_minimized: bool = False,
    fallback_host: str = "0.0.0.0",
    fallback_port: int = 8080,
) -> int:
    """Launch the native PyQt6 Desktop GUI, falling back to Web Dashboard if headless."""
    has_display = (
        sys.platform.startswith(("win", "darwin"))
        or bool(os.environ.get("DISPLAY"))
        or bool(os.environ.get("WAYLAND_DISPLAY"))
    )
    if not has_display:
        logger.info("No desktop X11/Wayland display detected; starting Live Web Dashboard mode.")
        return run_web_dashboard_mode(
            config_manager=config_manager,
            telemetry=telemetry,
            host=fallback_host,
            port=fallback_port,
            ws_port=ws_port,
        )

    try:
        from PyQt6.QtWidgets import QApplication

        from video_downloader_app.gui.main_window import MainWindow
    except ImportError as exc:
        logger.warning(
            "PyQt6 GUI libraries unavailable (%s); falling back to Live Web Dashboard.", exc
        )
        return run_web_dashboard_mode(
            config_manager=config_manager,
            telemetry=telemetry,
            host=fallback_host,
            port=fallback_port,
            ws_port=ws_port,
        )

    qt_app = QApplication(sys.argv)
    qt_app.setApplicationName("VDownloader OS")
    qt_app.setOrganizationName("InsightDL")
    qt_app.setQuitOnLastWindowClosed(False)

    window_holder: list[MainWindow] = []

    ws_server = ExtensionWebSocketServer(
        host=config_manager.config.websocket_host,
        port=ws_port,
        on_video_detected=lambda ev: (
            window_holder[0].browserEventReceived.emit(ev) if window_holder else None
        ),
        telemetry=telemetry,
    )
    ws_server.start()

    main_win = MainWindow(
        config_manager=config_manager,
        telemetry=telemetry,
        ws_server=ws_server,
    )
    window_holder.append(main_win)

    signal.signal(signal.SIGINT, lambda *_a: main_win.quit_application())

    if start_minimized and main_win.tray.is_available:
        logger.info("Launched minimized to system tray.")
    else:
        main_win.show()

    return int(qt_app.exec())


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    config_manager = ConfigManager()
    telemetry = TelemetryStore(db_path=config_manager.data_dir / "telemetry.sqlite3")

    ffmpeg_diag = probe_ffmpeg_version(config_manager.get_ffmpeg_executable())
    logger.info(
        "VDownloader OS booting | FFmpeg=%s (%s)",
        ffmpeg_diag["available"],
        ffmpeg_diag["source"],
    )

    ws_port = args.ws_port or config_manager.config.websocket_port
    web_port = args.port or config_manager.config.web_dashboard_port

    if args.web:
        return run_web_dashboard_mode(
            config_manager=config_manager,
            telemetry=telemetry,
            host=args.host,
            port=web_port,
            ws_port=ws_port,
        )

    return run_desktop_gui_mode(
        config_manager=config_manager,
        telemetry=telemetry,
        ws_port=ws_port,
        start_minimized=args.minimized,
        fallback_host=args.host,
        fallback_port=web_port,
    )


if __name__ == "__main__":
    raise SystemExit(main())
