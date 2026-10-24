"""ChessScope training module: mistake recording and improvement recommendations.

Every recommendation is derived from recorded mistakes in the user's analysed
games — patterns with counts and phases, never vague claims. Classification
comes from the engine tier (inaccuracy/mistake/blunder by eval drop); the
categorisation below is a transparent heuristic for the *theme* of a mistake.
"""
from __future__ import annotations

from dataclasses import dataclass, field

CATEGORIES = ("opening", "tactics", "positional", "endgame", "risky capture", "hanging piece")

PHASES = ("opening", "middlegame", "endgame")

# Honest framing: what a category means and what to practise — written as
# training suggestions, not guarantees.
FOCUS = {
    "hanging piece": (
        "Piece safety (tactics)",
        "Several mistakes involve pieces left attacked and undefended. Before each move, "
        "check which of your pieces become undefended after it. Practice: one-move capture "
        "puzzles focusing on hanging pieces.",
    ),
    "risky capture": (
        "Capture evaluation (tactics)",
        "Some mistakes were captures into squares your opponent could recapture favourably. "
        "Before capturing, count attackers and defenders on the target square. Practice: "
        "exchange-sequence puzzles (SEE-style counting).",
    ),
    "tactics": (
        "Tactical awareness (middlegame)",
        "Mistakes clustered in sharp positions. Practice: forks, pins and discovered-attack "
        "puzzles; after each game, review the moves the engine flagged first.",
    ),
    "opening": (
        "Opening principles",
        "Mistakes occurred in the opening phase. Focus on development, king safety and "
        "central control rather than memorised lines — and review where the evaluation "
        "first dropped.",
    ),
    "endgame": (
        "Endgame technique",
        "Mistakes occurred in simplified positions. Practice: king and pawn endings "
        "(opposition, key squares) and basic checkmates; endgames reward exact play.",
    ),
    "positional": (
        "Positional judgement",
        "Mistakes were not directly tactical. Study pawn-structure weaknesses, piece "
        "activity and prophylactic thinking — and compare your move with the engine's "
        "first suggestion in the reviewed moves below.",
    ),
}


def phase_of(ply: int, material_total: int) -> str:
    """Opening = first 10 plies; endgame = little material left; else middlegame."""
    if ply <= 10:
        return "opening"
    if material_total <= 26:
        return "endgame"
    return "middlegame"


def categorise(flags: list[str], is_capture: bool, phase: str) -> str:
    """Transparent theme heuristic for a classified mistake."""
    joined = " ".join(flags)
    if "hanging" in joined:
        return "hanging piece"
    if "recapture" in joined or "lower-value piece" in joined:
        return "risky capture"
    if phase == "opening":
        return "opening"
    if phase == "endgame":
        return "endgame"
    return "tactics" if is_capture else "positional"


@dataclass
class FocusArea:
    category: str
    title: str
    advice: str
    count: int
    phases: list[str] = field(default_factory=list)


@dataclass
class TrainingPlan:
    total_mistakes: int
    by_classification: dict[str, int]
    by_category: dict[str, int]
    focus_areas: list[FocusArea]
    note: str


def build_plan(mistakes: list[dict]) -> TrainingPlan:
    """Group recorded mistakes and produce ranked improvement suggestions.

    mistakes: dicts with keys classification, category, phase.
    """
    by_classification: dict[str, int] = {}
    by_category: dict[str, int] = {}
    category_phases: dict[str, set[str]] = {}
    for m in mistakes:
        by_classification[m["classification"]] = by_classification.get(m["classification"], 0) + 1
        by_category[m["category"]] = by_category.get(m["category"], 0) + 1
        category_phases.setdefault(m["category"], set()).add(m["phase"])

    focus = []
    for category, count in sorted(by_category.items(), key=lambda kv: -kv[1]):
        title, advice = FOCUS.get(category, FOCUS["positional"])
        focus.append(FocusArea(category=category, title=title, advice=advice, count=count,
                               phases=sorted(category_phases.get(category, set()))))

    return TrainingPlan(
        total_mistakes=len(mistakes),
        by_classification=by_classification,
        by_category=by_category,
        focus_areas=focus,
        note=(
            "Suggestions are derived from patterns in your recorded games. They are training "
            "guidance, not guarantees — and a missed move is never proof of a bad habit on its own."
        ),
    )


def progress_summary(mistakes: list[dict]) -> dict:
    """Mistake density over time (first half vs second half of analysed games)."""
    if not mistakes:
        return {"note": "No recorded mistakes yet — analyse a game with the engine to start tracking."}
    ordered = sorted(mistakes, key=lambda m: m.get("created_at", ""))
    half = len(ordered) // 2 or 1
    early, late = ordered[:half], ordered[half:]
    early_blunders = sum(1 for m in early if m["classification"] == "blunder")
    late_blunders = sum(1 for m in late if m["classification"] == "blunder")
    return {
        "early_blunders": early_blunders,
        "recent_blunders": late_blunders,
        "direction": "improving" if late_blunders < early_blunders else "stable-or-worsening",
        "note": "Counts of recorded blunders in earlier vs later analysed games — a rough signal, not a rating.",
    }
