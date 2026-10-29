import json
import re
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import analysis_dict, owned, transcript_dict
from app.db import get_db, utc_iso
from app.errors import AppError
from app.models import Analysis, FlashcardReview, QuizAttempt, Transcript, User
from app.security import current_user
from app.services.exports import docx_export, html_export, markdown_export

router = APIRouter(tags=["Exports & portability"])


@router.get("/analyses/{analysis_id}/export")
def export_guide(
    analysis_id: str,
    format: str = Query("markdown", pattern="^(markdown|docx|html|json)$"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    analysis = owned(db, Analysis, analysis_id, user.id)
    if not analysis.guide:
        raise AppError(409, "guide_not_ready", "A generated guide is needed before exporting.")
    transcript = db.get(Transcript, analysis.transcript_id)
    slug = re.sub(r"[^a-zA-Z0-9-]", "-", analysis.title).strip("-")[:70] or "learning-guide"
    if format == "markdown":
        data, media, ext = markdown_export(analysis, transcript), "text/markdown; charset=utf-8", "md"
    elif format == "docx":
        data, media, ext = (
            docx_export(analysis, transcript),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "docx",
        )
    elif format == "html":
        return Response(
            html_export(analysis, transcript),
            media_type="text/html",
            headers={
                "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",
                "Cache-Control": "no-store",
            },
        )
    else:
        attempts = db.scalars(select(QuizAttempt).where(QuizAttempt.user_id == user.id, QuizAttempt.analysis_id == analysis.id)).all()
        reviews = db.scalars(
            select(FlashcardReview).where(FlashcardReview.user_id == user.id, FlashcardReview.analysis_id == analysis.id)
        ).all()
        payload = {
            "format_version": "1.0",
            "initial_analysis_chunks": analysis.checkpoints,
            "chunk_notice": "These are the unabridged validated initial chunk results. The current guide may include later user edits or bounded section regenerations; this is not a full revision history.",
            "analysis": analysis_dict(analysis),
            "transcript": transcript_dict(transcript),
            "quiz_attempts": [{"answers": a.answers, "result": a.result, "created_at": utc_iso(a.created_at)} for a in attempts],
            "flashcard_reviews": [
                {
                    "card_id": r.card_id,
                    "rating": r.rating,
                    "interval_days": r.interval_days,
                    "due_at": utc_iso(r.due_at),
                    "created_at": utc_iso(r.created_at),
                }
                for r in reviews
            ],
        }
        data, media, ext = json.dumps(payload, default=str, indent=2, ensure_ascii=False), "application/json", "json"
    return Response(
        data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{slug}.{ext}"', "Cache-Control": "no-store"}
    )
