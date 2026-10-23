"""Integrity report generation: JSON summaries and CSV export."""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone


def build_scan_summary(scan, findings, baseline) -> dict:
    return {
        "scan": {
            "id": scan.id,
            "workspace_id": scan.workspace_id,
            "baseline_id": scan.baseline_id,
            "baseline_name": baseline.name if baseline else "",
            "baseline_version": baseline.version if baseline else None,
            "generated_at": scan.created_at.isoformat() if scan.created_at else None,
        },
        "counts": {
            "matched": scan.matched_count,
            "changed": sum(1 for f in findings if f.kind == "changed"),
            "missing": sum(1 for f in findings if f.kind == "missing"),
            "new": sum(1 for f in findings if f.kind == "new"),
        },
        "findings": [
            {
                "id": f.id,
                "display_name": f.display_name,
                "kind": f.kind,
                "severity": f.severity,
                "expected_sha256": f.expected_sha256,
                "observed_sha256": f.observed_sha256,
                "explanation": f.explanation,
                "reviewed": f.reviewed,
                "notes": f.notes,
            }
            for f in findings
        ],
        "disclaimer": (
            "Baseline trust depends on protecting the baseline's integrity and origin. "
            "A matching hash proves byte-identity with the baseline record only — it does not "
            "prove a file is safe or free of malware. This workspace compares files explicitly "
            "uploaded to the application; it cannot inspect a computer's filesystem."
        ),
    }


def summary_to_csv(summary: dict) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["section", "key", "value"])
    for key, value in summary["scan"].items():
        writer.writerow(["scan", key, value])
    for key, value in summary["counts"].items():
        writer.writerow(["counts", key, value])
    for f in summary["findings"]:
        writer.writerow(["finding", f["display_name"], f"{f['kind']} / {f['severity']} / {f['explanation']}"])
    writer.writerow(["meta", "exported_at", datetime.now(timezone.utc).isoformat()])
    return buffer.getvalue()
