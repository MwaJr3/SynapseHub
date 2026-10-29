import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * `vite preview` serves the built app from disk and has no SPA fallback, so a
 * hard reload on /projects/phishlens would 404. This rewrite keeps deep links
 * working when the production build is served by any static file server that
 * lacks its own rewrite rule (the same rule is documented for Netlify/Nginx in
 * docs/DEPLOYMENT.md).
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    apply: 'build',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = (req.url ?? '/').split('?')[0];
        const hasExtension = /\.[a-z0-9]+$/i.test(url);
        if (!hasExtension && !url.startsWith('/assets')) {
          req.url = '/index.html';
        }
        next();
      });
    },
  };
}

const REACT_PACKAGES = /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    /**
     * Absolute base by default: this is a client-routed SPA, so a hard reload
     * on /projects/netscope must still resolve /assets/*. A relative base
     * ('./') would resolve those URLs against the deep path and 404.
     *
     * Deploying under a sub-path (e.g. a GitHub Pages project site)? Set
     * `VITE_BASE_PATH=/your-repo/` in the environment or in .env.production.
     */
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss(), spaFallback()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          /**
           * Keep the project registry and the case-study artwork out of the
           * entry chunk. The nine case studies are the largest content in the
           * app and are imported by several lazy routes, so Rollup would
           * otherwise hoist all of it into the entry bundle.
           */
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return REACT_PACKAGES.test(id) ? 'react' : 'vendor';
            }
            if (id.includes('/src/data/')) return 'content';
            if (id.includes('/src/components/previews/')) return 'artwork';
            return undefined;
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5401,
      allowedHosts: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      allowedHosts: true,
    },
  };
});
