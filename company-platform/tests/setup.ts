import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Fresh embedded database per test process before anything opens it.
const dataDir = mkdtempSync(path.join(tmpdir(), 'company-platform-test-'));
process.env.PGLITE_DATA_DIR = dataDir;
delete process.env.DATABASE_URL;

const { runMigrations } = await import('@/lib/db/migrate');

const globalForTests = globalThis as unknown as {
  __platformTestMigrationsReady?: Promise<void>;
};

if (!globalForTests.__platformTestMigrationsReady) {
  globalForTests.__platformTestMigrationsReady = runMigrations().then(() => undefined);
}
await globalForTests.__platformTestMigrationsReady;

export function testId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
