"""Persistent single-worker task runner. External calls never hold a DB transaction.

Checkpoints survive restarts. A failed chunk can be retried without charging for
already-valid chunks again. Use one application worker; see docs/architecture.md.
"""

import asyncio
import logging
import hashlib
import json
from datetime import timedelta

from sqlalchemy import delete, select, update

from app.config import get_settings
from app.db import SessionLocal, utcnow
from app.errors import ServiceError
from app.models import Analysis, ProcessingTask, SessionRecord, Transcript, User
from app.providers import get_provider
from app.providers.validation import validate_source_refs
from app.providers.openai_compatible import PROMPT_VERSION
from app.schemas import AnalysisConfig, Guide
from app.services.guides import merge_guides
from app.services.transcripts import chunk_segments
from app.services.youtube import OfficialYouTubeRetriever, canonical_url

logger = logging.getLogger(__name__)


def update_task(task_id: str, **values):
    with SessionLocal() as db:
        task = db.get(ProcessingTask, task_id)
        if task is None:
            raise ServiceError("task_deleted", "This workspace or task was deleted.")
        for key, value in values.items():
            setattr(task, key, value)
        db.commit()


def _with_meta(guide: Guide, provider: str, total: int, processed: int, segment_count: int, processed_segments: int):
    return {
        **guide.model_dump(),
        "_meta": {
            "engine": provider,
            "prompt_version": PROMPT_VERSION,
            "chunks": total,
            "processed_chunks": processed,
            "source_segments": segment_count,
            "processed_segments": processed_segments,
            "partial": processed < total,
        },
    }


