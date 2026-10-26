"""Modern features: weighted categories, what-if planner, boundary validation.

DSA notes: all functions are O(n) over the mark/plan inputs; the what-if
solver is a closed-form computation (O(1)) — no search loops.
"""
from __future__ import annotations


class FeatureError(ValueError):
    pass


def apply_weights(subject_scores: dict[str, float], weights: dict[str, float]) -> dict:
    """Weighted overall score. Weights must be positive and sum to 1.0 (±1e-9)."""
    if not subject_scores:
        raise FeatureError("no subject scores provided")
    total_w = sum(weights.get(s, 0.0) for s in subject_scores)
    if abs(total_w - 1.0) > 1e-9:
        raise FeatureError(f"weights for the given subjects must sum to 1.0 (got {total_w:.4f})")
    weighted = 0.0
    detail = {}
    for subject, score in subject_scores.items():
        w = weights[subject]
        if w < 0:
            raise FeatureError("weights must be non-negative")
        contribution = round(score * w, 4)
        detail[subject] = {"score": score, "weight": w, "contribution": contribution}
        weighted += contribution
    return {"weighted_score": round(weighted, 2), "detail": detail,
            "note": "Weighted score is computed from the provided weights; it is not a prediction."}


def what_if(current_score: float, current_weight: float, target: float, remaining_weight: float) -> dict:
    """What average score is needed on the remaining weight to reach `target`?

    Returns an explicit plan estimate (labelled), with refusals for impossible
    or meaningless inputs instead of optimistic numbers."""
    if not (0 < current_weight < 1) or not (0 < remaining_weight < 1):
        raise FeatureError("weights must be between 0 and 1 (exclusive)")
    if abs(current_weight + remaining_weight - 1.0) > 1e-9:
        raise FeatureError("current_weight + remaining_weight must equal 1.0")
    needed = (target - current_score * current_weight) / remaining_weight
    return {"needed_average_on_remaining": round(needed, 2),
            "classification": "PLAN ESTIMATE",
            "feasible": 0.0 <= needed <= 100.0,
            "assumptions": ("Assumes the remaining assessments count at the stated weight and are "
                            "scored on the same 0-100 scale. Not a guarantee of the final grade.")}


def validate_boundaries(boundaries: dict[str, float]) -> list[str]:
    """Boundary validation: grade cutoffs must strictly decrease A..F and lie in 0..100."""
    problems = []
    order = [b for b in ("A", "B", "C", "D", "F") if b in boundaries]
    values = [boundaries[b] for b in order]
    for name, value in zip(order, values):
        if not 0 <= value <= 100:
            problems.append(f"{name} boundary {value} outside 0..100")
    for (n1, v1), (n2, v2) in zip(zip(order, values), zip(order[1:], values[1:])):
        if v1 <= v2:
            problems.append(f"boundaries must strictly decrease: {n1}={v1} must be > {n2}={v2}")
    return problems
