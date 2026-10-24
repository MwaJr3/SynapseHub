from copy import deepcopy
from datetime import timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, func, or_, select, update
from sqlalchemy.orm import Session

from app.api.deps import analysis_dict, owned, task_dict
from app.config import get_settings
from app.db import get_db, utcnow
from app.errors import AppError
from app.models import Analysis, FlashcardReview, ProcessingTask, QuizAttempt, Transcript, User
from app.providers.validation import validate_source_refs
from app.schemas import AnalysisCreate, AnalysisEdit, Guide, GuideSection, RegenerateInput, URLInput
from app.security import current_user, expensive_limit, require_account
from app.services.youtube import canonical_url, extract_video_id

router = APIRouter(tags=["Analyses, tasks & library"])


def enforce_quota(db: Session, user: User):
    since = utcnow() - timedelta(days=1)
    count = db.scalar(
        select(func.count())
        .select_from(ProcessingTask)
        .where(ProcessingTask.user_id == user.id, ProcessingTask.created_at > since, ProcessingTask.kind != "retrieve")
    )
    if count >= get_settings().daily_analysis_limit:
        raise AppError(
            429, "daily_limit", "Your daily processing limit was reached. Existing guides remain available; please try again tomorrow."
        )


@router.post("/analyses", status_code=202, dependencies=[Depends(expensive_limit)])
def create_analysis(data: AnalysisCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    transcript = owned(db, Transcript, data.transcript_id, user.id)
    enforce_quota(db, user)
    if get_settings().ai_provider == "local" and data.config.output_language.lower() not in ("english", "en"):
        raise AppError(
            422, "language_not_supported", "Local extractive mode supports English output only. Configure an AI provider for translation."
        )
    if get_settings().ai_provider == "local" and data.config.instructions.strip():
        raise AppError(
            422,
            "instructions_not_supported",
            "Free-form instructions require a configured AI provider; local mode only extracts and organizes the source.",
        )
    record = Analysis(
        user_id=user.id, transcript_id=transcript.id, title=transcript.title, config=data.config.model_dump(), status="queued"
    )
    db.add(record)
    db.flush()
    task = ProcessingTask(
        user_id=user.id, analysis_id=record.id, kind="analyze", message="Transcript accepted. Waiting for the analysis worker."
    )
    db.add(task)
    db.commit()
    return {"analysis": analysis_dict(record), "task": task_dict(task)}


@router.get("/analyses")
def list_analyses(
    q: str = Query("", max_length=200),
    saved: bool | None = None,
    folder: str = Query("", max_length=80),
    tag: str = Query("", max_length=40),
    source: str = Query("", pattern="^(|paste|upload|youtube)$"),
    sort: str = Query("newest", pattern="^(newest|oldest|title)$"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0, le=10000),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = select(Analysis).join(Transcript, Analysis.transcript_id == Transcript.id).where(Analysis.user_id == user.id)
    if saved is not None:
        query = query.where(Analysis.is_saved == saved)
    if q:
        # Escape wildcard characters; search terms aren't SQL expressions.
        term = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        query = query.where(
            or_(
                Analysis.title.ilike(term, escape="\\"),
                Analysis.notes.ilike(term, escape="\\"),
                cast(Analysis.tags, String).ilike(term, escape="\\"),
                cast(Analysis.guide, String).ilike(term, escape="\\"),
            )
        )
    if folder:
        query = query.where(Analysis.folder == folder)
    if tag:
        query = query.where(cast(Analysis.tags, String).ilike('%"' + tag.replace('"', "") + '"%'))
    if source:
        query = query.where(Transcript.source_type == source)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    order = {"newest": Analysis.created_at.desc(), "oldest": Analysis.created_at.asc(), "title": Analysis.title.asc()}[sort]
    items = db.scalars(query.order_by(order).offset(offset).limit(limit)).all()
    records = []
    for a in items:
        t = db.get(Transcript, a.transcript_id)
        records.append(
            {
                **analysis_dict(a, False),
                "source_type": t.source_type,
                "channel": t.metadata_json.get("channel"),
                "card_count": len((a.guide or {}).get("flashcards", [])),
                "section_count": len((a.guide or {}).get("sections", [])),
            }
        )
    all_owned = db.scalars(select(Analysis).where(Analysis.user_id == user.id)).all()
    return {
        "items": records,
        "total": total,
        "folders": sorted({a.folder for a in all_owned if a.folder}),
        "tags": sorted({t for a in all_owned for t in a.tags}),
    }


@router.get("/stats")
def stats(user: User = Depends(current_user), db: Session = Depends(get_db)):
    def count(model):
        return db.scalar(select(func.count()).select_from(model).where(model.user_id == user.id))

    return {
        "guides": count(Analysis),
        "saved": db.scalar(select(func.count()).select_from(Analysis).where(Analysis.user_id == user.id, Analysis.is_saved.is_(True))),
        "quizzes_completed": count(QuizAttempt),
        "cards_reviewed": count(FlashcardReview),
    }


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    analysis = owned(db, Analysis, analysis_id, user.id)
    task = db.scalar(
        select(ProcessingTask).where(ProcessingTask.analysis_id == analysis.id).order_by(ProcessingTask.created_at.desc()).limit(1)
    )
    return {**analysis_dict(analysis), "task": task_dict(task) if task else None}


@router.patch("/analyses/{analysis_id}")
def edit_analysis(analysis_id: str, data: AnalysisEdit, user: User = Depends(current_user), db: Session = Depends(get_db)):
    record = owned(db, Analysis, analysis_id, user.id)
    if record.status in ("queued", "processing"):
        raise AppError(409, "analysis_busy", "Wait until initial analysis finishes before editing.")
    if record.revision != data.revision:
        raise AppError(409, "edit_conflict", "This guide changed in another tab or task. Reload to get the latest version before saving.")
    if data.is_saved:
        require_account(user)
    values = {"revision": data.revision + 1, "updated_at": utcnow()}
    updated = deepcopy(record.guide) if record.guide else None
    if data.section:
        if record.status != "complete":
            raise AppError(
                409,
                "initial_analysis_incomplete",
                "Complete initial analysis before editing generated sections so a retry cannot replace your edits. Personal notes can still be saved.",
            )
        if not updated or not any(section["key"] == data.section.key for section in updated["sections"]):
            raise AppError(422, "section_not_found", "This section does not exist in the guide.")
        old_section = next(section for section in updated["sections"] if section["key"] == data.section.key)
        old_items = {item["id"]: item for item in old_section["items"]}
        edited = data.section.model_dump()
        for item in edited["items"]:
            if old_items.get(item["id"]) != item:
                item["provenance"] = "user_note"
        transcript = db.get(Transcript, record.transcript_id)
        try:
            validate_source_refs(Guide(title=record.title, sections=[GuideSection.model_validate(edited)]), transcript.segments)
        except ValueError as exc:
            raise AppError(422, "invalid_source_reference", str(exc)) from exc
        updated["sections"] = [edited if section["key"] == data.section.key else section for section in updated["sections"]]
        values["guide"] = updated
    for field in ("title", "notes", "is_saved", "folder", "tags"):
        value = getattr(data, field)
        if value is not None:
            values[field] = value.strip() if isinstance(value, str) else value
    if data.title and updated:
        updated["title"] = data.title
        values["guide"] = updated
    changed = db.execute(
        update(Analysis)
        .where(
            Analysis.id == record.id,
            Analysis.user_id == user.id,
            Analysis.revision == data.revision,
            Analysis.status.not_in(["queued", "processing"]),
        )
        .values(**values)
        .execution_options(synchronize_session=False)
    )
    if changed.rowcount != 1:
        db.rollback()
        raise AppError(
            409,
            "edit_conflict",
            "This guide changed while you were saving. Reload to keep the latest version; your changes were not applied.",
        )
    db.commit()
    db.refresh(record)
    return analysis_dict(record)


@router.delete("/analyses/{analysis_id}")
def delete_analysis(analysis_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    record = owned(db, Analysis, analysis_id, user.id)
    transcript_id = record.transcript_id
    db.delete(record)
    db.flush()
    if not db.scalar(select(Analysis.id).where(Analysis.transcript_id == transcript_id)):
        transcript = db.get(Transcript, transcript_id)
        if transcript:
            db.delete(transcript)
    db.commit()
    return {"message": "Guide, study activity, and unused source transcript deleted."}


@router.post("/analyses/{analysis_id}/regenerate", status_code=202, dependencies=[Depends(expensive_limit)])
def regenerate(analysis_id: str, data: RegenerateInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    record = owned(db, Analysis, analysis_id, user.id)
    if record.status != "complete" or not record.guide:
        raise AppError(409, "not_ready", "A completed guide is required before regenerating a section.")
    if record.revision != data.revision:
        raise AppError(409, "edit_conflict", "Reload the guide before regenerating; its saved version changed.")
    if data.section not in ("quiz", "flashcards") and not any(s["key"] == data.section for s in record.guide["sections"]):
        raise AppError(422, "section_not_found", "That section isn't present in this guide.")
    if db.scalar(
        select(ProcessingTask.id).where(ProcessingTask.analysis_id == record.id, ProcessingTask.status.in_(["queued", "processing"]))
    ):
        raise AppError(409, "task_active", "A task is already running for this guide. Please wait for it to finish.")
    enforce_quota(db, user)
    task = ProcessingTask(
        user_id=user.id,
        analysis_id=record.id,
        kind="regenerate",
        payload=data.model_dump(),
        message="Waiting to regenerate the selected section; other sections will be preserved.",
    )
    db.add(task)
    db.commit()
    return task_dict(task)


@router.get("/tasks/{task_id}")
def get_task(task_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return task_dict(owned(db, ProcessingTask, task_id, user.id))


@router.post("/tasks/{task_id}/retry", status_code=202, dependencies=[Depends(expensive_limit)])
def retry(task_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    task = owned(db, ProcessingTask, task_id, user.id)
    if task.status != "failed":
        raise AppError(409, "not_retryable", "Only failed or interrupted tasks can be retried.")
    enforce_quota(db, user)
    if task.analysis_id:
        if db.scalar(
            select(ProcessingTask.id).where(
                ProcessingTask.analysis_id == task.analysis_id, ProcessingTask.status.in_(["queued", "processing"])
            )
        ):
            raise AppError(409, "task_active", "This guide already has a running task.")
        analysis = db.get(Analysis, task.analysis_id)
        if task.kind == "analyze":
            analysis.status, analysis.error = "queued", None
        elif task.payload.get("revision") != analysis.revision:
            raise AppError(409, "edit_conflict", "The guide changed since this task. Start a fresh section regeneration instead.")
    new_task = ProcessingTask(
        user_id=user.id,
        analysis_id=task.analysis_id,
        kind=task.kind,
        payload=task.payload,
        message="Waiting to retry; completed analysis chunks will be reused.",
    )
    db.add(new_task)
    db.commit()
    return task_dict(new_task)


@router.post("/youtube/validate")
def validate_url(data: URLInput, user: User = Depends(current_user)):
    video_id = extract_video_id(data.url)
    return {"video_id": video_id, "source_url": canonical_url(video_id)}


@router.post("/youtube/retrieve", status_code=202, dependencies=[Depends(expensive_limit)])
def retrieve(data: URLInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    video_id = extract_video_id(data.url)
    task = ProcessingTask(
        user_id=user.id,
        kind="retrieve",
        payload={"video_id": video_id, "language": data.language},
        message="URL validated. Waiting to retrieve metadata and check captions access.",
    )
    db.add(task)
    db.commit()
    return task_dict(task)
