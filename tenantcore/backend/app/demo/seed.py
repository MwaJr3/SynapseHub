"""Idempotent, explicitly labeled demonstration data. Never run in production."""

from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session

from app.audit.service import platform_event, tenant_event
from app.auth.security import hash_password
from app.config import get_settings
from app.database.session import session_scope, set_context
from app.demo.ids import PLANS, PROJECTS, TENANTS, USERS
from app.models import (
    Comment,
    Document,
    Notification,
    Plan,
    Project,
    Subscription,
    Task,
    Team,
    Tenant,
    TenantMembership,
    User,
)
from app.services.usage import increment_usage

logger = structlog.get_logger(__name__)
DEMO_PASSWORD = "DemoPass!2026"
PLATFORM_PASSWORD = "PlatformAdmin!2026"


@contextmanager
def control_scope():
    settings = get_settings()
    engine = create_engine(
        settings.migration_database_url,
        pool_pre_ping=True,
        connect_args={"prepare_threshold": None},
    )
    if settings.database_role:

        @event.listens_for(engine, "connect")
        def reset_control_plane_role(dbapi_connection, _connection_record) -> None:
            with dbapi_connection.cursor() as cursor:
                cursor.execute("RESET ROLE")
            dbapi_connection.commit()

    session = Session(engine, expire_on_commit=False)
    try:
        set_context(session, user_id=USERS["platform"], platform_admin=True)
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        engine.dispose()


def seed_control_plane() -> None:
    with control_scope() as db:
        for code, name, price, limits in (
            ("starter", "Starter", 0, {"projects": 10, "members": 5}),
            ("growth", "Growth", 4900, {"projects": 100, "members": 50}),
            ("enterprise", "Enterprise", 29900, {"projects": -1, "members": -1}),
        ):
            if db.get(Plan, PLANS[code]) is None:
                db.add(
                    Plan(
                        id=PLANS[code],
                        code=code,
                        name=name,
                        price_cents_monthly=price,
                        limits=limits,
                    )
                )
        db.flush()
        users = (
            ("platform", "platform.admin@tenantcore.demo", "Platform Administrator", True, True),
            ("acme_admin", "acme.admin@tenantcore.demo", "Acme Admin (Demo)", True, False),
            ("acme_member", "acme.member@tenantcore.demo", "Acme Member (Demo)", True, False),
            ("globex_admin", "globex.admin@tenantcore.demo", "Globex Admin (Demo)", True, False),
            ("globex_member", "globex.member@tenantcore.demo", "Globex Member (Demo)", True, False),
            (
                "novatech_admin",
                "novatech.admin@tenantcore.demo",
                "NovaTech Admin (Demo)",
                True,
                False,
            ),
            (
                "novatech_member",
                "novatech.member@tenantcore.demo",
                "NovaTech Member (Demo)",
                True,
                False,
            ),
            ("multi", "multi@tenantcore.demo", "Multi-Organization User (Demo)", True, False),
        )
        for key, email, name, active, platform_admin in users:
            if db.get(User, USERS[key]) is None:
                db.add(
                    User(
                        id=USERS[key],
                        email=email,
                        full_name=name,
                        password_hash=hash_password(
                            PLATFORM_PASSWORD if key == "platform" else DEMO_PASSWORD
                        ),
                        is_active=active,
                        is_platform_admin=platform_admin,
                    )
                )
        db.flush()
        now = datetime.now(UTC)
        tenant_info = (
            ("acme", "Acme Corporation", "growth"),
            ("globex", "Globex Industries", "enterprise"),
            ("novatech", "NovaTech Solutions", "starter"),
        )
        for slug, name, plan in tenant_info:
            tenant = db.get(Tenant, TENANTS[slug])
            if tenant is None:
                tenant = Tenant(
                    id=TENANTS[slug],
                    name=name,
                    slug=slug,
                    plan_id=PLANS[plan],
                    status="active",
                    provisioned_at=now,
                    configuration={"demo_data": True, "region": "local", "theme": slug},
                )
                db.add(tenant)
                db.flush()
                db.add(
                    Subscription(
                        tenant_id=tenant.id,
                        plan_id=tenant.plan_id,
                        status="active",
                        current_period_start=now,
                        current_period_end=now + timedelta(days=30),
                    )
                )
        memberships = (
            ("acme", "acme_admin", "tenant_admin"),
            ("acme", "acme_member", "member"),
            ("acme", "multi", "manager"),
            ("globex", "globex_admin", "tenant_admin"),
            ("globex", "globex_member", "member"),
            ("globex", "multi", "read_only"),
            ("novatech", "novatech_admin", "tenant_admin"),
            ("novatech", "novatech_member", "member"),
        )
        for slug, user_key, role in memberships:
            membership = db.get(TenantMembership, (TENANTS[slug], USERS[user_key]))
            if membership is None:
                db.add(
                    TenantMembership(
                        tenant_id=TENANTS[slug],
                        user_id=USERS[user_key],
                        role=role,
                        status="active",
                        joined_at=now,
                        invited_by=USERS["platform"],
                    )
                )
        platform_event(
            db,
            actor_user_id=USERS["platform"],
            action="demo.seeded",
            resource_type="environment",
            metadata={"tenants": ["acme", "globex", "novatech"], "demo_data": True},
        )
    logger.info("demo_control_plane_seeded")


