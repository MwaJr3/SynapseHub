"""LearnPulse domain logic: CSV ingestion, aggregation, transparent support rules.

Every dashboard value is computed from stored events; every metric carries a
documented definition; flags show the exact rule and evidence behind them.
Flags are reviewable signals for supportive follow-up — never labels of
ability or predictions of failure.
"""
from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass, field
from datetime import datetime

EVENT_KINDS = {
    "lesson_completed", "quiz_attempt", "assessment_result", "assignment_submitted",
    "assignment_missing", "help_requested",
}
REQUIRED_COLUMNS = ("uid", "occurred_at", "kind", "learner_ref")
MIN_COHORT_SIZE = 3


@dataclass
class ImportResult:
    rows_ok: list[dict] = field(default_factory=list)
    rejected: list[dict] = field(default_factory=list)


def parse_events_csv(text: str, existing_uids: set[str]) -> ImportResult:
    """Validate rows; reject (with reasons) instead of failing the whole file.
    Duplicate uids are rejected — re-importing the same file is idempotent."""
    result = ImportResult()
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        result.rejected.append({"line": 0, "reason": "Empty CSV."})
        return result
    missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
    if missing:
        result.rejected.append({"line": 0, "reason": f"Missing required columns: {', '.join(missing)}."})
        return result
    seen: set[str] = set(existing_uids)
    for line_no, row in enumerate(reader, start=2):
        uid = (row.get("uid") or "").strip()
        reason = ""
        if not uid:
            reason = "uid is required."
        elif uid in seen:
            reason = "duplicate uid (already imported) — idempotent skip."
        else:
            try:
                datetime.fromisoformat((row.get("occurred_at") or "").strip().replace("Z", "+00:00"))
            except ValueError:
                reason = "occurred_at must be an ISO date or datetime."
            if not reason and (row.get("kind") or "").strip() not in EVENT_KINDS:
                reason = f"kind must be one of: {', '.join(sorted(EVENT_KINDS))}."
        if reason:
            result.rejected.append({"line": line_no, "reason": reason, "row": row})
        else:
            seen.add(uid)
            value_raw = (row.get("value") or "").strip()
            try:
                value = float(value_raw) if value_raw else None
            except ValueError:
                result.rejected.append({"line": line_no, "reason": "value must be numeric.", "row": row})
                continue
            result.rows_ok.append({
                "uid": uid,
                "occurred_at": (row.get("occurred_at") or "").strip(),
                "kind": (row.get("kind") or "").strip(),
                "learner_ref": (row.get("learner_ref") or "").strip(),
                "course": (row.get("course") or "").strip(),
                "class_name": (row.get("class_name") or "").strip(),
                "topic": (row.get("topic") or "").strip(),
                "assessment": (row.get("assessment") or "").strip(),
                "value": value,
            })
    return result


# --------------------------------------------------------------- aggregation ---


def in_range(iso_ts: str, date_from: str, date_to: str) -> bool:
    day = iso_ts[:10]
    if date_from and day < date_from:
        return False
    if date_to and day > date_to:
        return False
    return True


@dataclass
class Summary:
    events: int
    learners: int
    lesson_completions: int
    quiz_attempts: int
    quiz_avg: float | None
    assignments_submitted: int
    assignments_missing: int
    help_requests: int
    by_topic: dict[str, int]


def summarize(events, date_from: str = "", date_to: str = "") -> Summary:
    filtered = [e for e in events if in_range(e.occurred_at, date_from, date_to)]
    quiz_scores = [e.value for e in filtered if e.kind == "quiz_attempt" and e.value is not None]
    by_topic: dict[str, int] = {}
    for e in filtered:
        if e.topic:
            by_topic[e.topic] = by_topic.get(e.topic, 0) + 1
    return Summary(
        events=len(filtered),
        learners=len({e.learner_ref for e in filtered}),
        lesson_completions=sum(1 for e in filtered if e.kind == "lesson_completed"),
        quiz_attempts=len(quiz_scores),
        quiz_avg=round(sum(quiz_scores) / len(quiz_scores), 1) if quiz_scores else None,
        assignments_submitted=sum(1 for e in filtered if e.kind == "assignment_submitted"),
        assignments_missing=sum(1 for e in filtered if e.kind == "assignment_missing"),
        help_requests=sum(1 for e in filtered if e.kind == "help_requested"),
        by_topic=by_topic,
    )


