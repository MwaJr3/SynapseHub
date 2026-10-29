"""Initial schema, constraints, indexes, audit infrastructure, and RLS.

Revision ID: 20261022_0001
Revises:
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261022_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TENANT_TABLES = (
    "teams",
    "projects",
    "tasks",
    "documents",
    "comments",
    "tenant_audit_events",
    "api_keys",
    "subscriptions",
    "usage_metrics",
)


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenantcore_app') THEN
            RAISE EXCEPTION 'Role tenantcore_app must exist before migrating; see deployment docs';
          END IF;
        END $$;
        CREATE SCHEMA app;
        CREATE FUNCTION app.current_tenant_id() RETURNS uuid
          LANGUAGE sql STABLE PARALLEL SAFE
          AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;
        CREATE FUNCTION app.current_user_id() RETURNS uuid
          LANGUAGE sql STABLE PARALLEL SAFE
          AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;
        CREATE FUNCTION app.is_platform_admin() RETURNS boolean
          LANGUAGE sql STABLE PARALLEL SAFE
          AS $$ SELECT COALESCE(NULLIF(current_setting('app.is_platform_admin', true), ''), 'false')::boolean $$;

        CREATE TABLE plans (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          code varchar(40) NOT NULL UNIQUE,
          name varchar(100) NOT NULL,
          limits jsonb NOT NULL DEFAULT '{}'::jsonb,
          price_cents_monthly integer NOT NULL DEFAULT 0 CHECK (price_cents_monthly >= 0),
          is_active boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE tenants (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name varchar(160) NOT NULL,
          slug varchar(80) NOT NULL UNIQUE,
          status varchar(20) NOT NULL DEFAULT 'provisioning',
          plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
          configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
          provisioned_at timestamptz,
          suspended_at timestamptz,
          archived_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT ck_tenants_valid_status CHECK (status IN ('provisioning','active','suspended','archived')),
          CONSTRAINT ck_tenants_valid_slug CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
        );
        CREATE INDEX ix_tenants_status_created_at ON tenants(status, created_at);

        CREATE TABLE users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email varchar(320) NOT NULL UNIQUE,
          full_name varchar(160) NOT NULL,
          password_hash text,
          is_active boolean NOT NULL DEFAULT false,
          is_platform_admin boolean NOT NULL DEFAULT false,
          last_login_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT ck_users_lowercase_email CHECK (email = lower(email))
        );

        CREATE TABLE tenant_memberships (
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          role varchar(20) NOT NULL DEFAULT 'member',
          status varchar(20) NOT NULL DEFAULT 'invited',
          invited_by uuid REFERENCES users(id) ON DELETE RESTRICT,
          invitation_token_hash varchar(64) UNIQUE,
          invitation_expires_at timestamptz,
          joined_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (tenant_id, user_id),
          CONSTRAINT ck_memberships_valid_role CHECK (role IN ('tenant_admin','manager','member','read_only')),
          CONSTRAINT ck_memberships_valid_status CHECK (status IN ('invited','active','deactivated'))
        );
        CREATE INDEX ix_memberships_user_status ON tenant_memberships(user_id, status);
        CREATE INDEX ix_memberships_tenant_role ON tenant_memberships(tenant_id, role);

        CREATE TABLE auth_sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          refresh_token_hash varchar(64) NOT NULL UNIQUE,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL,
          revoked_at timestamptz,
          replaced_by uuid,
          ip_address varchar(64),
          user_agent text
        );
        CREATE INDEX ix_auth_sessions_user_active ON auth_sessions(user_id, revoked_at);

        CREATE TABLE platform_audit_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
          action varchar(100) NOT NULL,
          resource_type varchar(80) NOT NULL,
          resource_id varchar(100),
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          request_id varchar(100),
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_platform_audit_created_at ON platform_audit_events(created_at DESC);
        CREATE INDEX ix_platform_audit_actor ON platform_audit_events(actor_user_id, created_at DESC);

        CREATE TABLE teams (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          name varchar(120) NOT NULL,
          description text NOT NULL DEFAULT '',
          created_by uuid NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT uq_teams_tenant_id_id UNIQUE (tenant_id, id),
          CONSTRAINT uq_teams_tenant_name UNIQUE (tenant_id, name),
          CONSTRAINT fk_teams_tenant_creator FOREIGN KEY (tenant_id, created_by)
            REFERENCES tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT
        );
        CREATE INDEX ix_teams_tenant_created ON teams(tenant_id, created_at DESC);

        CREATE TABLE projects (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          team_id uuid,
          name varchar(160) NOT NULL,
          description text NOT NULL DEFAULT '',
          status varchar(20) NOT NULL DEFAULT 'active',
          created_by uuid NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT uq_projects_tenant_id_id UNIQUE (tenant_id, id),
          CONSTRAINT fk_projects_tenant_team FOREIGN KEY (tenant_id, team_id)
            REFERENCES teams(tenant_id, id) ON DELETE RESTRICT,
          CONSTRAINT fk_projects_tenant_creator FOREIGN KEY (tenant_id, created_by)
            REFERENCES tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT,
          CONSTRAINT ck_projects_valid_status CHECK (status IN ('active','on_hold','completed','archived'))
        );
        CREATE INDEX ix_projects_tenant_created ON projects(tenant_id, created_at DESC);
        CREATE INDEX ix_projects_tenant_status ON projects(tenant_id, status);
        CREATE INDEX ix_projects_tenant_active_created ON projects(tenant_id, created_at DESC)
          WHERE status <> 'archived';

        CREATE TABLE tasks (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          project_id uuid NOT NULL,
          assignee_id uuid,
          created_by uuid NOT NULL,
          title varchar(200) NOT NULL,
          description text NOT NULL DEFAULT '',
          status varchar(20) NOT NULL DEFAULT 'todo',
          priority varchar(20) NOT NULL DEFAULT 'medium',
          due_date date,
          version integer NOT NULL DEFAULT 1,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT uq_tasks_tenant_id_id UNIQUE (tenant_id, id),
          CONSTRAINT fk_tasks_tenant_project FOREIGN KEY (tenant_id, project_id)
            REFERENCES projects(tenant_id, id) ON DELETE CASCADE,
          CONSTRAINT fk_tasks_tenant_assignee FOREIGN KEY (tenant_id, assignee_id)
            REFERENCES tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT,
          CONSTRAINT fk_tasks_tenant_creator FOREIGN KEY (tenant_id, created_by)
            REFERENCES tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT,
          CONSTRAINT ck_tasks_valid_status CHECK (status IN ('todo','in_progress','blocked','done')),
          CONSTRAINT ck_tasks_valid_priority CHECK (priority IN ('low','medium','high','urgent')),
          CONSTRAINT ck_tasks_positive_version CHECK (version > 0)
        );
        CREATE INDEX ix_tasks_tenant_project ON tasks(tenant_id, project_id, status);
        CREATE INDEX ix_tasks_tenant_assignee ON tasks(tenant_id, assignee_id, status);
        CREATE INDEX ix_tasks_tenant_created ON tasks(tenant_id, created_at DESC);
        CREATE INDEX ix_tasks_tenant_open_due ON tasks(tenant_id, due_date)
          WHERE status <> 'done' AND due_date IS NOT NULL;

        CREATE TABLE documents (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          project_id uuid NOT NULL,
          title varchar(200) NOT NULL,
          content text NOT NULL DEFAULT '',
          storage_bytes bigint NOT NULL DEFAULT 0 CHECK (storage_bytes >= 0),
          created_by uuid NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT fk_documents_tenant_project FOREIGN KEY (tenant_id, project_id)
            REFERENCES projects(tenant_id, id) ON DELETE CASCADE,
          CONSTRAINT fk_documents_tenant_creator FOREIGN KEY (tenant_id, created_by)
            REFERENCES tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT
        );
        CREATE INDEX ix_documents_tenant_project ON documents(tenant_id, project_id, created_at DESC);

        CREATE TABLE comments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          task_id uuid NOT NULL,
          author_id uuid NOT NULL,
          body text NOT NULL CHECK (length(trim(body)) > 0),
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT fk_comments_tenant_task FOREIGN KEY (tenant_id, task_id)
            REFERENCES tasks(tenant_id, id) ON DELETE CASCADE,
          CONSTRAINT fk_comments_tenant_author FOREIGN KEY (tenant_id, author_id)
            REFERENCES tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT
        );
        CREATE INDEX ix_comments_tenant_task_created ON comments(tenant_id, task_id, created_at DESC);

        CREATE TABLE notifications (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          user_id uuid NOT NULL,
          title varchar(200) NOT NULL,
          body text NOT NULL,
          read_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT fk_notifications_tenant_user FOREIGN KEY (tenant_id, user_id)
            REFERENCES tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT
        );
        CREATE INDEX ix_notifications_tenant_user_unread ON notifications(tenant_id, user_id, created_at DESC)
          WHERE read_at IS NULL;

        CREATE TABLE tenant_audit_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          actor_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
          action varchar(100) NOT NULL,
          resource_type varchar(80) NOT NULL,
          resource_id varchar(100),
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          request_id varchar(100),
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_tenant_audit_tenant_created ON tenant_audit_events(tenant_id, created_at DESC);
        CREATE INDEX ix_tenant_audit_tenant_action ON tenant_audit_events(tenant_id, action, created_at DESC);

        CREATE TABLE api_keys (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          name varchar(120) NOT NULL,
          prefix varchar(24) NOT NULL UNIQUE,
          key_hash varchar(64) NOT NULL UNIQUE,
          scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
          created_by uuid NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz,
          last_used_at timestamptz,
          revoked_at timestamptz,
          CONSTRAINT fk_api_keys_tenant_creator FOREIGN KEY (tenant_id, created_by)
            REFERENCES tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT
        );
        CREATE INDEX ix_api_keys_tenant_active ON api_keys(tenant_id, revoked_at);

        CREATE TABLE subscriptions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
          status varchar(20) NOT NULL DEFAULT 'trialing',
          current_period_start timestamptz NOT NULL,
          current_period_end timestamptz NOT NULL,
          external_reference varchar(200),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT uq_subscriptions_tenant UNIQUE (tenant_id),
          CONSTRAINT ck_subscriptions_valid_status CHECK (status IN ('trialing','active','past_due','canceled')),
          CONSTRAINT ck_subscriptions_valid_period CHECK (current_period_end > current_period_start)
        );

        CREATE TABLE usage_metrics (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
          period_date date NOT NULL,
          metric varchar(60) NOT NULL,
          value bigint NOT NULL DEFAULT 0 CHECK (value >= 0),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT uq_usage_tenant_period_metric UNIQUE (tenant_id, period_date, metric)
        );
        CREATE INDEX ix_usage_tenant_metric_period ON usage_metrics(tenant_id, metric, period_date DESC);

        CREATE FUNCTION app.tenant_is_active() RETURNS boolean
          LANGUAGE sql STABLE PARALLEL SAFE
          AS $$ SELECT EXISTS (
            SELECT 1 FROM public.tenants
            WHERE id = app.current_tenant_id() AND status = 'active'
          ) $$;
        CREATE FUNCTION app.is_tenant_admin() RETURNS boolean
          LANGUAGE sql STABLE PARALLEL SAFE
          AS $$ SELECT app.is_platform_admin() OR EXISTS (
            SELECT 1 FROM public.tenant_memberships
            WHERE tenant_id = app.current_tenant_id()
              AND user_id = app.current_user_id()
              AND role = 'tenant_admin' AND status = 'active'
          ) $$;
        CREATE FUNCTION app.set_updated_at() RETURNS trigger
          LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
        CREATE FUNCTION app.prevent_audit_mutation() RETURNS trigger
          LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'audit events are immutable'; END $$;

        CREATE TRIGGER tenants_set_updated_at BEFORE UPDATE ON tenants
          FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        CREATE TRIGGER memberships_set_updated_at BEFORE UPDATE ON tenant_memberships
          FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON teams
          FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON projects
          FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON tasks
          FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON documents
          FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON subscriptions
          FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        CREATE TRIGGER usage_set_updated_at BEFORE UPDATE ON usage_metrics
          FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
        CREATE TRIGGER platform_audit_immutable BEFORE UPDATE OR DELETE ON platform_audit_events
          FOR EACH ROW EXECUTE FUNCTION app.prevent_audit_mutation();
        CREATE TRIGGER tenant_audit_immutable BEFORE UPDATE OR DELETE ON tenant_audit_events
          FOR EACH ROW EXECUTE FUNCTION app.prevent_audit_mutation();
        """
    )

    # Platform control-plane rows are also protected. Membership lookup deliberately
    # allows users to see their own memberships before a tenant is selected.
    op.execute(
        "ALTER TABLE tenants ENABLE ROW LEVEL SECURITY; ALTER TABLE tenants FORCE ROW LEVEL SECURITY"
    )
    op.execute(
        """
        CREATE POLICY tenants_select ON tenants FOR SELECT USING (
          app.is_platform_admin() OR id = app.current_tenant_id() OR EXISTS (
            SELECT 1 FROM tenant_memberships m
            WHERE m.tenant_id = id AND m.user_id = app.current_user_id()
          )
        );
        CREATE POLICY tenants_insert ON tenants FOR INSERT
          WITH CHECK (app.is_platform_admin());
        CREATE POLICY tenants_update ON tenants FOR UPDATE
          USING (app.is_platform_admin() OR (id = app.current_tenant_id() AND app.is_tenant_admin()))
          WITH CHECK (app.is_platform_admin() OR (id = app.current_tenant_id() AND app.is_tenant_admin()));
        CREATE POLICY tenants_delete ON tenants FOR DELETE USING (app.is_platform_admin());
        """
    )
    op.execute(
        "ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY; "
        "ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY"
    )
    op.execute(
        """
        CREATE POLICY memberships_select ON tenant_memberships FOR SELECT USING (
          app.is_platform_admin() OR user_id = app.current_user_id() OR tenant_id = app.current_tenant_id()
        );
        CREATE POLICY memberships_insert ON tenant_memberships FOR INSERT WITH CHECK (
          app.is_platform_admin() OR (tenant_id = app.current_tenant_id() AND app.tenant_is_active())
        );
        CREATE POLICY memberships_update ON tenant_memberships FOR UPDATE
          USING (app.is_platform_admin() OR (tenant_id = app.current_tenant_id() AND app.tenant_is_active()))
          WITH CHECK (app.is_platform_admin() OR (tenant_id = app.current_tenant_id() AND app.tenant_is_active()));
        CREATE POLICY memberships_delete ON tenant_memberships FOR DELETE USING (
          app.is_platform_admin() OR (tenant_id = app.current_tenant_id() AND app.tenant_is_active())
        );
        """
    )

    for table in TENANT_TABLES:
        op.execute(
            f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY; ALTER TABLE {table} FORCE ROW LEVEL SECURITY"
        )
        guard = "tenant_id = app.current_tenant_id() AND app.tenant_is_active()"
        if table in {"subscriptions", "usage_metrics", "api_keys"}:
            guard = f"app.is_platform_admin() OR ({guard})"
        op.execute(f"CREATE POLICY {table}_select ON {table} FOR SELECT USING ({guard})")
        op.execute(f"CREATE POLICY {table}_insert ON {table} FOR INSERT WITH CHECK ({guard})")
        op.execute(
            f"CREATE POLICY {table}_update ON {table} FOR UPDATE USING ({guard}) WITH CHECK ({guard})"
        )
        op.execute(f"CREATE POLICY {table}_delete ON {table} FOR DELETE USING ({guard})")

    # Notifications are private to their recipient as well as tenant-bound.
    op.execute(
        """
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
        CREATE POLICY notifications_select ON notifications FOR SELECT USING (
          tenant_id = app.current_tenant_id() AND user_id = app.current_user_id() AND app.tenant_is_active()
        );
        CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (
          tenant_id = app.current_tenant_id() AND app.tenant_is_active()
        );
        CREATE POLICY notifications_update ON notifications FOR UPDATE
          USING (tenant_id = app.current_tenant_id() AND user_id = app.current_user_id() AND app.tenant_is_active())
          WITH CHECK (tenant_id = app.current_tenant_id() AND user_id = app.current_user_id() AND app.tenant_is_active());
        CREATE POLICY notifications_delete ON notifications FOR DELETE USING (
          tenant_id = app.current_tenant_id() AND user_id = app.current_user_id() AND app.tenant_is_active()
        );
        """
    )

    # Audit SELECT/INSERT are tenant-scoped; mutation policies are intentionally deny-all.
    op.execute(
        """
        DROP POLICY tenant_audit_events_update ON tenant_audit_events;
        DROP POLICY tenant_audit_events_delete ON tenant_audit_events;
        CREATE POLICY tenant_audit_events_update ON tenant_audit_events
          FOR UPDATE USING (false) WITH CHECK (false);
        CREATE POLICY tenant_audit_events_delete ON tenant_audit_events FOR DELETE USING (false);
        """
    )
    op.execute(
        """
        ALTER TABLE platform_audit_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE platform_audit_events FORCE ROW LEVEL SECURITY;
        CREATE POLICY platform_audit_select ON platform_audit_events FOR SELECT USING (
          app.is_platform_admin() OR actor_user_id = app.current_user_id()
        );
        CREATE POLICY platform_audit_insert ON platform_audit_events FOR INSERT
          WITH CHECK (app.is_platform_admin() OR actor_user_id = app.current_user_id());
        CREATE POLICY platform_audit_update ON platform_audit_events FOR UPDATE USING (false) WITH CHECK (false);
        CREATE POLICY platform_audit_delete ON platform_audit_events FOR DELETE USING (false);
        """
    )

    op.execute(
        """
        ALTER ROLE tenantcore_app SET row_security = on;
        GRANT USAGE ON SCHEMA public, app TO tenantcore_app;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO tenantcore_app;
        GRANT SELECT ON plans TO tenantcore_app;
        GRANT SELECT, INSERT, UPDATE ON users TO tenantcore_app;
        GRANT SELECT, INSERT, UPDATE ON tenants TO tenantcore_app;
        GRANT SELECT, INSERT, UPDATE ON tenant_memberships TO tenantcore_app;
        GRANT SELECT, INSERT, UPDATE ON auth_sessions TO tenantcore_app;
        GRANT SELECT, INSERT ON platform_audit_events TO tenantcore_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON teams, projects, tasks, documents, comments TO tenantcore_app;
        GRANT SELECT, INSERT, UPDATE ON notifications TO tenantcore_app;
        GRANT SELECT, INSERT ON tenant_audit_events TO tenantcore_app;
        GRANT SELECT, INSERT, UPDATE ON api_keys TO tenantcore_app;
        GRANT SELECT, INSERT, UPDATE ON subscriptions, usage_metrics TO tenantcore_app;
        REVOKE UPDATE, DELETE ON tenant_audit_events, platform_audit_events FROM tenantcore_app;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS usage_metrics, subscriptions, api_keys, tenant_audit_events,
          notifications, comments, documents, tasks, projects, teams,
          platform_audit_events, auth_sessions, tenant_memberships, users, tenants, plans CASCADE;
        DROP SCHEMA app CASCADE;
        """
    )
