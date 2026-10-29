"""Unit tests for ConfigManager, FFmpeg auto-discovery, ClipboardMonitor, and TelemetryStore."""

from __future__ import annotations

from pathlib import Path

from video_downloader_app.core.clipboard_monitor import ClipboardMonitor
from video_downloader_app.core.telemetry import TelemetryStore
from video_downloader_app.utils.config import ConfigManager, probe_ffmpeg_version, resolve_ffmpeg_path


def test_config_persistence_and_ffmpeg_discovery(tmp_path: Path) -> None:
    cfg_file = tmp_path / "config.json"
    mgr = ConfigManager(config_path=cfg_file)
    notified: list[str] = []
    mgr.subscribe(lambda c: notified.append(c.theme_mode))

    mgr.update(theme_mode="dark", websocket_port=9123, mini_taskbar_timeout_sec=20)
    assert notified == ["dark"]

    reloaded = ConfigManager(config_path=cfg_file)
    assert reloaded.config.theme_mode == "dark"
    assert reloaded.config.websocket_port == 9123
    assert reloaded.config.mini_taskbar_timeout_sec == 20

    ffmpeg_bin = resolve_ffmpeg_path(data_dir=tmp_path)
    assert ffmpeg_bin is not None
    diag = probe_ffmpeg_version(ffmpeg_bin)
    assert diag["available"] is True


def test_clipboard_monitor_deduplicates_urls() -> None:
    detected: list[tuple[str, str]] = []
    mon = ClipboardMonitor(
        on_video_url_detected=lambda u, p: detected.append((u, p.slug)),
        enabled=True,
    )
    assert mon.inspect_text_once("Watch https://www.youtube.com/watch?v=aqz-KE-bpKQ") is True
    assert mon.inspect_text_once("Duplicate https://www.youtube.com/watch?v=aqz-KE-bpKQ") is False
    assert mon.inspect_text_once("Bare homepage https://www.youtube.com/") is False
    assert len(detected) == 1
    assert detected[0][1] == "youtube"


def test_telemetry_store_all_six_dashboards(tmp_path: Path) -> None:
    store = TelemetryStore(db_path=tmp_path / "telemetry.sqlite3")
    store.record_download(
        url="https://www.tiktok.com/@dev/video/112233",
        title="Python Async Clip",
        platform="TikTok",
        resolution="1080p",
        size_bytes=25_000_000,
        speed_bps=8_500_000.0,
        has_subtitles=True,
    )
    store.record_transcript(
        url="https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        title="Keynote",
        language="en",
        is_auto=True,
        cue_count=120,
        word_count=980,
        elapsed_sec=0.92,
    )
    snap = store.get_dashboard_snapshot(active_queue_count=2)
    assert "insight_board" in snap
    assert "live_metrics" in snap
    assert "sources_hub" in snap
    assert "engine_health" in snap
    assert "ui_performance" in snap
    assert "changelog" in snap
    assert snap["sources_hub"]["active_queue_jobs"] == 2
    assert len(snap["changelog"]) >= 4
