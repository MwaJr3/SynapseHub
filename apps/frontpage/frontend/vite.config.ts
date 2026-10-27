/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5189,
    proxy: { '/api': { target: 'http://127.0.0.1:8025', changeOrigin: true } },
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 600 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});
