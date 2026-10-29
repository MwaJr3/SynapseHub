"""Human-readable and JSON reporting (never echoes the password)."""
from __future__ import annotations

from .rules import Assessment


def to_json(assessment: Assessment) -> dict:
    return {
        "band": assessment.band,
        "score": assessment.score,
        "entropy_bits_estimate": assessment.entropy_bits_estimate,
        "signals": [{"name": s.name, "effect": s.effect, "detail": s.detail} for s in assessment.signals],
        "suggestions": assessment.suggestions,
    }


def to_text(assessment: Assessment) -> str:
    lines = [f"Assessment: {assessment.band.upper()} (rubric score {assessment.score}/10; "
             f"entropy estimate ~{assessment.entropy_bits_estimate} bits - approximate)"]
    lines += [f"  - {s.name}: {s.detail}" for s in assessment.signals]
    lines.append("Suggestions:")
    lines += [f"  * {s}" for s in assessment.suggestions]
    lines.append("Honest note: this local analysis cannot tell you whether a password appears "
                 "in a real breach corpus. Scores are estimates, not proofs of strength.")
    return "\n".join(lines)
