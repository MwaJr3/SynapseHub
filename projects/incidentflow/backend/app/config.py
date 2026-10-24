from __future__ import annotations
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore", case_sensitive=False)
    database_url: str = "sqlite:///./data/incidentflow.db"
    session_days: int = 14
    reset_token_minutes: int = 30
    reset_delivery: str = "dev"
    max_evidence_bytes: int = 5 * 1024 * 1024


settings = Settings()
