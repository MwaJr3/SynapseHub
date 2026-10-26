"""Finding model: evidence, reproduction steps, candidate fix, limitations."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict


@dataclass
class Finding:
    vulnerability_class: str   # OWASP-Top-10-style class label (2021 list naming)
    location: str
    evidence: str              # the code/markup snippet showing the issue
    why_it_matters: str
    reproduction_steps: list[str]
    candidate_fix: str
    severity: str              # indicative only
    limitations: str           # what the analysis does NOT prove

    def to_dict(self) -> dict:
        return asdict(self)


SEVERITY_NOTE = ("Severity labels are INDICATIVE estimates only; findings are "
                 "starting points for discussion and are NOT proof of exploitability.")
