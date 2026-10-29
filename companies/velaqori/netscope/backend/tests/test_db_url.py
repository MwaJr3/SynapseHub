"""The deployed DATABASE_URL may name either Postgres driver.

Supabase hands out `postgresql://` (psycopg2) while some integrations hand out
`postgresql+psycopg://` (psycopg 3). Only psycopg2-binary is installed, so every
spelling must resolve to it - otherwise the import fails before any route runs
and the platform returns an opaque 500.
"""
from __future__ import annotations

import pytest

from app.db import _normalise_url


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://u:p@host:5432/db",
        "postgres://u:p@host:5432/db",
        "postgresql+psycopg://u:p@host:5432/db",
        "postgresql+psycopg2://u:p@host:5432/db",
    ],
)
def test_postgres_urls_use_the_installed_driver(url):
    assert _normalise_url(url) == "postgresql+psycopg2://u:p@host:5432/db"


def test_sqlite_is_untouched():
    assert _normalise_url("sqlite:///./data/app.db") == "sqlite:///./data/app.db"
