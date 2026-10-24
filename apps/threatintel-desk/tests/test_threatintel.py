"""Tests: parsing, local lookups, caching, refusals, explicit unavailability."""
from __future__ import annotations

import pytest

from app.cache import cached_lookup, save
from app.indicators import IndicatorError, parse_indicator
from app.providers import HttpReputationProvider, LocalDatasetProvider, ProviderError, Verdict
from app.report import consolidate

DATASET = "data/synthetic_intel.json"


def test_parse_indicator_kinds():
    assert parse_indicator("203.0.113.66").kind == "ip"
    assert parse_indicator("Evil-DEMO.example").kind == "domain"
    assert parse_indicator("https://demo.example/path").kind == "url"
    assert parse_indicator("d41d8cd98f00b204e9800998ecf8427e").kind == "hash-md5"
    assert parse_indicator("A" * 64).kind == "hash-sha256"
    for bad in ("", "not an indicator", "zz" * 20):
        with pytest.raises(IndicatorError):
            parse_indicator(bad)


def test_local_dataset_lookup_and_no_data():
    p = LocalDatasetProvider(DATASET)
    v = p.lookup(parse_indicator("203.0.113.66"))
    assert v.result == "known-malicious" and "SYNTHETIC" in v.detail
    v2 = p.lookup(parse_indicator("192.0.2.1"))
    assert v2.result == "no-data"


def test_cache_records_provenance(tmp_path):
    p = LocalDatasetProvider(DATASET)
    v = p.lookup(parse_indicator("203.0.113.66"))
    cache = tmp_path / "c.json"
    save(cache, v)
    hit = cached_lookup(cache, p.name, "203.0.113.66")
    assert hit is not None and hit.cached is True and hit.retrieved_at


def test_private_indicators_never_sent_externally():
    provider = HttpReputationProvider("https://ti.example.test", api_key="k")
    with pytest.raises(ProviderError):
        provider.lookup(parse_indicator("10.0.0.5"))
    with pytest.raises(ProviderError):
        provider.lookup(parse_indicator("https://localhost/admin"))
    with pytest.raises(ProviderError):
        provider.lookup(parse_indicator("192.168.1.10"))


def test_unavailable_provider_is_explicit():
    provider = HttpReputationProvider("https://ti.invalid.invalid")
    v = provider.lookup(parse_indicator("93.184.216.34"))   # public-looking; DNS will fail
    assert v.result == "unavailable"
    assert "unavailable" in v.detail.lower() or "URLError" in v.detail


def test_consolidated_report_honesty():
    payload = consolidate("203.0.113.66", [
        Verdict("local-synthetic", "203.0.113.66", "known-malicious", "SYNTHETIC", "2026-10-24T00:00:00+00:00"),
        Verdict("http", "203.0.113.66", "unavailable", "down", "2026-10-24T00:00:00+00:00"),
    ])
    assert "unverified" in payload["consensus"]
    assert "NOT a clearance" in payload["disclaimer"]
    assert any(r["result"] == "unavailable" for r in payload["results"])
