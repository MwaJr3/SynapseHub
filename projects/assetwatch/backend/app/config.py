from __future__ import annotations
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore", case_sensitive=False)
    database_url: str = "sqlite:///./data/assetwatch.db"
    session_days: int = 14
    reset_token_minutes: int = 30
    reset_delivery: str = "dev"
    # Scan safety limits — enforced server-side on every scan.
    max_targets_per_scan: int = 8
    max_ports_per_scan: int = 100
    scan_timeout_seconds: int = 120
    scan_mode: str = "import"        # import | simulated | nmap (nmap is opt-in + allowlist only)


settings = Settings()
