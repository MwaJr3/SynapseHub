from app.db import utc_iso
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.errors import AppError
from app.models import Analysis, ProcessingTask, Transcript


def owned(db: Session, model, record_id: str, user_id: str):
    record = db.scalar(select(model).where(model.id == record_id, model.user_id == user_id))
    if record is None:
        raise AppError(
            404,
            "not_found",
            "This record was not found in your workspace. It may have been deleted or your guest session may have expired.",
        )
    return record


def transcript_dict(record: Transcript):
    return {
        "id": record.id,
        "title": record.title,
        "source_type": record.source_type,
        "source_url": record.source_url,
        "video_id": record.video_id,
        "metadata": record.metadata_json,
        "language": record.language,
        "text": record.text,
        "original_text": record.original_text,
        "segments": record.segments,
        "original_segments": record.original_segments,
        "version": record.version,
        "created_at": utc_iso(record.created_at),
    }


def analysis_dict(record: Analysis, full=True):
    output = {
        "id": record.id,
        "transcript_id": record.transcript_id,
        "title": record.title,
        "config": record.config,
        "status": record.status,
        "error": record.error,
        "is_saved": record.is_saved,
        "folder": record.folder,
        "tags": record.tags,
        "revision": record.revision,
        "created_at": utc_iso(record.created_at),
        "updated_at": utc_iso(record.updated_at),
    }
    if full:
        output.update({"guide": record.guide, "notes": record.notes, "processed_chunks": len(record.checkpoints)})
    return output


def task_dict(task: ProcessingTask):
    return {
        "id": task.id,
        "analysis_id": task.analysis_id,
        "kind": task.kind,
        "status": task.status,
        "message": task.message,
        "result": task.result,
        "error_code": task.error_code,
        "completed_units": task.completed_units,
        "total_units": task.total_units,
        "created_at": utc_iso(task.created_at),
    }
