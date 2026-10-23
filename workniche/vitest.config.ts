import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // The embedded PGlite database is a single file — parallel workers would
    // fight over it.
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
  },
});