def suppress_small_cohorts(groups: dict[str, list[str]], min_size: int = MIN_COHORT_SIZE) -> dict[str, dict]:
    """Group comparisons hide groups small enough to reveal individuals."""
    out: dict[str, dict] = {}
    for name, members in groups.items():
        if len(members) < min_size:
            out[name] = {"suppressed": True, "reason": f"group smaller than {min_size} — could reveal individuals"}
        else:
            out[name] = {"suppressed": False, "size": len(members)}
    return out


# ------------------------------------------------------------ support rules ---

RULES = {
    "missed_assignments": {
        "description": "Two or more missing-assignment events in the period suggest a support conversation.",
        "threshold": 2,
    },
    "repeated_topic_errors": {
        "description": "Three or more quiz attempts below 50% on one topic suggest targeted practice.",
        "threshold": 3,
    },
    "help_requested": {
        "description": "A learner explicitly asked for help — respond with support.",
        "threshold": 1,
    },
}


@dataclass
class FlagDraft:
    rule_key: str
    learner_ref: str
    evidence: dict


def evaluate_rules(events, date_from: str = "", date_to: str = "") -> list[FlagDraft]:
    """Transparent rules with exact evidence — reviewable, dismissible, and
    explicitly NOT predictions of ability or failure."""
    filtered = [e for e in events if in_range(e.occurred_at, date_from, date_to)]
    drafts: list[FlagDraft] = []
    by_learner: dict[str, list] = {}
    for e in filtered:
        by_learner.setdefault(e.learner_ref, []).append(e)

    for learner, rows in by_learner.items():
        missing = [e for e in rows if e.kind == "assignment_missing"]
        if len(missing) >= RULES["missed_assignments"]["threshold"]:
            drafts.append(FlagDraft("missed_assignments", learner, {
                "rule": RULES["missed_assignments"]["description"],
                "event_uids": [e.uid for e in missing],
                "count": len(missing),
            }))
        weak_topics: dict[str, list] = {}
        for e in rows:
            if e.kind == "quiz_attempt" and e.value is not None and e.value < 50 and e.topic:
                weak_topics.setdefault(e.topic, []).append(e)
        for topic, attempts in weak_topics.items():
            if len(attempts) >= RULES["repeated_topic_errors"]["threshold"]:
                drafts.append(FlagDraft("repeated_topic_errors", learner, {
                    "rule": RULES["repeated_topic_errors"]["description"],
                    "topic": topic,
                    "event_uids": [e.uid for e in attempts],
                    "count": len(attempts),
                }))
        helps = [e for e in rows if e.kind == "help_requested"]
        if helps:
            drafts.append(FlagDraft("help_requested", learner, {
                "rule": RULES["help_requested"]["description"],
                "event_uids": [e.uid for e in helps],
            }))
    return drafts


def report_payload(summary: Summary, date_from: str, date_to: str, sources: list[str]) -> dict:
    return {
        "date_from": date_from or "(all)",
        "date_to": date_to or "(all)",
        "data_sources": sources,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "metric_definitions": {
            "lesson_completions": "Count of lesson_completed events in range.",
            "quiz_avg": "Mean of quiz_attempt values in range (0-100). Null when no attempts.",
            "assignments_missing": "Count of assignment_missing events in range.",
            "help_requests": "Count of help_requested events in range.",
        },
        "values": {
            "events": summary.events,
            "learners": summary.learners,
            "lesson_completions": summary.lesson_completions,
            "quiz_attempts": summary.quiz_attempts,
            "quiz_avg": summary.quiz_avg,
            "assignments_submitted": summary.assignments_submitted,
            "assignments_missing": summary.assignments_missing,
            "help_requests": summary.help_requests,
        },
        "data_quality_notes": [
            "Values cover only events present in the imported data; missing events are missing evidence.",
            "Correlation between metrics is not evidence of cause.",
        ],
    }
