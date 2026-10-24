"""Authorized retrieval adapter. Deliberately independent of all AI code.

Uses public oEmbed metadata and official YouTube Data API captions.list/download.
The authenticated Google account must have the required rights to the caption track.
This is NOT an arbitrary-public-video caption scraper.
"""

import re
from dataclasses import dataclass
from typing import Awaitable, Callable, Protocol
from urllib.parse import parse_qs, quote, urlsplit

import httpx

from app.config import Settings
from app.errors import ServiceError
from app.services.transcripts import parse_upload

VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}
EMBED_HOSTS = {"www.youtube-nocookie.com", "youtube-nocookie.com"}
Progress = Callable[[str, dict | None], Awaitable[None]]


def extract_video_id(url: str) -> str:
    try:
        parsed = urlsplit(url.strip())
        if parsed.scheme not in ("https", "http") or parsed.username or parsed.password or parsed.port not in (None, 80, 443):
            raise ValueError()
        host = (parsed.hostname or "").lower()
        parts = [p for p in parsed.path.split("/") if p]
        candidate = None
        if host in ("youtu.be", "www.youtu.be") and len(parts) == 1:
            candidate = parts[0]
        elif host in YOUTUBE_HOSTS and parsed.path.rstrip("/") == "/watch":
            values = parse_qs(parsed.query).get("v", [])
            candidate = values[0] if len(values) == 1 else None
        elif host in YOUTUBE_HOSTS | EMBED_HOSTS and len(parts) == 2 and parts[0] in ("shorts", "embed", "live"):
            if host in EMBED_HOSTS and parts[0] != "embed":
                raise ValueError()
            candidate = parts[1]
        if candidate and VIDEO_ID.fullmatch(candidate):
            return candidate
    except (ValueError, TypeError):
        pass
    raise ServiceError(
        "invalid_youtube_url",
        "Enter a valid YouTube watch, youtu.be, Shorts, live, or embed URL with an 11-character video ID. Other domains and playlists are not supported.",
    )


def canonical_url(video_id: str) -> str:
    if not VIDEO_ID.fullmatch(video_id):
        raise ValueError("Invalid video ID")
    return f"https://www.youtube.com/watch?v={video_id}"


@dataclass
class RetrievedTranscript:
    video_id: str
    metadata: dict
    original_text: str
    segments: list[dict]
    language: str | None
    method: str


class TranscriptRetriever(Protocol):
    async def retrieve(self, video_id: str, language: str | None, progress: Progress) -> RetrievedTranscript: ...


async def video_metadata(client: httpx.AsyncClient, video_id: str) -> dict:
    response = await client.get("https://www.youtube.com/oembed", params={"url": canonical_url(video_id), "format": "json"}, timeout=10)
    if not response.is_success:
        return {
            "availability": "unavailable",
            "notice": "Public video metadata could not be retrieved. This does not establish whether captions exist.",
        }
    data = response.json()
    metadata = {"availability": "retrieved", "title": str(data.get("title", ""))[:240], "channel": str(data.get("author_name", ""))[:240]}
    thumbnail = str(data.get("thumbnail_url", ""))
    parsed = urlsplit(thumbnail)
    if parsed.scheme == "https" and parsed.hostname and (parsed.hostname == "i.ytimg.com" or parsed.hostname.endswith(".ytimg.com")):
        metadata["thumbnail_url"] = thumbnail
    # Duration and transcript language are not supplied by oEmbed; never invent them.
    return metadata