async def run_analysis(task_id: str):
    provider = get_provider()
    settings = get_settings()
    fingerprint = hashlib.sha256(
        (provider.name + "|" + (settings.ai_base_url if settings.ai_provider != "local" else "") + "|" + PROMPT_VERSION).encode()
    ).hexdigest()
    with SessionLocal() as db:
        task = db.get(ProcessingTask, task_id)
        analysis = db.get(Analysis, task.analysis_id)
        if not analysis:
            raise ServiceError("task_deleted", "The analysis was deleted.")
        transcript = db.get(Transcript, analysis.transcript_id)
        segments, title = transcript.segments, analysis.title
        config = AnalysisConfig.model_validate(analysis.config)
        target = task.payload.get("section") if task.kind == "regenerate" else None
        expected_revision = task.payload.get("revision")
        if target == "quiz":
            config.include_quiz = True
        if target == "flashcards":
            config.include_flashcards = True
        if task.payload.get("level"):
            config.level = task.payload["level"]
        checkpoints = [] if target else list(analysis.checkpoints)
        source_hash = hashlib.sha256(json.dumps(segments, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        if target:
            original_engine = (analysis.guide or {}).get("_meta", {}).get("engine")
            if (original_engine and original_engine != provider.name) or (
                analysis.processing_plan and analysis.processing_plan.get("fingerprint") != fingerprint
            ):
                raise ServiceError(
                    "provider_changed",
                    "This guide was created with a different engine. Use 'New guide from this source' to switch engines without mixing provenance.",
                )
            chunk_chars = settings.ai_chunk_chars
        else:
            plan = analysis.processing_plan
            if not plan:
                if checkpoints:
                    raise ServiceError(
                        "checkpoint_version",
                        "These checkpoints predate the source-plan safeguard. Start a new guide from this source; existing material is preserved.",
                    )
                plan = {
                    "version": 1,
                    "source_hash": source_hash,
                    "chunk_chars": settings.ai_chunk_chars,
                    "engine": provider.name,
                    "fingerprint": fingerprint,
                    "prompt_version": PROMPT_VERSION,
                }
                analysis.processing_plan = plan
            if plan["source_hash"] != source_hash or plan["fingerprint"] != fingerprint:
                raise ServiceError(
                    "provider_changed",
                    "The source or AI engine changed since this task began. Start a new guide from this source; partial material was preserved and no incompatible checkpoints were reused.",
                )
            chunk_chars = plan["chunk_chars"]
            analysis.status, analysis.error = "processing", None
            db.commit()
    chunks = chunk_segments(segments, chunk_chars)
    update_task(task_id, total_units=len(chunks), completed_units=len(checkpoints), message="Preparing transcript sections")
    for index, chunk in enumerate(chunks):
        if index < len(checkpoints):
            continue
        update_task(task_id, message=f"Analyzing transcript section {index + 1} of {len(chunks)}", completed_units=index)
        guide = await provider.generate(chunk, config, title, target)
        validate_source_refs(guide, chunk)
        checkpoints.append(guide.model_dump())
        if not target:
            combined = merge_guides([Guide.model_validate(c) for c in checkpoints], title)
            with SessionLocal() as db:
                current = db.get(Analysis, analysis.id)
                if current is None:
                    raise ServiceError("task_deleted", "The analysis was deleted.")
                current.checkpoints = list(checkpoints)
                current.guide = _with_meta(
                    combined, provider.name, len(chunks), len(checkpoints), len(segments), sum(len(c) for c in chunks[: len(checkpoints)])
                )
                db.commit()
        update_task(task_id, completed_units=index + 1)
    update_task(task_id, message="Organizing the learning guide and saving results")
    combined = merge_guides([Guide.model_validate(c) for c in checkpoints], title)
    with SessionLocal() as db:
        current = db.get(Analysis, analysis.id)
        if current is None:
            raise ServiceError("task_deleted", "The analysis was deleted.")
        if target:
            if current.revision != expected_revision:
                raise ServiceError(
                    "edit_conflict",
                    "The guide was edited while regeneration was running. Your edits were kept. Reload and regenerate again if needed.",
                )
            result = dict(current.guide or {})
            if target in ("quiz", "flashcards"):
                replacement = getattr(combined, target)
                if not replacement:
                    raise ServiceError(
                        "section_unavailable",
                        "The engine did not find supported material for this learning section. The previous content was kept.",
                    )
                # New study versions must not inherit review schedules for different content.
                result[target] = [{**c.model_dump(), "id": f"r{current.revision + 1}-{c.id}"[:80]} for c in replacement]
            else:
                section = next((s for s in combined.sections if s.key == target), None)
                if not section or not section.items:
                    raise ServiceError(
                        "section_unavailable",
                        "The engine did not return supported content for this section. Your previous version was kept.",
                    )
                result["sections"] = [section.model_dump() if s["key"] == target else s for s in result.get("sections", [])]
            changed = db.execute(
                update(Analysis)
                .where(Analysis.id == current.id, Analysis.revision == expected_revision)
                .values(guide=result, revision=expected_revision + 1, updated_at=utcnow())
                .execution_options(synchronize_session=False)
            )
            if changed.rowcount != 1:
                db.rollback()
                raise ServiceError("edit_conflict", "The guide changed while the replacement was saving. Your saved edits were preserved.")
        else:
            current.guide = _with_meta(combined, provider.name, len(chunks), len(chunks), len(segments), len(segments))
            current.status, current.error = "complete", None
        if not target:
            current.revision += 1
        db.commit()
    update_task(task_id, status="complete", message="Your learning guide is ready", result={"analysis_id": analysis.id})


async def run_retrieval(task_id: str):
    with SessionLocal() as db:
        task = db.get(ProcessingTask, task_id)
        payload, user_id = task.payload, task.user_id

    async def progress(message, context):
        with SessionLocal() as db:
            task = db.get(ProcessingTask, task_id)
            if not task:
                raise ServiceError("task_deleted", "The task was deleted.")
            task.message = message
            if context:
                task.result = {**(task.result or {}), **context}
            db.commit()

    retriever = OfficialYouTubeRetriever(get_settings())
    result = await retriever.retrieve(payload["video_id"], payload.get("language"), progress)
    with SessionLocal() as db:
        if db.get(ProcessingTask, task_id) is None:
            return
        record = Transcript(
            user_id=user_id,
            title=result.metadata.get("title") or "YouTube transcript",
            source_type="youtube",
            source_url=canonical_url(result.video_id),
            video_id=result.video_id,
            metadata_json={**result.metadata, "retrieval_method": result.method},
            language=result.language,
            original_text=result.original_text,
            text="\n\n".join(s["text"] for s in result.segments),
            original_segments=result.segments,
            segments=result.segments,
        )
        db.add(record)
        db.commit()
    update_task(
        task_id,
        status="complete",
        message="Transcript ready for review",
        result={"transcript_id": record.id, "metadata": result.metadata, "video_id": result.video_id},
    )


async def run_task(task_id: str):
    with SessionLocal() as db:
        claim = db.execute(
            update(ProcessingTask)
            .where(ProcessingTask.id == task_id, ProcessingTask.status == "queued")
            .values(status="processing", message="Starting task")
        )
        db.commit()
        if claim.rowcount != 1:
            return
        kind = db.get(ProcessingTask, task_id).kind
    try:
        if kind == "retrieve":
            await run_retrieval(task_id)
        else:
            await run_analysis(task_id)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        code = exc.code if isinstance(exc, ServiceError) else "processing_failed"
        message = (
            exc.message
            if isinstance(exc, ServiceError)
            else "Processing failed unexpectedly. Valid completed sections were preserved. Try again, or contact the administrator."
        )
        # Deliberately omit exception text, provider bodies and transcript contents from logs.
        logger.warning("Task %s failed (%s, %s)", task_id, code, type(exc).__name__)
        with SessionLocal() as db:
            task = db.get(ProcessingTask, task_id)
            if task:
                task.status, task.error_code, task.message = "failed", code, message
                if task.kind == "analyze":
                    analysis = db.get(Analysis, task.analysis_id)
                    if analysis:
                        analysis.status = "partial" if analysis.guide else "failed"
                        analysis.error = message
                db.commit()


def recover_interrupted():
    with SessionLocal() as db:
        for task in db.scalars(select(ProcessingTask).where(ProcessingTask.status == "processing")):
            task.status, task.error_code = "failed", "interrupted"
            task.message = "The server restarted during processing. Retry to continue from saved analysis checkpoints."
            if task.kind == "analyze" and task.analysis_id:
                analysis = db.get(Analysis, task.analysis_id)
                if analysis:
                    analysis.status = "partial" if analysis.guide else "failed"
                    analysis.error = task.message
        db.commit()


def purge_expired():
    settings = get_settings()
    with SessionLocal() as db:
        db.execute(delete(SessionRecord).where(SessionRecord.expires_at < utcnow()))
        db.execute(
            delete(ProcessingTask).where(
                ProcessingTask.updated_at < utcnow() - timedelta(days=settings.unsaved_retention_days),
                ProcessingTask.status.in_(["complete", "failed"]),
            )
        )
        db.execute(delete(User).where(User.expires_at.is_not(None), User.expires_at < utcnow()))
        cutoff = utcnow() - timedelta(days=settings.unsaved_retention_days)
        db.execute(delete(Analysis).where(Analysis.is_saved.is_(False), Analysis.updated_at < cutoff))
        db.execute(
            delete(Transcript).where(
                Transcript.created_at < cutoff, ~select(Analysis.id).where(Analysis.transcript_id == Transcript.id).exists()
            )
        )
        db.commit()


async def worker_loop():
    needs_recovery = True
    last_purge = utcnow()
    while True:
        try:
            if needs_recovery:
                recover_interrupted()
                purge_expired()
                needs_recovery = False
                last_purge = utcnow()
            with SessionLocal() as db:
                task_id = db.scalar(
                    select(ProcessingTask.id).where(ProcessingTask.status == "queued").order_by(ProcessingTask.created_at).limit(1)
                )
            if task_id:
                await run_task(task_id)
            else:
                await asyncio.sleep(0.75)
            if (utcnow() - last_purge).total_seconds() > 3600:
                purge_expired()
                last_purge = utcnow()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            # A transient database outage must not silently kill the worker.
            logger.error("Worker paused (%s); retrying connection in 3 seconds", type(exc).__name__)
            needs_recovery = True
            await asyncio.sleep(3)
