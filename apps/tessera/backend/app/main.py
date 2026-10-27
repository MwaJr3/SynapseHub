"""Tessera API entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .database import Base, SessionLocal, engine
from .integration import ensure_configured_client
from .integration_routes import router as integration_router
from .routes import router

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

app.include_router(router)
app.include_router(integration_router)



@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": "tessera", "company": config.COMPANY}
