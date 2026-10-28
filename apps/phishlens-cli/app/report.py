"""Human-readable and JSON reports (defanged URLs, no live fetching)."""
from __future__ import annotations

from .rules import AnalysisReport


def to_text(report: AnalysisReport) -> str:
    lines = [f"PhishLens analysis — worst severity: {report.worst_severity}"]
    if not report.findings:
        lines.append("No suspicious patterns matched the current rules. This is NOT proof of safety.")
    for f in report.findings:
        lines.append(f"[{f.severity.upper():13}] {f.title}")
        lines.append(f"    why:   {f.explanation}")
        lines.append(f"    evidence: {f.evidence}")
    lines.append(report.to_dict()["disclaimer"])
    return "\n".join(lines)
