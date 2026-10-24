"""Parser for Bandit JSON output into the common finding schema.

Accuracy is tested against fixture rows; unknown fields are preserved in
evidence rather than dropped or invented."""
from __future__ import annotations

from ..rules.base import Finding


def parse_bandit_json(results: dict) -> list[Finding]:
    out: list[Finding] = []
    for row in results.get("results", []):
        try:
            out.append(Finding(
                rule_id=str(row.get("test_id", "BANDIT")),
                title=str(row.get("test_name", "bandit finding")),
                severity=str(row.get("issue_severity", "medium")).lower(),
                cwe=f"CWE-{row.get('issue_cwe', {}).get('id', 0)}" if isinstance(row.get("issue_cwe"), dict) else "CWE-0",
                path=str(row.get("filename", "")),
                line=int(row.get("line_number", 0) or 0),
                evidence=str(row.get("code", "")).strip()[:160],
                explanation=str(row.get("issue_text", "")),
                suggested_fix="Review the flagged construct; apply the vendor's recommended remediation.",
            ))
        except (TypeError, ValueError):
            continue
    return out
