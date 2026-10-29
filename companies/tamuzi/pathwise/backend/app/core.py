"""PathWise domain logic: scoring, transparent mastery, recommendations, scheduling.

The mastery model is deliberately transparent (weighted evidence with recency
and minimum-evidence rules). It is NOT machine learning, and is never
presented as such.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone


class ScoringError(ValueError):
    pass


def score_response(kind: str, answer_json: str, response) -> float:
    """Return credit in [0, 1]. Multi-select uses partial credit
    (correct selections minus incorrect, floored at 0)."""
    expected = json.loads(answer_json)
    if kind == "mcq":
        return 1.0 if isinstance(response, int) and response == expected else 0.0
    if kind == "tf":
        return 1.0 if isinstance(response, bool) and response is expected else 0.0
    if kind == "numeric":
        try:
            return 1.0 if abs(float(response) - float(expected)) < 1e-9 else 0.0
        except (TypeError, ValueError):
            return 0.0
    if kind == "short":
        given = str(response).strip().lower()
        return 1.0 if any(given == str(a).strip().lower() for a in expected) else 0.0
    if kind == "multi":
        if not isinstance(response, list):
            return 0.0
        expected_set = {int(i) for i in expected}
        given_set = {int(i) for i in response}
        hits = len(expected_set & given_set)
        misses = len(given_set - expected_set)
        return max(0.0, (hits - misses) / max(1, len(expected_set)))
    raise ScoringError(f"Unknown question kind '{kind}'.")


# ----------------------------------------------------------------- mastery ---

RECENCY_HALF_LIFE_DAYS = 14
MIN_EVIDENCE_FOR_HIGH_CONFIDENCE = 3
MIN_EVIDENCE_FOR_MODERATE = 2


@dataclass
class MasteryUpdate:
    score: float
    evidence_count: int
    confidence: str
    evidence: list[dict] = field(default_factory=list)


def _recency_weight(days_old: float) -> float:
    return 0.5 ** (days_old / RECENCY_HALF_LIFE_DAYS)


def update_mastery(previous_score: float, previous_evidence: int, new_scores: list[tuple[float, float]]):
    """Weighted evidence mastery estimate.

    new_scores: list of (credit 0..1, days_old). New evidence replaces the
    estimate with a recency-weighted average blended with prior evidence.
    Confidence is derived from evidence COUNT only — uncertainty is shown when
    evidence is limited (never a fixed judgement of ability).
    """
    if not new_scores:
        return MasteryUpdate(previous_score, previous_evidence, confidence_for(previous_evidence))
    total_weight = 0.0
    total = 0.0
    for credit, days_old in new_scores:
        weight = _recency_weight(max(0.0, days_old))
        total += credit * weight
        total_weight += weight
    fresh = 100.0 * total / total_weight
    count = previous_evidence + len(new_scores)
    blended = fresh if previous_evidence == 0 else (previous_score * previous_evidence + fresh * len(new_scores)) / count
    return MasteryUpdate(round(blended, 1), count, confidence_for(count))


def confidence_for(evidence_count: int) -> str:
    if evidence_count >= MIN_EVIDENCE_FOR_HIGH_CONFIDENCE:
        return "high"
    if evidence_count >= MIN_EVIDENCE_FOR_MODERATE:
        return "moderate"
    return "low"


def mastery_status(score: float, threshold: float, evidence_count: int) -> str:
    """mastered | developing | not_yet_assessed — with uncertainty when evidence is thin."""
    if evidence_count == 0:
        return "not_yet_assessed"
    if evidence_count < MIN_EVIDENCE_FOR_MODERATE:
        return "developing"
    return "mastered" if score >= threshold else "developing"


# --------------------------------------------------------- recommendations ---


@dataclass
class Recommendation:
    skill_id: int
    skill_name: str
    rationale: str
    evidence: dict


def recommend_next(skills, edges, mastery_by_skill: dict[int, MasteryUpdate | None]) -> list[Recommendation]:
    """Recommend skills whose prerequisites are satisfied but mastery is below
    threshold. Every recommendation carries a plain-language rationale."""
    prereqs: dict[int, list[int]] = {}
    for edge in edges:
        prereqs.setdefault(edge.skill_id, []).append(edge.prereq_skill_id)

    out: list[Recommendation] = []
    for skill in skills:
        current = mastery_by_skill.get(skill.id)
        if current and current.score >= skill.mastery_threshold and current.evidence_count >= MIN_EVIDENCE_FOR_MODERATE:
            continue
        missing = [
            pid for pid in prereqs.get(skill.id, [])
            if not (mastery_by_skill.get(pid) and mastery_by_skill[pid].score >= 70)  # type: ignore[union-attr]
        ]
        if missing:
            names = {s.id: s.name for s in skills}
            missing_names = ", ".join(names.get(pid, f"skill {pid}") for pid in missing)
            out.append(Recommendation(
                skill_id=skill.id, skill_name=skill.name,
                rationale=f"Strengthen {missing_names} first — {skill.name} builds on it (prerequisite gap).",
                evidence={"missing_prerequisites": missing},
            ))
        elif not current or current.evidence_count == 0:
            out.append(Recommendation(
                skill_id=skill.id, skill_name=skill.name,
                rationale=f"{skill.name} has not been assessed yet — a short diagnostic will establish the baseline.",
                evidence={"reason": "no_evidence"},
            ))
        else:
            out.append(Recommendation(
                skill_id=skill.id, skill_name=skill.name,
                rationale=(
                    f"{skill.name} is at {current.score:.0f}% (threshold {skill.mastery_threshold}%, "
                    f"{current.confidence} confidence) — practise this next to close the gap."
                ),
                evidence={"score": current.score, "threshold": skill.mastery_threshold, "confidence": current.confidence},
            ))
    return out


# ----------------------------------------------------- spaced review plan ---


def schedule_review(score: float, now: datetime) -> str:
    """Spaced repetition: weaker skills review sooner (1/3/7 day intervals)."""
    if score < 50:
        days = 1
    elif score < 75:
        days = 3
    else:
        days = 7
    return (now + timedelta(days=days)).isoformat()


# ------------------------------------------------------------- pre vs post ---


def pre_post_report(pre_scores: dict[int, float], post_scores: dict[int, float], threshold: float) -> dict:
    """Compare pre-test and post-test outcomes, separating participation
    (who attempted) from proficiency (how they scored)."""
    skills = sorted(set(pre_scores) | set(post_scores))
    rows = []
    for skill_id in skills:
        pre = pre_scores.get(skill_id)
        post = post_scores.get(skill_id)
        delta = round(post - pre, 1) if pre is not None and post is not None else None
        rows.append({
            "skill_id": skill_id,
            "pre": pre, "post": post, "delta": delta,
            "improved": bool(delta is not None and delta > 0),
            "meets_threshold_now": bool(post is not None and post >= threshold),
        })
    matched = [r for r in rows if r["delta"] is not None]
    return {
        "rows": rows,
        "matched_skills": len(matched),
        "average_delta": round(sum(r["delta"] for r in matched) / len(matched), 1) if matched else None,
        "note": "Deltas cover only skills assessed in both tests (participation); proficiency is the score itself.",
    }
