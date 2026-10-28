"""Data export and account deletion over HTTP.

Two decisions worth stating, because both are easy to get subtly wrong:

* **Deletion is a POST, not a DELETE with a body.** It carries a password, and a
  request body on DELETE is dropped by enough proxies that a learner could see a
  success page for a request the server never fully received. POST has no such
  ambiguity.
* **The password is checked before the typed confirmation.** A wrong password and a
  mistyped email are different problems: one is an authentication failure (403,
  "that password is not correct"), the other is a deliberate-action guard (422,
  "the email did not match"). Checking in this order means the guard cannot be
  used to probe whether a password is right.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import account, config
from .database import get_db
from .models import User
from .security import require_user, verify_password

router = APIRouter(prefix="/api/account", tags=["account"])

def _current(request: Request, db: Session) -> User:
    return require_user(db, request.cookies.get(config.SESSION_COOKIE))


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=200)
    #: The account email, typed by hand. Not a checkbox: a checkbox is one
    #: misfired click away from erasing a year of work.
    confirm_email: str = Field(max_length=254)


@router.get("/export")
def export_account(request: Request, db: Session = Depends(get_db)):
    """A single JSON file containing every row that names the learner."""
    user = _current(request, db)
    bundle = account.export_bundle(db, user)
    return JSONResponse(
        bundle,
        headers={
            "Content-Disposition": f'attachment; filename="{account.filename()}"',
            # A copy of everything a learner has done is not a document to be cached
            # by a proxy or replayed from the back button of a shared machine.
            "Cache-Control": "no-store",
        },
    )


@router.get("/delete-preview")
def preview_deletion(request: Request, db: Session = Depends(get_db)):
    """Counts first. The screen can then say exactly what a click would remove."""
    user = _current(request, db)
    return account.deletion_preview(db, user)


@router.post("/delete")
def delete_account(
    body: DeleteAccountRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    user = _current(request, db)

    if not verify_password(body.password, user.password_hash):
        # Attempt limiting is an edge concern and is documented as a gap rather
        # than half-implemented in process memory: two API workers would each keep
        # their own count and quietly double the real limit.
        raise HTTPException(403, "that password is not correct; nothing was deleted")

    if body.confirm_email.strip().lower() != user.email.lower():
        raise HTTPException(
            422,
            "type your account email exactly to confirm; nothing was deleted",
        )

    removed = account.delete_account(db, user)
    # The session this request arrived on no longer exists. Clearing the cookie
    # keeps the browser from showing a signed-in shell for a deleted account.
    response.delete_cookie(config.SESSION_COOKIE)
    return {
        "deleted": True,
        "rows": removed,
        "total": sum(removed.values()),
        "message": (
            "Your account and everything recorded under it have been erased. "
            "No copy was kept."
        ),
    }