def seed_tenant(slug: str, admin_key: str, member_key: str) -> None:
    tenant_id = TENANTS[slug]
    admin_id = USERS[admin_key]
    member_id = USERS[member_key]
    with session_scope(tenant_id=tenant_id, user_id=admin_id, request_id="demo-seed") as db:
        if (db.scalar(select(func.count(Project.id))) or 0) > 0:
            logger.info("demo_tenant_already_seeded", tenant=slug)
            return
        company = {"acme": "Acme", "globex": "Globex", "novatech": "NovaTech"}[slug]
        team_a = Team(
            tenant_id=tenant_id,
            name=f"{company} Delivery (Demo)",
            description=f"Fictional {company} implementation team — demonstration data only.",
            created_by=admin_id,
        )
        team_b = Team(
            tenant_id=tenant_id,
            name=f"{company} Operations (Demo)",
            description=f"Fictional {company} operations team — demonstration data only.",
            created_by=admin_id,
        )
        db.add_all([team_a, team_b])
        db.flush()
        project_a = Project(
            id=PROJECTS[f"{slug}_a"],
            tenant_id=tenant_id,
            team_id=team_a.id,
            name=f"{company} Project A",
            description=f"DEMO DATA — {company} customer onboarding workflow.",
            created_by=admin_id,
        )
        project_b = Project(
            id=PROJECTS[f"{slug}_b"],
            tenant_id=tenant_id,
            team_id=team_b.id,
            name=f"{company} Project B",
            description=f"DEMO DATA — {company} operational reporting rollout.",
            status="on_hold" if slug == "globex" else "active",
            created_by=admin_id,
        )
        db.add_all([project_a, project_b])
        db.flush()
        tasks = []
        for index, (project, title, status, priority) in enumerate(
            (
                (project_a, f"Configure {company} tenant policy", "in_progress", "high"),
                (project_a, f"Review {company} isolation evidence", "todo", "urgent"),
                (project_b, f"Publish {company} demo report", "done", "medium"),
            )
        ):
            tasks.append(
                Task(
                    tenant_id=tenant_id,
                    project_id=project.id,
                    title=f"{title} (Demo)",
                    description="Fictional task created by the TenantCore demonstration seeder.",
                    status=status,
                    priority=priority,
                    assignee_id=admin_id if index == 0 else member_id,
                    created_by=admin_id,
                    due_date=(datetime.now(UTC) + timedelta(days=index + 2)).date(),
                )
            )
        db.add_all(tasks)
        db.flush()
        document = Document(
            tenant_id=tenant_id,
            project_id=project_a.id,
            title=f"{company} Isolation Runbook (Demo)",
            content=f"DEMO DATA ONLY. Fictional {company} procedures for tenant isolation verification.",
            storage_bytes=1024 + len(slug),
            created_by=admin_id,
        )
        db.add(document)
        db.add_all(
            [
                Comment(
                    tenant_id=tenant_id,
                    task_id=tasks[0].id,
                    author_id=member_id,
                    body=f"Demo comment visible only inside {company}.",
                ),
                Notification(
                    tenant_id=tenant_id,
                    user_id=admin_id,
                    title=f"Welcome to {company} (Demo)",
                    body="This notification belongs only to this fictional organization.",
                ),
            ]
        )
        tenant_event(
            db,
            tenant_id=tenant_id,
            actor_user_id=admin_id,
            action="demo.seeded",
            resource_type="tenant",
            resource_id=tenant_id,
            metadata={"company": company, "demo_data": True},
            request_id="demo-seed",
        )
        increment_usage(db, tenant_id, "api_requests", 40 + len(slug))
        increment_usage(db, tenant_id, "background_jobs", 2)
    logger.info("demo_tenant_seeded", tenant=slug)


def main() -> None:
    settings = get_settings()
    if not settings.demo_mode:
        raise RuntimeError("Demo seeding is disabled. Set DEMO_MODE=true only for local demos.")
    seed_control_plane()
    seed_tenant("acme", "acme_admin", "acme_member")
    seed_tenant("globex", "globex_admin", "globex_member")
    seed_tenant("novatech", "novatech_admin", "novatech_member")
    logger.info("demo_seed_complete", password=DEMO_PASSWORD)


if __name__ == "__main__":
    main()
