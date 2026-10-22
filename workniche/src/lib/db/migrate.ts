/**
 * Shared migration runner. The `db:migrate` script wraps this; tests use it
 * directly against a throwaway database directory.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';

import { getDb, waitDbReady, isEmbeddedDatabase, rowsOf } from './index';

export async function runMigrations(): Promise<string[]> {
  await waitDbReady();
  const db = getDb();

  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );

  const folder = path.join(process.cwd(), 'drizzle');
  const files = (await readdir(folder))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const appliedResult: unknown = await db.execute(
    sql`SELECT name FROM _migrations`,
  );
  const applied = new Set(
    rowsOf(appliedResult).map((row) => String(row.name)),
  );

  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const content = await readFile(path.join(folder, file), 'utf8');
    const statements = content
      .split('--> statement-breakpoint')
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);

    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }
    await db.execute(sql`INSERT INTO _migrations (name) VALUES (${file})`);
    newlyApplied.push(file);
  }

  return newlyApplied;
}

export function describeDatabase(): string {
  return isEmbeddedDatabase() ? 'embedded PGlite' : 'PostgreSQL';
}
