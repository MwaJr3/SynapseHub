"""Platform collectors behind an interface — mockable for tests.

Least privilege: collectors read process metadata and file facts only.
Command lines are NOT collected by default (they can contain secrets).
Nothing is terminated, deleted or altered, ever.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class ProcessSnapshot:
    pid: int
    name: str
    cpu_percent: float
    memory_mb: float


@dataclass
class FileFact:
    path: str
    size: int
    mtime: float
    sha256: str | None = None


@dataclass
class CollectorReport:
    collected_at: str
    processes: list[ProcessSnapshot] = field(default_factory=list)
    file_facts: list[FileFact] = field(default_factory=list)
    unsupported: list[str] = field(default_factory=list)


class SystemCollector:
    """Real collector using psutil when available; reports what is unsupported."""

    name = "system"

    def collect(self, watch_paths: list[str] | None = None) -> CollectorReport:
        report = CollectorReport(datetime.now(timezone.utc).isoformat())
        try:
            import psutil
        except ImportError:
            report.unsupported.append("psutil unavailable: process metadata not collected")
        else:
            for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_info"]):
                try:
                    info = proc.info
                    report.processes.append(ProcessSnapshot(
                        int(info["pid"]), str(info.get("name") or "?"),
                        float(info.get("cpu_percent") or 0.0),
                        round((info["memory_info"].rss if info.get("memory_info") else 0) / 1048576, 2)))
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        from .files import scan_paths
        for fact in scan_paths(watch_paths or []):
            report.file_facts.append(fact)
        return report
