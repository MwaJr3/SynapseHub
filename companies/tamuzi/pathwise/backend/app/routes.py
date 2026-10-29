"""PathWise HTTP routes: auth, skills, questions, assessments, mastery, recommendations."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, core, security
from .database import get_db
from .models import (
    Assessment, AssessmentQuestion, Assignment, Attempt, Mastery, Question, Recommendation, Response as ResponseRow,
    Skill, SkillEdge, User,
)

router = APIRouter()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    return security.require_user(db, token)


def require_role(user: User, *roles: str) -> User:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Your role cannot perform this action.")
    return user


# ----------------------------------------------------------------- auth -----


class RegisterBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    display_name: str = ""
    role: str = "learner"

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        if "@" not in v or v.startswith("@") or v.endswith("@") or "." not in v.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return v.lower()


class LoginBody(BaseModel):
    email: str
    password: str


def _session_response(user: User, response: Response, db: Session) -> dict:
    token = security.create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=config.SESSION_MAX_AGE_SECONDS)
    return {"id": user.id, "email": user.email, "display_name": user.display_name, "role": user.role}


@router.post("/api/auth/register")
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    if body.role not in ("learner", "teacher", "admin"):
        raise HTTPException(status_code=400, detail="Role must be learner, teacher or admin.")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(email=body.email.lower(), display_name=body.display_name or body.email.split("@")[0],
                password_hash=security.hash_password(body.password), role=body.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _session_response(user, response, db)


@router.post("/api/auth/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return _session_response(user, response, db)


@router.post("/api/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(config.SESSION_COOKIE)
    if token:
        security.destroy_session(db, token)
    response.delete_cookie(config.SESSION_COOKIE)
    return {"ok": True}


@router.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email, "display_name": user.display_name, "role": user.role}


# ----------------------------------------------------------------- skills ---


class SkillBody(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    mastery_threshold: int = Field(default=70, ge=0, le=100)
    prereq_ids: list[int] = Field(default_factory=list)


@router.get("/api/skills")
def list_skills(user: User = Depends(current_user), db: Session = Depends(get_db)):
    skills = db.query(Skill).all()
    edges = db.query(SkillEdge).all()
    return [
        {"id": s.id, "name": s.name, "description": s.description, "mastery_threshold": s.mastery_threshold,
         "prereq_ids": [e.prereq_skill_id for e in edges if e.skill_id == s.id]}
        for s in skills
    ]


@router.post("/api/skills")
def create_skill(body: SkillBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "teacher")
    if db.query(Skill).filter(Skill.name == body.name).first():
        raise HTTPException(status_code=409, detail="Skill name already exists.")
    skill = Skill(name=body.name, description=body.description, mastery_threshold=body.mastery_threshold)
    db.add(skill)
    db.flush()
    for pid in body.prereq_ids:
        if db.get(Skill, pid) is None:
            raise HTTPException(status_code=404, detail=f"Prerequisite skill {pid} not found.")
        db.add(SkillEdge(skill_id=skill.id, prereq_skill_id=pid))
    db.commit()
    return {"id": skill.id}


# ------------------------------------------------------ questions/assessments ---


class QuestionBody(BaseModel):
    skill_id: int
    kind: str
    prompt: str = Field(min_length=1)
    choices: list[str] = Field(default_factory=list)
    answer: object
    rubric: str = ""


class AssessmentBody(BaseModel):
    title: str = Field(min_length=1)
    kind: str = Field(pattern="^(diagnostic|formative|practice|posttest)$")
    version: str = "1.0"
    question_ids: list[int] = Field(default_factory=list)


@router.post("/api/questions")
def create_question(body: QuestionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "teacher")
    if body.kind not in ("mcq", "multi", "numeric", "tf", "short"):
        raise HTTPException(status_code=400, detail="Unsupported question kind.")
    if db.get(Skill, body.skill_id) is None:
        raise HTTPException(status_code=404, detail="Skill not found.")
    question = Question(skill_id=body.skill_id, kind=body.kind, prompt=body.prompt,
                        choices_json=json.dumps(body.choices), answer_json=json.dumps(body.answer), rubric=body.rubric)
    db.add(question)
    db.commit()
    return {"id": question.id}


@router.post("/api/assessments")
def create_assessment(body: AssessmentBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "teacher")
    assessment = Assessment(title=body.title, kind=body.kind, version=body.version)
    db.add(assessment)
    db.flush()
    for position, qid in enumerate(body.question_ids):
        if db.get(Question, qid) is None:
            raise HTTPException(status_code=404, detail=f"Question {qid} not found.")
        db.add(AssessmentQuestion(assessment_id=assessment.id, question_id=qid, position=position))
    db.commit()
    return {"id": assessment.id, "version": assessment.version}


@router.get("/api/assessments")
def list_assessments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [
        {"id": a.id, "title": a.title, "kind": a.kind, "version": a.version,
         "question_count": len(a.questions) if hasattr(a, "questions") else db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == a.id).count()}
        for a in db.query(Assessment).filter(Assessment.archived == "no").all()
    ]


@router.get("/api/assessments/{assessment_id}")
def assessment_detail(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    rows = db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == assessment_id).order_by(AssessmentQuestion.position).all()
    return {
        "id": assessment.id, "title": assessment.title, "kind": assessment.kind, "version": assessment.version,
        "questions": [
            {"id": r.question.id, "skill_id": r.question.skill_id, "kind": r.question.kind,
             "prompt": r.question.prompt, "choices": json.loads(r.question.choices_json)}
            for r in rows
        ],
    }


class AttemptBody(BaseModel):
    responses: dict[int, object]


@router.post("/api/assessments/{assessment_id}/attempts")
def submit_attempt(assessment_id: int, body: AttemptBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    rows = db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == assessment_id).all()
    attempt = Attempt(user_id=user.id, assessment_id=assessment.id, assessment_version=assessment.version)
    db.add(attempt)
    db.flush()
    per_skill: dict[int, list[tuple[float, float]]] = {}
    per_question = []
    credits = []
    for row in rows:
        question = row.question
        raw = body.responses.get(question.id, body.responses.get(str(question.id)))
        try:
            credit = core.score_response(question.kind, question.answer_json, raw) if raw is not None else 0.0
        except core.ScoringError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        db.add(ResponseRow(attempt_id=attempt.id, question_id=question.id, skill_id=question.skill_id,
                           answer=json.dumps(raw), score=credit))
        per_skill.setdefault(question.skill_id, []).append((credit, 0.0))
        per_question.append({"question_id": question.id, "skill_id": question.skill_id, "credit": credit,
                             "rubric": question.rubric if question.kind == "short" else ""})
        credits.append(credit)
    attempt.score = round(100.0 * sum(credits) / len(credits), 1) if credits else 0.0

    mastery_updates = {}
    for skill_id, evidence in per_skill.items():
        existing = db.query(Mastery).filter(Mastery.user_id == user.id, Mastery.skill_id == skill_id).first()
        prev_score = existing.score if existing else 0.0
        prev_count = existing.evidence_count if existing else 0
        update = core.update_mastery(prev_score, prev_count, evidence)
        now = datetime.now(timezone.utc)
        if existing:
            existing.score, existing.evidence_count, existing.confidence = update.score, update.evidence_count, update.confidence
            existing.next_review = core.schedule_review(update.score, now)
        else:
            db.add(Mastery(user_id=user.id, skill_id=skill_id, score=update.score,
                           evidence_count=update.evidence_count, confidence=update.confidence,
                           next_review=core.schedule_review(update.score, now)))
        mastery_updates[skill_id] = {"score": update.score, "confidence": update.confidence}

    _refresh_recommendations(db, user)
    db.commit()
    return {"attempt_id": attempt.id, "score": attempt.score, "per_question": per_question,
            "mastery": mastery_updates,
            "note": "Scores reflect this assessment only. Uncertainty is shown when evidence is limited."}


def _refresh_recommendations(db: Session, user: User) -> None:
    skills = db.query(Skill).all()
    edges = db.query(SkillEdge).all()
    mastery_by_skill = {}
    for m in db.query(Mastery).filter(Mastery.user_id == user.id).all():
        mastery_by_skill[m.skill_id] = core.MasteryUpdate(m.score, m.evidence_count, m.confidence)
    db.query(Recommendation).filter(Recommendation.user_id == user.id, Recommendation.status == "open").delete()
    for rec in core.recommend_next(skills, edges, mastery_by_skill):
        db.add(Recommendation(user_id=user.id, skill_id=rec.skill_id, rationale=rec.rationale,
                              evidence_json=json.dumps(rec.evidence)))


@router.get("/api/my/map")
def my_map(user: User = Depends(current_user), db: Session = Depends(get_db)):
    skills = db.query(Skill).all()
    edges = db.query(SkillEdge).all()
    mastery = {m.skill_id: m for m in db.query(Mastery).filter(Mastery.user_id == user.id).all()}
    rows = []
    for skill in skills:
        m = mastery.get(skill.id)
        status = core.mastery_status(m.score if m else 0.0, skill.mastery_threshold, m.evidence_count if m else 0)
        rows.append({
            "skill_id": skill.id, "name": skill.name, "status": status,
            "score": m.score if m else None, "confidence": m.confidence if m else "low",
            "evidence_count": m.evidence_count if m else 0,
            "next_review": m.next_review if m else "",
            "prereq_ids": [e.prereq_skill_id for e in edges if e.skill_id == skill.id],
            "explanation": {
                "mastered": f"Consistent evidence of {skill.name} at or above the {skill.mastery_threshold}% threshold.",
                "developing": f"Evidence for {skill.name} is still below threshold or too limited to be confident.",
                "not_yet_assessed": f"No assessment evidence for {skill.name} yet.",
            }[status],
        })
    return rows


@router.get("/api/my/recommendations")
def my_recommendations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    _refresh_recommendations(db, user)
    db.commit()
    rows = db.query(Recommendation).filter(Recommendation.user_id == user.id).all()
    return [
        {"id": r.id, "skill_id": r.skill_id, "rationale": r.rationale,
         "evidence": json.loads(r.evidence_json), "status": r.status, "override_reason": r.override_reason}
        for r in rows
    ]


class OverrideBody(BaseModel):
    status: str = Field(pattern="^(accepted|overridden)$")
    reason: str = ""


@router.patch("/api/recommendations/{rec_id}")
def override_recommendation(rec_id: int, body: OverrideBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "teacher")
    rec = db.get(Recommendation, rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")
    if body.status == "overridden" and not body.reason.strip():
        raise HTTPException(status_code=400, detail="Overriding a recommendation requires a recorded reason.")
    rec.status = body.status
    rec.override_reason = body.reason
    db.commit()
    return {"id": rec.id, "status": rec.status}


class AssignmentBody(BaseModel):
    user_id: int
    skill_id: int
    note: str = ""
    override_reason: str = ""


@router.post("/api/assignments")
def assign_work(body: AssignmentBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "teacher")
    if db.get(User, body.user_id) is None or db.get(Skill, body.skill_id) is None:
        raise HTTPException(status_code=404, detail="Learner or skill not found.")
    assignment = Assignment(teacher_id=user.id, user_id=body.user_id, skill_id=body.skill_id,
                            note=body.note, override_reason=body.override_reason)
    db.add(assignment)
    db.commit()
    return {"id": assignment.id}


@router.get("/api/reports/pre-post")
def pre_post(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Pre-test vs post-test comparison for THIS learner's evidence."""
    pre: dict[int, float] = {}
    post: dict[int, float] = {}
    attempts = db.query(Attempt).filter(Attempt.user_id == user.id).all()
    for attempt in attempts:
        assessment = db.get(Assessment, attempt.assessment_id)
        bucket = pre if assessment and assessment.kind == "diagnostic" else post if assessment and assessment.kind == "posttest" else None
        if bucket is None:
            continue
        for response in attempt.responses:
            entries = bucket.setdefault(response.skill_id, [])
            # average attempts per skill per phase
            if isinstance(entries, list):
                entries.append(response.score * 100)
    pre_avg = {k: round(sum(v) / len(v), 1) for k, v in pre.items() if v}
    post_avg = {k: round(sum(v) / len(v), 1) for k, v in post.items() if v}
    return core.pre_post_report(pre_avg, post_avg, threshold=70.0)
