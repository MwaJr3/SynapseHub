import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5326,
    // The sandbox preview is served from a generated host; allow it (and any
    // tunnelled host) so the app is reachable from the browser, not just localhost.
    allowedHosts: true,
    // The browser only ever talks to this origin; the dev server forwards to the API.
    proxy: { '/api': 'http://127.0.0.1:8024', '/health': 'http://127.0.0.1:8024' },
  },
  preview: { host: '0.0.0.0', port: 5326, allowedHosts: true },
  test: { environment: 'node' },
});
