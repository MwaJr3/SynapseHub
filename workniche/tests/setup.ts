/**
 * Test bootstrap: one throwaway embedded database per vitest process.
 * Guarded by a global flag — vitest re-runs setupFiles per test file, and
 * the original `rm -rf` version deleted the live database mid-run.
 */
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const globalForTests = globalThis as unknown as {
  __worknicheTestDbReady?: boolean;
};

if (!globalForTests.__worknicheTestDbReady) {
  const dataDir = path.join(process.cwd(), 'data', 'test.db');
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  process.env.PGLITE_DATA_DIR = dataDir;
  // Tests never touch real services.
  delete process.env.DATABASE_URL;

  const { runMigrations } = await import('@/lib/db/migrate');
  await runMigrations();
  globalForTests.__worknicheTestDbReady = true;
}
