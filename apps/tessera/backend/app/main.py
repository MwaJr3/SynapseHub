"""Tessera API entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .database import Base, engine
from .routes import router

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Local SQLite convenience only; PostgreSQL schema creation is Alembic's job.
    if config.DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
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



@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": "tessera", "company": config.COMPANY}
