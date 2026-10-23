#!/usr/bin/env python3
"""Direct psycopg proof using tenantcore_app, not the migration/superuser role."""

import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import get_settings  # noqa: E402
from app.demo.ids import PROJECTS, TENANTS, USERS  # noqa: E402


def connect():
    settings = get_settings()
    url = settings.database_url.replace("postgresql+psycopg://", "postgresql://")
    connection = psycopg.connect(url, prepare_threshold=None)
    if settings.database_role:
        if settings.database_role != "tenantcore_app":
            raise ValueError("Unexpected database test role")
        connection.execute("SET ROLE tenantcore_app")
        connection.commit()
    return connection


def context(cursor, tenant, user):
    cursor.execute("SELECT set_config('app.tenant_id', %s, true)", (str(tenant),))
    cursor.execute("SELECT set_config('app.user_id', %s, true)", (str(user),))
    cursor.execute("SELECT set_config('app.is_platform_admin', 'false', true)")


def main() -> None:
    acme, globex = TENANTS["acme"], TENANTS["globex"]
    acme_admin, globex_admin = USERS["acme_admin"], USERS["globex_admin"]
    globex_project = PROJECTS["globex_a"]
    with connect() as connection:
        with connection.transaction():
            with connection.cursor() as cursor:
                context(cursor, acme, acme_admin)
                cursor.execute("SELECT id, name, tenant_id FROM projects ORDER BY name")
                rows = cursor.fetchall()
                assert len(rows) >= 2 and all(row[2] == acme for row in rows)
                print(f"ALLOWED Acme -> Acme SELECT: {len(rows)} projects, all tenant-bound")
                cursor.execute("SELECT id FROM projects WHERE id = %s", (globex_project,))
                assert cursor.fetchone() is None
                print("DENIED  Acme -> Globex SELECT: row hidden by RLS")

        try:
            with connection.transaction():
                with connection.cursor() as cursor:
                    context(cursor, acme, acme_admin)
                    cursor.execute(
                        "INSERT INTO projects (tenant_id, name, created_by) VALUES (%s, %s, %s)",
                        (globex, "MALICIOUS CROSS-TENANT INSERT", globex_admin),
                    )
        except psycopg.errors.InsufficientPrivilege as exc:
            print(f"DENIED  Acme -> Globex INSERT: {exc.sqlstate} RLS WITH CHECK")
        else:
            raise AssertionError("Cross-tenant INSERT unexpectedly succeeded")

        for operation in ("UPDATE", "DELETE"):
            with connection.transaction():
                with connection.cursor() as cursor:
                    context(cursor, acme, acme_admin)
                    if operation == "UPDATE":
                        cursor.execute(
                            "UPDATE projects SET name = 'unauthorized' WHERE id = %s",
                            (globex_project,),
                        )
                    else:
                        cursor.execute("DELETE FROM projects WHERE id = %s", (globex_project,))
                    assert cursor.rowcount == 0
                    print(f"DENIED  Acme -> Globex {operation}: 0 rows affected")
    print("Isolation demonstration passed with the tenantcore_app database role.")


if __name__ == "__main__":
    main()
