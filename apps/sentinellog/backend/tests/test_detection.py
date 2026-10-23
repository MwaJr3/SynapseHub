"""Detection-engine tests with independently constructed event sequences."""
from datetime import datetime, timedelta, timezone

from app import detection

BASE = datetime(2026, 10, 21, 8, 0, tzinfo=timezone.utc)


def make_events():
    events = []
    counter = 0

    def add(minutes, event_type, username="", ip="", message=""):
        nonlocal counter
        counter += 1
        events.append(
            detection.EventView(
                id=counter,
                timestamp=BASE + timedelta(minutes=minutes),
                event_type=event_type,
                username=username,
                source_ip=ip,
                message=message,
            )
        )

    return events, add


def rule(rule_type, threshold=5, window=15, severity="high"):
    return detection.RuleConfig(
        id=1,
        name="test rule",
        rule_type=rule_type,
        threshold=threshold,
        window_minutes=window,
        severity=severity,
        description="",
        runbook="",
    )


def test_repeated_failures_triggers_at_threshold():
    events, add = make_events()
    for i in range(5):
        add(i, "auth_failure", "mbanda", "198.51.100.23")
    findings = detection.run_rule(events, rule("repeated_failures", threshold=5))
    assert len(findings) == 1
    assert findings[0]["classification"] == "suspicious-pattern"
    assert "not proof of an attack" in findings[0]["explanation"]
    assert findings[0]["evidence"]["event_count"] == 5


def test_repeated_failures_respects_window():
    events, add = make_events()
    for i in range(5):
        add(i * 30, "auth_failure", "mbanda", "198.51.100.23")  # spread beyond 15 min
    assert detection.run_rule(events, rule("repeated_failures", threshold=5, window=15)) == []


def test_repeated_failures_respects_threshold():
    events, add = make_events()
    for i in range(4):
        add(i, "auth_failure", "mbanda", "198.51.100.23")
    assert detection.run_rule(events, rule("repeated_failures", threshold=5)) == []


def test_multi_account_spray_detects_distinct_usernames():
    events, add = make_events()
    for i, name in enumerate(["admin", "oracle", "postgres", "test"]):
        add(i, "auth_failure", name, "203.0.113.7")
    findings = detection.run_rule(events, rule("multi_account_spray", threshold=4))
    assert len(findings) == 1
    assert "203.0.113.7" in findings[0]["title"]
    assert set(findings[0]["evidence"]["usernames"]) == {"admin", "oracle", "postgres", "test"}


def test_multi_account_spray_ignores_single_account():
    events, add = make_events()
    for i in range(6):
        add(i, "auth_failure", "mbanda", "203.0.113.7")
    assert detection.run_rule(events, rule("multi_account_spray", threshold=4)) == []


def test_success_after_failures():
    events, add = make_events()
    for i in range(3):
        add(i, "auth_failure", "nmwila", "198.51.100.23")
    add(5, "auth_success", "nmwila", "198.51.100.23")
    findings = detection.run_rule(events, rule("success_after_failures", threshold=3))
    assert len(findings) == 1
    assert "nmwila" in findings[0]["title"]
    # Honest framing: the pattern has benign explanations too.
    assert "forgotten password" in findings[0]["explanation"]


def test_success_without_failures_not_flagged():
    events, add = make_events()
    add(0, "auth_success", "jchanda", "192.0.2.10")
    assert detection.run_rule(events, rule("success_after_failures", threshold=3)) == []


def test_error_spike():
    events, add = make_events()
    for i in range(5):
        add(i, "error", message="ERROR upstream returned 502")
    findings = detection.run_rule(events, rule("error_spike", threshold=5))
    assert len(findings) == 1
    assert "faults as well as" in findings[0]["explanation"]


def test_event_frequency_buckets():
    events, add = make_events()
    add(0, "auth_success", "a", "1.1.1.1")
    add(30, "auth_failure", "b", "2.2.2.2")
    add(90, "auth_success", "a", "1.1.1.1")
    buckets = detection.event_frequency(events)
    assert len(buckets) == 2
    assert buckets[0]["total"] == 2
    assert buckets[1]["auth_success"] == 1
