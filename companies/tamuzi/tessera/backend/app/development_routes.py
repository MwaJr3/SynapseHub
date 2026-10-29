"""Stage 7 over HTTP: the learner model, the curriculum, the baseline, the protocol.

Same conventions as the rest of the API — session cookie for the learner, thin
routes, reasoning in `development.py`. Three endpoint shapes are deliberate:

* **The model is read as a whole.** Splitting dimensions from processes from
  suggestions would let a client render one without the caveats that make it
  honest.
* **A retrieval check is submitted, not just ticked.** The answer body is stored
  verbatim, so a later review can see what "passed" meant.
* **The gate is a GET.** It reports what is missing; it does not block anything.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import config, development
from .database import get_db
from .models import User
from .security import require_user

router = APIRouter(prefix="/api/development", tags=["development"])


def _current(request: Request, db: Session) -> User:
    return require_user(db, request.cookies.get(config.SESSION_COOKIE))


# ------------------------------------------------------------------- the model


@router.get("/model")
def read_model(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    return development.model_payload(db, user)


class HypothesisRequest(BaseModel):
    scope: str = Field(pattern="^(dimension|process)$")
    key: str = Field(min_length=1, max_length=40)
    claim: str = Field(min_length=1, max_length=2000)
    rationale: str = Field(default="", max_length=2000)
    support: list[str] = Field(default_factory=list)
    contradict: list[str] = Field(default_factory=list)


@router.post("/model/hypotheses", status_code=201)
def write_hypothesis(payload: HypothesisRequest, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    row = development.upsert_hypothesis(
        db,
        user,
        scope=payload.scope,
        key=payload.key,
        claim=payload.claim,
        rationale=payload.rationale,
        support=payload.support,
        contradict=payload.contradict,
    )
    return {
        **development.serialize_hypothesis(row),
        "confidence_because": getattr(row, "_because", ""),
    }


class ReviewRequest(BaseModel):
    status: str = Field(pattern="^(open|supported|contradicted)$")
    note: str = Field(default="", max_length=2000)


@router.post("/model/hypotheses/{hypothesis_id}/review")
def review_hypothesis(
    hypothesis_id: str,
    payload: ReviewRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = _current(request, db)
    row = development.review_hypothesis(
        db, user, hypothesis_id, status=payload.status, note=payload.note
    )
    return development.serialize_hypothesis(row)


@router.post("/model/refresh")
def refresh_model(request: Request, db: Session = Depends(get_db)):
    """Recompute confidence from the evidence that now exists."""
    user = _current(request, db)
    changed = development.refresh_confidence(db, user)
    return {"updated": changed}


# ------------------------------------------------------------- the baseline


@router.get("/baseline")
def read_baseline(request: Request, db: Session = Depends(get_db)):
    from .models import SelfManagementBaseline

    user = _current(request, db)
    row = (
        db.query(SelfManagementBaseline)
        .filter(SelfManagementBaseline.user_id == user.id)
        .order_by(SelfManagementBaseline.created_at.desc())
        .first()
    )
    from . import development_content as content

    return {
        "baseline": development.baseline_payload(row),
        "items": [dict(item) for item in content.BASELINE_ITEMS],
        "observation_fields": [dict(zip(("key", "label"), pair)) for pair in content.OBSERVATION_FIELDS],
        "why_no_score": (
            "Self-management was never scored by the instrument. A percentage would "
            "imply a measurement that did not take place; this baseline is a "
            "description you can compare against your own later answers."
        ),
    }


class BaselineRequest(BaseModel):
    items: list[dict]
    observation: dict


@router.post("/baseline", status_code=201)
def record_baseline(payload: BaselineRequest, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    row = development.create_baseline(
        db, user, items=payload.items, observation=payload.observation
    )
    return development.baseline_payload(row)


# ------------------------------------------------------------- the curriculum


@router.get("/curriculum")
def read_curriculum(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    return development.curriculum_payload(db, user)


@router.post("/curriculum/{slug}/study")
def study_lesson(slug: str, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    row = development.mark_studied(db, user, slug)
    return {"slug": row.lesson_slug, "state": row.state}


class PracticeRequest(BaseModel):
    note: str = Field(default="", max_length=4000)


@router.post("/curriculum/{slug}/practice")
def practise_lesson(
    slug: str, payload: PracticeRequest, request: Request, db: Session = Depends(get_db)
):
    user = _current(request, db)
    row = development.mark_practised(db, user, slug, note=payload.note)
    return {"slug": row.lesson_slug, "state": row.state}


class RetrievalRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=8000)
    criteria_met: list[int] = Field(default_factory=list)


@router.post("/curriculum/{slug}/retrieval")
def submit_retrieval(
    slug: str, payload: RetrievalRequest, request: Request, db: Session = Depends(get_db)
):
    user = _current(request, db)
    row, passed = development.submit_retrieval(
        db, user, slug, answer=payload.answer, criteria_met=payload.criteria_met
    )
    lesson = development_content_lesson(slug)
    criteria = lesson["retrieval_check"][1]
    return {
        "slug": row.lesson_slug,
        "state": row.state,
        "passed": passed,
        "criteria_met": list(row.criteria_met),
        "criteria_total": len(criteria),
        "self_assessed": True,
        "note": (
            "Marking is yours: the criteria are prose, and a keyword match is not a grade."
        ),
        "still_open": [text for index, text in enumerate(criteria) if index not in row.criteria_met],
    }


def development_content_lesson(slug: str) -> dict:
    from . import development_content as content

    lesson = content.lesson_by_slug(slug)
    if lesson is None:
        raise HTTPException(status_code=404, detail="No such lesson.")
    return lesson  # type: ignore[return-value]


# --------------------------------------------------------------- the protocol


@router.get("/protocol")
def read_protocol(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    row = development.current_protocol(db, user)
    return development.protocol_payload(row)


class ProtocolRequest(BaseModel):
    sections: dict[str, str] = Field(default_factory=dict)
    material_examples: dict[str, str] = Field(default_factory=dict)


@router.post("/protocol", status_code=201)
def write_protocol(payload: ProtocolRequest, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    row = development.save_protocol(
        db, user, sections=payload.sections, material_examples=payload.material_examples
    )
    return development.protocol_payload(row)


# ------------------------------------------------------------ the experiments


@router.get("/experiments")
def read_experiments(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    return development.experiments_payload(db, user)


class ExperimentRequest(BaseModel):
    technique: str = Field(min_length=1, max_length=120)
    hypothesis: str = Field(min_length=1, max_length=2000)
    predicted: str = Field(default="", max_length=2000)
    measure: str = Field(default="", max_length=2000)


@router.post("/experiments", status_code=201)
def create_experiment(
    payload: ExperimentRequest, request: Request, db: Session = Depends(get_db)
):
    user = _current(request, db)
    row = development.create_experiment(
        db,
        user,
        technique=payload.technique,
        hypothesis=payload.hypothesis,
        predicted=payload.predicted,
        measure=payload.measure,
    )
    return development.serialize_experiment(row)


class ObserveRequest(BaseModel):
    observed: str = Field(default="", max_length=4000)
    outcome: str
    sample_size: int = Field(default=0, ge=0, le=10000)


@router.post("/experiments/{experiment_id}/observe")
def observe_experiment(
    experiment_id: str, payload: ObserveRequest, request: Request, db: Session = Depends(get_db)
):
    user = _current(request, db)
    row = development.observe_experiment(
        db,
        user,
        experiment_id,
        observed=payload.observed,
        outcome=payload.outcome,
        sample_size=payload.sample_size,
    )
    return development.serialize_experiment(row)


# ----------------------------------------------------------------- the gate


@router.get("/gate")
def read_gate(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    return development.gate(db, user)
