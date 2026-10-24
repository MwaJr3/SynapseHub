from pathlib import Path
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from app.api.deps import owned, transcript_dict
from app.config import get_settings
from app.db import get_db
from app.errors import AppError
from app.models import Analysis, Transcript, User
from app.schemas import TextInput, TranscriptEdit
from app.security import current_user
from app.services.transcripts import cleanup, parse_plain, parse_upload, validate_length

router = APIRouter(prefix="/transcripts", tags=["Transcript input & review"])


@router.post("/text", status_code=201)
def create_text(data: TextInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    validate_length(data.text)
    segments = parse_plain(data.text)
    record = Transcript(
        user_id=user.id,
        title=data.title.strip() or "Untitled transcript",
        source_type="paste",
        language=data.language,
        text="\n\n".join(s["text"] for s in segments),
        original_text=data.text,
        segments=segments,
        original_segments=segments,
    )
    db.add(record)
    db.commit()
    return transcript_dict(record)


@router.post("/upload", status_code=201)
async def upload(file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    limit = get_settings().max_upload_bytes
    content = await file.read(limit + 1)
    await file.close()
    original, segments = parse_upload(file.filename or "transcript", content)
    title = Path(file.filename or "Transcript").stem.replace("_", " ")[:240]
    record = Transcript(
        user_id=user.id,
        title=title,
        source_type="upload",
        metadata_json={"filename": Path(file.filename or "").name[:240]},
        original_text=original,
        text="\n\n".join(s["text"] for s in segments),
        original_segments=segments,
        segments=segments,
    )
    db.add(record)
    db.commit()
    return transcript_dict(record)


@router.get("/{transcript_id}")
def get_transcript(transcript_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return transcript_dict(owned(db, Transcript, transcript_id, user.id))


@router.patch("/{transcript_id}")
def edit_transcript(transcript_id: str, data: TranscriptEdit, user: User = Depends(current_user), db: Session = Depends(get_db)):
    record = owned(db, Transcript, transcript_id, user.id)
    if record.version != data.version:
        raise AppError(409, "edit_conflict", "This transcript changed in another tab. Reload before saving your changes.")
    if db.scalar(select(Analysis.id).where(Analysis.transcript_id == record.id)):
        raise AppError(
            409,
            "source_locked",
            "This transcript already has an analysis. Create a new transcript for further source edits; existing source references are preserved.",
        )
    ids = [s.id for s in data.segments]
    if len(set(ids)) != len(ids):
        raise AppError(422, "duplicate_segments", "Each transcript segment needs a unique identifier.")
    if any(len(s.text) > 1800 for s in data.segments):
        raise AppError(422, "segment_too_long", "Keep each segment under 1,800 characters. Add a new segment for longer passages.")
    text = "\n\n".join(s.text for s in data.segments)
    validate_length(text)
    changed = db.execute(
        update(Transcript)
        .where(
            Transcript.id == record.id,
            Transcript.user_id == user.id,
            Transcript.version == data.version,
            ~select(Analysis.id).where(Analysis.transcript_id == record.id).exists(),
        )
        .values(
            text=text, segments=[s.model_dump() for s in data.segments], title=data.title, language=data.language, version=data.version + 1
        )
        .execution_options(synchronize_session=False)
    )
    if changed.rowcount != 1:
        db.rollback()
        raise AppError(
            409, "edit_conflict", "The source changed or an analysis started while you were saving. Reload before editing again."
        )
    db.commit()
    db.refresh(record)
    return transcript_dict(record)


@router.post("/{transcript_id}/cleanup")
def cleanup_preview(transcript_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    record = owned(db, Transcript, transcript_id, user.id)
    return {
        "segments": [{**s, "text": cleanup(s["text"])} for s in record.segments],
        "message": "Whitespace normalized only. Review and save to apply; the original is unchanged.",
    }


@router.post("/{transcript_id}/duplicate", status_code=201)
def duplicate_transcript(transcript_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    source = owned(db, Transcript, transcript_id, user.id)
    record = Transcript(
        user_id=user.id,
        title=source.title,
        source_type=source.source_type,
        source_url=source.source_url,
        video_id=source.video_id,
        metadata_json={**source.metadata_json, "derived_from_transcript": source.id},
        language=source.language,
        original_text=source.text,
        text=source.text,
        original_segments=source.segments,
        segments=source.segments,
    )
    db.add(record)
    db.commit()
    return transcript_dict(record)
