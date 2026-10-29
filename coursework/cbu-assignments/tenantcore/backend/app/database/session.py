import uuid
from collections.abc import Generator, Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

settings = get_settings()
# Safe with transaction pooling and PGlite's multiplexed test connections.
# Parameterization remains enabled; only server-side prepared statements are off.
connect_args = {"prepare_threshold": None}
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_timeout=10,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


if settings.database_role:
    if settings.database_role != "tenantcore_app":
        raise ValueError("DATABASE_ROLE only supports the tenantcore_app test role")

    @event.listens_for(engine, "connect")
    def assume_test_runtime_role(dbapi_connection, _connection_record) -> None:
        # PGlite ignores the startup username. Official PostgreSQL does not need this.
        with dbapi_connection.cursor() as cursor:
            cursor.execute("SET ROLE tenantcore_app")
        dbapi_connection.commit()


def set_context(
    session: Session,
    *,
    tenant_id: uuid.UUID | str | None = None,
    user_id: uuid.UUID | str | None = None,
    platform_admin: bool = False,
    request_id: str | None = None,
) -> None:
    """Set transaction-local context. The transaction is the context boundary.

    Request handlers call this only after server-side membership verification. These are
    custom GUCs, not credentials; database credentials must never be issued to app users.
    """
    values = {
        "app.tenant_id": str(tenant_id) if tenant_id else "",
        "app.user_id": str(user_id) if user_id else "",
        "app.is_platform_admin": "true" if platform_admin else "false",
        "app.request_id": request_id or "",
    }
    for key, value in values.items():
        session.execute(text("SELECT set_config(:key, :value, true)"), {"key": key, "value": value})


@contextmanager
def session_scope(
    *,
    tenant_id: uuid.UUID | str | None = None,
    user_id: uuid.UUID | str | None = None,
    platform_admin: bool = False,
    request_id: str | None = None,
) -> Iterator[Session]:
    session = SessionLocal()
    try:
        set_context(
            session,
            tenant_id=tenant_id,
            user_id=user_id,
            platform_admin=platform_admin,
            request_id=request_id,
        )
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """Unscoped control-plane transaction; tenant routes must use TenantContext."""
    with session_scope() as session:
        yield session
