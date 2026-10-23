from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import asc, desc, func, select

from app.api.schemas import PageMetadata
from app.audit.service import tenant_event
from app.auth.dependencies import TenantContext, TenantRole, get_tenant_context, require_roles
from app.errors import NotFoundError
from app.models import Project, Team
from app.projects.schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])
WRITE_ROLES: tuple[TenantRole, ...] = ("tenant_admin", "manager", "member")


@router.get("")
def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=160),
    project_status: str | None = Query(None, alias="status", max_length=20),
    team_id: str | None = None,
    sort: str = Query("created_at", pattern="^(created_at|name|status)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    context: TenantContext = Depends(get_tenant_context),
):
    filters = [Project.tenant_id == context.tenant_id]
    if search:
        filters.append(Project.name.ilike(f"%{search.strip()}%"))
    if project_status:
        filters.append(Project.status == project_status)
    if team_id:
        filters.append(Project.team_id == team_id)
    total = context.db.scalar(select(func.count(Project.id)).where(*filters)) or 0
    sort_column = getattr(Project, sort)
    projects = context.db.scalars(
        select(Project)
        .where(*filters)
        .order_by(asc(sort_column) if order == "asc" else desc(sort_column), Project.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [ProjectResponse.model_validate(project) for project in projects],
        "meta": PageMetadata(
            page=page, page_size=page_size, total=total, pages=(total + page_size - 1) // page_size
        ),
    }


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    context: TenantContext = Depends(require_roles(*WRITE_ROLES)),
):
    if payload.team_id and context.db.get(Team, payload.team_id) is None:
        raise NotFoundError("Team")
    project = Project(
        tenant_id=context.tenant_id,
        created_by=context.user_id,
        **payload.model_dump(),
    )
    context.db.add(project)
    context.db.flush()
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="project.created",
        resource_type="project",
        resource_id=project.id,
        metadata={"name": project.name},
        request_id=context.request_id,
    )
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, context: TenantContext = Depends(get_tenant_context)):
    project = context.db.get(Project, project_id)
    if project is None:
        # RLS makes another tenant's row indistinguishable from a missing row.
        raise NotFoundError("Project")
    return ProjectResponse.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    context: TenantContext = Depends(require_roles(*WRITE_ROLES)),
):
    project = context.db.get(Project, project_id)
    if project is None:
        raise NotFoundError("Project")
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("team_id") and context.db.get(Team, changes["team_id"]) is None:
        raise NotFoundError("Team")
    for key, value in changes.items():
        setattr(project, key, value)
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="project.updated",
        resource_type="project",
        resource_id=project.id,
        metadata={"fields": sorted(changes)},
        request_id=context.request_id,
    )
    context.db.flush()
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str, context: TenantContext = Depends(require_roles("tenant_admin", "manager"))
):
    project = context.db.get(Project, project_id)
    if project is None:
        raise NotFoundError("Project")
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="project.deleted",
        resource_type="project",
        resource_id=project.id,
        metadata={"name": project.name},
        request_id=context.request_id,
    )
    context.db.delete(project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
