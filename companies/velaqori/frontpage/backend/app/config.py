"""Frontpage configuration. Environment variables only; no secrets are hardcoded."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "Frontpage"
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("FRONTPAGE_DATA_DIR", BASE_DIR / "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'frontpage.db'}")
SAMPLE_FEEDS_PATH = Path(
    os.environ.get("FRONTPAGE_SAMPLE_FEEDS", BASE_DIR.parent / "data" / "sample-feeds.json")
)

SESSION_COOKIE = "fp_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
GUEST_MAX_AGE_SECONDS = 60 * 60 * 6
COOKIE_SECURE = os.environ.get("FRONTPAGE_COOKIE_SECURE", "") == "1"
RESET_TOKEN_TTL_SECONDS = 60 * 60
# No email provider is configured by default: reset links are written to the server log.
# Set FRONTPAGE_DEV_EXPOSE_RESET=1 to also return the token in the API response (local demos/tests only).
DEV_EXPOSE_RESET = os.environ.get("FRONTPAGE_DEV_EXPOSE_RESET", "") == "1"

# Feed fetching
FETCH_TIMEOUT_SECONDS = float(os.environ.get("FRONTPAGE_FETCH_TIMEOUT", "10"))
MAX_FEED_BYTES = 5 * 1024 * 1024
MAX_REDIRECTS = 5
USER_AGENT = "Frontpage/1.0 (+feed reader; https://github.com/MwaJr3/SynapseHub)"
# Fetching private/loopback addresses is blocked (SSRF). Tests and local fixture servers opt in.
ALLOW_PRIVATE_HOSTS = os.environ.get("FRONTPAGE_ALLOW_PRIVATE_HOSTS", "") == "1"
HOST_MIN_INTERVAL_SECONDS = float(os.environ.get("FRONTPAGE_HOST_MIN_INTERVAL", "0.4"))
REFRESH_WORKERS = 8
RATE_LIMIT_ENABLED = os.environ.get("FRONTPAGE_RATE_LIMIT", "1") == "1"

# Feed health / retention
STALE_AFTER_DAYS = 30
BACKOFF_BASE_SECONDS = 5 * 60
BACKOFF_MAX_SECONDS = 24 * 60 * 60
DEAD_AFTER_FAILURES = 5
MAX_ITEMS_PER_FEED = 300
EXCERPT_CHARS = 320
MAX_FEEDS_PER_USER = 200
GUEST_TEMPLATE_TTL_SECONDS = 30 * 60
