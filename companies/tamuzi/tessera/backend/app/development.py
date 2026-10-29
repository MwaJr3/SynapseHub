"""Stage 7: learner development — the document's Phase I, built as software.

Four rules shape this module, and each of them exists because the alternative is a
plausible lie.

**A hypothesis is not a finding.** The diagnostic supplied scores; it did not
supply conclusions. Everything inferred from them is stored as a *claim* with the
evidence it rests on, a confidence label derived from that evidence, and a sentence
saying what would contradict it. Confidence is computed by
:func:`confidence_for` from the kinds of evidence actually present — never typed in
by hand, so "high confidence" cannot be asserted about a learner with one
self-report and no behaviour.

**Missing stays missing.** Self-management was never scored. Its development
record therefore starts as a *question*, and the module's answer is a behavioural
baseline — nine self-report items and one timed observation — that produces prose
and counts. There is no percentage anywhere in this file, by design, and the
database table has no column that could hold one.

**Named methods are undefined until a source says otherwise.** Nine methods arrive
as names without definitions. They are exposed as `undefined`, with the learning
problem each appears to address and an openly supported alternative. No definition
is stored, so none can be served.

**A conclusion needs a sample.** An experiment can be recorded from the first
observation, but it cannot be marked `supported` or `no_change` until at least
``MIN_SAMPLE`` comparable cases exist. The refusal says so in a sentence rather
than silently upgrading a sample of one.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import development_content as content
from . import models, profile

#: Evidence kinds, strongest last. `assessment` is what an instrument reported;
#: everything after it is something the learner did.
EVIDENCE_KINDS = ("assessment", "attempt", "session", "observation", "retrieval")
BEHAVIOURAL_KINDS = frozenset({"attempt", "session", "observation", "retrieval"})

#: Below this, an experiment may record what happened but not conclude from it.
MIN_SAMPLE = 5


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


# ------------------------------------------------------------------- confidence


def confidence_for(evidence: list[dict]) -> tuple[str, str]:
    """Derive a confidence label from the evidence present, and say why.

    The policy is stated rather than tuned, because it is a policy and not a
    psychometric result:

    ``none``
        Nothing recorded. This is a question, not a hypothesis.
    ``low``
        A supplied self-report score and nothing else. Someone said so; nobody
        watched.
    ``moderate``
        A score plus at least one behavioural record, or two independent
        behavioural kinds without a score.
    ``high``
        A score plus two behavioural kinds, or three behavioural kinds. The claim
        now rests on something the learner did, repeatedly, in more than one form.
    """
    kinds = {entry.get("kind") for entry in evidence if isinstance(entry, dict)}
    kinds &= set(EVIDENCE_KINDS)
    behavioural = kinds & BEHAVIOURAL_KINDS
    has_score = "assessment" in kinds

    if not kinds:
        return "none", "No evidence has been recorded for this claim yet."
    if not behavioural:
        return "low", "It rests on a supplied score alone — a report, not an observation."
    if len(behavioural) == 1:
        if has_score:
            return "moderate", "It rests on a supplied score and one kind of recorded behaviour."
        return "low", "It rests on one kind of recorded behaviour, with no score to compare it to."
    if len(behavioural) == 2:
        if has_score:
            return "high", "It rests on a supplied score and two kinds of recorded behaviour."
        return "moderate", "It rests on two kinds of recorded behaviour, with no score involved."
    return "high", "It rests on three or more kinds of recorded behaviour."


def evidence_inventory(db: Session, user_id: str) -> dict[str, int]:
    """What behavioural and reported evidence exists for this learner."""
    assessment_scores = (
        db.query(models.AssessmentScore)
        .join(models.Assessment, models.Assessment.id == models.AssessmentScore.assessment_id)
        .filter(
            models.Assessment.user_id == user_id,
            models.Assessment.archived_at.is_(None),
            models.AssessmentScore.value.isnot(None),
        )
        .count()
    )
    return {
        "assessment": assessment_scores,
        "attempt": db.query(models.Attempt).filter(models.Attempt.user_id == user_id).count(),
        "session": db.query(models.LearningSession)
        .filter(models.LearningSession.user_id == user_id)
        .count(),
        "observation": db.query(models.SelfManagementBaseline)
        .filter(models.SelfManagementBaseline.user_id == user_id)
        .count(),
        "retrieval": db.query(models.RetrievalAttempt)
        .filter(models.RetrievalAttempt.user_id == user_id)
        .count(),
    }


def _area_evidence(inventory: dict[str, int], *, has_score: bool) -> list[dict]:
    """The evidence list a hypothesis for one area starts from.

    Only kinds that exist are included: an empty count is not evidence, and
    listing it would inflate the confidence label.
    """
    entries: list[dict] = []
    if has_score and inventory.get("assessment", 0):
        entries.append({"kind": "assessment", "count": inventory["assessment"]})
    for kind in ("retrieval", "attempt", "session", "observation"):
        if inventory.get(kind, 0):
            entries.append({"kind": kind, "count": inventory[kind]})
    return entries


# ------------------------------------------------------------------ the model


def _core_areas() -> list[dict]:
    areas: list[dict] = []
    for dimension in content.DIMENSIONS:
        areas.append(
            {
                "scope": "dimension",
                "key": dimension["key"],
                "name": dimension["name"],
                "reported": dimension["reported"],
                "goal": dimension["goal"],
            }
        )
    for process in content.PROCESSES:
        areas.append(
            {
                "scope": "process",
                "key": process["key"],
                "name": process["name"],
                "reported": process["reported"],
                "goal": process["trains"],
            }
        )
    return areas


def _suggested_claim(area: dict, score: dict | None, lowest: str | None) -> dict:
    """A candidate hypothesis, written from what is actually known.

    Deliberately phrased as something to test. It is offered, never stored: the
    learner accepts it, edits it or writes their own.
    """
    name = area["name"]
    if score is None:
        return {
            "scope": area["scope"],
            "key": area["key"],
            "claim": (
                f"No score was supplied for {name}, so whether it is a development "
                f"target is unknown. The open question is what would count as evidence."
            ),
            "rationale": (
                "The instrument did not report this axis. A missing score is not a low "
                "score, and treating it as one would invent a weakness."
            ),
            "support": [f"A behavioural record that depends on {name} goes better or worse than expected."],
            "contradict": [f"Repeated performance that shows no difficulty with {name}."],
            "kind": "question",
        }
    value = score.get("value")
    if value == 0:
        return {
            "scope": area["scope"],
            "key": area["key"],
            "claim": (
                f"The instrument reported {value} for {name} — a supplied zero, not a "
                f"missing value. The question is what currently happens in its place."
            ),
            "rationale": (
                "A zero from an instrument usually means the behaviour was not observed, "
                "not that it cannot occur. The useful step is to watch what is done instead."
            ),
            "support": [f"A recorded attempt at {name} that produces nothing usable."],
            "contradict": [f"An observed instance of {name} that worked, which would mean the zero described a habit rather than a capacity."],
            "kind": "question",
        }
    relative = (
        f" It is the lowest supplied score in its group, which makes it the first thing worth testing."
        if lowest == area["key"]
        else ""
    )
    return {
        "scope": area["scope"],
        "key": area["key"],
        "claim": (
            f"{name} is reported at {value} and is likely the first constraint on work "
            f"that depends on it.{relative}"
        ),
        "rationale": (
            "A supplied self-report score locates the question; it does not answer it. "
            "This claim needs behaviour before it can be trusted."
        ),
        "support": [f"Evidence of {name} failing under unsupported conditions."],
        "contradict": [f"Evidence of {name} succeeding when it is actually required."],
        "kind": "claim",
    }


def model_payload(db: Session, user: models.User) -> dict:
    """The provisional learner model: what is known, inferred, and still open."""
    axes, _missing = profile.core_evidence(db, user.id)
    scores = {
        (axis["axis"], axis["name"]): axis["score"] for axis in axes if not axis["missing"]
    }
    # `core_evidence` labels axes by display name; the model works by key.
    score_for_key = {}
    for dimension in content.DIMENSIONS + content.PROCESSES:  # type: ignore[operator]
        label = dimension["name"]
        for (axis, name), score in scores.items():
            if name == label:
                score_for_key[dimension["key"]] = score
        if dimension["reported"] is None:
            score_for_key.pop(dimension["key"], None)

    inventory = evidence_inventory(db, user.id)
    stored = {row.key: row for row in db.query(models.DevelopmentHypothesis).filter(
        models.DevelopmentHypothesis.user_id == user.id
    )}

    areas = _core_areas()
    by_group: dict[str, list[int]] = {"dimension": [], "process": []}
    for area in areas:
        score = score_for_key.get(area["key"])
        if score is not None and score.get("value") is not None:
            by_group[area["scope"]].append(area["key"])
    lowest = {}
    for scope, keys in by_group.items():
        if keys:
            lowest[scope] = min(
                keys, key=lambda key: score_for_key[key]["value"]  # type: ignore[index]
            )

    rendered = []
    for area in areas:
        score = score_for_key.get(area["key"])
        suggestion = _suggested_claim(area, score, lowest.get(area["scope"]))
        row = stored.get(area["key"])
        rendered.append(
            {
                **area,
                "score": score,
                "missing": score is None,
                "suggestion": suggestion,
                "hypothesis": serialize_hypothesis(row) if row else None,
            }
        )

    return {
        "caveats": [
            "Everything here is provisional. A hypothesis is a claim to test, not a finding.",
            "A missing score is not a low score. It is an absence of evidence, recorded as one.",
            "Confidence is computed from the kinds of evidence present, not chosen by hand.",
            "No composite, average or 'learning score' is computed across these areas.",
        ],
        "confidence_policy": {
            "none": "No evidence recorded.",
            "low": "A supplied score alone.",
            "moderate": "A score plus one kind of recorded behaviour, or two behavioural kinds.",
            "high": "A score plus two behavioural kinds, or three or more behavioural kinds.",
        },
        "evidence": inventory,
        "areas": rendered,
    }


def serialize_hypothesis(row: models.DevelopmentHypothesis) -> dict:
    return {
        "id": row.id,
        "scope": row.scope,
        "key": row.key,
        "claim": row.claim,
        "rationale": row.rationale,
        "confidence": row.confidence,
        "support": list(row.support or []),
        "contradict": list(row.contradict or []),
        "evidence": list(row.evidence or []),
        "status": row.status,
        "review_note": row.review_note,
        "reviewed_at": _aware(row.reviewed_at).isoformat() if row.reviewed_at else None,
        "created_at": _aware(row.created_at).isoformat() if row.created_at else None,
    }


def _known_area(scope: str, key: str) -> dict:
    for area in _core_areas():
        if area["scope"] == scope and area["key"] == key:
            return area
    raise HTTPException(status_code=422, detail=f"Unknown {scope}: {key}")


def upsert_hypothesis(
    db: Session,
    user: models.User,
    *,
    scope: str,
    key: str,
    claim: str,
    rationale: str = "",
    support: list[str] | None = None,
    contradict: list[str] | None = None,
) -> models.DevelopmentHypothesis:
    """Create or replace the claim for one area, recomputing its confidence."""
    _known_area(scope, key)
    claim = claim.strip()
    if len(claim) < 12:
        raise HTTPException(
            status_code=422,
            detail="A hypothesis has to be a claim someone could test, not a label.",
        )

    axes, _missing = profile.core_evidence(db, user.id)
    has_score = any(
        not axis["missing"]
        and axis["score"] is not None
        and axis["score"].get("value") is not None
        and axis["name"] == _known_area(scope, key)["name"]
        for axis in axes
    )
    evidence = _area_evidence(evidence_inventory(db, user.id), has_score=has_score)
    confidence, because = confidence_for(evidence)

    row = (
        db.query(models.DevelopmentHypothesis)
        .filter(
            models.DevelopmentHypothesis.user_id == user.id,
            models.DevelopmentHypothesis.scope == scope,
            models.DevelopmentHypothesis.key == key,
        )
        .one_or_none()
    )
    if row is None:
        row = models.DevelopmentHypothesis(user_id=user.id, scope=scope, key=key)
        db.add(row)
    row.claim = claim
    row.rationale = rationale.strip()
    row.support = [item for item in (support or []) if item.strip()]
    row.contradict = [item for item in (contradict or []) if item.strip()]
    row.evidence = evidence
    row.confidence = confidence
    row.updated_at = utcnow()
    try:
        db.commit()
    except IntegrityError as error:  # pragma: no cover - the unique constraint is the guard
        db.rollback()
        raise HTTPException(status_code=409, detail="A hypothesis already exists for this area.") from error
    db.refresh(row)
    row_because = because  # surfaced by the route
    setattr(row, "_because", row_because)
    return row


def refresh_confidence(db: Session, user: models.User) -> int:
    """Recompute every hypothesis's confidence from the evidence that now exists.

    Called after work that produces new evidence, so a claim quietly becomes
    better supported — or stops being — without anyone editing it. This is the
    document's "update it after practice", implemented literally.
    """
    axes, _missing = profile.core_evidence(db, user.id)
    names_with_scores = {
        axis["name"]
        for axis in axes
        if not axis["missing"] and axis["score"] is not None and axis["score"].get("value") is not None
    }
    inventory = evidence_inventory(db, user.id)
    changed = 0
    for row in (
        db.query(models.DevelopmentHypothesis)
        .filter(models.DevelopmentHypothesis.user_id == user.id)
        .all()
    ):
        area = _known_area(row.scope, row.key)
        evidence = _area_evidence(inventory, has_score=area["name"] in names_with_scores)
        confidence, _because = confidence_for(evidence)
        if evidence != list(row.evidence or []) or confidence != row.confidence:
            row.evidence = evidence
            row.confidence = confidence
            changed += 1
    if changed:
        db.commit()
    return changed


def review_hypothesis(
    db: Session,
    user: models.User,
    hypothesis_id: str,
    *,
    status: str,
    note: str,
) -> models.DevelopmentHypothesis:
    if status not in ("open", "supported", "contradicted"):
        raise HTTPException(status_code=422, detail="Status must be open, supported or contradicted.")
    row = (
        db.query(models.DevelopmentHypothesis)
        .filter(
            models.DevelopmentHypothesis.id == hypothesis_id,
            models.DevelopmentHypothesis.user_id == user.id,
        )
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="No such hypothesis.")
    if status != "open" and not note.strip():
        # "Supported" with no reason is exactly the unfalsifiable claim the field
        # exists to prevent.
        raise HTTPException(
            status_code=422,
            detail="Record what moved this claim, so a later review can disagree with you.",
        )
    row.status = status
    row.review_note = note.strip()
    row.reviewed_at = utcnow()
    db.commit()
    db.refresh(row)
    return row


# ------------------------------------------------------- self-management baseline


def baseline_payload(row: models.SelfManagementBaseline | None) -> dict | None:
    if row is None:
        return None
    return {
        "id": row.id,
        "items": list(row.items or []),
        "observation": dict(row.observation or {}),
        "summary": row.summary,
        "created_at": _aware(row.created_at).isoformat() if row.created_at else None,
        # Stated in the payload rather than left to the reader to notice.
        "score": None,
        "score_note": (
            "No score is calculated. These answers are a description you can compare "
            "with your own later, not a measurement of a person."
        ),
    }


def _validate_items(items: list[dict]) -> list[dict]:
    expected = {item["key"]: item for item in content.BASELINE_ITEMS}
    seen: dict[str, dict] = {}
    for entry in items:
        key = str(entry.get("key", ""))
        if key not in expected:
            raise HTTPException(status_code=422, detail=f"Unknown baseline item: {key}")
        if key in seen:
            raise HTTPException(status_code=422, detail=f"Baseline item answered twice: {key}")
        answer = str(entry.get("answer", "")).strip().lower()
        if answer not in expected[key]["options"]:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Answer for '{key}' must be one of: "
                    + ", ".join(expected[key]["options"])
                ),
            )
        seen[key] = {"key": key, "prompt": expected[key]["prompt"], "answer": answer}
    missing = [key for key in expected if key not in seen]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=(
                "A partial baseline is not a baseline. Still unanswered: " + ", ".join(missing)
            ),
        )
    return [seen[item["key"]] for item in content.BASELINE_ITEMS]


def _validate_observation(raw: dict) -> dict:
    task = str(raw.get("task", "")).strip()
    if not task:
        raise HTTPException(
            status_code=422,
            detail="The observation needs the task you intended to do.",
        )
    numbers: dict[str, int] = {}
    for field in ("planned_minutes", "actual_minutes", "started_after_minutes", "interruptions", "resumed_after_minutes"):
        value = raw.get(field)
        if isinstance(value, bool) or not isinstance(value, int):
            raise HTTPException(status_code=422, detail=f"'{field}' must be a whole number of minutes or a count.")
        if value < 0 or value > 1440:
            raise HTTPException(status_code=422, detail=f"'{field}' is outside a plausible day.")
        numbers[field] = value
    finished = raw.get("finished")
    if not isinstance(finished, bool):
        raise HTTPException(status_code=422, detail="'finished' must be true or false.")
    return {
        "task": task,
        "finished": finished,
        **numbers,
    }


def _baseline_summary(items: list[dict], observation: dict, previous: models.SelfManagementBaseline | None) -> str:
    """Prose and counts. No percentage, no total, no tier."""
    frequent = [item for item in items if item["answer"] in ("most days", "every day")]
    rare = [item for item in items if item["answer"] == "never"]
    parts = [
        f"{len(frequent)} of {len(items)} statements were answered 'most days' or "
        f"'every day'; {len(rare)} {'was' if len(rare) == 1 else 'were'} answered 'never'.",
    ]
    if frequent:
        parts.append(
            "Already happening: " + ", ".join(item["key"] for item in frequent) + "."
        )
    if rare:
        parts.append("Not happening at all: " + ", ".join(item["key"] for item in rare) + ".")
    parts.append(
        f"In the observed session you planned {observation['planned_minutes']} minutes, "
        f"worked {observation['actual_minutes']}, started {observation['started_after_minutes']} "
        f"minutes after intending to, and were interrupted {observation['interruptions']} "
        f"time(s); the longest interruption cost {observation['resumed_after_minutes']} minutes "
        f"of re-entry. The objective was {'met' if observation['finished'] else 'not met'}."
    )
    if previous is not None:
        before = {item["key"]: item["answer"] for item in (previous.items or [])}
        order = ["never", "sometimes", "most days", "every day"]
        moved_up, moved_down = [], []
        for item in items:
            old = before.get(item["key"])
            if old in order and item["answer"] in order:
                delta = order.index(item["answer"]) - order.index(old)
                if delta > 0:
                    moved_up.append(item["key"])
                elif delta < 0:
                    moved_down.append(item["key"])
        if moved_up or moved_down:
            parts.append(
                "Compared with the previous baseline: "
                + (f"higher on {', '.join(moved_up)}. " if moved_up else "")
                + (f"lower on {', '.join(moved_down)}." if moved_down else "")
            )
    parts.append("No score is calculated from these answers, by design.")
    return " ".join(part.strip() for part in parts)


def create_baseline(db: Session, user: models.User, *, items: list[dict], observation: dict) -> models.SelfManagementBaseline:
    clean_items = _validate_items(items)
    clean_observation = _validate_observation(observation)
    previous = (
        db.query(models.SelfManagementBaseline)
        .filter(models.SelfManagementBaseline.user_id == user.id)
        .order_by(models.SelfManagementBaseline.created_at.desc())
        .first()
    )
    row = models.SelfManagementBaseline(
        user_id=user.id,
        items=clean_items,
        observation=clean_observation,
        summary=_baseline_summary(clean_items, clean_observation, previous),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    refresh_confidence(db, user)
    return row


# ------------------------------------------------------------------ curriculum


def _progress_map(db: Session, user_id: str) -> dict[str, models.LessonProgress]:
    return {
        row.lesson_slug: row
        for row in db.query(models.LessonProgress)
        .filter(models.LessonProgress.user_id == user_id)
        .all()
    }


def curriculum_payload(db: Session, user: models.User) -> dict:
    progress = _progress_map(db, user.id)
    lessons = []
    for lesson in content.LESSONS:
        row = progress.get(lesson["slug"])
        lessons.append(
            {
                "slug": lesson["slug"],
                "title": lesson["title"],
                "group": lesson["group"],
                "group_title": content.GROUP_TITLES[lesson["group"]],
                "topics": [
                    {"key": key, "title": content.TOPIC_TITLES[key]} for key in lesson["topics"]
                ],
                "model": lesson["model"],
                "when_to_use": lesson["when_to_use"],
                "when_not_to_use": lesson["when_not_to_use"],
                "worked_example": lesson["worked_example"],
                "exercise": lesson["exercise"],
                "judging_results": lesson["judging_results"],
                "traps": lesson["traps"],
                "retrieval_check": {
                    "question": lesson["retrieval_check"][0],
                    "criteria": list(lesson["retrieval_check"][1]),
                },
                "state": row.state if row else "not_started",
                "criteria_met": list(row.criteria_met or []) if row else [],
                "studied_at": _aware(row.studied_at).isoformat() if row and row.studied_at else None,
                "practised_at": _aware(row.practised_at).isoformat() if row and row.practised_at else None,
            }
        )
    counts = {"practised": 0, "retrieval_passed": 0}
    for lesson in lessons:
        if lesson["state"] in ("practised", "retrieval_passed"):
            counts["practised"] += 1
        if lesson["state"] == "retrieval_passed":
            counts["retrieval_passed"] += 1
    return {
        "lessons": lessons,
        "progress": {
            "total": len(lessons),
            **counts,
            "groups": {
                group: {
                    "title": title,
                    "topics": [title_ for _key, title_ in content.TOPICS[group]],
                    "lessons": sum(1 for lesson in lessons if lesson["group"] == group),
                }
                for group, title in content.GROUP_TITLES.items()
            },
        },
        "named_methods": [dict(method) for method in content.NAMED_METHODS],
        "dimensions": [dict(item) for item in content.DIMENSIONS],
        "processes": [dict(item) for item in content.PROCESSES],
    }


def _lesson_or_404(slug: str) -> content.Lesson:
    lesson = content.lesson_by_slug(slug)
    if lesson is None:
        raise HTTPException(status_code=404, detail="No such lesson.")
    return lesson


def _row_for(db: Session, user: models.User, slug: str) -> models.LessonProgress:
    row = (
        db.query(models.LessonProgress)
        .filter(
            models.LessonProgress.user_id == user.id,
            models.LessonProgress.lesson_slug == slug,
        )
        .one_or_none()
    )
    if row is None:
        row = models.LessonProgress(user_id=user.id, lesson_slug=slug)
        db.add(row)
    return row


def mark_studied(db: Session, user: models.User, slug: str) -> models.LessonProgress:
    _lesson_or_404(slug)
    row = _row_for(db, user, slug)
    if row.studied_at is None:
        row.studied_at = utcnow()
    if row.state == "not_started":
        row.state = "studied"
    db.commit()
    db.refresh(row)
    return row


def mark_practised(db: Session, user: models.User, slug: str, note: str = "") -> models.LessonProgress:
    _lesson_or_404(slug)
    row = _row_for(db, user, slug)
    if row.state in ("studied", "not_started"):
        row.state = "practised"
    if row.studied_at is None:
        row.studied_at = utcnow()
    row.practised_at = utcnow()
    if note.strip():
        row.note = note.strip()
    db.commit()
    db.refresh(row)
    refresh_confidence(db, user)
    return row


def submit_retrieval(
    db: Session,
    user: models.User,
    slug: str,
    *,
    answer: str,
    criteria_met: list[int],
) -> tuple[models.LessonProgress, bool]:
    """Record a retrieval check. Passing requires the learner to have met every criterion.

    The marking is self-assessment because the criteria are prose. That is stated
    in the payload rather than hidden: a keyword match pretending to be a grade
    would be the fake integration this product refuses.
    """
    lesson = _lesson_or_404(slug)
    if len(answer.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="A retrieval check needs an answer produced from memory, not a placeholder.",
        )
    criteria = lesson["retrieval_check"][1]
    for index in criteria_met:
        if not isinstance(index, int) or index < 0 or index >= len(criteria):
            raise HTTPException(status_code=422, detail="Criterion index out of range.")

    row = _row_for(db, user, slug)
    row.retrieval_answer = answer.strip()
    row.criteria_met = sorted(set(criteria_met))
    row.retrieval_at = utcnow()
    passed = len(row.criteria_met) == len(criteria)
    row.state = "retrieval_passed" if passed else "practised"
    if row.practised_at is None:
        row.practised_at = utcnow()
    db.commit()
    db.refresh(row)
    refresh_confidence(db, user)
    return row, passed


# -------------------------------------------------------------------- protocol


def protocol_payload(row: models.LearningProtocol | None) -> dict:
    sections = dict(row.sections or {}) if row else {}
    examples = dict(row.material_examples or {}) if row else {}
    missing_sections = [key for key, _label in content.PROTOCOL_SECTIONS if not str(sections.get(key, "")).strip()]
    missing_examples = [key for key, _label in content.MATERIAL_TYPES if not str(examples.get(key, "")).strip()]
    return {
        "id": row.id if row else None,
        "version": row.version if row else 0,
        "sections": [
            {
                "key": key,
                "label": label,
                "text": str(sections.get(key, "")),
                "missing": key in missing_sections,
            }
            for key, label in content.PROTOCOL_SECTIONS
        ],
        "material_examples": [
            {
                "key": key,
                "label": label,
                "guidance": content.MATERIAL_GUIDANCE[key],
                "text": str(examples.get(key, "")),
                "missing": key in missing_examples,
            }
            for key, label in content.MATERIAL_TYPES
        ],
        "complete": not missing_sections and not missing_examples,
        "missing": missing_sections + missing_examples,
        "updated_at": _aware(row.created_at).isoformat() if row and row.created_at else None,
    }


def save_protocol(
    db: Session,
    user: models.User,
    *,
    sections: dict[str, str],
    material_examples: dict[str, str],
) -> models.LearningProtocol:
    allowed_sections = {key for key, _label in content.PROTOCOL_SECTIONS}
    allowed_examples = {key for key, _label in content.MATERIAL_TYPES}
    unknown = set(sections) - allowed_sections
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown protocol sections: {', '.join(sorted(unknown))}")
    unknown_examples = set(material_examples) - allowed_examples
    if unknown_examples:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown material types: {', '.join(sorted(unknown_examples))}",
        )

    clean_sections = {key: str(value).strip() for key, value in sections.items() if str(value).strip()}
    clean_examples = {
        key: str(value).strip() for key, value in material_examples.items() if str(value).strip()
    }
    if not clean_sections and not clean_examples:
        raise HTTPException(status_code=422, detail="An empty protocol would erase the previous one.")

    previous = (
        db.query(models.LearningProtocol)
        .filter(models.LearningProtocol.user_id == user.id)
        .order_by(models.LearningProtocol.version.desc())
        .first()
    )
    for row in db.query(models.LearningProtocol).filter(
        models.LearningProtocol.user_id == user.id,
        models.LearningProtocol.is_current.is_(True),
    ):
        row.is_current = False

    row = models.LearningProtocol(
        user_id=user.id,
        version=(previous.version + 1) if previous else 1,
        sections=clean_sections,
        material_examples=clean_examples,
        is_current=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def current_protocol(db: Session, user: models.User) -> models.LearningProtocol | None:
    return (
        db.query(models.LearningProtocol)
        .filter(
            models.LearningProtocol.user_id == user.id,
            models.LearningProtocol.is_current.is_(True),
        )
        .order_by(models.LearningProtocol.version.desc())
        .first()
    )


# ----------------------------------------------------------------- experiments


def serialize_experiment(row: models.DevelopmentExperiment) -> dict:
    premature = row.sample_size < MIN_SAMPLE and row.outcome in ("pending", "weak_signal")
    return {
        "id": row.id,
        "technique": row.technique,
        "hypothesis": row.hypothesis,
        "predicted": row.predicted,
        "measure": row.measure,
        "sample_size": row.sample_size,
        "observed": row.observed,
        "outcome": row.outcome,
        "created_at": _aware(row.created_at).isoformat() if row.created_at else None,
        "observed_at": _aware(row.observed_at).isoformat() if row.observed_at else None,
        "caveat": (
            f"Fewer than {MIN_SAMPLE} cases. This records what happened; it does not "
            f"establish a difference between techniques."
            if premature
            else ""
        ),
    }


def create_experiment(
    db: Session,
    user: models.User,
    *,
    technique: str,
    hypothesis: str,
    predicted: str,
    measure: str,
) -> models.DevelopmentExperiment:
    if not technique.strip() or not hypothesis.strip():
        raise HTTPException(
            status_code=422,
            detail="An experiment needs a technique and a hypothesis it is testing.",
        )
    if not measure.strip():
        # Written before the result exists, or it is a description of the result.
        raise HTTPException(
            status_code=422,
            detail="Write how the result will be judged before you observe it.",
        )
    row = models.DevelopmentExperiment(
        user_id=user.id,
        technique=technique.strip()[:120],
        hypothesis=hypothesis.strip(),
        predicted=predicted.strip(),
        measure=measure.strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def observe_experiment(
    db: Session,
    user: models.User,
    experiment_id: str,
    *,
    observed: str,
    outcome: str,
    sample_size: int,
) -> models.DevelopmentExperiment:
    if outcome not in ("pending", "weak_signal", "no_change", "supported", "abandoned"):
        raise HTTPException(status_code=422, detail="Unknown outcome.")
    if sample_size < 0 or sample_size > 10000:
        raise HTTPException(status_code=422, detail="Sample size is outside a plausible range.")
    row = (
        db.query(models.DevelopmentExperiment)
        .filter(
            models.DevelopmentExperiment.id == experiment_id,
            models.DevelopmentExperiment.user_id == user.id,
        )
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="No such experiment.")
    if outcome in ("supported", "no_change") and sample_size < MIN_SAMPLE:
        raise HTTPException(
            status_code=422,
            detail=(
                f"'{outcome}' is a conclusion, and {sample_size} case(s) cannot support one. "
                f"Record it as 'weak_signal', or add cases until you have {MIN_SAMPLE}."
            ),
        )
    if outcome != "pending" and not observed.strip():
        raise HTTPException(status_code=422, detail="Record what you actually observed.")
    row.observed = observed.strip()
    row.outcome = outcome
    row.sample_size = sample_size
    row.observed_at = utcnow() if outcome != "pending" else None
    db.commit()
    db.refresh(row)
    return row


def experiments_payload(db: Session, user: models.User) -> dict:
    rows = (
        db.query(models.DevelopmentExperiment)
        .filter(models.DevelopmentExperiment.user_id == user.id)
        .order_by(models.DevelopmentExperiment.created_at.desc())
        .all()
    )
    return {
        "experiments": [serialize_experiment(row) for row in rows],
        "min_sample": MIN_SAMPLE,
        "rule": (
            f"An outcome of 'supported' or 'no_change' needs at least {MIN_SAMPLE} comparable "
            "cases. Below that, record 'weak_signal' — the observation is still worth keeping, "
            "and it is not a conclusion."
        ),
    }


# ------------------------------------------------------------------ Phase I gate


def gate(db: Session, user: models.User) -> dict:
    """What is still missing before this stage can be called complete.

    Reported rather than enforced: a learner can work in any order, and a locked
    screen would be a worse teacher than a list of what is outstanding.
    """
    model = model_payload(db, user)
    curriculum = curriculum_payload(db, user)
    baseline = baseline_payload(
        db.query(models.SelfManagementBaseline)
        .filter(models.SelfManagementBaseline.user_id == user.id)
        .order_by(models.SelfManagementBaseline.created_at.desc())
        .first()
    )
    protocol = protocol_payload(current_protocol(db, user))
    experiments = experiments_payload(db, user)

    missing_areas = [area["name"] for area in model["areas"] if area["hypothesis"] is None]
    supplied = [area["name"] for area in model["areas"] if area["score"] is not None]
    unexplained = [
        area["name"]
        for area in model["areas"]
        if area["score"] is not None
        and (
            area["hypothesis"] is None
            or not any(entry.get("kind") == "assessment" for entry in area["hypothesis"]["evidence"])
        )
    ]
    unpractised = [lesson["title"] for lesson in curriculum["lessons"] if lesson["state"] == "not_started"]
    unchecked = [
        lesson["title"]
        for lesson in curriculum["lessons"]
        if lesson["state"] != "retrieval_passed"
    ]

    requirements = [
        {
            "key": "model",
            "label": "A documented learner model for all ten areas, with confidence labels",
            "done": not missing_areas,
            "detail": (
                "Every dimension and process carries a claim or an explicit open question."
                if not missing_areas
                else f"{len(missing_areas)} area(s) have no recorded claim: {', '.join(missing_areas[:4])}"
            ),
            "missing": missing_areas,
        },
        {
            "key": "diagnostics",
            "label": "Every supplied diagnostic score is explained, not restated",
            # "All supplied scores are cited" is vacuously true for a learner who
            # supplied none, which would report a deliverable as met before any
            # evidence existed. The requirement therefore also needs a score to
            # exist: with none, Phase I has a genuine gap rather than a pass.
            "done": bool(supplied) and not unexplained,
            "detail": (
                "Each area that has a score carries that score as its evidence."
                if supplied and not unexplained
                else (
                    "No diagnostic result has been recorded yet, so there is nothing to "
                    "explain. Take the instrument, or record why it is unavailable."
                    if not supplied
                    else f"Scores exist without being cited: {', '.join(unexplained[:4])}"
                )
            ),
            "missing": unexplained if supplied else ["diagnostic result"],
        },
        {
            "key": "baseline",
            "label": "A self-management behavioural baseline, with no score invented",
            "done": baseline is not None,
            "detail": (
                "Nine self-report items and one timed observation are recorded."
                if baseline
                else "Not recorded. Self-management is still unmeasured, which is honest but incomplete."
            ),
            "missing": [] if baseline else ["baseline"],
        },
        {
            "key": "curriculum",
            "label": f"All {curriculum['progress']['total']} lessons worked through",
            "done": not unpractised,
            "detail": (
                f"{curriculum['progress']['practised']} of {curriculum['progress']['total']} practised."
                if unpractised
                else "Every lesson has been practised."
            ),
            "missing": unpractised,
        },
        {
            "key": "retrieval",
            "label": "A retrieval check passed for every lesson",
            "done": not unchecked,
            "detail": (
                f"{curriculum['progress']['retrieval_passed']} of {curriculum['progress']['total']} passed."
                if unchecked
                else "Every lesson's retrieval check has been passed."
            ),
            "missing": unchecked,
        },
        {
            "key": "protocol",
            "label": "A personal learning protocol, complete, with all four material types",
            "done": bool(protocol["complete"]),
            "detail": (
                "All sections and all four material examples are written."
                if protocol["complete"]
                else f"{len(protocol['missing'])} part(s) still empty."
            ),
            "missing": protocol["missing"],
        },
        {
            "key": "experiments",
            "label": "At least one experiment designed to test the protocol",
            "done": bool(experiments["experiments"]),
            "detail": (
                f"{len(experiments['experiments'])} experiment(s) recorded."
                if experiments["experiments"]
                else "No experiment recorded, so the protocol has no plan to be tested."
            ),
            "missing": [] if experiments["experiments"] else ["experiment"],
        },
    ]
    done = sum(1 for item in requirements if item["done"])
    return {
        "requirements": requirements,
        "done": done,
        "total": len(requirements),
        "ready": done == len(requirements),
        "note": (
            "Not a lock. Work in any order; this is a list of what Phase I still needs."
            if not (done == len(requirements))
            else "Phase I deliverables are present. The document's gate also asks for acknowledgement."
        ),
    }
