import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * The collection's own test configuration.
 *
 * The site runs these tests through its root config, but the collection is meant
 * to stand alone — extracted to a branch or a repository of its own. This file is
 * what makes that possible: without it, a checkout of `challenges/` alone has no
 * way to run its own suite.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
