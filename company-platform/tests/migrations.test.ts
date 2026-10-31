/**
 * The deployed schema is generated, and generated things drift.
 *
 * `src/lib/db/migrations.generated.ts` is what the serverless function actually
 * executes; `drizzle/*.sql` is what Drizzle generates and what a person reads. If
 * those two ever disagree, the deployed database is not the one the repository
 * describes — and nothing else in the suite would notice, because the tests run
 * the embedded branch of the runner against the real files.
 *
 * This file closes that gap, and pins the two properties that make a shared
 * database safe: the schema is named, and the runner is idempotent.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { sql } from 'drizzle-orm';

import { MIGRATIONS, MIGRATION_SCHEMA } from '@/lib/db/migrations.generated';
import { runMigrations } from '@/lib/db/migrate';
import { getDb, rowsOf } from '@/lib/db';

const drizzleDir = path.join(process.cwd(), 'drizzle');

/** The same split the embed script uses, so the comparison is like for like. */
function statementsOf(sqlText: string): string[] {
  return sqlText
    .split('--> statement-breakpoint')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .filter((chunk) => !/^CREATE SCHEMA\s+"[a-z_]+"\s*;?$/i.test(chunk))
    .map((chunk) => (chunk.endsWith(';') ? chunk : `${chunk};`));
}

describe('generated migrations', () => {
  it('covers exactly the SQL files on disk, in order', () => {
    const onDisk = readdirSync(drizzleDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    expect(MIGRATIONS.map((migration) => migration.name)).toEqual(onDisk);
  });

  it('matches the SQL statement for statement', () => {
    for (const migration of MIGRATIONS) {
      const sqlText = readFileSync(path.join(drizzleDir, migration.name), 'utf8');
      expect(migration.statements, migration.name).toEqual(statementsOf(sqlText));
    }
  });

  it('qualifies every statement with the platform schema', () => {
    // `CREATE SCHEMA` is the one statement that names itself, and it is dropped by
    // the embed step; anything else that mentions a table must be qualified.
    for (const migration of MIGRATIONS) {
      for (const statement of migration.statements) {
        if (/^CREATE (TYPE|TABLE|INDEX|SCHEMA)\b/i.test(statement)) {
          expect(statement, statement).toContain(`"${MIGRATION_SCHEMA}".`);
        }
        // Unqualified `public.` would mean the generator lost the schema binding.
        expect(statement, statement).not.toMatch(/\bpublic\./);
      }
    }
  });

  it('runs once from nothing and is idempotent afterwards', async () => {
    // `tests/setup.ts` already ran it against an empty data directory, so the
    // "from nothing" case is the suite getting this far at all. This asserts that
    // a second run applies nothing and records nothing twice.
    const second = await runMigrations();
    expect(second).toEqual([]);

    const recorded = rowsOf(
      await getDb().execute(
        sql.raw(`SELECT name FROM "${MIGRATION_SCHEMA}"."_migrations" ORDER BY name`),
      ),
    ).map((row) => String(row.name));
    expect(recorded).toEqual(MIGRATIONS.map((migration) => migration.name));
  });

  it('creates every table the schema defines in the platform schema', async () => {
    const tables = rowsOf(
      await getDb().execute(
        sql.raw(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = '${MIGRATION_SCHEMA}'`,
        ),
      ),
    ).map((row) => String(row.table_name));

    // The count is pinned rather than compared to the Drizzle object graph: a new
    // table that ships without a migration is exactly what this test exists to
    // catch, and it would still be "defined" in the schema module.
    expect(tables).toHaveLength(19);
    for (const name of [
      'companies',
      'products',
      'case_studies',
      'users',
      'person_profiles',
      // Added by 0001: resume bytes live here when STORAGE_PROVIDER=postgres.
      'storage_blobs',
    ]) {
      expect(tables, name).toContain(name);
    }
    expect(tables).toContain('_migrations');
  });
});