class OfficialYouTubeRetriever:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def _access_token(self, client: httpx.AsyncClient) -> str:
        if self.settings.youtube_access_token:
            return self.settings.youtube_access_token
        if not self.settings.youtube_configured:
            raise ServiceError(
                "manual_transcript_required",
                "Automatic captions access is not configured. YouTube's official API requires an authorized Google account with permission for the video. Paste a transcript or upload a .txt, .srt, or .vtt file to continue.",
            )
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "refresh_token",
                "client_id": self.settings.youtube_client_id,
                "client_secret": self.settings.youtube_client_secret,
                "refresh_token": self.settings.youtube_refresh_token,
            },
        )
        if not response.is_success:
            raise ServiceError(
                "access_not_authorized",
                "Google authorization could not be refreshed. The administrator needs to reconnect an authorized account; you can use manual input instead.",
            )
        value = response.json().get("access_token")
        if not value:
            raise ServiceError("temporary_service_failure", "Google did not return a usable access token. Try manual transcript input.")
        return value

    @staticmethod
    def _check_status(response: httpx.Response):
        if response.status_code in (401, 403):
            raise ServiceError(
                "access_not_authorized",
                "YouTube did not authorize access to these captions. This does not mean captions don't exist. Use a transcript you have permission to provide, or check the configured account's permissions and quota.",
            )
        if response.status_code == 429:
            raise ServiceError(
                "retrieval_rate_limit", "The YouTube request limit was reached. Wait and retry, or use manual transcript input."
            )
        if response.status_code == 404:
            raise ServiceError(
                "transcript_unavailable",
                "The requested video or caption track was not available through the authorized API. You can paste or upload a transcript instead.",
            )
        if not response.is_success:
            raise ServiceError(
                "temporary_service_failure",
                "YouTube's captions service is temporarily unavailable. Try again later, or provide a transcript manually.",
            )

    async def retrieve(self, video_id: str, language: str | None, progress: Progress) -> RetrievedTranscript:
        canonical_url(video_id)  # validation independent of caller
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
                await progress("Retrieving public video metadata", None)
                try:
                    metadata = await video_metadata(client, video_id)
                except (httpx.HTTPError, ValueError):
                    metadata = {"availability": "unavailable", "notice": "Video metadata could not be retrieved."}
                await progress(
                    "Checking authorized captions access",
                    {"metadata": metadata, "video_id": video_id, "source_url": canonical_url(video_id)},
                )
                if self.settings.youtube_configured and video_id not in {
                    v.strip() for v in self.settings.youtube_allowed_video_ids.split(",") if v.strip()
                }:
                    raise ServiceError(
                        "access_not_authorized",
                        "This server is not authorized to share captions for this video. Administrators must explicitly allowlist videos before sharing caption access with workspace users. Paste or upload a transcript you have permission to use instead.",
                    )
                token = await self._access_token(client)
                headers = {"Authorization": f"Bearer {token}"}
                response = await client.get(
                    "https://www.googleapis.com/youtube/v3/captions", params={"part": "snippet", "videoId": video_id}, headers=headers
                )
                self._check_status(response)
                tracks = response.json().get("items", [])
                languages = sorted({t.get("snippet", {}).get("language", "") for t in tracks if t.get("snippet", {}).get("language")})
                await progress("Selecting an available caption track", {"available_languages": languages})
                if not tracks:
                    raise ServiceError(
                        "transcript_unavailable",
                        "No caption tracks were returned for this account and video. This does not prove that public captions don't exist. Paste or upload a transcript to continue.",
                    )
                eligible = [t for t in tracks if not language or t.get("snippet", {}).get("language", "").lower() == language.lower()]
                if not eligible:
                    raise ServiceError(
                        "unsupported_language",
                        "The requested caption language was not returned. Select an available language or provide a transcript manually.",
                    )
                eligible.sort(key=lambda t: t.get("snippet", {}).get("trackKind") == "ASR")
                track = eligible[0]
                caption_id = track.get("id", "")
                if not isinstance(caption_id, str) or not caption_id or len(caption_id) > 1024 or any(ord(c) < 32 for c in caption_id):
                    raise ServiceError("unsupported_format", "The captions service returned an unsupported track identifier.")
                await progress("Downloading the authorized transcript", None)
                async with client.stream(
                    "GET",
                    f"https://www.googleapis.com/youtube/v3/captions/{quote(caption_id, safe='')}",
                    params={"tfmt": "vtt"},
                    headers=headers,
                ) as download:
                    self._check_status(download)
                    content = bytearray()
                    async for chunk in download.aiter_bytes():
                        content.extend(chunk)
                        if len(content) > self.settings.max_upload_bytes:
                            raise ServiceError(
                                "transcript_too_long",
                                "The caption file exceeds this server's upload limit. Download it through an authorized method and split it into smaller files.",
                            )
                original, segments = parse_upload("captions.vtt", bytes(content))
                return RetrievedTranscript(
                    video_id, metadata, original, segments, track.get("snippet", {}).get("language"), "youtube_official_captions"
                )
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            raise ServiceError(
                "temporary_service_failure",
                "We couldn't complete the request to YouTube. No transcript has been substituted. Retry or use paste/upload.",
            ) from exc
