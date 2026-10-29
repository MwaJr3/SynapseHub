"""Provider adapters. The API layer is isolated from application logic.

Rules:
- The bundled FixtureProvider is deterministic SIMULATED demo data and always
  labels readings as such.
- HttpProvider is opt-in via configuration (SKYCAST_PROVIDER=http) with an
  explicit base URL; it never runs silently, uses timeouts, and validates
  response structure. Live lookups depend on network access and the provider's
  terms — the tool documents this rather than pretending otherwise.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from datetime import datetime, timezone

from .models import DayForecast, WeatherReading


class ProviderError(ValueError):
    """A provider could not deliver a reading (invalid city, timeout, bad data)."""


class WeatherProvider:
    name = "base"

    def get(self, city: str) -> WeatherReading:  # pragma: no cover - interface
        raise NotImplementedError


class FixtureProvider(WeatherProvider):
    """Deterministic simulated data for demos and tests (clearly labelled)."""
    name = "fixture-simulated"

    CITIES = {
        "lusaka": ("ZM", 21.0, "Sunny", 32, 14.0, "Africa/Lusaka"),
        "ndola": ("ZM", 19.5, "Partly cloudy", 45, 11.0, "Africa/Lusaka"),
        "cairo": ("EG", 31.0, "Clear", 22, 17.0, "Africa/Cairo"),
        "london": ("GB", 12.5, "Light rain", 78, 21.0, "Europe/London"),
    }

    def get(self, city: str) -> WeatherReading:
        key = city.strip().lower()
        if key not in self.CITIES:
            raise ProviderError(f"City {city!r} is not in the simulated fixture set.")
        country, temp, cond, hum, wind, tz = self.CITIES[key]
        base = datetime(2026, 10, 24, 12, 0, tzinfo=timezone.utc)
        forecast = [
            DayForecast(f"2026-10-{25 + i}", round(temp + 1.5 - i, 1), round(temp - 5 + i * 0.5, 1),
                        cond)
            for i in range(3)
        ]
        return WeatherReading(key.title(), country, temp, cond, hum, wind, tz,
                              base.isoformat(), forecast, provider=self.name, simulated=True)


class HttpProvider(WeatherProvider):
    """Minimal JSON-over-HTTP adapter (Open-Meteo style schema).

    Configured explicitly; requires network access. Any malformed response is a
    ProviderError, never a fabricated reading.
    """
    name = "http"

    def __init__(self, base_url: str, geocode_url: str, timeout: float = 8.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.geocode_url = geocode_url.rstrip("/")
        self.timeout = timeout

    def _fetch_json(self, url: str) -> dict:
        try:
            with urllib.request.urlopen(url, timeout=self.timeout) as resp:  # noqa: S310 (configured base URLs)
                return json.loads(resp.read().decode())
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise ProviderError(f"Weather service unavailable or returned invalid data: {exc}") from exc

    def get(self, city: str) -> WeatherReading:
        geo = self._fetch_json(f"{self.geocode_url}?name={urllib.parse.quote(city)}&count=1")
        results = geo.get("results") or []
        if not results:
            raise ProviderError(f"City {city!r} not found by the geocoding service.")
        loc = results[0]
        data = self._fetch_json(
            f"{self.base_url}?latitude={loc['latitude']}&longitude={loc['longitude']}"
            "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=3")
        try:
            current = data["current"]
            daily = data["daily"]
            forecast = [DayForecast(d, mx, mn, "see provider")
                        for d, mx, mn in zip(daily["time"], daily["temperature_2m_max"], daily["temperature_2m_min"])]
            return WeatherReading(
                city=str(loc.get("name", city)), country=str(loc.get("country", "?")),
                temperature_c=float(current["temperature_2m"]),
                conditions=f"weather_code {current.get('weather_code')}",
                humidity_pct=int(current["relative_humidity_2m"]),
                wind_kph=float(current["wind_speed_10m"]),
                timezone=str(loc.get("timezone", "unknown")),
                observed_at=str(current.get("time", "")), forecast=forecast,
                provider=self.name, simulated=False)
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderError(f"Weather service returned a malformed response: {exc}") from exc
