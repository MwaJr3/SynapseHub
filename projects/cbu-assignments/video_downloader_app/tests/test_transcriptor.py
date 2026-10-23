"""Unit tests for WebVTT/SRT subtitle parsing, rolling deduplication, and transcript export."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from video_downloader_app.core.transcriptor import TranscriptExtractor, TranscriptResult

ROLLING_VTT_SAMPLE = """WEBVTT
Kind: captions
Language: en

00:00:01.000 --> 00:00:03.500 align:start position:0%
Hello<00:00:01.500><c> world</c> from Python.

00:00:03.500 --> 00:00:06.200 align:start position:0%
Hello world from Python.
Building<00:00:04.200><c> clean</c> desktop transcripts!

00:00:06.200 --> 00:00:09.000 align:start position:0%
Building clean desktop transcripts!
Supports YouTube &amp; anime captions.
"""

SRT_SAMPLE = """1
00:00:02,000 --> 00:00:05,400
<i>First subtitle line</i>

2
00:00:05,500 --> 00:01:08,250
Second subtitle line
"""


def test_parse_rolling_vtt_file_via_webvtt(tmp_path: Path) -> None:
    vtt_file = tmp_path / "sample.en.vtt"
    vtt_file.write_text(ROLLING_VTT_SAMPLE, encoding="utf-8")

    cues = TranscriptExtractor.parse_subtitle_file(vtt_file)
    assert len(cues) == 3
    assert cues[0].text == "Hello world from Python."
    assert cues[1].text == "Building clean desktop transcripts!"
    assert cues[2].text == "Supports YouTube & anime captions."


def test_parse_srt_and_export_formats(tmp_path: Path) -> None:
    cues = TranscriptExtractor.parse_subtitle_text(SRT_SAMPLE, fmt="srt")
    assert len(cues) == 2
    assert cues[0].text == "First subtitle line"
    assert cues[1].display_timestamp == "00:05"

    res = TranscriptResult(
        url="https://www.youtube.com/watch?v=test123",
        video_title="Sample Lecture",
        language="en",
        is_auto_generated=False,
        source_format="srt",
        fetch_elapsed_sec=0.25,
        cues=cues,
    )
    assert "First subtitle line\nSecond subtitle line" == res.to_plain_text()
    assert "[00:02] First subtitle line" in res.to_timestamped_text()
    assert "00:00:02,000 --> 00:00:05,400" in res.to_srt()

    out_srt = res.save_to_file(tmp_path / "exported.srt", mode="srt")
    assert out_srt.is_file()
    assert "-->" in out_srt.read_text(encoding="utf-8")


def test_extract_transcript_with_mocked_ytdlp(monkeypatch: Any) -> None:
    class FakeYoutubeDL:
        def __init__(self, opts: dict[str, Any]) -> None:
            self.opts = opts

        def __enter__(self) -> "FakeYoutubeDL":
            return self

        def __exit__(self, *args: Any) -> None:
            return None

        def extract_info(self, url: str, download: bool = True) -> dict[str, Any]:
            outtmpl = str(self.opts["outtmpl"])
            sub_path = Path(outtmpl.replace("%(ext)s", "en.vtt"))
            sub_path.write_text(ROLLING_VTT_SAMPLE, encoding="utf-8")
            return {
                "title": "Mocked YouTube Video",
                "subtitles": {},
                "automatic_captions": {"en": [{"ext": "vtt"}]},
            }

    monkeypatch.setattr("yt_dlp.YoutubeDL", FakeYoutubeDL)
    extractor = TranscriptExtractor()
    result = extractor.extract_transcript("https://www.youtube.com/watch?v=aqz-KE-bpKQ")
    assert result.video_title == "Mocked YouTube Video"
    assert result.is_auto_generated is True
    assert len(result.cues) == 3
