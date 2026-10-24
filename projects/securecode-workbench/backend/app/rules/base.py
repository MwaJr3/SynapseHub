"""Rule + finding schema. Rules are data/behavior, completely separate from
the presentation layer; the UI renders whatever the engine emits."""
from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class Finding:
    rule_id: str
    title: str
    severity: str          # info | low | medium | high | critical
    cwe: str
    path: str
    line: int
    evidence: str
    explanation: str
    suggested_fix: str


@dataclass
class Rule:
    rule_id: str
    title: str
    severity: str
    cwe: str
    explanation: str
    suggested_fix: str
    pattern: re.Pattern
    applies_to: tuple[str, ...] = (".py",)

    def check(self, path: str, text: str) -> list[Finding]:
        if not path.endswith(self.applies_to):
            return []
        out = []
        for i, line in enumerate(text.splitlines(), start=1):
            if self.pattern.search(line):
                out.append(Finding(
                    rule_id=self.rule_id, title=self.title, severity=self.severity,
                    cwe=self.cwe, path=path, line=i, evidence=line.strip()[:160],
                    explanation=self.explanation, suggested_fix=self.suggested_fix))
        return out


@dataclass
class RuleSet:
    rules: list[Rule] = field(default_factory=list)

    def run(self, files) -> list[Finding]:
        findings: list[Finding] = []
        for path, text in files:
            for rule in self.rules:
                findings.extend(rule.check(path, text))
        return findings
