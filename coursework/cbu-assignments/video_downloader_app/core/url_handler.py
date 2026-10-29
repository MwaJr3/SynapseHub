"""URL validation, normalization, and streaming platform detection."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any
from urllib.parse import urlparse


@dataclass(frozen=True)
class PlatformInfo:
    """Detected streaming source metadata for UI badges and telemetry."""

    slug: str
    display_name: str
    category: str  # youtube | social | anime | streaming | generic
    accent_hex: str
    icon_name: str
    is_supported: bool
    extractor_name: str = "generic"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


_PLATFORM_RULES: list[tuple[re.Pattern[str], PlatformInfo]] = [
    (
        re.compile(r"(^|\.)((youtube\.com)|(youtu\.be)|(youtube-nocookie\.com))$", re.I),
        PlatformInfo(
            slug="youtube",
            display_name="YouTube",
            category="youtube",
            accent_hex="#FF0033",
            icon_name="youtube.svg",
            is_supported=True,
            extractor_name="youtube",
        ),
    ),
    (
        re.compile(r"(^|\.)((facebook\.com)|(fb\.watch)|(fb\.com))$", re.I),
        PlatformInfo(
            slug="facebook",
            display_name="Facebook Video",
            category="social",
            accent_hex="#1877F2",
            icon_name="facebook.svg",
            is_supported=True,
            extractor_name="facebook",
        ),
    ),
    (
        re.compile(r"(^|\.)((tiktok\.com)|(vm\.tiktok\.com)|(vt\.tiktok\.com))$", re.I),
        PlatformInfo(
            slug="tiktok",
            display_name="TikTok",
            category="social",
            accent_hex="#25F4EE",
            icon_name="tiktok.svg",
            is_supported=True,
            extractor_name="tiktok",
        ),
    ),
    (
        re.compile(
            r"(^|\.)((crunchyroll\.com)|(hianime\.\w+)|(aniwatch\.\w+)|(gogoanime\w*\.\w+)|"
            r"(animepahe\.\w+)|(9anime\w*\.\w+)|(aniwave\.\w+)|(bilibili\.com)|(bilibili\.tv)|"
            r"(nicovideo\.jp)|(hidive\.com)|(miruro\.\w+))$",
            re.I,
        ),
        PlatformInfo(
            slug="anime",
            display_name="Anime Stream",
            category="anime",
            accent_hex="#F47521",
            icon_name="anime.svg",
            is_supported=True,
            extractor_name="anime_stream",
        ),
    ),
    (
        re.compile(r"(^|\.)((twitch\.tv)|(clips\.twitch\.tv))$", re.I),
        PlatformInfo(
            slug="twitch",
            display_name="Twitch",
            category="streaming",
            accent_hex="#9146FF",
            icon_name="generic.svg",
            is_supported=True,
            extractor_name="twitch",
        ),
    ),
    (
        re.compile(r"(^|\.)((twitter\.com)|(x\.com))$", re.I),
        PlatformInfo(
            slug="x_twitter",
            display_name="X / Twitter",
            category="social",
            accent_hex="#38BDF8",
            icon_name="generic.svg",
            is_supported=True,
            extractor_name="twitter",
        ),
    ),
    (
        re.compile(r"(^|\.)instagram\.com$", re.I),
        PlatformInfo(
            slug="instagram",
            display_name="Instagram",
            category="social",
            accent_hex="#E1306C",
            icon_name="generic.svg",
            is_supported=True,
            extractor_name="instagram",
        ),
    ),
    (
        re.compile(r"(^|\.)((vimeo\.com)|(dailymotion\.com)|(rumble\.com)|(reddit\.com)|(redd\.it))$", re.I),
        PlatformInfo(
            slug="streaming",
            display_name="Streaming Portal",
            category="streaming",
            accent_hex="#10B981",
            icon_name="generic.svg",
            is_supported=True,
            extractor_name="streaming",
        ),
    ),
]

_IGNORED_LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
_DIRECT_MEDIA_EXTENSIONS = (".mp4", ".mkv", ".webm", ".m3u8", ".mpd", ".mov", ".flv", ".mp3", ".m4a")
_URL_EXTRACT_RE = re.compile(r"https?://[^\s<>\"'`]+", re.I)


class URLHandler:
    """Validates candidate URLs, detects streaming platforms, and checks yt-dlp extractors."""

    @staticmethod
    def extract_first_url(text: str) -> str | None:
        """Extract the first HTTP(S) URL found inside arbitrary clipboard text."""
        if not text:
            return None
        match = _URL_EXTRACT_RE.search(text.strip())
        if not match:
            return None
        cleaned = match.group(0).rstrip(").,;!]")
        return cleaned

    @staticmethod
    def normalize_url(raw_url: str) -> str:
        """Trim whitespace and normalize scheme/host formatting."""
        url = (raw_url or "").strip()
        if not url:
            return ""
        if url.startswith(("www.youtube.com/", "youtu.be/", "www.tiktok.com/", "www.facebook.com/")):
            url = "https://" + url
        return url

    @classmethod
    def is_valid_http_url(cls, raw_url: str) -> bool:
        """Return True if ``raw_url`` is a syntactically valid public HTTP(S) URL."""
        url = cls.normalize_url(raw_url)
        if not url:
            return False
        try:
            parsed = urlparse(url)
        except ValueError:
            return False
        if parsed.scheme.lower() not in {"http", "https"}:
            return False
        host = (parsed.hostname or "").lower()
        if not host or host in _IGNORED_LOCAL_HOSTS or host.endswith(".e2b.app"):
            return False
        if "." not in host:
            return False
        return True

    @classmethod
    def detect_platform(cls, raw_url: str) -> PlatformInfo:
        """Identify the streaming source and verify support via domain rules + yt-dlp extractors."""
        url = cls.normalize_url(raw_url)
        if not cls.is_valid_http_url(url):
            return PlatformInfo(
                slug="invalid",
                display_name="Invalid URL",
                category="generic",
                accent_hex="#EF4444",
                icon_name="generic.svg",
                is_supported=False,
                extractor_name="none",
            )

        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        path_lower = (parsed.path or "").lower()

        for pattern, info in _PLATFORM_RULES:
            if pattern.search(host):
                # Avoid triggering on bare platform homepages when evaluating passive clipboard/tab checks
                return info

        if path_lower.endswith(_DIRECT_MEDIA_EXTENSIONS):
            return PlatformInfo(
                slug="direct_stream",
                display_name="Direct Media / HLS",
                category="streaming",
                accent_hex="#10B981",
                icon_name="generic.svg",
                is_supported=True,
                extractor_name="direct",
            )

        # Query yt-dlp's built-in extractor registry (excluding GenericIE fallback)
        extractor_name = cls._match_ytdlp_extractor(url)
        if extractor_name:
            is_anime_hint = any(
                kw in host or kw in extractor_name.lower()
                for kw in ("anime", "crunchy", "bili", "nico", "manga", "sub", "dub")
            )
            return PlatformInfo(
                slug="anime" if is_anime_hint else "supported_site",
                display_name=extractor_name,
                category="anime" if is_anime_hint else "streaming",
                accent_hex="#F47521" if is_anime_hint else "#10B981",
                icon_name="anime.svg" if is_anime_hint else "generic.svg",
                is_supported=True,
                extractor_name=extractor_name,
            )

        # Generic web page that yt-dlp's HTML5/Generic extractor may still inspect manually
        return PlatformInfo(
            slug="generic_web",
            display_name=host.removeprefix("www."),
            category="generic",
            accent_hex="#64748B",
            icon_name="generic.svg",
            is_supported=True,
            extractor_name="generic",
        )

    @classmethod
    def is_probable_video_page(cls, raw_url: str) -> bool:
        """Stricter check used for automatic Clipboard & Browser Mini-Taskbar triggers.

        Prevents popping up the floating mini-taskbar on generic search pages or bare homepages,
        while firing reliably on video watch/reel/short/episode URLs.
        """
        url = cls.normalize_url(raw_url)
        if not cls.is_valid_http_url(url):
            return False

        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        path = (parsed.path or "").strip("/")
        query = (parsed.query or "").lower()

        info = cls.detect_platform(url)
        if not info.is_supported:
            return False

        # YouTube: require watch?v=, shorts/, live/, embed/, or youtu.be/<id>
        if info.slug == "youtube":
            if host.endswith("youtu.be"):
                return bool(path)
            return (
                "v=" in query
                or path.startswith(("shorts/", "live/", "embed/", "v/", "playlist"))
            )

        # Facebook: require watch, videos, reel, share/v, or fb.watch
        if info.slug == "facebook":
            if "fb.watch" in host:
                return bool(path)
            return any(
                seg in path.lower() or seg in query
                for seg in ("watch", "video", "videos", "reel", "share/v", "share/r", "story_fbid")
            )

        # TikTok: require /video/, /@user, or shortener link
        if info.slug == "tiktok":
            if host.startswith(("vm.", "vt.")):
                return bool(path)
            return "/video/" in f"/{path.lower()}" or path.startswith("@")

        # Anime sites or specific yt-dlp extractors: require a non-empty path
        if info.slug in {"anime", "twitch", "x_twitter", "instagram", "streaming", "direct_stream", "supported_site"}:
            if info.extractor_name != "generic":
                return bool(path or query)

        # Direct media extensions
        if path.lower().endswith(_DIRECT_MEDIA_EXTENSIONS):
            return True

        return False

    @staticmethod
    def _match_ytdlp_extractor(url: str) -> str | None:
        """Return the specific yt-dlp extractor IE_NAME matching ``url`` (excluding Generic)."""
        try:
            from yt_dlp.extractor import gen_extractor_classes

            for ie_cls in gen_extractor_classes():
                ie_name = getattr(ie_cls, "IE_NAME", "")
                if ie_name in {"generic", "Generic"}:
                    continue
                try:
                    if ie_cls.suitable(url):
                        return str(ie_name)
                except Exception:
                    continue
        except Exception:
            pass
        return None
