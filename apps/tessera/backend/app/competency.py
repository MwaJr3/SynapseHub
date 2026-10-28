"""Competency and analytics: what the answers show, kept apart from the model.

Two different numbers describe a learner's grasp of a concept, and this module
refuses to merge them.

**Evidence** is computed, on read, from the append-only observation tables:
`retrieval_attempts` from stage 3 and `attempts` from the quiz. It is a
description of answers actually given — how many, how strong, how recent, and
whether the server or the learner did the grading.

**Mastery** is the scheduler's stored estimate in `concept_states`. It is a model
that moves on evidence, decays with the forgetting curve, and can be wrong.

Collapsing them into one "competency score" would be the easy thing to do, and it
would hide both of the things a learner needs to know: that an unmeasured concept
is *unknown* rather than weak, and that a stored mastery is a prediction rather
than a result. So this module reports them side by side and never writes a
verdict back into the model.

The rules are deliberately blunt and exported as constants:

* no observation → verdict ``no_evidence`` and ``score`` of ``None``. **Never 0.0**.
  A concept nobody has answered is unmeasured; calling it weak is an invented
  claim, and averaging it into a mean would drag the mean toward a value nothing
  supports.
* evidence ages. Each observation is weighted by the material's half-life of 30
  days as well as by how it was graded (``evidence_weight``), so a correct answer
  from four months ago counts less than the same answer today.
* ``secure`` needs both quantity and quality, and at least one answer the server
  checked: three self-graded recollections are not the same evidence as three
  server-graded ones.
* when the stored mastery and the evidence disagree, that is reported as a
  disagreement with its size — not smoothed away.

Everything here is read-only. There is no ``save`` path and no competency table:
a stored second opinion is just a second source of truth that will drift.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import library, mastery as mastery_mod, profile as profile_mod, srs
from .models import Attempt, Concept, ConceptState, RetrievalAttempt, User

#: How fast an observation loses weight. Thirty days halves it: a verdict is a
#: claim about the learner now, and a term's worth of answers says less about now
#: than last week's answers do.
HALF_LIFE_DAYS = 30.0

#: `secure` requires this much recency-weighted evidence...
SECURE_MIN_EFFECTIVE = 3.0
#: ...at or above this weighted score...
SECURE_MIN_SCORE = 0.8
#: ...and at least one observation the server graded, not the learner.
SECURE_MIN_AUTO = 1

#: `developing` is the lower bar: evidence exists and is not bad.
DEVELOPING_MIN_EFFECTIVE = 1.5
DEVELOPING_MIN_SCORE = 0.6

#: Evidence older than this on a concept that has some is reported as stale,
#: separately from being wrong.
STALE_AFTER_DAYS = 45.0

#: Below this distance the stored mastery and the evidence are treated as
#: agreeing; above it, the difference is reported with its size.
DISAGREEMENT_GAP = 0.25

#: How many gaps the overview returns. The rest exist and are counted.
MAX_GAPS = 12

#: A supplied self-report older than this is worth re-taking, but its age says
#: nothing about whether the number was right.
REASSESS_AFTER_DAYS = 120.0

VERDICTS = ("no_evidence", "emerging", "developing", "secure")


@dataclass(frozen=True)
class Observation:
    """One graded answer, normalised across the two evidence tables."""

    id: str
    source: str  # "quiz" | "retrieval"
    at: datetime
    score: float  # 0..1
    weight: float  # evidence_weight: 1.0 server-graded, 0.5 self-graded
    graded_by: str  # "auto" | "self"
    format: str


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def recency(age_days: float) -> float:
    """Weight of an observation that is `age_days` old: 1 today, 0.5 at 30 days.

    Negative ages (clock skew, a row written a moment in the future) are treated
    as fresh rather than as more than fresh — evidence cannot be worth more than
    a perfect answer.
    """
    return 0.5 ** (max(0.0, age_days) / HALF_LIFE_DAYS)


def summarise(observations: list[Observation], *, now: datetime) -> dict:
    """Quantities and quality of the evidence, with its own confidence.

    `score` is ``None`` — not ``0.0`` — when there is nothing to average. That
    distinction is the whole point of the module, so it is enforced here rather
    than left to each caller.
    """
    count = len(observations)
    if count == 0:
        return {
            "observations": 0,
            "auto": 0,
            "self": 0,
            "effective": 0.0,
            "score": None,
            "confidence": 0.0,
            "recent_score": None,
            "last_observed_at": None,
            "first_observed_at": None,
            "formats": {},
        }

    total_weight = 0.0
    weighted_score = 0.0
    recent_weight = 0.0
    recent_score = 0.0
    formats: dict[str, dict[str, float]] = {}
    auto = 0
    for item in observations:
        age = max(0.0, (now - _aware(item.at)).total_seconds() / 86_400)  # type: ignore[operator]
        weight = item.weight * recency(age)
        total_weight += weight
        weighted_score += weight * item.score
        if age <= HALF_LIFE_DAYS:
            recent_weight += weight
            recent_score += weight * item.score
        if item.graded_by == "auto":
            auto += 1
        bucket = formats.setdefault(item.format, {"attempts": 0.0, "score": 0.0})
        bucket["attempts"] += 1
        bucket["score"] += item.score

    starts = [_aware(item.at) for item in observations if item.at is not None]
    return {
        "observations": count,
        "auto": auto,
        "self": count - auto,
        "effective": round(total_weight, 3),
        # The confidence is a statement about how much has been seen, not about
        # how good the learner is: two answers cannot produce high confidence
        # however correct they were.
        "score": round(weighted_score / total_weight, 4) if total_weight else None,
        "confidence": round(1.0 - pow(2.718281828, -total_weight / SECURE_MIN_EFFECTIVE), 3),
        "recent_score": round(recent_score / recent_weight, 4) if recent_weight else None,
        "last_observed_at": max(starts).isoformat() if starts else None,
        "first_observed_at": min(starts).isoformat() if starts else None,
        "formats": {
            name: {"attempts": int(values["attempts"]), "mean_score": round(values["score"] / values["attempts"], 3)}
            for name, values in sorted(formats.items())
        },
    }


def _plural(value: float) -> str:
    """`1.0 weighted observation`, `2.0 weighted observations`."""
    return "" if abs(value - 1.0) < 1e-9 else "s"


def verdict(evidence: dict, *, now: datetime) -> tuple[str, str]:
    """Label the evidence and say, in words, which numbers produced the label."""
    observations = evidence["observations"]
    if observations == 0:
        return (
            "no_evidence",
            "No graded attempt on this concept yet. Unmeasured is not the same as weak, so no score is shown.",
        )

    effective = evidence["effective"]
    score = evidence["score"] or 0.0
    last = _aware(
        datetime.fromisoformat(evidence["last_observed_at"]) if evidence["last_observed_at"] else None
    )
    age = (now - last).total_seconds() / 86_400 if last else None
    aged = f"; newest is {age:.0f} days old" if age is not None and age >= STALE_AFTER_DAYS else ""

    if (
        effective >= SECURE_MIN_EFFECTIVE
        and score >= SECURE_MIN_SCORE
        and evidence["auto"] >= SECURE_MIN_AUTO
    ):
        return (
            "secure",
            f"{effective:.1f} weighted observation{_plural(effective)} ({evidence['auto']} checked by the server) "
            f"averaging {score:.2f}{aged}.",
        )
    if effective >= DEVELOPING_MIN_EFFECTIVE and score >= DEVELOPING_MIN_SCORE:
        return (
            "developing",
            f"{effective:.1f} weighted observation{_plural(effective)} averaging {score:.2f}{aged}. "
            f"{SECURE_MIN_EFFECTIVE:.1f} weighted observation{_plural(SECURE_MIN_EFFECTIVE)} at {SECURE_MIN_SCORE:.2f} "
            "or better would make it secure.",
        )
    return (
        "emerging",
        f"{effective:.1f} weighted observation{_plural(effective)} averaging {score:.2f}{aged}. "
        "There is evidence, but not yet enough of it, or not good enough, to call this known.",
    )


def disagreement(evidence: dict, mastery: dict | None) -> dict | None:
    """Where the stored model and the answers part company.

    Mastery is a prediction that only *moves* on evidence; it does not collapse
    when the learner stops answering. So a learner who has not practised for half
    a year can hold a high stored mastery with little current evidence. Reporting
    the gap — and which way it points — is more honest than averaging it out.
    """
    if mastery is None or evidence["score"] is None:
        return None
    scale = max(1.0, mastery["scale_max"] - mastery["scale_min"])
    stored = (mastery["value"] - mastery["scale_min"]) / scale
    gap = round(stored - evidence["score"], 4)
    if abs(gap) < DISAGREEMENT_GAP:
        return None
    if gap > 0:
        return {
            "contested": True,
            "gap": gap,
            "direction": "optimistic",
            "reason": (
                f"The stored mastery ({stored * 100:.0f}% of its scale) is {gap * 100:.0f} points above "
                f"the weighted score of the answers ({evidence['score'] * 100:.0f}%). The next review "
                "settles which of them is right."
            ),
        }
    return {
        "contested": True,
        "gap": gap,
        "direction": "conservative",
        "reason": (
            f"The answers ({evidence['score'] * 100:.0f}%) are {-gap * 100:.0f} points above the "
            f"stored mastery ({stored * 100:.0f}% of its scale). The schedule is being more cautious "
            "than your evidence warrants."
        ),
    }


# ------------------------------------------------------------------ gaps
#
# A gap is not "a low number". It is a statement about missing or weak evidence
# with the reason and the action attached, because "Retrieval: 43" tells a learner
# nothing they can do, while "no server-checked answer on this concept yet; one
# multiple-choice attempt is enough to move it" does.


def _gap(kind: str, severity: float, reason: str, action: str, **extra) -> dict:
    return {"kind": kind, "severity": round(min(1.0, max(0.0, severity)), 3), "reason": reason, "action": action, **extra}


def concept_gaps(row: dict, *, now: datetime) -> list[dict]:
    """Every reason this concept is not yet secure, ordered by severity."""
    evidence = row["evidence"]
    concept = {"type": "concept", "concept_id": row["concept_id"], "label": row["title"]}
    gaps: list[dict] = []

    if evidence["observations"] == 0:
        gaps.append(
            _gap(
                "no_evidence",
                0.35,
                "No graded attempt on this concept. It is unmeasured, not weak.",
                "Answer one multiple-choice question or one review prompt on it.",
                **concept,
            )
        )
        return gaps

    if evidence["effective"] < DEVELOPING_MIN_EFFECTIVE:
        gaps.append(
            _gap(
                "thin_evidence",
                0.3,
                f"{evidence['effective']:.1f} weighted observations is below the "
                f"{DEVELOPING_MIN_EFFECTIVE:.1f} needed for a developing verdict"
                + (" — every observation so far was self-graded." if evidence["auto"] == 0 else "."),
                "Practise it again; server-graded formats count double.",
                **concept,
            )
        )

    score = evidence["score"] or 0.0
    if score < DEVELOPING_MIN_SCORE:
        gaps.append(
            _gap(
                "weak",
                0.45 + (DEVELOPING_MIN_SCORE - score) * 0.7,
                f"Weighted score {score:.2f} against a {DEVELOPING_MIN_SCORE:.2f} threshold, "
                f"over {evidence['observations']} observation(s).",
                "Review the material, then practise it in a format the server grades.",
                **concept,
            )
        )

    if evidence["auto"] == 0:
        gaps.append(
            _gap(
                "self_graded_only",
                0.22,
                "Every observation was graded by you. Self-grading is real evidence at half weight, "
                "but nothing here has been checked against the source.",
                "Use a multiple-choice or cloze prompt — the server grades those.",
                **concept,
            )
        )

    last = _aware(datetime.fromisoformat(evidence["last_observed_at"])) if evidence["last_observed_at"] else None
    if last is not None:
        age = (now - last).total_seconds() / 86_400
        if age >= STALE_AFTER_DAYS:
            gaps.append(
                _gap(
                    "stale",
                    0.2,
                    f"No evidence in {age:.0f} days, so the verdict describes a learner who may no longer exist.",
                    "Practise it once to see where you actually are.",
                    **concept,
                )
            )

    compare = disagreement(evidence, row.get("mastery"))
    if compare and compare["direction"] == "optimistic":
        gaps.append(
            _gap(
                "optimistic_mastery",
                0.3 + min(0.4, compare["gap"]),
                compare["reason"],
                "Schedule it now rather than at the stored due date.",
                **concept,
            )
        )
    return gaps


# --------------------------------------------------------------- loading


def observations_for(
    user_id: str,
    *,
    attempts: list[Attempt],
    retrievals: list[RetrievalAttempt],
) -> dict[str, list[Observation]]:
    """Group both evidence tables by concept. Pure, so it is cheap to test."""
    by_concept: dict[str, list[Observation]] = {}
    for attempt in attempts:
        by_concept.setdefault(attempt.concept_id, []).append(
            Observation(
                id=attempt.id,
                source="quiz",
                at=attempt.created_at,
                score=1.0 if attempt.correct else 0.0,
                weight=1.0,
                graded_by="auto",
                format="multiple_choice",
            )
        )
    for retrieval in retrievals:
        by_concept.setdefault(retrieval.concept_id, []).append(
            Observation(
                id=retrieval.id,
                source="retrieval",
                at=retrieval.created_at,
                score=float(retrieval.score),
                weight=float(retrieval.evidence_weight),
                graded_by=retrieval.graded_by,
                format=retrieval.format,
            )
        )
    return by_concept


def _mastery_block(state: ConceptState | None, *, now: datetime) -> dict | None:
    if state is None:
        return None
    last = _aware(state.last_reviewed_at)
    elapsed = max(0.0, (now - last).total_seconds() / 86_400) if last else 0.0
    retained = mastery_mod.decayed_mastery(state.mastery, state.stability_days, elapsed) if last else state.mastery
    next_review = _aware(state.next_review_at)
    return {
        "value": state.mastery,
        "retained": retained,
        "scale_min": 0.0,
        "scale_max": 1.0,
        "tier": mastery_mod.tier(state.mastery),
        "reps": state.reps,
        "lapses": state.lapses,
        "stability_days": round(state.stability_days, 2),
        "last_reviewed_at": last.isoformat() if last else None,
        "next_review_at": next_review.isoformat() if next_review else None,
        # Said on every row so the client cannot present the two numbers as one.
        "source": "scheduler state; it only moves on graded evidence",
    }


def _load(db: Session, user: User) -> tuple[list[Concept], dict[str, list[Observation]], dict[str, ConceptState]]:
    """Four queries for the whole screen, whatever the catalogue size.

    Filtering the evidence by `concept_id IN (...)` would also be correct, but the
    id list grows with the library and eventually becomes the slow part. Every row
    in these tables belongs to the learner already, so the user filter is the whole
    restriction; evidence for a concept they can no longer see simply goes unused.
    """
    concepts = library.visible_concepts(db, user).all()
    visible = {concept.id for concept in concepts}
    attempts = db.query(Attempt).filter(Attempt.user_id == user.id).all()
    retrievals = db.query(RetrievalAttempt).filter(RetrievalAttempt.user_id == user.id).all()
    states = db.query(ConceptState).filter(ConceptState.user_id == user.id).all()

    grouped = {
        concept_id: rows
        for concept_id, rows in observations_for(user.id, attempts=attempts, retrievals=retrievals).items()
        if concept_id in visible
    }
    state_map = {state.concept_id: state for state in states if state.concept_id in visible}
    return concepts, grouped, state_map


def _row(concept: Concept, observations: list[Observation], state: ConceptState | None, *, now: datetime) -> dict:
    evidence = summarise(observations, now=now)
    label, reason = verdict(evidence, now=now)
    mastery_block = _mastery_block(state, now=now)
    row = {
        "concept_id": concept.id,
        "title": concept.title,
        "subject": concept.subject,
        "verdict": label,
        "verdict_reason": reason,
        "evidence": evidence,
        "mastery": mastery_block,
        "disagreement": disagreement(evidence, mastery_block),
    }
    gaps = concept_gaps(row, now=now)
    row["gaps"] = gaps
    row["primary_gap"] = gaps[0] if gaps else None
    return row


def _calibration(db: Session, user: User) -> dict:
    """How well the learner's confidence matches their accuracy.

    Only multiple-choice answers carry a confidence, so retrieval practice cannot
    contribute here — said in the payload rather than left as a mystery empty
    chart.
    """
    rows = db.query(Attempt).filter(Attempt.user_id == user.id).all()
    if not rows:
        return {
            "answered": 0,
            "accuracy": None,
            "mean_confidence": None,
            "overconfidence": None,
            "buckets": [],
            "reason": "No multiple-choice answers yet, so there is no confidence to compare with anything.",
        }
    correct = sum(1 for row in rows if row.correct)
    # Confidence arrives on a 1..5 scale and is normalised to 0..1 so it can be
    # compared with accuracy on the same axis.
    mean_confidence = sum((row.confidence - 1) / 4 for row in rows) / len(rows)
    accuracy = correct / len(rows)
    buckets = []
    for level in range(1, 6):
        in_bucket = [row for row in rows if row.confidence == level]
        if not in_bucket:
            continue
        buckets.append(
            {
                "confidence": level,
                "answered": len(in_bucket),
                "accuracy": round(sum(1 for row in in_bucket if row.correct) / len(in_bucket), 3),
            }
        )
    return {
        "answered": len(rows),
        "accuracy": round(accuracy, 3),
        "mean_confidence": round(mean_confidence, 3),
        "overconfidence": round(mean_confidence - accuracy, 3),
        "buckets": buckets,
        "reason": (
            "Confidence is what you said before answering, accuracy is what happened. A positive gap "
            "means you were more sure than you were right."
        ),
    }


def _axis_gaps(db: Session, user: User) -> list[dict]:
    """Gaps in the *reported* baseline — kept apart from concept evidence.

    A missing axis is a missing input, not a competence of zero; an old self-report
    is a date, not a verdict. Both are returned with the instrument that would fill
    them, so the reassessment form can be opened from the gap.
    """
    axes, _missing = profile_mod.core_evidence(db, user.id)
    instrument_for: dict[tuple[str, str], str] = {}
    for definition in profile_mod.INSTRUMENTS.values():
        for axis in definition.axes:
            instrument_for.setdefault((axis.axis, axis.name), definition.id)

    gaps: list[dict] = []

    # The unscored axes are reported as one gap that lists them rather than one
    # gap each: a fresh account has ten, and ten identical rows would push every
    # piece of practice evidence off the screen. The individual axes and the
    # instrument that would fill each one travel inside the gap.
    unmeasured = [
        {
            "axis": axis["axis"],
            "name": axis["name"],
            "label": axis["label"],
            "instrument": instrument_for.get((axis["axis"], axis["name"])),
        }
        for axis in axes
        if axis["missing"]
    ]
    if unmeasured:
        labels = ", ".join(item["label"] for item in unmeasured)
        gaps.append(
            _gap(
                "unmeasured_axes",
                0.5,
                f"{len(unmeasured)} of {len(axes)} baseline axes have no score ({labels}). "
                "Nothing has been estimated in their place.",
                "Record a result from the instrument, or reassess the report you have.",
                type="axes",
                axes=unmeasured,
            )
        )

    for axis in axes:
        if axis["missing"]:
            continue
        score = axis["score"]
        taken = score.get("administered_on") or ""
        if taken:
            try:
                age = (datetime.now(timezone.utc).date() - datetime.fromisoformat(taken).date()).days
            except ValueError:  # pragma: no cover - validated on write
                age = 0
            if age >= REASSESS_AFTER_DAYS:
                gaps.append(
                    _gap(
                        "stale_report",
                        0.18,
                        f"{axis['label']} comes from a report taken {age} days ago. It is dated, not wrong.",
                        "Reassess it when you have a newer result.",
                        type="axis",
                        axis=axis["axis"],
                        name=axis["name"],
                        label=axis["label"],
                        instrument=score["instrument"],
                        assessment_id=score["assessment_id"],
                        concept_id=None,
                    )
                )
    return gaps


def overview(db: Session, user: User, *, now: datetime | None = None) -> dict:
    """The competency screen in one response: rows, counts, gaps, calibration."""
    now = now or datetime.now(timezone.utc)
    concepts, grouped, states = _load(db, user)
    rows = [
        _row(concept, grouped.get(concept.id, []), states.get(concept.id), now=now) for concept in concepts
    ]

    counts = {
        "concepts": len(rows),
        "with_evidence": sum(1 for row in rows if row["evidence"]["observations"] > 0),
        "without_evidence": sum(1 for row in rows if row["evidence"]["observations"] == 0),
        "observations": sum(row["evidence"]["observations"] for row in rows),
        "server_graded": sum(row["evidence"]["auto"] for row in rows),
        "self_graded": sum(row["evidence"]["self"] for row in rows),
    }
    verdicts = {name: 0 for name in VERDICTS}
    for row in rows:
        verdicts[row["verdict"]] += 1

    axis_gaps = _axis_gaps(db, user)
    concept_gap_list = [gap for row in rows for gap in row["gaps"]]
    # A learner with a fresh account has ten unscored axes. Listing all ten would
    # push every concept gap off the screen, so the reported mix keeps a few axis
    # gaps and then fills with what the practice evidence says. The count is not
    # truncated — `gaps_total` still reports everything that exists.
    all_gaps = sorted(
        axis_gaps[:4] + concept_gap_list, key=lambda gap: (-gap["severity"], gap["kind"])
    )
    total_gaps = len(axis_gaps) + len(concept_gap_list)

    # Secure last: the screen is about what is not yet known, and burying that
    # under ten mastered concepts is how a dashboard stops being read.
    rows.sort(key=lambda row: (row["verdict"] == "secure", -(row["primary_gap"]["severity"] if row["primary_gap"] else 0.0), row["title"]))

    return {
        "as_of": now.isoformat(),
        "policy": (
            "A verdict comes only from graded attempts: the quiz and the retrieval formats. "
            "Mastery is the scheduler's stored estimate and is shown beside it, never merged with it. "
            "A concept with no attempt is unmeasured; it is not scored zero and is not averaged in. "
            f"Evidence halves in weight every {HALF_LIFE_DAYS:.0f} days, and self-graded evidence counts "
            f"at {0.5:.1f} of a server-graded answer."
        ),
        "thresholds": {
            "half_life_days": HALF_LIFE_DAYS,
            "secure_min_effective": SECURE_MIN_EFFECTIVE,
            "secure_min_score": SECURE_MIN_SCORE,
            "developing_min_effective": DEVELOPING_MIN_EFFECTIVE,
            "developing_min_score": DEVELOPING_MIN_SCORE,
            "disagreement_gap": DISAGREEMENT_GAP,
        },
        "counts": counts,
        "verdicts": verdicts,
        "coverage_note": (
            f"{counts['with_evidence']} of {counts['concepts']} visible concepts have at least one graded attempt. "
            f"{counts['without_evidence']} have none and are reported as unmeasured."
        ),
        "calibration": _calibration(db, user),
        "gaps": all_gaps[:MAX_GAPS],
        "gaps_total": total_gaps,
        "concepts": rows,
    }


def detail(db: Session, user: User, concept_id: str, *, now: datetime | None = None) -> dict:
    """One concept, with every observation that produced its verdict."""
    now = now or datetime.now(timezone.utc)
    concept = library.get_concept(db, user, concept_id)
    attempts = db.query(Attempt).filter(Attempt.user_id == user.id, Attempt.concept_id == concept.id).all()
    retrievals = (
        db.query(RetrievalAttempt)
        .filter(RetrievalAttempt.user_id == user.id, RetrievalAttempt.concept_id == concept.id)
        .all()
    )
    state = (
        db.query(ConceptState)
        .filter(ConceptState.user_id == user.id, ConceptState.concept_id == concept.id)
        .first()
    )
    observations = observations_for(user.id, attempts=attempts, retrievals=retrievals).get(concept.id, [])
    row = _row(concept, observations, state, now=now)
    ordered = sorted(observations, key=lambda item: item.at, reverse=True)

    row["observation_log"] = [
        {
            "id": item.id,
            "source": item.source,
            "format": item.format,
            "score": round(item.score, 4),
            "weight": item.weight,
            "graded_by": item.graded_by,
            "at": _aware(item.at).isoformat(),  # type: ignore[union-attr]
            "recency": round(recency(max(0.0, (now - _aware(item.at)).total_seconds() / 86_400)), 4),  # type: ignore[operator]
        }
        for item in ordered
    ]
    row["what_would_change_it"] = (
        [
            f"Reach {SECURE_MIN_EFFECTIVE:.1f} recency-weighted observations at {SECURE_MIN_SCORE:.2f} or "
            "better, with at least one answer the server graded."
        ]
        if row["verdict"] != "secure"
        else []
    )
    row["next_interval_days"] = (
        round(srs.interval_for(state.stability_days), 2) if state is not None else None
    )
    return row
