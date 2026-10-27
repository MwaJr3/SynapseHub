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


#: Where the built frontend lives, when this process serves it. Empty means the
#: API is deployed on its own (a separate static host, or the Vite dev server).
FRONTEND_DIR = os.environ.get("TESSERA_FRONTEND_DIR", "").strip()

DATABASE_URL = normalise_database_url(
    os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'tessera.db'}")
)

SESSION_COOKIE = "ts_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
PASSWORD_MIN_LENGTH = 12


# ------------------------------------------------------------------ hardening
def _flag(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


#: True for a deployment that real learners use. It changes nothing about how the
#: learning works; it switches on the claims a local demo does not need — a Secure
#: cookie, HSTS, and a preflight that refuses a database it should not ship with.
PRODUCTION = _flag("TESSERA_PRODUCTION")

#: A Secure cookie is mandatory over HTTPS and unusable over plain HTTP, so it
#: follows the deployment flag unless it is set explicitly (a TLS-terminating proxy
#: in front of a local HTTP app is a real, if uncommon, arrangement).
SESSION_COOKIE_SECURE = _flag("TESSERA_COOKIE_SECURE", PRODUCTION)
SESSION_COOKIE_SAMESITE = os.environ.get("TESSERA_COOKIE_SAMESITE", "lax").strip().lower()
if SESSION_COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    raise RuntimeError(
        "TESSERA_COOKIE_SAMESITE must be one of lax, strict or none "
        f"(got {SESSION_COOKIE_SAMESITE!r})"
    )


def production_problems() -> list[str]:
    """Things that are wrong for a real deployment and invisible in a demo.

    Returned as sentences rather than booleans so `python3 -m app.preflight` can
    print them, and so a test can assert the wording names the fix.
    """
    problems: list[str] = []
    if not PRODUCTION:
        return problems
    if DATABASE_URL.startswith("sqlite"):
        problems.append(
            "TESSERA_PRODUCTION is set but the database is SQLite. A single file cannot "
            "serve concurrent writers or be backed up safely under load: point DATABASE_URL "
            "at PostgreSQL."
        )
    if not SESSION_COOKIE_SECURE:
        problems.append(
            "TESSERA_PRODUCTION is set but the session cookie is not Secure. Set "
            "TESSERA_COOKIE_SECURE=1 (the default when production is on) or terminate TLS "
            "in front of the app and leave it on."
        )
    if SESSION_COOKIE_SAMESITE == "none" and not SESSION_COOKIE_SECURE:
        problems.append(
            "SameSite=None without a Secure cookie is rejected by every current browser; "
            "the learner would appear signed out on every request."
        )
    if any(origin.startswith("http://localhost") or origin.startswith("http://127.") for origin in ALLOWED_ORIGINS):
        problems.append(
            "ALLOWED_ORIGINS still contains a local address. Set it to the origin the "
            "frontend is actually served from."
        )
    if not ALLOWED_ORIGINS:
        problems.append("ALLOWED_ORIGINS is empty; the browser client would be blocked by CORS.")
    return problems

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


# --------------------------------------------------------------------- integration
# The study planner is a separate deployment. These describe the one client this
# server will issue a grant to. A comma-separated redirect list means a preview
# deployment can be added without a code change; each entry is matched exactly.
PLANNER_CLIENT_ID = os.environ.get("TESSERA_PLANNER_CLIENT_ID", "tamuzi-study-planner")
PLANNER_CLIENT_NAME = os.environ.get("TESSERA_PLANNER_CLIENT_NAME", "Tamuzi Study Planner")
PLANNER_REDIRECT_URIS = [
    entry.strip()
    for entry in os.environ.get(
        "TESSERA_PLANNER_REDIRECT_URIS",
        "http://localhost:3000/api/tessera/callback",
    ).split(",")
    if entry.strip()
]
PLANNER_SCOPES = ["learning-summary:read"]


# ------------------------------------------------------------------- stage 5: quests
# The caps are product policy, not code, so they live here and are quoted back to the
# learner in the UI ("120 minutes today"). Changing them changes behaviour only.
XP_DAILY_CAP = int(os.environ.get("TESSERA_XP_DAILY_CAP", "400"))
MAX_DAILY_MINUTES = int(os.environ.get("TESSERA_MAX_DAILY_MINUTES", "120"))
#: Same concept practised again in one day is worth 100%, 60%, 30%, then nothing.
#: The fourth repeat is not punished — it simply earns no XP, and the ledger says so.
DIMINISHING_XP = (1.0, 0.6, 0.3, 0.0)
#: Seasons are 12 weeks. The window is derived from a fixed anchor so that the id of a
#: season is a function of the date: two servers computing it agree, and creating it
#: twice is a no-op rather than a duplicate.
SEASON_WEEKS = int(os.environ.get("TESSERA_SEASON_WEEKS", "12"))
SEASON_ANCHOR = "2026-01-05T00:00:00+00:00"
