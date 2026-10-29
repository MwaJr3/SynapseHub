/**
 * Runs once per server instance, before the first request is served.
 *
 * The schema is created here rather than by a deploy step, because there is no
 * deploy step: Vercel builds the Next.js app and starts serving it, and nothing in
 * that pipeline can run `npm run db:migrate`. Without this, a fresh database
 * reaches production with no tables and every page 500s — which is what happened
 * on 2026-10-29.
 *
 * A failure here does not stop the server: it is logged once, and the page-level
 * error boundary explains it. Taking the whole site down for a database problem
 * trades one broken page for a blank deployment.
 *
 * `bootstrapDatabase` is also what seeds a fresh database (companies, products,
 * case studies — no demo logins), so a first deploy against an empty PostgreSQL
 * serves the real catalogue instead of an empty one.
 */
export async function register(): Promise<void> {
  // Edge runtime has no TCP sockets; only the Node runtime can reach PostgreSQL.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { bootstrapDatabase } = await import('./src/lib/db/bootstrap');

  try {
    const { seeded } = await bootstrapDatabase();
    // One line, once, on the only run that writes content to the database.
    // eslint-disable-next-line no-console
    if (seeded) console.log('[db] catalogue seeded — this was a fresh database');
  } catch (error) {
    console.error('[db] bootstrap failed — the site will report an unavailable catalogue', error);
  }
}
