"""Reassessment: a new submission against the one it replaces.

The profile screen already refuses to edit a supplied assessment — a correction
is a new row. Reassessment is the other half of that rule: the same instrument,
answered again, recorded as a *successor* of the earlier submission, with a diff
that shows what actually changed.

Three things this module will not do:

* **Overwrite.** The prior row is archived, never rewritten, and keeps its own
  scores. ``supersedes_id`` on the new row points back at it, so the pair can be
  read in either direction.
* **Invent a delta.** When either side of a comparison is missing, the delta is
  ``None`` and the direction is ``missing`` / ``not_supplied``. "0 → 43" would be a
  fabricated gain of 43 points; the honest statement is that the first report did
  not score that axis.
* **Present the number as measured.** Both rows are self-reports. The diff says
  which side came from a provider report and which was entered by the learner, and
  neither is treated as a test result.

The chain is linear by construction: ``assessments.supersedes_id`` is UNIQUE, so a
submission can be superseded once. Reassessing an already-superseded row is a 409
that names the current row, rather than a fork nobody can compare.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .models import Assessment, AssessmentScore

#: How a comparison's direction is described. Kept as a closed set so the client
#: cannot accidentally render an arrow for a case it does not understand.
DIRECTIONS = ("up", "down", "same", "new", "missing", "not_supplied")


class ReassessmentError(ValueError):
    """Raised when a reassessment would fork the chain or invent data."""

    def __init__(self, message: str, *, current_id: str | None = None) -> None:
        super().__init__(message)
        self.current_id = current_id


def _direction(previous: float | None, new: float | None) -> str:
    if previous is None and new is None:
        return "missing"
    if previous is None:
        return "new"
    if new is None:
        return "not_supplied"
    if new > previous:
        return "up"
    if new < previous:
        return "down"
    return "same"


def _delta(previous: float | None, new: float | None) -> float | None:
    """The difference, or ``None`` when either side does not exist.

    Deliberately not ``(new or 0) - (previous or 0)``: that single expression is
    how a missing score becomes a measured change.
    """
    if previous is None or new is None:
        return None
    return round(new - previous, 4)


def diff_scores(previous: list[dict], new: list[dict]) -> list[dict]:
    """Compare two submissions axis by axis, in the order the instrument lists them.

    Both arguments are ``[{axis, name, value, value_label}]``. Axes present on only
    one side are reported, not dropped: an omission in a reassessment is a change
    in what is claimed, and it has to be visible.
    """
    keyed_previous = {(item["axis"], item["name"]): item for item in previous}
    keyed_new = {(item["axis"], item["name"]): item for item in new}
    order = list(keyed_previous) + [key for key in keyed_new if key not in keyed_previous]

    rows: list[dict] = []
    for axis, name in order:
        before = keyed_previous.get((axis, name))
        after = keyed_new.get((axis, name))
        if before is not None and before.get("value") is None and not before.get("value_label"):
            before = None
        if after is not None and after.get("value") is None and not after.get("value_label"):
            after = None

        previous_value = before.get("value") if before else None
        new_value = after.get("value") if after else None
        previous_label = (before or {}).get("value_label") or ""
        new_label = (after or {}).get("value_label") or ""

        # Categorical results compare as labels; there is no arithmetic to do.
        if previous_label or new_label:
            direction = _direction(None, None)
            if previous_label and new_label:
                direction = "same" if previous_label == new_label else "up"
            elif new_label:
                direction = "new"
            elif previous_label:
                direction = "not_supplied"
            rows.append(
                {
                    "axis": axis,
                    "name": name,
                    "previous": None,
                    "value": None,
                    "delta": None,
                    "previous_label": previous_label,
                    "new_label": new_label,
                    "direction": direction,
                }
            )
            continue

        rows.append(
            {
                "axis": axis,
                "name": name,
                "previous": previous_value,
                "value": new_value,
                "delta": _delta(previous_value, new_value),
                "previous_label": "",
                "new_label": "",
                "direction": _direction(previous_value, new_value),
            }
        )
    return rows


def summarise_changes(rows: list[dict]) -> dict:
    """Counts that describe the diff without overstating it."""
    comparable = [row for row in rows if row["delta"] is not None]
    return {
        "axes": len(rows),
        "moved": sum(1 for row in rows if row["direction"] in ("up", "down")),
        "up": sum(1 for row in rows if row["direction"] == "up"),
        "down": sum(1 for row in rows if row["direction"] == "down"),
        "unchanged": sum(1 for row in rows if row["direction"] == "same"),
        "newly_supplied": sum(1 for row in rows if row["direction"] == "new"),
        "withdrawn": sum(1 for row in rows if row["direction"] == "not_supplied"),
        "missing": sum(1 for row in rows if row["direction"] == "missing"),
        "comparable": len(comparable),
        "mean_delta": round(sum(row["delta"] for row in comparable) / len(comparable), 3) if comparable else None,
        "note": (
            "A delta is only computed where both submissions supplied a number. "
            "Missing stays missing: it is never counted as zero, and a newly supplied "
            "axis is not a gain."
        ),
    }


def chain_for(db: Session, assessment_id: str, *, limit: int = 20) -> list[Assessment]:
    """The submission and everything that replaced it, oldest first."""
    head = db.get(Assessment, assessment_id)
    if head is None:
        return []

    # Walk back to the first submission, guarding against a cycle even though the
    # self-reference check should make one impossible.
    seen = {head.id}
    current: Assessment = head
    while current.supersedes_id:
        parent = db.get(Assessment, current.supersedes_id)
        if parent is None or parent.id in seen:
            break
        seen.add(parent.id)
        current = parent

    # Then forward from the first. The forward pass keeps its own set: walking
    # back already recorded the row we started from, and reusing that set here
    # stopped the chain at its first link (caught by the three-submission test).
    chain: list[Assessment] = []
    visited: set[str] = set()
    while current is not None and len(chain) < limit and current.id not in visited:
        chain.append(current)
        visited.add(current.id)
        current = (
            db.query(Assessment)
            .filter(
                Assessment.supersedes_id == current.id,
                Assessment.user_id == current.user_id,
            )
            .first()
        )
    return chain


def scores_of(db: Session, assessment_ids: list[str]) -> dict[str, list[AssessmentScore]]:
    if not assessment_ids:
        return {}
    grouped: dict[str, list[AssessmentScore]] = {}
    for row in db.query(AssessmentScore).filter(AssessmentScore.assessment_id.in_(assessment_ids)).all():
        grouped.setdefault(row.assessment_id, []).append(row)
    return grouped


def replacement_of(db: Session, assessment_id: str) -> Assessment | None:
    return db.query(Assessment).filter(Assessment.supersedes_id == assessment_id).first()


def create_reassessment(
    db: Session,
    *,
    user_id: str,
    previous: Assessment,
    label: str,
    reported_by: str,
    source_url: str,
    source_note: str,
    administered_on: str,
    scale_min: float | None,
    scale_max: float | None,
    scores: list[dict],
) -> Assessment:
    """Store the successor and archive its predecessor, in that order.

    The caller has already validated the scores against the instrument and checked
    ownership. What is enforced here is the chain: no second successor, no
    reassessment of an archived-and-superseded row, and no cross-learner link.
    """
    existing = replacement_of(db, previous.id)
    if existing is not None:
        raise ReassessmentError(
            "This submission has already been reassessed; reassess the newer row instead.",
            current_id=existing.id,
        )
    if previous.archived_at is not None:
        raise ReassessmentError(
            "This submission was retired, not superseded. Reassess the live submission it belongs to.",
        )

    stamp = datetime.now(timezone.utc).isoformat()[:10]
    row = Assessment(
        user_id=user_id,
        instrument=previous.instrument,
        label=label or previous.label,
        reported_by=reported_by,
        source_url=source_url,
        source_note=source_note,
        administered_on=administered_on,
        scale_min=previous.scale_min if scale_min is None else scale_min,
        scale_max=previous.scale_max if scale_max is None else scale_max,
        supersedes_id=previous.id,
    )
    db.add(row)
    db.flush()  # need `row.id` for the archive reason below

    for score in scores:
        db.add(
            AssessmentScore(
                assessment_id=row.id,
                axis=str(score.get("axis", "")),
                name=str(score.get("name", "")),
                value=score.get("value"),
                value_label=str(score.get("value_label", "") or ""),
                note=str(score.get("note", "") or ""),
            )
        )

    previous.archived_at = datetime.now(timezone.utc)
    previous.archive_reason = f"Superseded by reassessment {row.id} on {stamp}."
    db.commit()
    db.refresh(row)
    return row
