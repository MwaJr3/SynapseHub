import os
import time

import psycopg
import pytest

from app.demo.ids import PROJECTS, TENANTS, USERS

pytestmark = [pytest.mark.postgres, pytest.mark.security]


@pytest.fixture(autouse=True)
def release_application_pool(postgres_database):
    from app.database.session import engine

    engine.dispose()
    yield
    engine.dispose()


def runtime_connection(url: str):
    # PGlite occasionally closes a new emulated client during setup. Retry only
    # connection establishment, never a SQL assertion or partially executed test.
    attempts = 5 if os.getenv("TEST_DATABASE_ROLE") else 1
    for attempt in range(attempts):
        try:
            connection = psycopg.connect(url, prepare_threshold=None)
            break
        except psycopg.OperationalError:
            if attempt == attempts - 1:
                raise
            time.sleep(0.1 * (attempt + 1))
    if os.getenv("TEST_DATABASE_ROLE"):
        if os.environ["TEST_DATABASE_ROLE"] != "tenantcore_app":
            raise ValueError("Unexpected test role")
        connection.execute("SET ROLE tenantcore_app")
        connection.commit()
    return connection


def set_context(cursor, tenant_id=None, user_id=None):
    cursor.execute("SELECT set_config('app.tenant_id', %s, true)", (str(tenant_id or ""),))
    cursor.execute("SELECT set_config('app.user_id', %s, true)", (str(user_id or ""),))
    cursor.execute("SELECT set_config('app.is_platform_admin', 'false', true)")


def test_select_insert_update_delete_isolation_with_runtime_role(raw_database_url):
    with runtime_connection(raw_database_url) as connection:
        with connection.cursor() as cursor:
            set_context(cursor, TENANTS["acme"], USERS["acme_admin"])
            cursor.execute("SELECT tenant_id FROM projects")
            assert {row[0] for row in cursor.fetchall()} == {TENANTS["acme"]}
            cursor.execute("SELECT id FROM projects WHERE id = %s", (PROJECTS["globex_a"],))
            assert cursor.fetchone() is None
            cursor.execute(
                "UPDATE projects SET name = 'cross-tenant attack' WHERE id = %s",
                (PROJECTS["globex_a"],),
            )
            assert cursor.rowcount == 0
            cursor.execute("DELETE FROM projects WHERE id = %s", (PROJECTS["globex_a"],))
            assert cursor.rowcount == 0
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                cursor.execute(
                    "INSERT INTO projects (tenant_id, name, created_by) VALUES (%s, %s, %s)",
                    (TENANTS["globex"], "cross-tenant attack", USERS["globex_admin"]),
                )


def test_same_tenant_insert_allowed_and_transaction_context_resets(raw_database_url):
    with runtime_connection(raw_database_url) as connection:
        with connection.cursor() as cursor:
            set_context(cursor, TENANTS["acme"], USERS["acme_admin"])
            cursor.execute(
                "INSERT INTO projects (tenant_id, name, created_by) VALUES (%s, %s, %s) RETURNING id",
                (TENANTS["acme"], "Temporary same-tenant insert", USERS["acme_admin"]),
            )
            assert cursor.fetchone() is not None
        connection.rollback()
        # Transaction-local GUCs are gone, so the next transaction sees no rows.
        with connection.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM projects")
            assert cursor.fetchone()[0] == 0
        connection.rollback()


def test_composite_foreign_key_blocks_cross_tenant_project_reference(raw_database_url):
    with runtime_connection(raw_database_url) as connection:
        with connection.cursor() as cursor:
            set_context(cursor, TENANTS["acme"], USERS["acme_admin"])
            with pytest.raises(psycopg.errors.ForeignKeyViolation):
                cursor.execute(
                    """INSERT INTO tasks (tenant_id, project_id, created_by, title)
                       VALUES (%s, %s, %s, %s)""",
                    (
                        TENANTS["acme"],
                        PROJECTS["globex_a"],
                        USERS["acme_admin"],
                        "Cross-tenant relationship attack",
                    ),
                )


def test_audit_events_cannot_be_modified_by_runtime_role(raw_database_url):
    with runtime_connection(raw_database_url) as connection:
        with connection.cursor() as cursor:
            set_context(cursor, TENANTS["acme"], USERS["acme_admin"])
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                cursor.execute("UPDATE tenant_audit_events SET action = 'tampered'")


def test_runtime_role_is_not_privileged(raw_database_url):
    with runtime_connection(raw_database_url) as connection:
        row = connection.execute(
            "SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = 'tenantcore_app'"
        ).fetchone()
        assert row == (False, False, False, False)
