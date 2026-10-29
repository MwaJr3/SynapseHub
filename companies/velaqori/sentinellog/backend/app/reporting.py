"""Report generation: dataset summaries, JSON payloads and CSV export."""
from __future__ import annotations

import csv
import io
from collections import Counter
from datetime import datetime, timezone


def build_summary(dataset, events, findings) -> dict:
    """Summarise an analyzed dataset. Counts come from stored records only."""
    by_type = Counter(e.event_type for e in events)
    by_user = Counter(e.username for e in events if e.username)
    by_ip = Counter(e.source_ip for e in events if e.source_ip)
    by_severity = Counter(f.severity for f in findings)
    return {
        "dataset": {
            "id": dataset.id,
            "name": dataset.name,
            "original_filename": dataset.original_filename,
            "file_format": dataset.file_format,
            "uploaded_at": dataset.uploaded_at.isoformat() if dataset.uploaded_at else None,
            "record_count": dataset.record_count,
            "error_count": dataset.error_count,
        },
        "counts": {
            "total_events": len(events),
            "successful_logins": by_type.get("auth_success", 0),
            "failed_logins": by_type.get("auth_failure", 0),
            "errors": by_type.get("error", 0),
            "other_events": by_type.get("info", 0),
            "suspicious_patterns": len(findings),
            "by_severity": dict(by_severity),
        },
        "top_usernames": by_user.most_common(10),
        "top_source_ips": by_ip.most_common(10),
        "findings": [
            {
                "id": f.id,
                "rule_name": f.rule_name,
                "severity": f.severity,
                "classification": f.classification,
                "title": f.title,
                "explanation": f.explanation,
                "status": f.status,
            }
            for f in findings
        ],
        "disclaimer": (
            "Detections are suspicious patterns produced by configurable rules. "
            "A pattern is not proof of an attack; analyst conclusions are recorded separately."
        ),
    }


def summary_to_csv(summary: dict) -> str:
    """Flatten the summary into a two-column CSV for export."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["section", "key", "value"])
    dataset = summary["dataset"]
    for key, value in dataset.items():
        writer.writerow(["dataset", key, value])
    for key, value in summary["counts"].items():
        writer.writerow(["counts", key, value])
    for name, count in summary["top_usernames"]:
        writer.writerow(["top_usernames", name, count])
    for ip, count in summary["top_source_ips"]:
        writer.writerow(["top_source_ips", ip, count])
    for finding in summary["findings"]:
        writer.writerow(["finding", finding["title"], f"{finding['severity']} / {finding['classification']}"])
    writer.writerow(["meta", "exported_at", datetime.now(timezone.utc).isoformat()])
    return buffer.getvalue()
