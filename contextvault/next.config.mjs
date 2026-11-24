/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ['@electric-sql/pglite', '@electric-sql/pglite-pgvector', 'pg', 'pdfjs-dist', 'mammoth', 'yauzl', '@aws-sdk/client-s3'],
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
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
};
export default nextConfig;
