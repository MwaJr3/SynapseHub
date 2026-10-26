from datetime import timedelta
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.config import get_settings
from app.db import get_db, utcnow, utc_iso
from app.errors import AppError
from app.models import Analysis, FlashcardReview, ProcessingTask, QuizAttempt, SessionRecord, Transcript, User
from app.schemas import DeleteAccountInput, LoginInput, PreferencesInput, RegisterInput
from app.security import (
    COOKIE,
    DUMMY_HASH,
    auth_limit,
    current_session,
    current_user,
    find_session,
    issue_session,
    hash_password,
    verify_password,
)

router = APIRouter(tags=["Accounts & preferences"])


def user_info(user: User, record: SessionRecord):
    settings = get_settings()
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "is_guest": user.email is None,
            "preferences": user.preferences,
            "expires_at": utc_iso(user.expires_at),
        },
        "csrf_token": record.csrf_token,
        "capabilities": {
            "ai_provider": settings.ai_provider,
            "ai_model": settings.ai_model if settings.ai_provider != "local" else None,
            "youtube_authorized": settings.youtube_configured and bool(settings.youtube_allowed_video_ids.strip()),
            "max_upload_bytes": settings.max_upload_bytes,
            "max_transcript_chars": settings.max_transcript_chars,
            "guest_retention_days": settings.guest_retention_days,
            "unsaved_retention_days": settings.unsaved_retention_days,
            "external_research": False,
        },
    }


@router.get("/session")
def session_info(request: Request, response: Response, db: Session = Depends(get_db)):
    record = find_session(request, db)
    if record is None:
        user = User(expires_at=utcnow() + timedelta(days=get_settings().guest_retention_days))
        db.add(user)
        db.commit()
        record = issue_session(db, user, response)
    user = db.get(User, record.user_id)
    response.headers["Cache-Control"] = "no-store"
    return user_info(user, record)


@router.post("/auth/register", dependencies=[Depends(auth_limit)])
def register(data: RegisterInput, response: Response, session: SessionRecord = Depends(current_session), db: Session = Depends(get_db)):
    user = db.get(User, session.user_id)
    if user.email:
        raise AppError(409, "already_signed_in", "You are already signed in.")
    if db.scalar(select(User.id).where(User.email == data.email)):
        raise AppError(409, "account_exists", "An account could not be created with this email. Try signing in.")
    user.email, user.display_name = data.email, data.display_name.strip()
    user.password_hash = hash_password(data.password)
    user.expires_at = None
    db.execute(delete(SessionRecord).where(SessionRecord.user_id == user.id))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AppError(409, "account_exists", "An account could not be created with this email. Try signing in.") from exc
    record = issue_session(db, user, response)
    return user_info(user, record)


@router.post("/auth/login", dependencies=[Depends(auth_limit)])
def login(data: LoginInput, response: Response, session: SessionRecord = Depends(current_session), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.strip().lower()))
    valid = verify_password(user.password_hash if user and user.password_hash else DUMMY_HASH, data.password)
    if not user or not valid:
        raise AppError(401, "invalid_credentials", "The email or password is incorrect.")
    guest = db.get(User, session.user_id)
    if not guest.email and guest.id != user.id:
        for model in (Transcript, Analysis, ProcessingTask, QuizAttempt, FlashcardReview):
            db.execute(update(model).where(model.user_id == guest.id).values(user_id=user.id))
        db.delete(guest)
    else:
        db.delete(session)
    db.commit()
    record = issue_session(db, user, response)
    return user_info(user, record)


@router.post("/auth/logout")
def logout(response: Response, session: SessionRecord = Depends(current_session), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
    response.delete_cookie(COOKIE, path="/", secure=get_settings().cookie_secure, httponly=True, samesite="lax")
    return {"message": "Signed out. Saved guides remain in your account."}


@router.patch("/preferences")
def preferences(data: PreferencesInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.preferences = {**user.preferences, **data.model_dump(exclude_none=True)}
    db.commit()
    return user.preferences


@router.delete("/account")
def delete_account(data: DeleteAccountInput, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.email and not verify_password(user.password_hash, data.password):
        raise AppError(403, "password_required", "Enter your current password to delete your account and all its data.")
    db.delete(user)
    db.commit()
    response.delete_cookie(COOKIE, path="/")
    return {"message": "Workspace and account data deleted."}
