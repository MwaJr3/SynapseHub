import psycopg
import pytest

pytestmark = pytest.mark.postgres


def test_clean_migration_installed_constraints_indexes_and_all_rls_policies(postgres_database):
    import os

    url = os.environ["TEST_MIGRATION_DATABASE_URL"].replace(
        "postgresql+psycopg://", "postgresql://"
    )
    from app.database.session import engine

    engine.dispose()  # PGlite serialized mode: no idle app connection beside this raw one.
    tenant_tables = {
        "teams",
        "projects",
        "tasks",
        "documents",
        "comments",
        "notifications",
        "tenant_audit_events",
        "api_keys",
        "subscriptions",
        "usage_metrics",
        "tenant_memberships",
    }
    with psycopg.connect(url) as connection:
        if os.getenv("TEST_DATABASE_ROLE"):
            connection.execute("RESET ROLE")
            connection.commit()
        version = connection.execute("SELECT version_num FROM alembic_version").fetchone()[0]
        assert version == "20261022_0001"
        rows = connection.execute(
            """SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, count(p.policyname)
               FROM pg_class c
               JOIN pg_namespace n ON n.oid = c.relnamespace
               LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
               WHERE n.nspname = 'public' AND c.relname = ANY(%s)
               GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity""",
            (list(tenant_tables),),
        ).fetchall()
        assert len(rows) == len(tenant_tables)
        for name, enabled, forced, policy_count in rows:
            assert enabled and forced, name
            assert policy_count == 4, (name, policy_count)
        fk = connection.execute(
            """SELECT count(*) FROM pg_constraint
               WHERE contype = 'f' AND conrelid = 'tasks'::regclass
                 AND confrelid = 'projects'::regclass"""
        ).fetchone()[0]
        assert fk == 1
        indexes = connection.execute(
            "SELECT indexname FROM pg_indexes WHERE tablename = 'tasks'"
        ).fetchall()
        assert "ix_tasks_tenant_project" in {row[0] for row in indexes}
