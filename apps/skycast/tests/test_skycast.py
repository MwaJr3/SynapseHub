"""Tests: fixture provider honesty, error handling, favourites, HTTP adapter."""
from __future__ import annotations

import pytest

from app.config import build_provider
from app.favourites import add, load
from app.models import WeatherReading
from app.providers import FixtureProvider, HttpProvider, ProviderError


def test_fixture_readings_labelled_simulated():
    r = FixtureProvider().get("lusaka")
    assert r.simulated is True and r.provider == "fixture-simulated"
    assert r.timezone == "Africa/Lusaka"
    assert r.observed_at.startswith("2026-10-24")
    assert len(r.forecast) == 3


def test_unknown_city_raises_clear_error():
    with pytest.raises(ProviderError):
        FixtureProvider().get("atlantis")


def test_default_provider_is_fixture(monkeypatch):
    monkeypatch.delenv("SKYCAST_PROVIDER", raising=False)
    assert isinstance(build_provider(), FixtureProvider)


def test_http_provider_requires_configuration(monkeypatch):
    monkeypatch.setenv("SKYCAST_PROVIDER", "http")
    with pytest.raises(ValueError):
        build_provider()


def test_http_provider_rejects_malformed_responses():
    class FakeOpener:
        def urlopen(self, url, timeout=None):
            class R:
                def read(self):
                    return b"{}"
                def __enter__(self):
                    return self
                def __exit__(self, *a):
                    return False
            return R()
    import app.providers as providers
    original = providers.urllib.request.urlopen
    providers.urllib.request.urlopen = FakeOpener().urlopen
    try:
        p = HttpProvider("https://example.test/w", "https://example.test/geo")
        with pytest.raises(ProviderError):
            p.get("Lusaka")     # geocode response has no results -> clear error
    finally:
        providers.urllib.request.urlopen = original


def test_favourites(tmp_path):
    path = tmp_path / "f.json"
    add(path, "Lusaka"); add(path, "lusaka"); add(path, "Ndola")
    assert load(path) == ["lusaka", "ndola"]
