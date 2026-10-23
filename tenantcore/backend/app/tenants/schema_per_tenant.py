"""Executable reference for the alternative schema-per-tenant strategy.

Not used by the primary RLS runtime. Functions require a privileged migration
connection and are intentionally separate from tenantcore_app.
"""

import re
import uuid

from sqlalchemy import text
from sqlalchemy.engine import Connection

SCHEMA_PATTERN = re.compile(r"^tenant_[a-f0-9]{32}$")


def schema_name_for_tenant(tenant_id: uuid.UUID | str) -> str:
    """UUID-derived names avoid slug renames, collisions, and SQL identifier injection."""
    return f"tenant_{uuid.UUID(str(tenant_id)).hex}"


def validate_schema_name(schema_name: str) -> None:
    if not SCHEMA_PATTERN.fullmatch(schema_name):
        raise ValueError("Invalid tenant schema name")


def provision_tenant_schema(connection: Connection, tenant_id: uuid.UUID | str) -> str:
    """Provision version 1 in the caller's transaction; never commit partially."""
    schema = schema_name_for_tenant(tenant_id)
    validate_schema_name(schema)
    # Identifiers cannot be bind parameters. The strict UUID-derived regex above
    # makes this controlled interpolation safe; no client-provided slug is used.
    connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    connection.execute(
        text(
            f'CREATE TABLE "{schema}".schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
        )
    )
    for table in ("teams", "projects", "tasks", "audit_events"):
        columns = {
            "teams": "id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()",
            "projects": "id uuid PRIMARY KEY, team_id uuid, name text NOT NULL, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now()",
            "tasks": "id uuid PRIMARY KEY, project_id uuid NOT NULL, title text NOT NULL, status text NOT NULL DEFAULT 'todo', created_at timestamptz NOT NULL DEFAULT now()",
            "audit_events": "id uuid PRIMARY KEY, action text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()",
        }[table]
        connection.execute(text(f'CREATE TABLE "{schema}".{table} ({columns})'))
    connection.execute(
        text(
            f'ALTER TABLE "{schema}".projects ADD CONSTRAINT projects_team_fk FOREIGN KEY (team_id) REFERENCES "{schema}".teams(id)'
        )
    )
    connection.execute(
        text(
            f'ALTER TABLE "{schema}".tasks ADD CONSTRAINT tasks_project_fk FOREIGN KEY (project_id) REFERENCES "{schema}".projects(id) ON DELETE CASCADE'
        )
    )
    connection.execute(
        text(f'CREATE INDEX projects_created ON "{schema}".projects(created_at DESC)')
    )
    connection.execute(
        text(f'CREATE INDEX tasks_project_status ON "{schema}".tasks(project_id, status)')
    )
    connection.execute(text(f'INSERT INTO "{schema}".schema_migrations(version) VALUES (1)'))
    return schema


def revoke_runtime_schema_access(connection: Connection, tenant_id: uuid.UUID | str) -> None:
    """Schema alternative uses search_path + privileges, not RLS, as its boundary."""
    schema = schema_name_for_tenant(tenant_id)
    validate_schema_name(schema)
    connection.execute(text(f'REVOKE ALL ON SCHEMA "{schema}" FROM tenantcore_app'))
    connection.execute(text(f'REVOKE ALL ON ALL TABLES IN SCHEMA "{schema}" FROM tenantcore_app'))


def drop_tenant_schema(
    connection: Connection, tenant_id: uuid.UUID | str, confirmation: str
) -> None:
    """Destruction is explicit and separate from normal archival workflows."""
    schema = schema_name_for_tenant(tenant_id)
    validate_schema_name(schema)
    if confirmation != f"DELETE {schema}":
        raise ValueError(f"Type 'DELETE {schema}' to confirm schema destruction")
    connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
