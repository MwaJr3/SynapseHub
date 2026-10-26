"""Tests: validation, explicit cleaning, stats correctness, reports."""
from __future__ import annotations

import json

import pytest

from app.analysis import column_stats, group_totals
from app.ingest import IngestError, coerce_numeric, load_csv
from app.report import build_json, build_report

SAMPLE = "data/sample_exams.csv"


def test_load_and_required_columns():
    ds = load_csv(SAMPLE, ["student", "subject", "score"])
    assert ds.name == "sample_exams.csv"
    assert len(ds.rows) == 10
    with pytest.raises(IngestError):
        load_csv(SAMPLE, ["missing_col"])
    with pytest.raises(IngestError):
        load_csv("data/nope.csv")


def test_cleaning_drops_not_fills():
    ds = coerce_numeric(load_csv(SAMPLE))
    assert "score" in ds.numeric_columns
    assert any("excluded from numeric analysis" in w for w in ds.warnings)
    stats = column_stats(ds, "score")
    assert stats.count == 9 and stats.missing == 1     # the blank score dropped, never 0-filled


def test_stats_values():
    ds = coerce_numeric(load_csv(SAMPLE))
    s = column_stats(ds, "score")
    assert s.min == 42 and s.max == 88
    assert s.median == 66 or s.median == 68.5          # 9 values -> median is 5th sorted
    assert s.mean == pytest.approx(sum([78, 71, 55, 62, 88, 79, 42, 48, 66]) / 9, abs=0.01)


def test_group_totals():
    ds = coerce_numeric(load_csv(SAMPLE))
    groups = group_totals(ds, "subject", "score")
    assert groups[0][0] == "Maths" and groups[0][1] == 78 + 55 + 88 + 42 + 66


def test_reports_include_text_summaries(tmp_path):
    ds = coerce_numeric(load_csv(SAMPLE))
    stats = [column_stats(ds, "score")]
    groups = group_totals(ds, "subject", "score")
    html_text = build_report(ds, stats, groups, "subject")
    assert "Text summary" in html_text and "Maths" in html_text
    assert "never zero-filled" in html_text
    payload = json.loads(build_json(ds, stats, groups))
    assert payload["rows"] == 10 and payload["statistics"][0]["count"] == 9
