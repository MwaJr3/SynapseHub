import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, status

from app.api.schemas import MessageResponse
from app.audit.service import tenant_event
from app.auth.dependencies import TenantContext, require_roles
from app.auth.security import hash_token
from app.errors import NotFoundError
from app.models import APIKey
from app.tenants.schemas import APIKeyCreate, APIKeyCreatedResponse, APIKeyResponse

router = APIRouter(prefix="/api-keys", tags=["API credentials"])


@router.get("")
def list_api_keys(context: TenantContext = Depends(require_roles("tenant_admin"))):
    from sqlalchemy import select

    keys = context.db.scalars(
        select(APIKey)
        .where(APIKey.tenant_id == context.tenant_id)
        .order_by(APIKey.created_at.desc())
    ).all()
    return {"items": [APIKeyResponse.model_validate(key) for key in keys]}


@router.post("", response_model=APIKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(
    payload: APIKeyCreate, context: TenantContext = Depends(require_roles("tenant_admin"))
):
    prefix = f"tc_{secrets.token_hex(6)}"
    secret = f"{prefix}.{secrets.token_urlsafe(36)}"
    key = APIKey(
        tenant_id=context.tenant_id,
        name=payload.name,
        prefix=prefix,
        key_hash=hash_token(secret),
        scopes=payload.scopes,
        created_by=context.user_id,
        expires_at=(
            datetime.now(UTC) + timedelta(days=payload.expires_in_days)
            if payload.expires_in_days
            else None
        ),
    )
    context.db.add(key)
    context.db.flush()
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="api_key.created",
        resource_type="api_key",
        resource_id=key.id,
        metadata={"prefix": prefix, "scopes": payload.scopes},
        request_id=context.request_id,
    )
    context.db.flush()
    return APIKeyCreatedResponse(
        api_key=APIKeyResponse.model_validate(key),
        secret=secret,
        warning="This secret is shown once. Only its SHA-256 hash is stored.",
    )


@router.post("/{key_id}/revoke", response_model=MessageResponse)
def revoke_api_key(key_id: str, context: TenantContext = Depends(require_roles("tenant_admin"))):
    key = context.db.get(APIKey, key_id)
    if key is None:
        raise NotFoundError("API key")
    if key.revoked_at is None:
        key.revoked_at = datetime.now(UTC)
        tenant_event(
            context.db,
            tenant_id=context.tenant_id,
            actor_user_id=context.user_id,
            action="api_key.revoked",
            resource_type="api_key",
            resource_id=key.id,
            metadata={"prefix": key.prefix},
            request_id=context.request_id,
        )
    return MessageResponse(message="API key revoked")
