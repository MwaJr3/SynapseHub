from datetime import timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import owned
from app.db import get_db, utcnow, utc_iso
from app.errors import AppError
from app.models import Analysis, FlashcardReview, QuizAttempt, User
from app.schemas import QuizSubmit, ReviewInput
from app.security import current_user

router = APIRouter(tags=["Quizzes, flashcards & learning activity"])


@router.post("/analyses/{analysis_id}/quiz/attempts", status_code=201)
def submit_quiz(analysis_id: str, data: QuizSubmit, user: User = Depends(current_user), db: Session = Depends(get_db)):
    record = owned(db, Analysis, analysis_id, user.id)
    questions = (record.guide or {}).get("quiz", [])
    if not questions:
        raise AppError(409, "quiz_unavailable", "This guide does not have revision questions yet.")
    expected = {q["id"] for q in questions}
    if set(data.answers) != expected or any(not a.strip() for a in data.answers.values()):
        raise AppError(
            422, "incomplete_answers", "Respond to every question before submitting. Answers must match this guide's current quiz."
        )
    results, objective_count, correct_count = [], 0, 0
    for q in questions:
        supplied = data.answers[q["id"]].strip()
        objective = q["kind"] in ("multiple_choice", "true_false")
        options = q["options"] if q["kind"] == "multiple_choice" else ["True", "False"]
        if objective and supplied not in options:
            raise AppError(422, "invalid_answer", "Choose one of the provided answer options.")
        correct = supplied == q["answer"] if objective else None
        objective_count += int(objective)
        correct_count += int(correct is True)
        results.append(
            {
                "id": q["id"],
                "question": q["question"],
                "submitted": supplied,
                "correct": correct,
                "answer": q["answer"],
                "explanation": q["explanation"],
                "refs": q["refs"],
            }
        )
    score = round(correct_count / objective_count * 100, 1) if objective_count else None
    result = {
        "questions": results,
        "objective_count": objective_count,
        "correct_count": correct_count,
        "score": score,
        "notice": "Only multiple-choice and true/false questions are automatically graded. Open-ended responses are self-assessed against the source; activity does not demonstrate mastery.",
    }
    attempt = QuizAttempt(user_id=user.id, analysis_id=record.id, answers=data.answers, result=result, score=score)
    db.add(attempt)
    db.commit()
    return {"id": attempt.id, **result, "created_at": utc_iso(attempt.created_at)}


@router.get("/analyses/{analysis_id}/quiz/attempts")
def attempts(analysis_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned(db, Analysis, analysis_id, user.id)
    return [
        {"id": a.id, "score": a.score, "result": a.result, "created_at": utc_iso(a.created_at)}
        for a in db.scalars(
            select(QuizAttempt)
            .where(QuizAttempt.analysis_id == analysis_id, QuizAttempt.user_id == user.id)
            .order_by(QuizAttempt.created_at.desc())
            .limit(20)
        )
    ]


def latest_review_map(db: Session, user_id: str, analysis_id: str | None = None):
    query = select(FlashcardReview).where(FlashcardReview.user_id == user_id)
    if analysis_id:
        query = query.where(FlashcardReview.analysis_id == analysis_id)
    latest = {}
    for review in db.scalars(query.order_by(FlashcardReview.created_at.desc())):
        latest.setdefault((review.analysis_id, review.card_id), review)
    return latest


@router.get("/flashcards")
def flashcards(
    analysis_id: str | None = None,
    due_only: bool = False,
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0, le=10000),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = select(Analysis).where(Analysis.user_id == user.id, Analysis.status.in_(["complete", "partial"]))
    if analysis_id:
        owned(db, Analysis, analysis_id, user.id)
        query = query.where(Analysis.id == analysis_id)
    latest = latest_review_map(db, user.id, analysis_id)
    cards = []
    for analysis in db.scalars(query.order_by(Analysis.updated_at.desc())):
        for card in (analysis.guide or {}).get("flashcards", []):
            review = latest.get((analysis.id, card["id"]))
            due = not review or review.due_at <= utcnow()
            if due_only and not due:
                continue
            cards.append(
                {
                    **card,
                    "analysis_id": analysis.id,
                    "guide_title": analysis.title,
                    "due": due,
                    "due_at": utc_iso(review.due_at) if review else None,
                    "last_rating": review.rating if review else None,
                }
            )
    return {"items": cards[offset : offset + limit], "total": len(cards), "due_count": sum(c["due"] for c in cards)}


@router.post("/analyses/{analysis_id}/flashcards/review", status_code=201)
def review_card(analysis_id: str, data: ReviewInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    analysis = owned(db, Analysis, analysis_id, user.id)
    if not any(c["id"] == data.card_id for c in (analysis.guide or {}).get("flashcards", [])):
        raise AppError(404, "card_not_found", "This flashcard no longer exists. Reload the guide.")
    latest = db.scalar(
        select(FlashcardReview)
        .where(FlashcardReview.user_id == user.id, FlashcardReview.analysis_id == analysis.id, FlashcardReview.card_id == data.card_id)
        .order_by(FlashcardReview.created_at.desc())
        .limit(1)
    )
    previous_interval = latest.interval_days if latest else 0
    interval = (
        0
        if data.rating == "again"
        else (min(30, max(1, round(previous_interval * 1.2))) if data.rating == "hard" else min(60, max(3, previous_interval * 2)))
    )
    due_at = utcnow() + (timedelta(minutes=10) if data.rating == "again" else timedelta(days=interval))
    review = FlashcardReview(
        user_id=user.id, analysis_id=analysis.id, card_id=data.card_id, rating=data.rating, interval_days=interval, due_at=due_at
    )
    db.add(review)
    db.commit()
    return {
        "id": review.id,
        "rating": review.rating,
        "due_at": utc_iso(review.due_at),
        "interval_days": interval,
        "message": "Review recorded. This schedule tracks practice, not mastery.",
    }
