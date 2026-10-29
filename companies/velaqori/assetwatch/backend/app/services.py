from __future__ import annotations
from sqlalchemy.orm import Session
from .models import AllowlistEntry, Asset, AuditEvent, Observation, ScanRun, now


def audit(db: Session, actor: str, action: str, detail: str = "") -> None:
    db.add(AuditEvent(at=now(), actor=actor, action=action, detail=detail))


def allowlist_for(db: Session, user_id: int) -> list[str]:
    return [e.entry for e in db.query(AllowlistEntry).filter(AllowlistEntry.owner_id == user_id)]


def record_run(db: Session, user_id: int, target: str, adapter: str, result) -> ScanRun:
    run = ScanRun(owner_id=user_id, target=target, adapter=adapter, status=result.status,
                  started_at=now(), finished_at=now(),
                  limitations=result.limitations, error=result.error)
    db.add(run)
    db.flush()
    assets = {a.hostname: a.id for a in db.query(Asset).filter(Asset.owner_id == user_id)}
    for obs in result.observations:
        db.add(Observation(run_id=run.id, asset_id=assets.get(target), target=target,
                           port=obs.port, service=obs.service, version=obs.version,
                           first_seen=now(), last_seen=now()))
    db.commit()
    return run


def observations_for(db: Session, user_id: int, run_id: int | None = None) -> list[dict]:
    q = (db.query(Observation).join(ScanRun, Observation.run_id == ScanRun.id)
         .filter(ScanRun.owner_id == user_id))
    if run_id is not None:
        q = q.filter(Observation.run_id == run_id)
    return [{"target": o.target, "port": o.port, "service": o.service,
             "version": o.version, "run_id": o.run_id} for o in q.all()]
