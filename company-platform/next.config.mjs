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
};

export default nextConfig;
