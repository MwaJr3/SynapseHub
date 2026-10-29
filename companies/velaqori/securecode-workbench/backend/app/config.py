from __future__ import annotations
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore", case_sensitive=False)
    database_url: str = "sqlite:///./data/securecode.db"
    session_days: int = 14
    reset_token_minutes: int = 30
    reset_delivery: str = "dev"
    # Untrusted-archive hard limits (enforced during extraction).
    max_archive_bytes: int = 10 * 1024 * 1024        # compressed upload cap
    max_uncompressed_bytes: int = 50 * 1024 * 1024   # total after expansion
    max_files: int = 500
    max_compression_ratio: int = 50
    # Optional AI review — off by default; requires explicit per-run consent.
    ai_enabled: bool = False
    ai_endpoint: str = ""


settings = Settings()
