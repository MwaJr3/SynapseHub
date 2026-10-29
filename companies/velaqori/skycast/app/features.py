"""Modern features: hourly series, unit conversions, favourites registry.

Existing freshness/TTL cache labels stay in providers.py. These helpers add
hourly presentation, unit conversion (deterministic), and a favourites store.

DSA notes: conversions are O(1); hourly reshaping is O(n); favourites lookups
are O(1) dict operations.
"""
from __future__ import annotations


class FeatureError(ValueError):
    pass


def to_fahrenheit(celsius: float) -> float:
    return round(celsius * 9 / 5 + 32, 2)


def to_celsius(fahrenheit: float) -> float:
    return round((fahrenheit - 32) * 5 / 9, 2)


def convert_units(reading: dict, unit: str) -> dict:
    """Convert a reading between metric and imperial. Deterministic math;
    unit choices are echoed back so the display is never ambiguous."""
    if unit not in ("metric", "imperial"):
        raise FeatureError("unit must be 'metric' or 'imperial'")
    out = dict(reading)
    if unit == "imperial":
        if "temp_c" in reading:
            out["temp_f"] = to_fahrenheit(reading["temp_c"])
        if "wind_kph" in reading:
            out["wind_mph"] = round(reading["wind_kph"] * 0.621371, 2)
    else:
        if "temp_f" in reading:
            out["temp_c"] = to_celsius(reading["temp_f"])
        if "wind_mph" in reading:
            out["wind_kph"] = round(reading["wind_mph"] / 0.621371, 2)
    out["units"] = unit
    return out


def hourly_series(hourly: list[dict], hours: int = 24) -> list[dict]:
    """Bounded hourly slice; flags anything missing instead of inventing it."""
    if hours < 1 or hours > 48:
        raise FeatureError("hours must be within 1..48 (bounded preview)")
    out = []
    for h in hourly[:hours]:
        if "temp" not in h or "hour" not in h:
            out.append({"hour": h.get("hour", "?"), "missing": True,
                        "note": "incomplete hourly record — not interpolated"})
        else:
            out.append(dict(h))
    return out


class Favourites:
    """Named favourite locations (local, per-user file/CLI)."""

    def __init__(self) -> None:
        self._favs: dict[str, str] = {}

    def add(self, name: str, location: str) -> None:
        if not name.strip() or not location.strip():
            raise FeatureError("name and location must be non-empty")
        self._favs[name] = location

    def remove(self, name: str) -> bool:
        return self._favs.pop(name, None) is not None

    def get(self, name: str) -> str | None:
        return self._favs.get(name)

    def all(self) -> dict[str, str]:
        return dict(self._favs)
