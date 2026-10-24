"""OpenLearn Commons HTTP routes: auth, catalogue, adaptations, translations, collections, moderation."""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, core, security
from .database import get_db
from .models import (
    Adaptation, AuditEvent, Collection, ModerationReport, Rating, Resource, Translation, User,
)

router = APIRouter()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    return security.require_user(db, token)


def require_role(user: User, *roles: str) -> User:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Your role cannot perform this action.")
    return user


def audit(db: Session, actor: User, action: str, target: str, detail: str = "") -> None:
    db.add(AuditEvent(actor_id=actor.id, action=action, target=target, detail=detail))
    db.commit()


class RegisterBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    display_name: str = ""
    role: str = "contributor"

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        if "@" not in v or v.startswith("@") or v.endswith("@") or "." not in v.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return v.lower()


class LoginBody(BaseModel):
    email: str
    password: str


def _session(user: User, response: Response, db: Session) -> dict:
    token = security.create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=config.SESSION_MAX_AGE_SECONDS)
    return {"id": user.id, "email": user.email, "display_name": user.display_name, "role": user.role}


@router.post("/api/auth/register")
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    if body.role not in ("contributor", "translator", "reviewer", "admin"):
        raise HTTPException(status_code=400, detail="Unsupported role.")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(email=body.email.lower(), display_name=body.display_name or body.email.split("@")[0],
                password_hash=security.hash_password(body.password), role=body.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _session(user, response, db)


@router.post("/api/auth/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return _session(user, response, db)


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


# ---------------------------------------------------------------- catalogue ---


def _resource_dict(r: Resource, include_body: bool = False) -> dict:
    guidance = core.license_guidance(r.license)
    row = {
        "id": r.id, "uid": r.uid, "title": r.title, "resource_type": r.resource_type,
        "subject": r.subject, "level": r.level, "language": r.language,
        "duration_min": r.duration_min, "connectivity": r.connectivity,
        "accessibility": r.accessibility, "creator": r.creator, "license": r.license,
        "attribution": r.attribution or core.attribution_line(r.title, r.creator, r.license, r.source_url),
        "source_url": r.source_url, "host_status": r.host_status, "review_status": r.review_status,
        "description": r.description,
        "reuse": {"can_adapt": guidance.can_adapt, "can_redistribute": guidance.can_redistribute,
                  "can_commercial": guidance.can_commercial, "obligation": guidance.obligation,
                  "uncertain": guidance.uncertain},
        "offline_note": ("This catalogue entry is a link only — the resource itself is not hosted locally."
                         if r.host_status == "link_only" else "File copy stored in this catalogue."),
    }
    if include_body:
        row["body"] = r.body
    return row


@router.get("/api/resources")
def search_resources(q: str = "", subject: str = "", language: str = "", license_name: str = "",
                     resource_type: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Resource).filter(Resource.review_status == "approved")
    if q:
        query = query.filter(Resource.title.ilike(f"%{q}%"))
    if subject:
        query = query.filter(Resource.subject == subject)
    if language:
        query = query.filter(Resource.language == language)
    if license_name:
        query = query.filter(Resource.license == license_name)
    if resource_type:
        query = query.filter(Resource.resource_type == resource_type)
    return [_resource_dict(r) for r in query.all()]


class ResourceBody(BaseModel):
    title: str = Field(min_length=1)
    resource_type: str = "lesson"
    subject: str = ""
    level: str = ""
    language: str = "en"
    duration_min: int = 0
    connectivity: str = "online"
    accessibility: str = ""
    creator: str = ""
    license: str = "Unknown"
    source_url: str = ""
    description: str = ""
    body: str = ""
    host_status: str = "link_only"
    rights_confirmed: str = "no"


@router.post("/api/resources")
def create_resource(body: ResourceBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "contributor", "reviewer", "admin")
    if body.rights_confirmed != "yes":
        raise HTTPException(status_code=400, detail="Confirm you have the rights to upload this material (rights_confirmed must be 'yes').")
    for existing in db.query(Resource).all():
        if core.is_duplicate(body.title, body.source_url, existing.title, existing.source_url):
            raise HTTPException(status_code=409, detail=f"Possible duplicate of resource {existing.id} ('{existing.title}').")
    resource = Resource(uid=uuid.uuid4().hex, **body.model_dump(), uploader_id=user.id)
    db.add(resource)
    db.commit()
    audit(db, user, "resource.create", f"resource:{resource.id}", resource.title)
    return {"id": resource.id}


@router.get("/api/resources/{resource_id}")
def resource_detail(resource_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    resource = db.get(Resource, resource_id)
    if not resource or resource.review_status == "takedown":
        raise HTTPException(status_code=404, detail="Resource not found.")
    return _resource_dict(resource, include_body=True)


@router.post("/api/resources/{resource_id}/review")
def review_resource(resource_id: int, body: dict, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "reviewer", "admin")
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    status = body.get("status", "")
    if status not in ("approved", "pending", "takedown"):
        raise HTTPException(status_code=400, detail="status must be approved, pending or takedown.")
    resource.review_status = status
    db.commit()
    audit(db, user, "resource.review", f"resource:{resource.id}", status)
    return {"id": resource.id, "review_status": status}


# ---------------------------------------------------------- adaptations/translations ---


class AdaptationBody(BaseModel):
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)
    license: str = ""


@router.post("/api/resources/{resource_id}/adaptations")
def create_adaptation(resource_id: int, body: AdaptationBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "contributor", "translator", "reviewer", "admin")
    source = db.get(Resource, resource_id)
    if not source:
        raise HTTPException(status_code=404, detail="Resource not found.")
    guidance = core.license_guidance(source.license)
    if not guidance.can_adapt:
        raise HTTPException(status_code=400, detail=f"Adaptation not permitted under '{guidance.license}': {guidance.obligation}")
    adaptation = Adaptation(source_id=resource_id, title=body.title, body=body.body,
                            author_id=user.id, license=body.license or source.license)
    db.add(adaptation)
    db.commit()
    audit(db, user, "adaptation.create", f"adaptation:{adaptation.id}", adaptation.title)
    return {"id": adaptation.id, "license_obligation": guidance.obligation}


@router.get("/api/adaptations/{adaptation_id}")
def adaptation_detail(adaptation_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    adaptation = db.get(Adaptation, adaptation_id)
    if not adaptation:
        raise HTTPException(status_code=404, detail="Adaptation not found.")
    source = db.get(Resource, adaptation.source_id)
    translations = db.query(Translation).filter(Translation.adaptation_id == adaptation_id).all()
    # Unpublished translations are not exposed publicly; reviewers/translators see the workflow rows.
    staff = user.role in ("reviewer", "admin", "translator")
    visible = [t for t in translations if core.public_translation(t) or staff]
    return {
        "id": adaptation.id, "title": adaptation.title, "body": adaptation.body,
        "status": adaptation.status, "license": adaptation.license,
        "source": {"id": source.id, "title": source.title, "license": source.license,
                   "attribution": core.attribution_line(source.title, source.creator, source.license, source.source_url)},
        "translations": [
            {"id": t.id, "language": t.language, "status": t.status, "machine": t.machine == "yes",
             "target_text": t.target_text if (core.public_translation(t) or user.role in ("reviewer", "admin", "translator")) else "",
             "reviewer_note": t.reviewer_note if user.role in ("reviewer", "admin") else ""}
            for t in visible
        ],
    }


class TranslationBody(BaseModel):
    language: str = Field(min_length=2)
    source_text: str = ""
    target_text: str = Field(min_length=1)
    machine: str = "no"


@router.post("/api/adaptations/{adaptation_id}/translations")
def create_translation(adaptation_id: int, body: TranslationBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "translator", "reviewer", "admin")
    if db.get(Adaptation, adaptation_id) is None:
        raise HTTPException(status_code=404, detail="Adaptation not found.")
    if body.machine not in ("yes", "no"):
        raise HTTPException(status_code=400, detail="machine must be yes or no.")
    translation = Translation(adaptation_id=adaptation_id, language=body.language,
                              source_text=body.source_text, target_text=body.target_text,
                              machine=body.machine, status="draft")
    db.add(translation)
    db.commit()
    return {"id": translation.id, "status": translation.status,
            "label": "Machine translation draft — pending human review." if body.machine == "yes" else "Human translation draft."}


@router.post("/api/translations/{translation_id}/transition")
def transition_translation(translation_id: int, body: dict, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "reviewer", "admin")
    translation = db.get(Translation, translation_id)
    if not translation:
        raise HTTPException(status_code=404, detail="Translation not found.")
    target = body.get("status", "")
    try:
        core.validate_translation_transition(translation.status, target)
        core.approve_translation(translation.machine)
    except core.WorkflowError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    translation.status = target
    translation.reviewer_note = str(body.get("note", ""))
    db.commit()
    audit(db, user, "translation.transition", f"translation:{translation.id}", target)
    return {"id": translation.id, "status": translation.status}


# ------------------------------------------------------------- collections ---


class CollectionBody(BaseModel):
    title: str = Field(min_length=1)
    item_ids: list[int] = Field(default_factory=list)


@router.post("/api/collections")
def create_collection(body: CollectionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    collection = Collection(title=body.title, owner_id=user.id, items_json=json.dumps(body.item_ids))
    db.add(collection)
    db.commit()
    return {"id": collection.id}


@router.get("/api/collections/{collection_id}/attribution")
def collection_attribution(collection_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    collection = db.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found.")
    items = []
    for rid in json.loads(collection.items_json):
        resource = db.get(Resource, rid)
        if resource:
            items.append({"title": resource.title, "creator": resource.creator,
                          "license": resource.license, "source_url": resource.source_url})
    return {"collection": collection.title, "attribution": core.collection_attribution(items)}


# ---------------------------------------------------------------- ratings/reports ---


class RatingBody(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: str = ""


@router.post("/api/resources/{resource_id}/ratings")
def rate(resource_id: int, body: RatingBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Resource, resource_id) is None:
        raise HTTPException(status_code=404, detail="Resource not found.")
    rating = Rating(resource_id=resource_id, user_id=user.id, stars=body.stars, comment=body.comment)
    db.add(rating)
    db.commit()
    return core.rating_display(body.stars, "visible", None, expert_reviewed=False)


class ReportBody(BaseModel):
    reason: str = Field(min_length=1)


@router.post("/api/resources/{resource_id}/reports")
def report(resource_id: int, body: ReportBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Resource, resource_id) is None:
        raise HTTPException(status_code=404, detail="Resource not found.")
    report_row = ModerationReport(resource_id=resource_id, reporter_id=user.id, reason=body.reason)
    db.add(report_row)
    db.commit()
    return {"id": report_row.id, "status": report_row.status}


@router.get("/api/reports")
def list_reports(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "reviewer", "admin")
    rows = db.query(ModerationReport).order_by(ModerationReport.id.desc()).all()
    return [{"id": r.id, "resource_id": r.resource_id, "reason": r.reason, "status": r.status} for r in rows]
