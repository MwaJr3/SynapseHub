"""Report generation for scans and remediation state."""
from __future__ import annotations

import csv
import io
from collections import Counter
from datetime import datetime, timezone


def build_report(project, scan, findings, tasks_by_finding: dict[int, dict]) -> dict:
    by_status = Counter(t.get("status", "Open") for t in tasks_by_finding.values())
    by_package = Counter(f.package for f in findings)
    return {
        "project": {"id": project.id, "name": project.name, "repository_ref": project.repository_ref},
        "scan": {
            "id": scan.id,
            "status": scan.status,
            "tool": scan.tool,
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "finished_at": scan.finished_at.isoformat() if scan.finished_at else None,
            "error": scan.error,
        },
        "counts": {
            "findings": len(findings),
            "affected_packages": len(by_package),
            "by_remediation_status": dict(by_status),
        },
        "findings": [
            {
                "package": f.package,
                "version": f.version,
                "advisory_id": f.advisory_id,
                "aliases": f.aliases,
                "fix_versions": f.fix_versions,
                "description": f.description,
                "remediation": tasks_by_finding.get(f.id, {}),
            }
            for f in findings
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "disclaimer": (
            "Findings are scanner output, not proof of exploitability. Absence of findings does not "
            "prove a dependency is safe. Remediation status is user-managed workflow data and is "
            "kept separate from the scanner's original finding."
        ),
    }


def report_to_csv(report: dict) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["section", "key", "value"])
    for key, value in report["scan"].items():
        writer.writerow(["scan", key, value])
    for key, value in report["counts"].items():
        writer.writerow(["counts", key, value])
    for f in report["findings"]:
        remediation = f.get("remediation") or {}
        writer.writerow(
            [
                "finding",
                f"{f['package']}=={f['version']}",
                f"{f['advisory_id']} aliases={';'.join(f['aliases'])} fix={';'.join(f['fix_versions'])} "
                f"status={remediation.get('status', 'Open')} assignee={remediation.get('assignee', '')}",
            ]
        )
    writer.writerow(["meta", "generated_at", report["generated_at"]])
    return buffer.getvalue()
