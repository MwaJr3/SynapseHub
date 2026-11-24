"""File discovery, exclusion rules, scanning, finding normalisation."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

from .rules import DEFAULT_RULES, Rule, redact

SKIP_DIRS = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build", ".tox", ".mypy_cache"}
DEFAULT_EXTENSIONS = {".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yml", ".yaml", ".toml", ".env", ".sh", ".txt", ".md", ".ini", ".cfg"}
BINARY_SNIFF_BYTES = 1024


@dataclass
class Finding:
    rule: str
    title: str
    severity: str          # candidate severity: medium default; keys/tokens high
    file: str
    line: int
    redacted: str
    remediation: str
    status: str = "open"


@dataclass
class ScanReport:
    root: str
    files_scanned: int = 0
    findings: list[Finding] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)

    def to_json(self) -> str:
        return json.dumps({
            "root": self.root,
            "files_scanned": self.files_scanned,
            "findings": [asdict(f) for f in self.findings],
            "skipped": self.skipped,
            "disclaimer": "Pattern matches are CANDIDATES for review, not confirmed credentials. "
                          "Values are redacted; the scanner never transmits scanned content anywhere.",
        }, indent=2)


HIGH_RULES = {"aws-access-key", "github-token", "private-key", "slack-token", "google-api-key", "db-connection-string"}


def scan(root: str | Path, rules: tuple[Rule, ...] = DEFAULT_RULES,
         extensions: set[str] | None = None) -> ScanReport:
    base = Path(root).resolve()
    if not base.is_dir():
        raise ValueError(f"{root} is not a directory.")
    exts = extensions if extensions is not None else DEFAULT_EXTENSIONS
    report = ScanReport(root=str(base))
    for path in sorted(base.rglob("*")):
        if any(part in SKIP_DIRS for part in path.relative_to(base).parts):
            continue
        if path.is_dir():
            continue
        try:
            sample = path.open("rb").read(BINARY_SNIFF_BYTES)
            if b"\x00" in sample:
                report.skipped.append(f"{path.relative_to(base)} (binary)")
                continue
        except OSError as exc:
            report.skipped.append(f"{path.relative_to(base)} (unreadable: {exc.__class__.__name__})")
            continue
        if path.suffix.lower() not in exts and path.name != ".env":
            report.skipped.append(str(path.relative_to(base)))
            continue
        try:
            text = path.read_text(errors="replace")
        except OSError as exc:
            report.skipped.append(f"{path.relative_to(base)} (unreadable: {exc.__class__.__name__})")
            continue
        report.files_scanned += 1
        for lineno, line in enumerate(text.splitlines(), start=1):
            for rule in rules:
                for match in rule.pattern.finditer(line):
                    report.findings.append(Finding(
                        rule=rule.code, title=rule.title,
                        severity="high" if rule.code in HIGH_RULES else "medium",
                        file=str(path.relative_to(base)), line=lineno,
                        redacted=redact(match.group(0)), remediation=rule.remediation))
    return report
