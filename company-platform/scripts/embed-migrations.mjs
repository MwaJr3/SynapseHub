#!/usr/bin/env node
/* global console, process -- run by Node directly, outside the Next.js tree */
/**
 * Bake `drizzle/*.sql` into `src/lib/db/migrations.generated.ts`.
 *
 * The migration runner executes inside a serverless function, where the working
 * directory is the function bundle and `drizzle/` is not necessarily traced into
 * it. Reading the files at runtime therefore fails in exactly the environment that
 * needs them — silently, because nothing runs the migrations at build time either.
 * Embedding the statements as a module removes the filesystem from the question.
 *
 * Usage:
 *   node scripts/embed-migrations.mjs            # write the module
 *   node scripts/embed-migrations.mjs --check    # fail if it is out of date
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const drizzleDir = join(root, 'drizzle');
const target = join(root, 'src/lib/db/migrations.generated.ts');

/** The schema every table lives in. Kept in step with `src/lib/db/schema.ts`. */
const SCHEMA = 'platform';

/**
 * Split one migration file into statements.
 *
 * `CREATE SCHEMA "platform";` is dropped: the runner always creates the schema
 * itself with `IF NOT EXISTS`, and a bare `CREATE SCHEMA` would fail on any
 * database where the schema already exists (which is every shared database).
 */
function statementsOf(sqlText) {
  return sqlText
    .split('--> statement-breakpoint')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .filter((chunk) => !/^CREATE SCHEMA\s+"[a-z_]+"\s*;?$/i.test(chunk))
    .map((chunk) => (chunk.endsWith(';') ? chunk : `${chunk};`));
}

function build() {
  const files = readdirSync(drizzleDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const migrations = files.map((file) => ({
    name: file,
    statements: statementsOf(readFileSync(join(drizzleDir, file), 'utf8')),
  }));

  const body = migrations
    .map(
      (migration) =>
        `  {\n    name: ${JSON.stringify(migration.name)},\n    statements: [\n` +
        migration.statements.map((s) => `      ${JSON.stringify(s)},`).join('\n') +
        `\n    ],\n  },`,
    )
    .join('\n');

  return {
  migrations,
  source: `/**
 * GENERATED FILE — do not edit. Regenerate with \`npm run db:embed\`.
 *
 * Source: \`drizzle/*.sql\`. \`tests/migrations.generated.test.ts\` fails if this file
 * and the SQL on disk disagree, so the deployed schema cannot drift from the
 * repository's migration history.
 */
export const MIGRATION_SCHEMA = ${JSON.stringify(SCHEMA)};

export interface Migration {
  /** File name, also the primary key in \`_migrations\`. */
  name: string;
  /** One statement per array entry; applied in order, never split further. */
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
${body}
];
`,
  };
}

const { source: generated, migrations } = build();

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(target, 'utf8');
  } catch {
    current = '';
  }
  if (current !== generated) {
    console.error(
      'src/lib/db/migrations.generated.ts is out of date — run `npm run db:embed`.',
    );
    process.exit(1);
  }
  console.log('migrations are embedded and current.');
  process.exit(0);
}

writeFileSync(target, generated);
const count = migrations.length;
const statements = migrations.reduce((sum, m) => sum + m.statements.length, 0);
console.log(
  `wrote ${target.replace(`${root}/`, '')} (${count} migration(s), ${statements} statement(s))`,
);
