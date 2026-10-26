from __future__ import annotations

import hashlib

from .rules.base import Finding
from .redaction import redact_evidence


LIMITATIONS = (
    "Heuristic static analysis — findings are indicators to review, not proof of "
    "vulnerabilities; absence of findings is NOT proof of security. No uploaded "
    "code was executed. Evidence is redacted by default."
)


def fingerprint(path: str, line: int, rule_id: str, evidence: str) -> str:
    return hashlib.sha256(f"{rule_id}|{path}|{line}|{evidence}".encode()).hexdigest()[:32]


def finding_to_row(f: Finding, run_id: int) -> dict:
    return {
        "run_id": run_id,
        "rule_id": f.rule_id,
        "title": f.title,
        "severity": f.severity,
        "cwe": f.cwe,
        "path": f.path,
        "line": f.line,
        "evidence": redact_evidence(f.evidence),
        "explanation": f.explanation,
        "suggested_fix": f.suggested_fix,
        "fingerprint": fingerprint(f.path, f.line, f.rule_id, f.evidence),
    }


def report_payload(run, findings: list[dict], project_name: str) -> dict:
    summary: dict[str, int] = {}
    for f in findings:
        summary[f["severity"]] = summary.get(f["severity"], 0) + 1
    return {
        "product": "SecureCode Workbench",
        "project": project_name,
        "run_id": run.id,
        "generated_at": run.started_at,
        "files_scanned": run.files_scanned,
        "summary_by_severity": summary,
        "findings": [{**f, "suggested_fix": f["suggested_fix"],
                      "disclaimer": "A finding is not proof of a vulnerability."} for f in findings],
        "limitations": LIMITATIONS,
        "ai_review": run.ai_consent,
    }
