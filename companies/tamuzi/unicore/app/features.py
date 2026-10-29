"""Modern features: prerequisite checks, timetable clash detection, transcript
export, audit log.

DSA notes: clash detection compares pairs O(e²) over a student's enrolments
(bounded: degrees are small); prerequisite checks are O(courses × prereqs);
audit rows are append-only O(1).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone


class FeatureError(ValueError):
    pass


def check_prerequisites(course_id: str, completed: set[str],
                        prerequisites: dict[str, set[str]]) -> list[str]:
    missing = sorted(prerequisites.get(course_id, set()) - completed)
    return [f"missing prerequisite: {m}" for m in missing]


def detect_clashes(enrolments: list[dict]) -> list[dict]:
    """Detect timetable clashes among a student's enrolments.

    Each enrolment: {"course": ..., "day": ..., "start": "HH:MM", "end": "HH:MM"}.
    Returns every clashing pair with the overlap window."""
    def minutes(hhmm: str) -> int:
        h, m = hhmm.split(":")
        return int(h) * 60 + int(m)

    clashes = []
    for i, a in enumerate(enrolments):
        for b in enrolments[i + 1:]:
            if a["day"] != b["day"]:
                continue
            overlap = min(minutes(a["end"]), minutes(b["end"])) - max(minutes(a["start"]), minutes(b["start"]))
            if overlap > 0:
                clashes.append({"courses": [a["course"], b["course"]], "day": a["day"],
                                "overlap_minutes": overlap,
                                "note": "Clash detected in the planned timetable; resolve before confirming enrolment."})
    return clashes


def transcript_rows(student: dict, results: list[dict]) -> dict:
    """Ordered transcript export. Grades are the recorded ones — never inferred."""
    rows = [{"course": r["course"], "grade": r["grade"], "credits": r.get("credits", 0),
             "term": r.get("term", "")} for r in sorted(results, key=lambda r: (r.get("term", ""), r["course"]))]
    earned = sum(r["credits"] for r in rows if str(r["grade"]).upper() not in ("F", "I", ""))
    return {"student": student.get("name", ""), "student_id": student.get("student_id", ""),
            "rows": rows, "credits_earned": earned,
            "note": "Grades as recorded in the system; not verified against any external authority."}


def audit_log(path: str, actor: str, action: str, detail: str = "") -> dict:
    """Append-only JSONL audit log."""
    entry = {"at": datetime.now(timezone.utc).isoformat(), "actor": actor,
             "action": action, "detail": detail}
    with open(path, "a") as fh:
        fh.write(json.dumps(entry) + "\n")
    return entry
