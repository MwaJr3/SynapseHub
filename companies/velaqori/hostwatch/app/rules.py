"""Detection rules over collected observations. Signals, never verdicts."""
from __future__ import annotations

from dataclasses import dataclass, field

from .collectors import CollectorReport, FileFact


@dataclass
class Alert:
    code: str
    severity: str       # informational | low | medium
    title: str
    explanation: str
    evidence: str


@dataclass
class AlertReport:
    alerts: list[Alert] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "alerts": [a.__dict__ for a in self.alerts],
            "disclaimer": ("An unusual process or file change is NOT proof of malicious activity. "
                           "Alerts are review signals with the evidence that produced them. "
                           "The monitor never terminates processes or modifies files."),
        }


def evaluate(report: CollectorReport, high_memory_mb: float = 2048.0,
             previous_files: dict[str, FileFact] | None = None) -> AlertReport:
    out = AlertReport()
    for proc in sorted(report.processes, key=lambda p: -p.memory_mb)[:3]:
        if proc.memory_mb >= high_memory_mb:
            out.alerts.append(Alert("high-memory", "informational",
                                    f"Process {proc.name} uses {proc.memory_mb} MB",
                                    "High memory usage can be normal; review whether it is expected on this host.",
                                    f"pid {proc.pid}"))
    for fact in report.file_facts:
        if fact.size == -1:
            out.alerts.append(Alert("path-unavailable", "low", f"Watched path unavailable: {fact.path}",
                                    "The monitored path is missing or unreadable (permissions or deletion).",
                                    fact.path))
    if previous_files:
        for path, prev in previous_files.items():
            current = next((f for f in report.file_facts if f.path == path), None)
            if current and prev.size >= 0 and current.size >= 0 and current.size != prev.size:
                out.alerts.append(Alert("file-changed", "low", f"Observed size change: {path}",
                                        "File size changed since the previous observation; review if expected.",
                                        f"{prev.size} -> {current.size} bytes"))
    for note in report.unsupported:
        out.alerts.append(Alert("unsupported-feature", "informational", "Collector limitation",
                                note, note))
    return out
