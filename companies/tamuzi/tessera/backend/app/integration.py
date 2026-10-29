"""The study planner integration: consent, PKCE authorization codes, read-only tokens.

Why this exists
---------------
Tessera and the study planner are separate applications with separate accounts.
The planner needs to know what a learner is working on so it can build a realistic
week. It must not get a Tessera password, a copied session cookie, or an
administrator identity that could read anybody's records.

So the learner grants one narrow permission in Tessera, for one client, and the
planner receives a short-lived bearer token scoped to `learning-summary:read`.
Tessera enforces that scope on the server. There is no write endpoint that accepts
these tokens at all, which is a stronger statement than "the planner does not show
an edit button".

What each object is for
-----------------------
`OAuthClient`         a registered application with an exact redirect allowlist
`ConsentGrant`        the learner's decision, kept after revocation
`AuthorizationCode`   single-use, PKCE-bound, 5 minutes, stored hashed
`AccessToken`         1 hour, stored hashed, scoped, revocable

Identity always comes from the token or the session. A learner id supplied by the
client is never consulted, so one learner cannot ask for another's summary.
"""

from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import config
from .models import (
    AccessToken,
    AuthorizationCode,
    Concept,
    ConceptState,
    ConsentGrant,
    Goal,
    OAuthClient,
    RetrievalAttempt,
    User,
)

#: The only permission this integration can be granted. Adding a second scope means
#: adding it here, to the consent copy, and to a test — deliberately, once.
SCOPE_SUMMARY = "learning-summary:read"
SUPPORTED_SCOPES = (SCOPE_SUMMARY,)

PURPOSE = (
    "Retrieve a read-only summary of your learning progress to help organise your study "
    "activities. The Study Planner cannot modify your Tessera records."
)

