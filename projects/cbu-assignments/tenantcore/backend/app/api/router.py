from fastapi import APIRouter

from app.api.routes import (
    api_keys,
    audit,
    auth,
    dashboard,
    members,
    projects,
    records,
    tasks,
    teams,
    tenants,
    usage,
)

api_router = APIRouter()
for module in (
    auth,
    tenants,
    members,
    projects,
    teams,
    tasks,
    records,
    dashboard,
    audit,
    usage,
    api_keys,
):
    api_router.include_router(module.router)
