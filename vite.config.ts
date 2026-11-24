/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The challenge collection is its own unit, extractable to a repository of
      // its own; the site reaches it through this one alias and nothing else.
      '@challenges': fileURLToPath(new URL('./challenges/src', import.meta.url)),
    },
  },
  server: {
    // 0.0.0.0 so the sandboxed preview proxy can reach the dev server.
    host: true,
    // The connected workspace's backend (backend/synapsehub) listens on 8000.
    proxy: { '/api': 'http://127.0.0.1:8000' },
    port: 5400,
    strictPort: false,
    // The preview is served through a proxy host (e.g. https://5400-<id>.e2b.app).
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: [
      'src/**/*.test.{ts,tsx}',
      'packages/**/*.test.{ts,tsx}',
      'challenges/src/**/*.test.{ts,tsx}',
      'tools/northstar/engine/**/*.test.ts',
    ],
  },
});
