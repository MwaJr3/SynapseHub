"""Unit tests for VideoDownloader format resolution, progress hooks, retries, and FFmpeg."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from video_downloader_app.core.downloader import (
    DownloadOptions,
    DownloadTask,
    VideoDownloader,
    format_bytes,
    format_eta,
)


def test_format_choices_span_144p_to_8k_and_audio() -> None:
    sample_info = {
        "formats": [
            {"format_id": "139", "vcodec": "none", "acodec": "mp4a.40.2", "filesize": 3_000_000},
            {"format_id": "160", "height": 144, "ext": "mp4", "vcodec": "avc1", "acodec": "none", "tbr": 110},
            {"format_id": "137", "height": 1080, "ext": "mp4", "vcodec": "avc1", "acodec": "none", "fps": 60, "tbr": 4200},
            {"format_id": "313", "height": 2160, "ext": "webm", "vcodec": "vp9", "acodec": "none", "fps": 60, "tbr": 18000},
            {"format_id": "571", "height": 4320, "ext": "mp4", "vcodec": "av01", "acodec": "none", "fps": 60, "tbr": 38000},
        ]
    }
    choices = VideoDownloader._build_format_choices(sample_info)
    heights = {c.height for c in choices}
    assert 4320 in heights
    assert 2160 in heights
    assert 1080 in heights
    assert 144 in heights
    audio_modes = {c.audio_only for c in choices if c.audio_only}
    assert {"mp3", "m4a"} == audio_modes


def test_exponential_retry_and_progress_hook(monkeypatch: Any, tmp_path: Path) -> None:
    attempts = {"count": 0}
    monkeypatch.setattr("time.sleep", lambda _s: None)

    class FlakyYoutubeDL:
        def __init__(self, opts: dict[str, Any]) -> None:
            self.opts = opts

        def __enter__(self) -> "FlakyYoutubeDL":
            return self

        def __exit__(self, *args: Any) -> None:
            return None

        def prepare_filename(self, info: dict[str, Any]) -> str:
            return str(tmp_path / f"{info['title']} [{info['id']}].mp4")

        def extract_info(self, url: str, download: bool = True) -> dict[str, Any]:
            attempts["count"] += 1
            if attempts["count"] == 1:
                raise ConnectionError("Transient socket reset")
            target = tmp_path / "Demo Stream [vid1].mp4"
            target.write_bytes(b"00" * 512)
            for hook in self.opts.get("progress_hooks", []):
                hook(
                    {
                        "status": "downloading",
                        "downloaded_bytes": 512,
                        "total_bytes": 1024,
                        "speed": 2_048_000,
                        "eta": 2,
                        "filename": str(target),
                    }
                )
                hook({"status": "finished", "filename": str(target)})
            return {"id": "vid1", "title": "Demo Stream"}

    monkeypatch.setattr("yt_dlp.YoutubeDL", FlakyYoutubeDL)
    opts = DownloadOptions(url="https://www.youtube.com/watch?v=aqz-KE-bpKQ", output_dir=str(tmp_path))
    task = DownloadTask(
        task_id="t1",
        options=opts,
        title="Demo Stream",
        platform_name="YouTube",
        resolution_label="1080p",
    )
    events: list[str] = []
    downloader = VideoDownloader()
    saved = downloader.execute_download(
        task,
        on_progress=lambda t: events.append(t.progress.status),
        max_retries=2,
    )
    assert attempts["count"] == 2
    assert "retrying" in events
    assert "completed" in events
    assert saved.is_file()


def test_human_formatters() -> None:
    assert format_bytes(1024 * 1024 * 5) == "5.0 MB"
    assert format_eta(125) == "02:05"
    assert format_eta(3661) == "01:01:01"


def test_real_ffmpeg_hardcoded_subtitle_burn(tmp_path: Path) -> None:
    import subprocess

    downloader = VideoDownloader()
    assert downloader.ffmpeg_path is not None

    src_video = tmp_path / "clip [id9].mp4"
    srt_file = tmp_path / "clip [id9].en.srt"
    subprocess.run(
        [
            downloader.ffmpeg_path,
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=black:s=320x180:d=0.6",
            "-pix_fmt",
            "yuv420p",
            str(src_video),
        ],
        check=True,
        capture_output=True,
    )
    srt_file.write_text("1\n00:00:00,000 --> 00:00:00,500\nBurned Subtitle Test\n", encoding="utf-8")

    opts = DownloadOptions(
        url="https://www.youtube.com/watch?v=id9",
        output_dir=str(tmp_path),
        hardcode_subtitles=True,
    )
    task = DownloadTask(
        task_id="burn1",
        options=opts,
        title="Clip",
        platform_name="YouTube",
        resolution_label="360p",
    )
    burned = downloader._burn_hardcoded_subtitles(
        video_path=src_video,
        out_dir=tmp_path,
        keep_separate_srt=False,
        task=task,
        on_progress=None,
    )
    assert burned.is_file()
    assert "[subbed]" in burned.name
    assert not srt_file.exists()

