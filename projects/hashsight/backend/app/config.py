"""Server-only configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore", case_sensitive=False)
    database_url: str = "sqlite:///./data/hashsight.db"
    max_upload_bytes: int = 5_000_000          # 5 MB default hard limit
    session_days: int = 14
    # Reputation providers are OPT-IN. Nothing is sent anywhere unless a
    # provider is explicitly configured AND the analyst confirms the lookup.
    provider_mode: str = "demo"                 # demo | external
    provider_api_key: str = ""
    provider_base_url: str = ""
    retention_days: int = 365


settings = Settings()
