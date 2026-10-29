from __future__ import annotations
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore", case_sensitive=False)
    database_url: str = "sqlite:///./data/netscope.db"
    session_days: int = 14
    reset_token_minutes: int = 30
    reset_delivery: str = "dev"
    max_upload_bytes: int = 25 * 1024 * 1024
    # uploads larger than this are analyzed in the background (job status polling)
    inline_max_bytes: int = 512 * 1024
    alert_threshold_per_minute: int = 120


settings = Settings()
