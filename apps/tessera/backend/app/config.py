"""Tessera configuration.

Tessera is the adaptive learning engine for Tamuzi Learning. It is deliberate
about two things that most learning products hide: what a learner actually
retains, and where the learning material came from.
"""

from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "Tessera"
COMPANY = "Tamuzi Learning"
DATA_DIR = Path(os.environ.get("TESSERA_DATA_DIR", "data"))


def normalise_database_url(url: str) -> str:
    """Pin the driver in a bare PostgreSQL URL.

    `requirements.txt` ships `psycopg2-binary`, but SQLAlchemy 2.1 resolves a bare
    `postgresql://` to psycopg (v3), which is not installed — so the app would die
    at startup with a driver error that looks like a database problem. Naming the
    driver makes the URL mean what the requirements say. An explicit driver is
    always respected.
    """
    if url.startswith("postgresql://"):
        return "postgresql+psycopg2://" + url[len("postgresql://") :]
    if url.startswith("postgres://"):
        return "postgresql+psycopg2://" + url[len("postgres://") :]
    return url


DATABASE_URL = normalise_database_url(
    os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'tessera.db'}")
)

SESSION_COOKIE = "ts_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
PASSWORD_MIN_LENGTH = 12

#: Retention target used when scheduling reviews. 0.9 is the default because
#: reviewing at 90% recall is the usual efficient trade-off; the algorithm
#: supports anything in [0.5, 1.0).
TARGET_RETENTION = float(os.environ.get("TESSERA_TARGET_RETENTION", "0.9"))

#: True when this deployment is commercially operated. Non-commercial licences
#: (e.g. CC BY-NC-SA) may then no longer back stored material.
COMMERCIAL_DEPLOYMENT = os.environ.get("TESSERA_COMMERCIAL", "").strip() in {"1", "true", "yes"}

ALLOWED_ORIGINS = [
    value.strip()
    for value in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if value.strip()
] or ["http://localhost:5197", "http://127.0.0.1:5197"]
