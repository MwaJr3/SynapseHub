from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import func, select

from app.api.schemas import MessageResponse, PageMetadata
from app.audit.service import tenant_event
from app.auth.dependencies import TenantContext, get_tenant_context, require_roles
from app.errors import NotFoundError
from app.models import Document, Notification, Project
from app.tasks.schemas import DocumentCreate, DocumentResponse, NotificationResponse

router = APIRouter(tags=["records"])


@router.get("/documents")
def list_documents(
    project_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    context: TenantContext = Depends(get_tenant_context),
):
    filters = [Document.tenant_id == context.tenant_id]
    if project_id:
        filters.append(Document.project_id == project_id)
    total = context.db.scalar(select(func.count(Document.id)).where(*filters)) or 0
    documents = context.db.scalars(
        select(Document)
        .where(*filters)
        .order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [DocumentResponse.model_validate(document) for document in documents],
        "meta": PageMetadata(
            page=page, page_size=page_size, total=total, pages=(total + page_size - 1) // page_size
        ),
    }


@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreate,
    context: TenantContext = Depends(require_roles("tenant_admin", "manager", "member")),
):
    if context.db.get(Project, payload.project_id) is None:
        raise NotFoundError("Project")
    content = payload.content.encode("utf-8")
    document = Document(
        tenant_id=context.tenant_id,
        created_by=context.user_id,
        storage_bytes=len(content),
        **payload.model_dump(),
    )
    context.db.add(document)
    context.db.flush()
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="document.created",
        resource_type="document",
        resource_id=document.id,
        metadata={"project_id": str(document.project_id)},
        request_id=context.request_id,
    )
    return DocumentResponse.model_validate(document)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    context: TenantContext = Depends(require_roles("tenant_admin", "manager")),
):
    document = context.db.get(Document, document_id)
    if document is None:
        raise NotFoundError("Document")
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="document.deleted",
        resource_type="document",
        resource_id=document.id,
        request_id=context.request_id,
    )
    context.db.delete(document)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/notifications")
def list_notifications(context: TenantContext = Depends(get_tenant_context)):
    notifications = context.db.scalars(
        select(Notification)
        .where(Notification.user_id == context.user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    ).all()
    return {"items": [NotificationResponse.model_validate(item) for item in notifications]}


@router.post("/notifications/{notification_id}/read", response_model=MessageResponse)
def mark_notification_read(
    notification_id: str, context: TenantContext = Depends(get_tenant_context)
):
    notification = context.db.get(Notification, notification_id)
    if notification is None:
        raise NotFoundError("Notification")
    notification.read_at = notification.read_at or datetime.now(UTC)
    return MessageResponse(message="Notification marked as read")
