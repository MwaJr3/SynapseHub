import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The browser only talks to same-origin /api URLs. During development Vite
// proxies those requests to the local FastAPI process; in Docker the web
// container sets VITE_API_PROXY_TARGET=http://api:8000.
const proxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5500,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4174,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
