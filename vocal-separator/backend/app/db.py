"""Database schema (§46). SQLAlchemy 2; SQLite by default, PostgreSQL via DATABASE_URL."""
from __future__ import annotations
import datetime as dt, json
from sqlalchemy import (create_engine, String, Integer, Float, Boolean, Text,
                        DateTime, ForeignKey, JSON)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker
from .config import DATABASE_URL, ensure_dirs

ensure_dirs()
_engine_kw = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, **_engine_kw)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def now():
    return dt.datetime.now(dt.timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)
    owner = relationship("User", back_populates="projects")
    audio_files = relationship("AudioFile", back_populates="project", cascade="all, delete-orphan")


class AudioFile(Base):
    __tablename__ = "audio_files"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(512))
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    size_bytes: Mapped[int] = mapped_column(Integer)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)        # duration/sr/channels/codec (§10 pipeline metadata)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)
    project = relationship("Project", back_populates="audio_files")
    jobs = relationship("ProcessingJob", back_populates="audio_file", cascade="all, delete-orphan")


class ModelRecord(Base):
    __tablename__ = "models"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    version: Mapped[str] = mapped_column(String(64))
    provider: Mapped[str] = mapped_column(String(128), default="")
    license: Mapped[str] = mapped_column(String(255), default="")
    supported_sources: Mapped[list] = mapped_column(JSON, default=list)
    sample_rate: Mapped[int] = mapped_column(Integer, default=44100)
    gpu_required: Mapped[bool] = mapped_column(Boolean, default=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    audio_file_id: Mapped[int] = mapped_column(ForeignKey("audio_files.id", ondelete="CASCADE"), index=True)
    state: Mapped[str] = mapped_column(String(32), default="QUEUED", index=True)   # §49 state machine
    config: Mapped[dict] = mapped_column(JSON, default=dict)  # quality/profile/engine/vocal options
    model_name: Mapped[str] = mapped_column(String(128), default="")
    model_version: Mapped[str] = mapped_column(String(64), default="")
    pipeline_version: Mapped[str] = mapped_column(String(32), default="")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    message: Mapped[str] = mapped_column(Text, default="")
    error: Mapped[str] = mapped_column(Text, default="")
    warnings: Mapped[list] = mapped_column(JSON, default=list)
    report: Mapped[dict] = mapped_column(JSON, default=dict)   # §41 processing report
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)
    started_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    audio_file = relationship("AudioFile", back_populates="jobs")
    stages = relationship("ProcessingStage", back_populates="job", cascade="all, delete-orphan")
    stems = relationship("Stem", back_populates="job", cascade="all, delete-orphan")
    voices = relationship("VoiceTrack", back_populates="job", cascade="all, delete-orphan")


class ProcessingStage(Base):
    __tablename__ = "processing_stages"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("processing_jobs.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(64))
    state: Mapped[str] = mapped_column(String(32), default="pending")  # pending|running|done|skipped|failed
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    message: Mapped[str] = mapped_column(Text, default="")
    duration_s: Mapped[float] = mapped_column(Float, default=0.0)
    job = relationship("ProcessingJob", back_populates="stages")


class Stem(Base):
    __tablename__ = "stems"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("processing_jobs.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(64))              # vocals|soprano|voice_01|...
    kind: Mapped[str] = mapped_column(String(32))              # music|voice_part|derived|original
    storage_key: Mapped[str] = mapped_column(String(512))
    preview_key: Mapped[str] = mapped_column(String(512), default="")   # §100 preview mp3
    voice_id: Mapped[str] = mapped_column(String(32), default="")
    user_label: Mapped[str] = mapped_column(String(64), default="")     # §111 user correction
    quality: Mapped[dict] = mapped_column(JSON, default=dict)
    job = relationship("ProcessingJob", back_populates="stems")


class VoiceTrack(Base):
    __tablename__ = "voice_tracks"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("processing_jobs.id", ondelete="CASCADE"), index=True)
    voice_id: Mapped[str] = mapped_column(String(32))
    role: Mapped[str] = mapped_column(String(32), default="ensemble")
    classification: Mapped[str] = mapped_column(String(32), default="unknown")
    user_classification: Mapped[str] = mapped_column(String(32), default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    data: Mapped[dict] = mapped_column(JSON, default=dict)     # ranges, predictions, pitch stats
    job = relationship("ProcessingJob", back_populates="voices")


class Export(Base):
    __tablename__ = "exports"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("processing_jobs.id", ondelete="CASCADE"), index=True)
    format: Mapped[str] = mapped_column(String(16))
    storage_key: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(128))
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)


MODEL_SEED = [
    dict(name="dsp-softmask", version="1.0.0", provider="Built-in DSP", license="Project licence",
         supported_sources=["vocals", "drums", "bass", "other", "instrumental"], gpu_required=False,
         meta={"kind": "stft-soft-mask", "expected_quality": "baseline",
               "notes": "Wiener-style mask partition; stems sum exactly to the mix."}),
    dict(name="htdemucs", version="v4", provider="Meta AI (Demucs)", license="MIT (model weights per Demucs repo)",
         supported_sources=["vocals", "drums", "bass", "other"], gpu_required=False,
         meta={"kind": "hybrid-transformer", "expected_quality": "high",
               "notes": "Weights downloaded from Meta on first use."}),
    dict(name="htdemucs_6s", version="v4", provider="Meta AI (Demucs)", license="MIT (model weights per Demucs repo)",
         supported_sources=["vocals", "drums", "bass", "piano", "guitar", "other"], gpu_required=False,
         meta={"kind": "hybrid-transformer-6s", "expected_quality": "moderate (guitar/piano are experimental)"}),
    dict(name="spleeter", version="2/4/5-stem", provider="Deezer", license="MIT",
         supported_sources=["vocals", "drums", "bass", "piano", "other"], gpu_required=False,
         meta={"kind": "unet", "expected_quality": "moderate", "notes": "Legacy TensorFlow stack; not bundled."}),
    dict(name="harmonic-mask-voice-separator", version="1.0.0", provider="Built-in Level-2",
         license="Project licence",
         supported_sources=["soprano", "alto", "contralto", "tenor", "baritone", "bass_baritone", "bass", "unknown"],
         gpu_required=False,
         meta={"kind": "multi-pitch salience + tracking + harmonic soft masks",
               "expected_quality": "experimental — confidence-gated, Unknown is a valid result"}),
]


def init_db():
    Base.metadata.create_all(engine)
    with SessionLocal() as s:
        for row in MODEL_SEED:
            if not s.query(ModelRecord).filter_by(name=row["name"]).first():
                s.add(ModelRecord(**row))
        s.commit()
