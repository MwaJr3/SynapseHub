"""LearnPulse ingestion, aggregation and support-rule tests."""
import pytest

from app import core


CSV_OK = """uid,occurred_at,kind,learner_ref,course,class_name,topic,assessment,value
e1,2026-10-01,lesson_completed,l1,c1,cls,fractions,,80
e2,2026-10-02,quiz_attempt,l1,c1,cls,fractions,q1,40
e3,2026-10-03,quiz_attempt,l1,c1,cls,fractions,q2,45
e4,2026-10-04,quiz_attempt,l1,c1,cls,fractions,q3,30
e5,2026-10-05,assignment_missing,l1,c1,cls,fractions,,0
e6,2026-10-06,assignment_missing,l1,c1,cls,fractions,,0
e7,2026-10-02,help_requested,l2,c1,cls,decimals,,0
"""


def test_csv_validation_and_idempotent_dedupe():
    result = core.parse_events_csv(CSV_OK, set())
    assert len(result.rows_ok) == 7 and not result.rejected

    again = core.parse_events_csv(CSV_OK, {r["uid"] for r in result.rows_ok})
    assert not again.rows_ok
    assert all("idempotent" in r["reason"] for r in again.rejected)

    bad = core.parse_events_csv("uid,occurred_at,kind,learner_ref\nx,not-a-date,quiz_attempt,l1\ny,2026-10-01,bogus,l1\n,2026-10-01,quiz_attempt,l1\n", set())
    reasons = " | ".join(r["reason"] for r in bad.rejected)
    assert "ISO" in reasons and "kind must be" in reasons and "uid is required" in reasons

    missing_cols = core.parse_events_csv("foo,bar\n1,2\n", set())
    assert "Missing required columns" in missing_cols.rejected[0]["reason"]

    empty = core.parse_events_csv("", set())
    assert empty.rejected and "Empty CSV" in empty.rejected[0]["reason"]


def test_summary_math_and_date_filters():
    events = [type("E", (), row)() for row in core.parse_events_csv(CSV_OK, set()).rows_ok]
    summary = core.summarize(events, "2026-10-02", "2026-10-05")
    assert summary.learners == 2
    assert summary.quiz_attempts == 3  # e2..e4 are inside the window
    assert summary.quiz_avg == pytest.approx((40 + 45 + 30) / 3, abs=0.1)
    assert summary.lesson_completions == 0  # e1 is before the window
    assert summary.by_topic["fractions"] == 4  # e2..e5 in window; e6 is 10-06 (excluded)

    all_time = core.summarize(events, "", "")
    assert all_time.events == 7 and all_time.help_requests == 1


def test_support_rules_carry_exact_evidence():
    events = [type("E", (), row)() for row in core.parse_events_csv(CSV_OK, set()).rows_ok]
    drafts = core.evaluate_rules(events, "", "")
    by_rule = {d.rule_key: d for d in drafts if d.learner_ref == "l1"}
    assert set(by_rule) == {"missed_assignments", "repeated_topic_errors"}
    assert by_rule["missed_assignments"].evidence["count"] == 2
    assert len(by_rule["missed_assignments"].evidence["event_uids"]) == 2
    assert by_rule["repeated_topic_errors"].evidence["topic"] == "fractions"
    assert "rule" in by_rule["repeated_topic_errors"].evidence
    assert any(d.rule_key == "help_requested" and d.learner_ref == "l2" for d in drafts)


def test_small_cohort_suppression():
    result = core.suppress_small_cohorts({"small": ["a", "b"], "big": ["a", "b", "c"]})
    assert result["small"]["suppressed"] is True and "could reveal individuals" in result["small"]["reason"]
    assert result["big"]["suppressed"] is False and result["big"]["size"] == 3


def test_report_includes_definitions_and_quality_notes():
    events = [type("E", (), row)() for row in core.parse_events_csv(CSV_OK, set()).rows_ok]
    payload = core.report_payload(core.summarize(events, "", ""), "2026-10-01", "2026-10-31", ["demo.csv"])
    assert "quiz_avg" in payload["metric_definitions"]
    assert payload["data_sources"] == ["demo.csv"]
    assert any("missing evidence" in n for n in payload["data_quality_notes"])
    assert payload["values"]["events"] == 7
