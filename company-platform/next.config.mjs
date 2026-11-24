import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: rootDir,
  // PGlite resolves wasm assets via import.meta.url; bundling breaks that.
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  images: { unoptimized: true },
  poweredByHeader: false,
  // Baseline hardening headers. A full script CSP is intentionally not set: Next.js
  // inlines scripts and needs per-request nonces to allow them safely.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
