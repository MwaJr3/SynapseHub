"""Tessera API entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .account_routes import router as account_router
from .development_routes import router as development_router
from .database import Base, SessionLocal, engine
from .gamification import ensure_quests
from .integration import ensure_configured_client
from .integration_routes import router as integration_router
from .quest_routes import router as quest_router
from .routes import router
from .headers import security_headers
from .static_site import mount_frontend

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Local SQLite convenience only; PostgreSQL schema creation is Alembic's job.
    if config.DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
    # Register the study planner as a known client. Registration is a deployment
    # decision (env-configured), not a public endpoint: nothing can create a client
    # at runtime and then ask a learner for a grant. Skipped when the integration
    # tables have not been migrated yet, so the API still starts on an older schema.
    from sqlalchemy.exc import SQLAlchemyError

    with SessionLocal() as db:
        try:
            ensure_configured_client(db)
        except SQLAlchemyError:
            logging.getLogger("tessera.integration").warning(
                "integration tables are missing; run the Alembic migration to enable "
                "the study planner connection"
            )
        for problem in config.production_problems():
            # Not a crash: the app still serves, and refusing to start would turn a
            # configuration mistake into an outage. But it must be impossible to
            # miss, and `python3 -m app.preflight` is the blocking version.
            logging.getLogger("tessera.config").error("production configuration: %s", problem)
        try:
            ensure_quests(db)
        except SQLAlchemyError as error:
            # Say what actually failed. The common cause is a missing migration, but a
            # warning that only says so hides every other reason the seed could fail.
            logging.getLogger("tessera.quests").warning(
                "quests are unavailable (%s); run the Alembic migration if the quest "
                "tables do not exist yet",
                error,
            )
    yield


app = FastAPI(
    title="Tessera",
    version="0.1.0",
    description=(
        "An adaptive learning engine: a knowledge graph, a learner model, and "
        "evidence-based scheduling. Part of Tamuzi Learning."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(security_headers)

app.include_router(router)
app.include_router(integration_router)
app.include_router(quest_router)
app.include_router(account_router)
app.include_router(development_router)

# After every API router, so the catch-all only sees paths the API did not claim.
if config.FRONTEND_DIR:
    mount_frontend(app, config.FRONTEND_DIR)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": "tessera", "company": config.COMPANY}
