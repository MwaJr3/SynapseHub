"""Provider selection is explicit configuration — never implicit network use."""
from __future__ import annotations

import os

from .providers import FixtureProvider, HttpProvider, WeatherProvider


def build_provider() -> WeatherProvider:
    mode = os.environ.get("SKYCAST_PROVIDER", "fixture").strip().lower()
    if mode == "fixture":
        return FixtureProvider()
    if mode == "http":
        base = os.environ.get("SKYCAST_WEATHER_URL", "").strip()
        geo = os.environ.get("SKYCAST_GEOCODE_URL", "").strip()
        if not base or not geo:
            raise ValueError(
                "SKYCAST_PROVIDER=http requires SKYCAST_WEATHER_URL and SKYCAST_GEOCODE_URL. "
                "Live lookups are opt-in and subject to the provider's terms.")
        return HttpProvider(base, geo)
    raise ValueError(f"Unknown SKYCAST_PROVIDER {mode!r} (use 'fixture' or 'http').")
