from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import asc, desc, func, select

from app.api.schemas import PageMetadata
from app.audit.service import tenant_event
from app.auth.dependencies import TenantContext, TenantRole, get_tenant_context, require_roles
from app.errors import AppError, NotFoundError
from app.models import Comment, Project, Task, TenantMembership
from app.tasks.schemas import CommentCreate, CommentResponse, TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])
WRITE_ROLES: tuple[TenantRole, ...] = ("tenant_admin", "manager", "member")


def validate_relationships(context: TenantContext, project_id, assignee_id) -> None:
    if context.db.get(Project, project_id) is None:
        raise NotFoundError("Project")
    if assignee_id:
        membership = context.db.get(TenantMembership, (context.tenant_id, assignee_id))
        if membership is None or membership.status != "active":
            raise AppError(
                400, "INVALID_ASSIGNEE", "The assignee is not an active organization member"
            )


@router.get("")
def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    project_id: str | None = None,
    task_status: str | None = Query(None, alias="status", max_length=20),
    assignee_id: str | None = None,
    search: str | None = Query(None, max_length=200),
    sort: str = Query("created_at", pattern="^(created_at|due_date|priority|status|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    context: TenantContext = Depends(get_tenant_context),
):
    filters = [Task.tenant_id == context.tenant_id]
    if project_id:
        filters.append(Task.project_id == project_id)
    if task_status:
        filters.append(Task.status == task_status)
    if assignee_id:
        filters.append(Task.assignee_id == assignee_id)
    if search:
        filters.append(Task.title.ilike(f"%{search.strip()}%"))
    total = context.db.scalar(select(func.count(Task.id)).where(*filters)) or 0
    sort_column = getattr(Task, sort)
    tasks = context.db.scalars(
        select(Task)
        .where(*filters)
        .order_by(asc(sort_column) if order == "asc" else desc(sort_column), Task.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [TaskResponse.model_validate(task) for task in tasks],
        "meta": PageMetadata(
            page=page, page_size=page_size, total=total, pages=(total + page_size - 1) // page_size
        ),
    }


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, context: TenantContext = Depends(require_roles(*WRITE_ROLES))):
    validate_relationships(context, payload.project_id, payload.assignee_id)
    task = Task(
        tenant_id=context.tenant_id,
        created_by=context.user_id,
        **payload.model_dump(),
    )
    context.db.add(task)
    context.db.flush()
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="task.created",
        resource_type="task",
        resource_id=task.id,
        metadata={"project_id": str(task.project_id)},
        request_id=context.request_id,
    )
    return TaskResponse.model_validate(task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, context: TenantContext = Depends(get_tenant_context)):
    task = context.db.get(Task, task_id)
    if task is None:
        raise NotFoundError("Task")
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    context: TenantContext = Depends(require_roles(*WRITE_ROLES)),
):
    task = context.db.scalar(select(Task).where(Task.id == task_id).with_for_update())
    if task is None:
        raise NotFoundError("Task")
    if task.version != payload.version:
        raise AppError(409, "VERSION_CONFLICT", "This task changed. Reload it and retry.")
    changes = payload.model_dump(exclude_unset=True, exclude={"version"})
    project_id = changes.get("project_id", task.project_id)
    assignee_id = changes.get("assignee_id", task.assignee_id)
    validate_relationships(context, project_id, assignee_id)
    for key, value in changes.items():
        setattr(task, key, value)
    task.version += 1
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="task.updated",
        resource_type="task",
        resource_id=task.id,
        metadata={"fields": sorted(changes)},
        request_id=context.request_id,
    )
    context.db.flush()
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str, context: TenantContext = Depends(require_roles("tenant_admin", "manager"))
):
    task = context.db.get(Task, task_id)
    if task is None:
        raise NotFoundError("Task")
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="task.deleted",
        resource_type="task",
        resource_id=task.id,
        request_id=context.request_id,
    )
    context.db.delete(task)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{task_id}/comments")
def list_comments(task_id: str, context: TenantContext = Depends(get_tenant_context)):
    if context.db.get(Task, task_id) is None:
        raise NotFoundError("Task")
    comments = context.db.scalars(
        select(Comment).where(Comment.task_id == task_id).order_by(Comment.created_at)
    ).all()
    return {"items": [CommentResponse.model_validate(comment) for comment in comments]}


@router.post(
    "/{task_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED
)
def create_comment(
    task_id: str,
    payload: CommentCreate,
    context: TenantContext = Depends(require_roles(*WRITE_ROLES)),
):
    if context.db.get(Task, task_id) is None:
        raise NotFoundError("Task")
    comment = Comment(
        tenant_id=context.tenant_id,
        task_id=task_id,
        author_id=context.user_id,
        body=payload.body,
    )
    context.db.add(comment)
    context.db.flush()
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="comment.created",
        resource_type="comment",
        resource_id=comment.id,
        metadata={"task_id": task_id},
        request_id=context.request_id,
    )
    return CommentResponse.model_validate(comment)
