from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import func, select

from app.api.schemas import PageMetadata
from app.audit.service import tenant_event
from app.auth.dependencies import TenantContext, get_tenant_context, require_roles
from app.errors import AppError, NotFoundError
from app.models import Project, Team
from app.teams.schemas import TeamCreate, TeamResponse, TeamUpdate

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("")
def list_teams(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    context: TenantContext = Depends(get_tenant_context),
):
    total = (
        context.db.scalar(select(func.count(Team.id)).where(Team.tenant_id == context.tenant_id))
        or 0
    )
    teams = context.db.scalars(
        select(Team)
        .where(Team.tenant_id == context.tenant_id)
        .order_by(Team.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [TeamResponse.model_validate(team) for team in teams],
        "meta": PageMetadata(
            page=page, page_size=page_size, total=total, pages=(total + page_size - 1) // page_size
        ),
    }


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreate, context: TenantContext = Depends(require_roles("tenant_admin", "manager"))
):
    team = Team(tenant_id=context.tenant_id, created_by=context.user_id, **payload.model_dump())
    context.db.add(team)
    context.db.flush()
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="team.created",
        resource_type="team",
        resource_id=team.id,
        metadata={"name": team.name},
        request_id=context.request_id,
    )
    return TeamResponse.model_validate(team)


@router.patch("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: str,
    payload: TeamUpdate,
    context: TenantContext = Depends(require_roles("tenant_admin", "manager")),
):
    team = context.db.get(Team, team_id)
    if team is None:
        raise NotFoundError("Team")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(team, key, value)
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="team.updated",
        resource_type="team",
        resource_id=team.id,
        metadata={"fields": sorted(changes)},
        request_id=context.request_id,
    )
    context.db.flush()
    return TeamResponse.model_validate(team)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: str, context: TenantContext = Depends(require_roles("tenant_admin", "manager"))
):
    team = context.db.get(Team, team_id)
    if team is None:
        raise NotFoundError("Team")
    project_count = (
        context.db.scalar(select(func.count(Project.id)).where(Project.team_id == team.id)) or 0
    )
    if project_count:
        raise AppError(409, "TEAM_IN_USE", "Move this team's projects before deleting it")
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="team.deleted",
        resource_type="team",
        resource_id=team.id,
        metadata={"name": team.name},
        request_id=context.request_id,
    )
    context.db.delete(team)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
