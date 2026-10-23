# Schema-per-tenant alternative

TenantCore's live API uses shared-schema RLS. This document describes the alternative operating model and the executable reference in `backend/app/tenants/schema_per_tenant.py`. The reference is intentionally isolated from `tenantcore_app` request paths; it is not advertised as a second completed production runtime.

## Target layout

```text
PostgreSQL Database
├── public
│   ├── platform_users / users
│   ├── tenants
│   ├── subscriptions
│   └── tenant_registry
├── tenant_<acme_uuid_hex>
│   ├── projects
│   ├── teams
│   ├── tasks
│   └── audit_events
├── tenant_<globex_uuid_hex>
│   ├── projects / teams / tasks / audit_events
└── tenant_<novatech_uuid_hex>
    ├── projects / teams / tasks / audit_events
```

Use immutable UUID-derived names, not client slugs. Slugs can change and can contain unsafe identifier input. The helper accepts a UUID and produces `tenant_<32 hex chars>`, then applies a strict allowlist before controlled identifier interpolation.

## Isolation model

A schema architecture uses a controlled `search_path` and database privileges:

1. Resolve tenant membership through public control-plane tables.
2. Derive the expected schema name server-side from tenant UUID.
3. Start a transaction and set a validated local search path.
4. Use a role permitted only for the intended schema, or a broker that strictly controls schema selection.
5. Verify objects and privileges; do not assume a schema name alone denies access.

If every tenant shares one runtime role with read access to every schema, a mistaken `search_path` can still cross the boundary. Per-tenant database roles improve isolation but dramatically increase credential/pool operations. That trade-off must be explicit.

## Provisioning

Provisioning should be idempotent and transactional:

1. Insert public tenant/registry row in `provisioning` with expected schema name and target version.
2. Create schema and all tables, constraints, indexes, audit infrastructure, and version row with a privileged migration connection.
3. Grant only required schema/table privileges.
4. Run connectivity, object-count, privilege, and isolation smoke checks.
5. Mark registry `active` only after every step succeeds. Failure leaves a provisioning record and actionable state, not a falsely active tenant.

The reference `provision_tenant_schema` creates a version table, teams/projects/tasks/audit tables, foreign keys, and indexes in the caller's transaction. It does not commit for the caller, allowing registry + schema provisioning to be coordinated by an outer runbook.

## Migration and versioning

Alembic can support schema-per-tenant with a controlled fleet runner:

- Keep shared migration revision definitions immutable.
- Maintain a schema version row per tenant (or Alembic version table in each schema).
- Enumerate tenant IDs from the privileged registry, never from user input.
- Derive/validate schema names and apply revisions in bounded batches.
- Record `pending → migrating → migrated/failed`, started/finished timestamps, and error references.
- Use expand/contract changes so old and new app versions can coexist during a rolling fleet migration.
- Canary a small cohort, run smoke/isolation tests, then continue. Do not run unlimited parallel DDL against one PostgreSQL cluster.

A failed schema is not “mostly migrated.” Stop its rollout cohort and follow a revision-specific recovery plan. Backup before destructive changes. PostgreSQL transactional DDL helps but does not make a whole multi-schema fleet one transaction.

## Backup

- Use whole-cluster physical backups + WAL/PITR for fleet disaster recovery.
- Use `pg_dump --schema=<validated_schema>` for tenant-level logical export when operationally useful.
- Include the public registry/control-plane metadata needed to interpret the schema; schema dump alone is not a complete customer account.
- Audit functions, extensions, privileges, ownership, and referenced global objects. A schema dump may not contain them.
- Encrypt backups, restrict access by tenant/purpose, and test restoration rather than measuring backup success only by file creation.

## Restore

1. Create/choose an isolated target cluster and validate versions/extensions.
2. Restore into a temporary schema name where possible.
3. Restore/remap required registry rows without overwriting a different tenant.
4. Apply missing migrations and validate row counts, invariants, constraints, and RLS/privilege equivalents.
5. Run application smoke tests under the restored identity.
6. Rename/cut over only inside a controlled maintenance/fencing window.

Cross-schema foreign keys are generally avoided in this model, so membership/global references need explicit restoration semantics.

## Monitoring

Track fleet migration lag and per-schema size, table/index counts, dead tuples, autovacuum, lock time, and query latency. PostgreSQL catalog/monitoring queries must aggregate by schema without exposing one tenant's metrics to another. Alert on failed provisioning, old schema versions, missing expected objects, and privilege drift.

Thousands of schemas multiply tables, indexes, constraints, statistics, migration time, and catalog work. Benchmark expected maximum scale rather than assuming schema count is free.

## Archival and deletion

- First revoke application access and mark tenant suspended/archived in the registry.
- Preserve required retention, legal holds, and a verified final backup.
- Deletion should be a separate approved job requiring the exact schema name. The reference requires `DELETE tenant_<uuid_hex>` confirmation before `DROP SCHEMA CASCADE`.
- Delete registry/credentials only after destruction and audit evidence succeed. Never derive a destructive identifier from an HTTP slug.

## Trade-off summary

Schema-per-tenant simplifies tenant-specific structure and logical schema exports, but increases provisioning, migration, monitoring, and catalog complexity. Cross-tenant analytics requires controlled federation/aggregation across schemas. Shared RLS keeps one domain and migration path but requires rigorous policy management and offers less per-tenant structural customization. Dedicated infrastructure may be more appropriate when the requirement is actually resource or regulatory separation rather than merely a schema boundary.
