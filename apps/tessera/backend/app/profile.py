"""The supplied learner profile: what was measured, by what, and what is missing.

This module is the boundary between "what an instrument reported" and "what this
learner has demonstrated". Mastery lives in `concept_states` and is only ever fed
by graded attempts; nothing here can raise a mastery number. The three rules it
enforces, all pinned by tests:

1. **Missing is not zero.** A score that was never supplied is stored as NULL and
   reported as missing. `retrieval = 0` (a real, supplied score) and
   `self_management = NULL` (never supplied) must never collapse together — the
   first is a development target, the second is an absence of evidence.
2. **A score is a claim, not a measurement of ability.** Every row carries who
   reported it, from which instrument, on what date. The payload ships the
   caveats alongside the numbers so a screen cannot show one without the other.
3. **History is append-only.** Correcting an assessment means adding a row or
   archiving one with a reason. Nothing is silently overwritten, so a later
   review can see what the system believed and why.

The instrument registry below is the only place scores are allowed to come from.
An unknown instrument, an axis that does not belong to the instrument, or a value
outside its scale is rejected rather than stored — a typo would otherwise become
"evidence" no one can trace.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from . import models

AXIS_DIMENSION = "dimension"
AXIS_PROCESS = "process"
AXIS_PREFERENCE = "preference"
AXIS_ATTRIBUTE = "attribute"
AXIS_LABEL = "label"

#: Who entered the numbers. "provider-report" means the learner transcribed a
#: report produced elsewhere, which is weaker evidence than a live instrument.
REPORTED_BY = ("learner", "provider-report")

#: Shown next to the numbers wherever they appear. Kept here, not in the UI, so
#: an API consumer gets them too and they cannot drift apart.
CAVEATS = (
    "These are scores an instrument reported. They are not measurements of "
    "ability, and a low score is a development target rather than a ceiling.",
    "A score that was never supplied stays missing. It is never treated as zero "
    "and the system will not invent one to fill the gap.",
    "Personality and learning-preference labels are context for choosing a "
    "strategy. They are not predictors of performance and never set a limit.",
    "Nothing on this page changes what you have demonstrated. Mastery comes only "
    "from graded answers, separately.",
)


@dataclass(frozen=True)
class Axis:
    axis: str
    name: str
    label: str


def _axes(axis: str, pairs: tuple[tuple[str, str], ...]) -> tuple[Axis, ...]:
    return tuple(Axis(axis, name, label) for name, label in pairs)


#: The five learning dimensions and five learning processes of the iCanStudy
#: diagnostic. These are the axes the rest of the product asks about, so they are
#: named once here and the "what is missing" view is computed from this list.
DIMENSIONS = _axes(
    AXIS_DIMENSION,
    (
        ("mindset", "Mindset"),
        ("self_regulation", "Self-regulation"),
        ("deep_processing", "Deep processing"),
        ("retrieval", "Retrieval"),
        ("self_management", "Self-management"),
    ),
)

PROCESSES = _axes(
    AXIS_PROCESS,
    (
        ("priming", "Priming"),
        ("encoding", "Encoding"),
        ("reference", "Reference"),
        ("retrieval_interleaving", "Retrieval and interleaving"),
        ("overlearning", "Overlearning"),
    ),
)

CORE_AXES = DIMENSIONS + PROCESSES


@dataclass(frozen=True)
class Instrument:
    id: str
    label: str
    axes: tuple[Axis, ...]
    scale_min: float | None
    scale_max: float | None
    #: "number" for scored axes, "label" for categorical results.
    value_kind: str
    note: str = ""


INSTRUMENTS: dict[str, Instrument] = {
    "icanstudy-dimensions": Instrument(
        id="icanstudy-dimensions",
        label="iCanStudy learning dimensions",
        axes=DIMENSIONS,
        scale_min=0.0,
        scale_max=100.0,
        value_kind="number",
        note="Five dimensions the diagnostic scores separately. Self-management was not scored.",
    ),
    "icanstudy-processes": Instrument(
        id="icanstudy-processes",
        label="iCanStudy learning processes",
        axes=PROCESSES,
        scale_min=0.0,
        scale_max=100.0,
        value_kind="number",
        note="Five learning processes. A supplied 0 is a real score, not a missing one.",
    ),
    "vark": Instrument(
        id="vark",
        label="VARK modality preference",
        axes=_axes(
            AXIS_PREFERENCE,
            (
                ("visual", "Visual"),
                ("auditory", "Auditory"),
                ("read_write", "Read/write"),
                ("kinesthetic", "Kinesthetic"),
            ),
        ),
        scale_min=0.0,
        scale_max=100.0,
        value_kind="number",
        note="A preference profile. Learning-style matching is not supported by the evidence.",
    ),
    "fastudy": Instrument(
        id="fastudy",
        label="Fastudy study preferences",
        axes=_axes(
            AXIS_PREFERENCE,
            (
                ("solitary", "Solitary"),
                ("structured", "Structured"),
                ("concrete", "Concrete"),
                ("analytical", "Analytical"),
            ),
        ),
        scale_min=0.0,
        scale_max=100.0,
        value_kind="number",
        note="Preference percentages. Balanced scores mean no strong leaning either way.",
    ),
    "honey-mumford": Instrument(
        id="honey-mumford",
        label="Honey and Mumford orientations",
        axes=_axes(
            AXIS_PREFERENCE,
            (
                ("theorist", "Theorist"),
                ("activist", "Activist"),
                ("reflector", "Reflector"),
                ("pragmatist", "Pragmatist"),
            ),
        ),
        scale_min=0.0,
        scale_max=20.0,
        value_kind="number",
        note="Raw orientation scores on the instrument's own 0–20 scale.",
    ),
    "intellectual-attributes": Instrument(
        id="intellectual-attributes",
        label="Intellectual attributes (supplied assessment)",
        axes=_axes(
            AXIS_ATTRIBUTE,
            (
                ("linguistic", "Linguistic"),
                ("logical_mathematical", "Logical-mathematical"),
                ("spatial", "Spatial"),
                ("musical", "Musical"),
                ("interpersonal", "Interpersonal"),
                ("intrapersonal", "Intrapersonal"),
                ("naturalistic", "Naturalistic"),
                ("kinesthetic", "Kinesthetic"),
            ),
        ),
        scale_min=0.0,
        scale_max=5.0,
        value_kind="number",
        note="Scores from the supplied assessment. Not standardised measures of intelligence.",
    ),
    "self-described": Instrument(
        id="self-described",
        label="Self-described labels",
        axes=_axes(
            AXIS_LABEL,
            (
                ("mbti", "MBTI"),
                ("enneagram", "Enneagram"),
                ("archetype", "Learner archetype"),
            ),
        ),
        scale_min=None,
        scale_max=None,
        value_kind="label",
        note="Self-reported labels. Reflective context only — no score, no bearing on mastery.",
    ),
}


class InvalidAssessment(ValueError):
    """Raised for anything that must not reach storage. Routes turn this into 422."""


def _axis_index(instrument: Instrument) -> dict[tuple[str, str], Axis]:
    return {(axis.axis, axis.name): axis for axis in instrument.axes}


def validate_assessment(
    *,
    instrument: str,
    reported_by: str,
    administered_on: str,
    scale_min: float | None,
    scale_max: float | None,
    scores: list[dict],
) -> None:
    """Reject anything that would store an untraceable or misleading score.

    Raises `InvalidAssessment` with a message meant for the person filling the
    form, not a stack trace.
    """
    definition = INSTRUMENTS.get(instrument)
    if definition is None:
        known = ", ".join(sorted(INSTRUMENTS))
        raise InvalidAssessment(f"unknown instrument {instrument!r}; expected one of: {known}")

    if reported_by not in REPORTED_BY:
        raise InvalidAssessment(f"reported_by must be one of: {', '.join(REPORTED_BY)}")

    if administered_on:
        try:
            when = date.fromisoformat(administered_on)
        except ValueError as error:
            raise InvalidAssessment("administered_on must be an ISO date, e.g. 2026-10-15") from error
        if when > date.today():
            raise InvalidAssessment("administered_on cannot be in the future")

    if definition.value_kind == "number":
        low = definition.scale_min if scale_min is None else scale_min
        high = definition.scale_max if scale_max is None else scale_max
        if low is None or high is None:
            raise InvalidAssessment("this instrument needs a numeric scale")
        if not (math.isfinite(low) and math.isfinite(high)) or low >= high:
            raise InvalidAssessment("scale_min must be a finite number below scale_max")
    else:
        low = high = None

    if not scores:
        raise InvalidAssessment("an assessment needs at least one score, or there is nothing to record")

    allowed = _axis_index(definition)
    seen: set[tuple[str, str]] = set()
    for raw in scores:
        key = (str(raw.get("axis", "")), str(raw.get("name", "")))
        if key not in allowed:
            expected = ", ".join(f"{axis.axis}/{axis.name}" for axis in definition.axes)
            raise InvalidAssessment(
                f"{definition.label} has no axis {key[0]}/{key[1]}; expected one of: {expected}"
            )
        if key in seen:
            raise InvalidAssessment(f"{key[0]}/{key[1]} is listed twice in one assessment")
        seen.add(key)

        value = raw.get("value")
        value_label = str(raw.get("value_label", "") or "").strip()

        if definition.value_kind == "label":
            if value is not None:
                raise InvalidAssessment(
                    f"{allowed[key].label} is categorical; record it as a label, not a number"
                )
            if not value_label:
                raise InvalidAssessment(f"{allowed[key].label} needs a label")
            continue

        if value is None:
            if value_label:
                raise InvalidAssessment(
                    f"{allowed[key].label} is scored; record a number, not a label"
                )
            # Explicitly allowed: an axis the instrument did not score can be
            # included with no value, which stores as NULL and is reported missing.
            continue

        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise InvalidAssessment(f"{allowed[key].label} must be a number")
        numeric = float(value)
        if not math.isfinite(numeric):
            raise InvalidAssessment(f"{allowed[key].label} must be a finite number")
        if low is not None and high is not None and not (low <= numeric <= high):
            raise InvalidAssessment(
                f"{allowed[key].label} is {numeric:g}, outside this instrument's scale of {low:g}–{high:g}"
            )


def effective_scale(instrument: str, scale_min: float | None, scale_max: float | None) -> tuple[float, float]:
    definition = INSTRUMENTS[instrument]
    low = definition.scale_min if scale_min is None else scale_min
    high = definition.scale_max if scale_max is None else scale_max
    return float(low if low is not None else 0.0), float(high if high is not None else 100.0)


def create_assessment(
    db: Session,
    *,
    user_id: str,
    instrument: str,
    label: str = "",
    reported_by: str = "learner",
    source_url: str = "",
    source_note: str = "",
    administered_on: str = "",
    scale_min: float | None = None,
    scale_max: float | None = None,
    scores: list[dict] | None = None,
) -> models.Assessment:
    """Validate, then store. Callers pass raw request data; nothing else may write."""
    scores = scores or []
    validate_assessment(
        instrument=instrument,
        reported_by=reported_by,
        administered_on=administered_on,
        scale_min=scale_min,
        scale_max=scale_max,
        scores=scores,
    )
    low, high = effective_scale(instrument, scale_min, scale_max)
    definition = INSTRUMENTS[instrument]

    row = models.Assessment(
        user_id=user_id,
        instrument=instrument,
        label=label.strip() or definition.label,
        reported_by=reported_by,
        source_url=source_url.strip(),
        source_note=source_note.strip(),
        administered_on=administered_on,
        scale_min=low,
        scale_max=high,
    )
    db.add(row)
    db.flush()

    for raw in scores:
        value = raw.get("value")
        db.add(
            models.AssessmentScore(
                assessment_id=row.id,
                axis=str(raw["axis"]),
                name=str(raw["name"]),
                value=None if value is None else float(value),
                value_label=str(raw.get("value_label", "") or "").strip(),
                note=str(raw.get("note", "") or "").strip(),
            )
        )
    db.commit()
    db.refresh(row)
    return row


def archive_assessment(db: Session, assessment: models.Assessment, reason: str) -> models.Assessment:
    """Retire a row without deleting history. Idempotent."""
    if assessment.archived_at is None:
        assessment.archived_at = datetime.now(timezone.utc)
        assessment.archive_reason = reason.strip()[:300]
        db.commit()
        db.refresh(assessment)
    return assessment


def _sort_key(assessment: models.Assessment, created_at: datetime) -> str:
    """Order by when the assessment was taken, falling back to when it was entered.

    An undated row therefore competes on its entry date instead of being treated
    as infinitely old (which would let a stray row win forever) or infinitely new.
    """
    return assessment.administered_on or created_at.date().isoformat()


def latest_core_scores(db: Session, user_id: str) -> dict[tuple[str, str], dict]:
    """The most recent live score per core axis, with its instrument attached."""
    rows = (
        db.query(models.AssessmentScore, models.Assessment)
        .join(models.Assessment, models.Assessment.id == models.AssessmentScore.assessment_id)
        .filter(
            models.Assessment.user_id == user_id,
            models.Assessment.archived_at.is_(None),
        )
        .all()
    )
    # A row that carries neither a number nor a label records an absence; it must
    # not mask an earlier real score, so it is not a candidate for "latest".
    rows = [pair for pair in rows if pair[0].value is not None or pair[0].value_label]

    ranked = sorted(
        rows,
        key=lambda pair: (_sort_key(pair[1], pair[1].created_at), pair[1].created_at.isoformat()),
        reverse=True,
    )

    latest: dict[tuple[str, str], dict] = {}
    for score, assessment in ranked:
        key = (score.axis, score.name)
        if key in latest:
            continue
        latest[key] = {
            "axis": score.axis,
            "name": score.name,
            "value": score.value,
            "value_label": score.value_label,
            "note": score.note,
            "scale_min": assessment.scale_min,
            "scale_max": assessment.scale_max,
            "instrument": assessment.instrument,
            "instrument_label": INSTRUMENTS[assessment.instrument].label
            if assessment.instrument in INSTRUMENTS
            else assessment.instrument,
            "reported_by": assessment.reported_by,
            "administered_on": assessment.administered_on,
            "assessment_id": assessment.id,
        }
    return latest


def core_evidence(db: Session, user_id: str) -> tuple[list[dict], list[str]]:
    """Every core axis with its latest score or an explicit `missing` marker.

    Returns `(axes, missing_names)`. The missing list is what a later plan may use
    to decide what still needs a baseline — the system never fills a gap with a
    guess to avoid showing one.
    """
    latest = latest_core_scores(db, user_id)
    axes: list[dict] = []
    missing: list[str] = []
    for axis in CORE_AXES:
        found = latest.get((axis.axis, axis.name))
        axes.append(
            {
                "axis": axis.axis,
                "name": axis.name,
                "label": axis.label,
                "missing": found is None,
                "score": found,
            }
        )
        if found is None:
            missing.append(axis.label)
    return axes, missing


def serialize_assessment(row: models.Assessment, scores: list[models.AssessmentScore]) -> dict:
    return {
        "id": row.id,
        "instrument": row.instrument,
        "instrument_label": INSTRUMENTS[row.instrument].label
        if row.instrument in INSTRUMENTS
        else row.instrument,
        "label": row.label,
        "reported_by": row.reported_by,
        "source_url": row.source_url,
        "source_note": row.source_note,
        "administered_on": row.administered_on,
        "scale_min": row.scale_min,
        "scale_max": row.scale_max,
        "archived": row.archived_at is not None,
        "archive_reason": row.archive_reason,
        "created_at": row.created_at.isoformat(),
        "scores": [
            {
                "axis": score.axis,
                "name": score.name,
                "value": score.value,
                "value_label": score.value_label,
                "note": score.note,
            }
            for score in scores
        ],
    }


def profile_payload(db: Session, user: models.User) -> dict:
    profile = db.query(models.LearnerProfile).filter(models.LearnerProfile.user_id == user.id).first()

    assessments = (
        db.query(models.Assessment)
        .filter(models.Assessment.user_id == user.id)
        .order_by(models.Assessment.created_at.desc())
        .all()
    )
    scores_by_assessment: dict[str, list[models.AssessmentScore]] = {}
    if assessments:
        rows = (
            db.query(models.AssessmentScore)
            .filter(models.AssessmentScore.assessment_id.in_([row.id for row in assessments]))
            .all()
        )
        for score in rows:
            scores_by_assessment.setdefault(score.assessment_id, []).append(score)

    axes, missing = core_evidence(db, user.id)

    return {
        "learner": {"email": user.email, "display_name": user.display_name},
        "context": profile.context if profile else "",
        "updated_at": profile.updated_at.isoformat() if profile else None,
        "axes": axes,
        "missing": missing,
        "assessments": [
            serialize_assessment(row, scores_by_assessment.get(row.id, [])) for row in assessments
        ],
        "instruments": instrument_catalogue(),
        "caveats": list(CAVEATS),
    }


def instrument_catalogue() -> list[dict]:
    """The form is built from this, so the client cannot drift from the server."""
    return [
        {
            "id": definition.id,
            "label": definition.label,
            "value_kind": definition.value_kind,
            "scale_min": definition.scale_min,
            "scale_max": definition.scale_max,
            "note": definition.note,
            "axes": [
                {"axis": axis.axis, "name": axis.name, "label": axis.label}
                for axis in definition.axes
            ],
        }
        for definition in INSTRUMENTS.values()
    ]
