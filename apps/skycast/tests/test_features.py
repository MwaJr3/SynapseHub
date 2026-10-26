"""Phase-B feature tests: unit conversion, hourly bounds, favourites."""
from __future__ import annotations

import pytest

from app.features import (FeatureError, Favourites, convert_units, hourly_series,
                          to_celsius, to_fahrenheit)


def test_unit_conversions_deterministic():
    assert to_fahrenheit(0) == 32.0 and to_fahrenheit(100) == 212.0
    assert to_celsius(32) == 0.0
    r = convert_units({"temp_c": 20, "wind_kph": 10}, "imperial")
    assert r["temp_f"] == 68.0 and abs(r["wind_mph"] - 6.21) < 0.01 and r["units"] == "imperial"
    back = convert_units(r, "metric")
    assert back["temp_c"] == 20.0 and back["units"] == "metric"
    with pytest.raises(FeatureError):
        convert_units({}, "kelvin")


def test_hourly_bounded_and_honest():
    hours = [{"hour": f"{h:02d}:00", "temp": h} for h in range(12)]
    series = hourly_series(hours, hours=24)
    assert len(series) == 12                          # no padding with invented rows
    incomplete = [{"hour": "01:00"}]
    flagged = hourly_series(incomplete, hours=5)
    assert flagged[0]["missing"] is True and "not interpolated" in flagged[0]["note"]
    with pytest.raises(FeatureError):
        hourly_series(hours, hours=100)


def test_favourites_registry():
    favs = Favourites()
    favs.add("home", "Lusaka")
    assert favs.get("home") == "Lusaka"
    assert favs.remove("home") and favs.get("home") is None
    with pytest.raises(FeatureError):
        favs.add("  ", "x")