#: An authorization code is exchanged within seconds of being issued. Five minutes
#: is generous for a redirect and short enough that a leaked code is not useful.
CODE_TTL = timedelta(minutes=5)
#: One hour. The planner re-requests a summary when it needs one; it does not keep
#: a token in a drawer.
TOKEN_TTL = timedelta(seconds=3600)
#: Consent itself is open-ended until revoked, but an expiry is recorded so a
#: deployment can choose one without a schema change.
CONSENT_TTL: timedelta | None = None


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware(value: datetime | None) -> datetime | None:
    """SQLite stores naive datetimes; every comparison in this module is aware."""
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def hash_token(raw: str) -> str:
    """Store a digest, never the credential itself."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def new_secret(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def s256(verifier: str) -> str:
    """BASE64URL(SHA256(ASCII(verifier))) without padding, per RFC 7636 §4.2."""
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def challenge_matches(verifier: str, challenge: str) -> bool:
    if not verifier or not challenge:
        return False
    if not 43 <= len(verifier) <= 128:
        return False
    return secrets.compare_digest(s256(verifier), challenge)


# ------------------------------------------------------------------ client registry


def ensure_client(
    db: Session,
    *,
    client_id: str,
    name: str,
    redirect_uris: list[str],
    allowed_scopes: list[str] | None = None,
) -> OAuthClient:
    """Register the study planner if it is not registered yet.

    Registration is a deployment decision, not a learner action: there is no public
    endpoint that creates clients, so a third party cannot register one and ask for
    a grant.
    """
    client = db.get(OAuthClient, client_id)
    scopes = list(allowed_scopes or SUPPORTED_SCOPES)
    if client is None:
        client = OAuthClient(
            id=client_id,
            name=name,
            redirect_uris=list(redirect_uris),
            allowed_scopes=scopes,
        )
        db.add(client)
        db.commit()
        return client
    changed = False
    if client.name != name:
        client.name = name
        changed = True
    if client.redirect_uris != list(redirect_uris):
        client.redirect_uris = list(redirect_uris)
        changed = True
    if client.allowed_scopes != scopes:
        client.allowed_scopes = scopes
        changed = True
    if changed:
        db.commit()
    return client


def ensure_configured_client(db: Session) -> OAuthClient:
    """The client this deployment is configured to trust."""
    return ensure_client(
        db,
        client_id=config.PLANNER_CLIENT_ID,
        name=config.PLANNER_CLIENT_NAME,
        redirect_uris=list(config.PLANNER_REDIRECT_URIS),
        allowed_scopes=list(config.PLANNER_SCOPES),
    )


# --------------------------------------------------------------------- validation


def parse_scope(raw: str | None, client: OAuthClient) -> list[str]:
    """Turn a scope string into a list, refusing anything not offered to this client."""
    requested = [part for part in (raw or SCOPE_SUMMARY).replace(",", " ").split() if part]
    if not requested:
        requested = [SCOPE_SUMMARY]
    for scope in requested:
        if scope not in SUPPORTED_SCOPES or scope not in (client.allowed_scopes or []):
            raise HTTPException(400, detail={"error": "invalid_scope", "error_description": "Unsupported scope."})
    # Deduplicate, keep order.
    return list(dict.fromkeys(requested))


def require_client(db: Session, client_id: str | None) -> OAuthClient:
    client = db.get(OAuthClient, client_id or "")
    if client is None:
        raise HTTPException(400, detail={"error": "invalid_client", "error_description": "Unknown client."})
    return client


def require_redirect_uri(client: OAuthClient, redirect_uri: str | None) -> str:
    """Exact match. Prefix matching is how open redirects get authorised."""
    if not redirect_uri or redirect_uri not in (client.redirect_uris or []):
        raise HTTPException(
            400,
            detail={
                "error": "invalid_request",
                "error_description": "redirect_uri is not registered for this client.",
            },
        )
    return redirect_uri


# ------------------------------------------------------------------------ consent


def active_grant(db: Session, user_id: str, client_id: str) -> ConsentGrant | None:
    grant = (
        db.query(ConsentGrant)
        .filter(ConsentGrant.user_id == user_id, ConsentGrant.client_id == client_id)
        .first()
    )
    if grant is None or grant.revoked_at is not None:
        return None
    expires_at = aware(grant.expires_at)
    if expires_at is not None and expires_at <= utcnow():
        return None
    return grant


def record_grant(db: Session, user: User, client: OAuthClient, scopes: list[str]) -> ConsentGrant:
    """Grant, or re-grant after a revocation, without losing the earlier decision."""
    grant = (
        db.query(ConsentGrant)
        .filter(ConsentGrant.user_id == user.id, ConsentGrant.client_id == client.id)
        .first()
    )
    if grant is None:
        grant = ConsentGrant(
            user_id=user.id,
            client_id=client.id,
            scopes=scopes,
            purpose=PURPOSE,
            expires_at=(utcnow() + CONSENT_TTL) if CONSENT_TTL else None,
        )
        db.add(grant)
    else:
        grant.scopes = scopes
        grant.purpose = PURPOSE
        grant.granted_at = utcnow()
        grant.revoked_at = None
        grant.expires_at = (utcnow() + CONSENT_TTL) if CONSENT_TTL else None
    db.commit()
    return grant


def revoke_grant(db: Session, user_id: str, client_id: str) -> int:
    """Withdraw one client's access and kill every token it holds.

    Returns the number of tokens revoked. Revocation is immediate: the very next
    request with any of those tokens fails.
    """
    grant = (
        db.query(ConsentGrant)
        .filter(ConsentGrant.user_id == user_id, ConsentGrant.client_id == client_id)
        .first()
    )
    now = utcnow()
    revoked = 0
    tokens = (
        db.query(AccessToken)
        .filter(
            AccessToken.user_id == user_id,
            AccessToken.client_id == client_id,
            AccessToken.revoked_at.is_(None),
        )
        .all()
    )
    for token in tokens:
        token.revoked_at = now
        revoked += 1
    if grant is not None and grant.revoked_at is None:
        grant.revoked_at = now
    db.commit()
    return revoked


# -------------------------------------------------------------------- codes/tokens


def issue_code(
    db: Session, *, user: User, client: OAuthClient, scopes: list[str], redirect_uri: str, challenge: str
) -> str:
    raw = new_secret(32)
    db.add(
        AuthorizationCode(
            code_hash=hash_token(raw),
            client_id=client.id,
            user_id=user.id,
            scopes=scopes,
            redirect_uri=redirect_uri,
            code_challenge=challenge,
            expires_at=utcnow() + CODE_TTL,
        )
    )
    db.commit()
    return raw


def exchange_code(
    db: Session,
    *,
    code: str | None,
    client_id: str | None,
    redirect_uri: str | None,
    verifier: str | None,
) -> tuple[AccessToken, str]:
    """Validate the code and mint a token. Returns `(row, raw_token)`."""
    client = require_client(db, client_id)
    if not code:
        raise HTTPException(400, detail={"error": "invalid_request", "error_description": "code is required."})
    record = db.query(AuthorizationCode).filter(AuthorizationCode.code_hash == hash_token(code)).first()
    if record is None or record.client_id != client.id:
        raise HTTPException(400, detail={"error": "invalid_grant", "error_description": "Code is not valid."})
    now = utcnow()
    if record.used_at is not None:
        # Replay of a used code means either a bug or a leak. Revoke everything the
        # code could have produced, then refuse.
        record.used_at = now
        revoke_grant(db, record.user_id, record.client_id)
        raise HTTPException(
            400, detail={"error": "invalid_grant", "error_description": "Code has already been used."}
        )
    if aware(record.expires_at) <= now:
        raise HTTPException(400, detail={"error": "invalid_grant", "error_description": "Code has expired."})
    if redirect_uri != record.redirect_uri:
        raise HTTPException(400, detail={"error": "invalid_grant", "error_description": "redirect_uri changed."})
    if not challenge_matches(verifier or "", record.code_challenge):
        raise HTTPException(400, detail={"error": "invalid_grant", "error_description": "PKCE verification failed."})

    record.used_at = now
    raw = new_secret(32)
    token = AccessToken(
        token_hash=hash_token(raw),
        client_id=record.client_id,
        user_id=record.user_id,
        scopes=list(record.scopes),
        expires_at=now + TOKEN_TTL,
    )
    db.add(token)
    grant = active_grant(db, record.user_id, record.client_id)
    if grant is not None:
        grant.last_used_at = now
    db.commit()
    return token, raw


def bearer_token(request) -> str | None:
    header = request.headers.get("authorization") or ""
    scheme, _, value = header.partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        return None
    return value.strip()


def resolve_token(db: Session, raw: str | None, scope: str = SCOPE_SUMMARY) -> tuple[AccessToken, User]:
    """Authenticate a bearer token and check its scope. Identity comes from here."""
    if not raw:
        raise HTTPException(401, detail={"error": "invalid_token", "error_description": "Bearer token required."})
    token = db.query(AccessToken).filter(AccessToken.token_hash == hash_token(raw)).first()
    now = utcnow()
    if token is None or token.revoked_at is not None or aware(token.expires_at) <= now:
        raise HTTPException(401, detail={"error": "invalid_token", "error_description": "Token is not valid."})
    grant = active_grant(db, token.user_id, token.client_id)
    if grant is None:
        # The consent was withdrawn or has expired; the token dies with it.
        raise HTTPException(401, detail={"error": "invalid_token", "error_description": "Consent was withdrawn."})
    if scope not in (token.scopes or []):
        raise HTTPException(
            403,
            detail={"error": "insufficient_scope", "error_description": f"{scope} is required."},
        )
    user = db.get(User, token.user_id)
    if user is None:
        raise HTTPException(401, detail={"error": "invalid_token", "error_description": "Token is not valid."})
    token.last_used_at = now
    grant.last_used_at = now
    db.commit()
    return token, user


def revoke_token(db: Session, raw: str | None) -> None:
    """RFC 7009 style: always 200, whether or not the token existed."""
    if not raw:
        return
    token = db.query(AccessToken).filter(AccessToken.token_hash == hash_token(raw)).first()
    if token is None or token.revoked_at is not None:
        return
    token.revoked_at = utcnow()
    db.commit()


# --------------------------------------------------------------- the actual payload


def _iso(value: datetime | None) -> str | None:
    return aware(value).isoformat().replace("+00:00", "Z") if value else None


def _concept_title(db: Session, concept_id: str) -> str:
    concept = db.get(Concept, concept_id)
    return concept.title if concept is not None else concept_id


def learning_summary(db: Session, user: User, *, limit: int = 5) -> dict:
    """The approved summary — and nothing else.

    Deliberately NOT included: email address, password hash, session records, notes,
    tutor transcripts, chess attempts, raw answers, or assessment scores. A planner
    needs the shape of the work, not the learner's file.

    Missing data stays missing: a concept with no evidence is not reported as weak,
    and `average_mastery` is null when nothing has been reviewed.
    """
    now = utcnow()
    states = db.query(ConceptState).filter(ConceptState.user_id == user.id).all()
    reviewed = [state for state in states if (state.reps or 0) > 0]

    objectives = (
        db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.created_at.desc()).limit(20).all()
    )
    evidence_count = (
        db.query(RetrievalAttempt).filter(RetrievalAttempt.user_id == user.id).count()
    )

    last_activity = None
    for state in states:
        reviewed_at = aware(state.last_reviewed_at)
        if reviewed_at and (last_activity is None or reviewed_at > last_activity):
            last_activity = reviewed_at

    due = (
        db.query(ConceptState)
        .filter(
            ConceptState.user_id == user.id,
            ConceptState.next_review_at.is_not(None),
            ConceptState.next_review_at <= now,
        )
        .order_by(ConceptState.next_review_at.asc())
        .limit(20)
        .all()
    )

    def entry(state: ConceptState) -> dict:
        due_at = aware(state.next_review_at)
        return {
            "concept_id": state.concept_id,
            "title": _concept_title(db, state.concept_id),
            "mastery": round(float(state.mastery or 0.0), 3),
            "due_at": _iso(due_at),
            "overdue_days": max(0, (now - due_at).days) if due_at else 0,
        }

    strengths = sorted(reviewed, key=lambda s: float(s.mastery or 0.0), reverse=True)[:limit]
    attention = sorted(reviewed, key=lambda s: float(s.mastery or 0.0))[:limit]
    average = (
        round(sum(float(state.mastery or 0.0) for state in reviewed) / len(reviewed), 3)
        if reviewed
        else None
    )

    return {
        "learning_objectives": [
            {
                "id": goal.id,
                "title": goal.title,
                "concept_count": len(goal.concept_ids or []),
                "created_at": _iso(goal.created_at),
            }
            for goal in objectives
        ],
        "progress": {
            "concepts_tracked": len(states),
            "concepts_reviewed": len(reviewed),
            "average_mastery": average,
            "retrieval_attempts": evidence_count,
            "last_activity_at": _iso(last_activity),
        },
        "outstanding_activities": [entry(state) for state in due[:(limit * 2)]],
        "strengths": [entry(state) for state in strengths],
        "needs_attention": [entry(state) for state in attention],
        "updated_at": _iso(last_activity),
        "generated_at": _iso(now),
        "source": "tessera",
        "scope": SCOPE_SUMMARY,
    }


def authorization_redirect(
    *, redirect_uri: str, state: str | None, **params: str
) -> str:
    """Build the return URL. The state is echoed untouched, never inspected."""
    query = dict(params)
    if state:
        query["state"] = state
    separator = "&" if "?" in redirect_uri else "?"
    return f"{redirect_uri}{separator}{urlencode(query)}"
