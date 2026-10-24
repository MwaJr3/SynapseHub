"""Server-only configuration. No provider secret is part of a public response."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore", case_sensitive=False, hide_input_in_errors=True)
    app_env: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite:///./data/transcriptwise.db"
    cookie_secure: bool = False
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    allowed_hosts: str = "localhost,127.0.0.1,testserver,*.e2b.app"
    guest_retention_days: int = Field(7, ge=1, le=30)
    unsaved_retention_days: int = Field(30, ge=1, le=365)
    session_days: int = Field(14, ge=1, le=90)
    max_upload_bytes: int = Field(2_000_000, ge=1024, le=10_000_000)
    max_transcript_chars: int = Field(300_000, ge=1000, le=2_000_000)
    min_transcript_chars: int = Field(80, ge=1, le=10000)
    daily_analysis_limit: int = Field(30, ge=1, le=1000)
    requests_per_minute: int = Field(120, ge=1, le=1000000)
    expensive_requests_per_hour: int = Field(30, ge=1, le=100000)
    ai_provider: Literal["local", "openai_compatible"] = "local"
    ai_api_key: str = ""
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = ""
    ai_chunk_chars: int = Field(18000, ge=2000, le=100000)
    ai_max_output_tokens: int = Field(6500, ge=1000, le=30000)
    ai_timeout_seconds: int = Field(120, ge=10, le=600)
    youtube_allowed_video_ids: str = ""
    youtube_access_token: str = ""
    youtube_client_id: str = ""
    youtube_client_secret: str = ""
    youtube_refresh_token: str = ""
    worker_enabled: bool = True
    serve_frontend: bool = False
    frontend_path: str = str(ROOT / "frontend" / "dist")

    @model_validator(mode="after")
    def secure_config(self):
        import re

        if any(not re.fullmatch(r"[A-Za-z0-9_-]{11}", v.strip()) for v in self.youtube_allowed_video_ids.split(",") if v.strip()):
            raise ValueError("YOUTUBE_ALLOWED_VIDEO_IDS must contain comma-separated 11-character video IDs, never a wildcard.")
        if self.ai_provider == "openai_compatible" and (not self.ai_api_key or not self.ai_model):
            raise ValueError("AI_API_KEY and AI_MODEL are required for openai_compatible.")
        if self.app_env == "production":
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production (HTTPS required).")
            from urllib.parse import urlsplit

            hosts = [host.strip() for host in self.allowed_hosts.split(",")]
            origins = [origin.strip() for origin in self.allowed_origins.split(",")]
            if (
                not all(hosts)
                or any("*" in host for host in hosts)
                or not all(origins)
                or any(
                    not origin.startswith("https://")
                    or not urlsplit(origin).netloc
                    or urlsplit(origin).path
                    or "localhost" in origin
                    or "*" in origin
                    for origin in origins
                )
            ):
                raise ValueError("Set explicit production ALLOWED_HOSTS and ALLOWED_ORIGINS (HTTPS origins without a path; no wildcards).")
            if not self.ai_base_url.startswith("https://"):
                raise ValueError("The production AI endpoint must use HTTPS.")
        return self

    @property
    def youtube_configured(self) -> bool:
        return bool(self.youtube_access_token or (self.youtube_client_id and self.youtube_client_secret and self.youtube_refresh_token))


@lru_cache
def get_settings() -> Settings:
    return Settings()
