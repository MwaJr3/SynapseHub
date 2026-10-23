"""Unit tests for URL validation, normalization, and platform detection."""

from __future__ import annotations

from video_downloader_app.core.url_handler import URLHandler


def test_detect_major_platforms() -> None:
    yt = URLHandler.detect_platform("https://www.youtube.com/watch?v=aqz-KE-bpKQ")
    assert yt.slug == "youtube"
    assert yt.is_supported is True

    fb = URLHandler.detect_platform("https://www.facebook.com/watch/?v=123456789")
    assert fb.slug == "facebook"
    assert fb.is_supported is True

    tt = URLHandler.detect_platform("https://www.tiktok.com/@creator/video/739201928371")
    assert tt.slug == "tiktok"
    assert tt.is_supported is True

    anime = URLHandler.detect_platform("https://www.crunchyroll.com/watch/G6NQ5DWZ6/episode-1")
    assert anime.slug == "anime"
    assert anime.category == "anime"

    hianime = URLHandler.detect_platform("https://hianime.to/watch/frieren-18542")
    assert hianime.slug == "anime"


def test_rejects_local_and_invalid_urls() -> None:
    assert URLHandler.is_valid_http_url("http://127.0.0.1:8765/video") is False
    assert URLHandler.is_valid_http_url("http://localhost:8080") is False
    assert URLHandler.is_valid_http_url("not-a-url") is False
    assert URLHandler.detect_platform("ftp://example.com/file.mp4").is_supported is False


def test_probable_video_page_filters_bare_homepages() -> None:
    assert URLHandler.is_probable_video_page("https://www.youtube.com/") is False
    assert URLHandler.is_probable_video_page("https://www.youtube.com/watch?v=dQw4w9WgXcQ") is True
    assert URLHandler.is_probable_video_page("https://youtu.be/dQw4w9WgXcQ") is True
    assert URLHandler.is_probable_video_page("https://www.youtube.com/shorts/abc123xyz") is True
    assert URLHandler.is_probable_video_page("https://www.tiktok.com/") is False
    assert URLHandler.is_probable_video_page("https://www.tiktok.com/@user/video/987654") is True
    assert URLHandler.is_probable_video_page("https://www.facebook.com/reel/555444333") is True


def test_extract_first_url_from_clipboard_text() -> None:
    blob = "Check out this stream: https://youtu.be/aqz-KE-bpKQ?t=12)."
    assert URLHandler.extract_first_url(blob) == "https://youtu.be/aqz-KE-bpKQ?t=12"
    assert URLHandler.extract_first_url("plain text without links") is None
