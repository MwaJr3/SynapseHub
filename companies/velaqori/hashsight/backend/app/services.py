"""Application services: lookup orchestration, CRUD, reports, retention."""
from __future__ import annotations

from sqlalchemy.orm import Session

from .models import Case, HashRecord, Lookup, Note, now
from .providers.base import DISCLAIMER, ProviderResult, combine
from .hashing import HashResult


class ServiceError(ValueError):
    pass


def record_lookup(db: Session, user_id: int, hashes: HashResult,
                  results: list[ProviderResult]) -> HashRecord:
    record = HashRecord(user_id=user_id, filename=hashes.filename, size=hashes.size,
                        sha256=hashes.sha256, sha1=hashes.sha1, md5=hashes.md5,
                        combined_verdict=combine(results))
    db.add(record)
    db.flush()
    for r in results:
        db.add(Lookup(record_id=record.id, provider=r.provider, verdict=r.verdict,
                      detections=r.detections, total_engines=r.total_engines,
                      looked_up_at=r.looked_up_at, raw_summary=r.raw_summary,
                      available=1 if r.available else 0, error=r.error))
    db.commit()
    return record


def record_dict(db: Session, record: HashRecord) -> dict:
    lookups = db.query(Lookup).filter(Lookup.record_id == record.id).all()
    return {
        "id": record.id, "filename": record.filename, "size": record.size,
        "sha256": record.sha256, "sha1": record.sha1, "md5": record.md5,
        "combined_verdict": record.combined_verdict, "disposition": record.disposition,
        "created_at": record.created_at,
        "lookups": [{"provider": l.provider, "verdict": l.verdict, "detections": l.detections,
                     "total_engines": l.total_engines, "looked_up_at": l.looked_up_at,
                     "raw_summary": l.raw_summary, "available": bool(l.available),
                     "error": l.error} for l in lookups],
        "disclaimer": DISCLAIMER}


def report(db: Session, record_id: int, user_id: int) -> dict:
    record = db.get(HashRecord, record_id)
    if record is None or record.user_id != user_id:
        raise ServiceError("record not found")
    data = record_dict(db, record)
    data["report_note"] = ("Lookup results describe what providers reported about this "
                           "hash at the listed times. They are not a safety determination.")
    return data
