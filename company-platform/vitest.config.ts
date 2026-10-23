import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\/lib\/auth\/config$/,
        replacement: path.resolve(__dirname, 'tests/stubs/auth-config.ts'),
      },
      {
        find: /^@\/lib\/auth$/,
        replacement: path.resolve(__dirname, 'tests/stubs/auth.ts'),
      },
      {
        find: /^next\/cache$/,
        replacement: path.resolve(__dirname, 'tests/stubs/next-cache.ts'),
      },
      {
        find: /^next\/navigation$/,
        replacement: path.resolve(__dirname, 'tests/stubs/next-navigation.ts'),
      },
      { find: /^@\//, replacement: `${path.resolve(__dirname, 'src')}/` },
    ],
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    hookTimeout: 60_000,
    testTimeout: 60_000,
    // One shared embedded database per worker; tests seed their own fixtures.
    pool: 'forks',
  },
});
