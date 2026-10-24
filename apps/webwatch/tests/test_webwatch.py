"""Tests: policy enforcement, conditional fetch, change detection, drift."""
from __future__ import annotations

import pytest

from app.collectors import CollectError, FixtureTransport, extract_records
from app.policy import PolicyError, SourcePolicy, check_allowed, robots_allows
from app.store import Store

FIXTURES = "data/fixtures"
URL = "https://demo-jobs.example.test/listings"


def test_policy_host_enforcement():
    source = SourcePolicy("demo", "https://demo-jobs.example.test", allowed=True)
    check_allowed(source, URL)                      # ok
    with pytest.raises(PolicyError):
        check_allowed(source, "https://evil.example.test/x")
    blocked = SourcePolicy("b", "https://blocked.example.test", allowed=False)
    with pytest.raises(PolicyError):
        check_allowed(blocked, "https://blocked.example.test/")


def test_robots_evaluation_offline():
    robots = open("data/robots_demo.txt").read()
    assert robots_allows(robots, "webwatch", "https://demo-jobs.example.test/listings")
    assert not robots_allows(robots, "webwatch", "https://demo-jobs.example.test/private/x")


def test_extraction_and_schema_drift():
    body = open(FIXTURES + "/https:_demo-jobs.example.test_listings.html").read()
    records = extract_records(body, URL)
    assert [r["title"] for r in records] == ["Junior Python Developer", "Data Analyst"]
    assert extract_records("<html><body><p>changed structure</p></body></html>", URL) == []


def test_conditional_fetch_uses_etag():
    t = FixtureTransport(FIXTURES, etags={URL: "v1"})
    p1 = t.fetch(URL, etag="v1")
    assert p1.from_cache is True          # unchanged resource not re-parsed
    p2 = t.fetch(URL, etag="old")
    assert p2.from_cache is False and "Junior" in p2.body


def test_change_detection_with_diffs(tmp_path):
    store = Store(str(tmp_path / "w.db"))
    r1 = store.upsert_records("demo", URL, [{"title": "Job A", "snippet": "old text"}])
    assert r1["new"] == 1
    r2 = store.upsert_records("demo", URL, [{"title": "Job A", "snippet": "new text"}])
    assert r2["changed"] == 1 and r2["diffs"][0]["before"] == "old text"
    r3 = store.upsert_records("demo", URL, [{"title": "Job A", "snippet": "new text"}])
    assert r3["unchanged"] == 1


def test_missing_fixture_is_error():
    t = FixtureTransport(FIXTURES)
    with pytest.raises(CollectError):
        t.fetch("https://none.example.test/x")
