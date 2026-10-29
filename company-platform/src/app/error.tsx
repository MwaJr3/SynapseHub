'use client';

/**
 * Page-level error boundary.
 *
 * The site's public pages all read from the database, so the failure a visitor is
 * most likely to meet is "the catalogue could not be reached". Next.js answers that
 * with a black screen reading *"Application error: a server-side exception has
 * occurred"* and a numeric digest, which tells a visitor nothing and looks like a
 * broken deployment rather than an unavailable one — which, on 2026-10-29, it was.
 *
 * This says what happened, keeps the digest for the server log, and offers a retry
 * that does not require a reload.
 */
import { useEffect } from 'react';

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the browser console and in Vercel's function logs.
    console.error('[page] render failed', error);
  }, [error]);

  return (
    <div className="card p-8">
      <p className="accent-text text-sm font-medium">Temporarily unavailable</p>
      <h1 className="mt-2 text-2xl font-semibold">This page could not be loaded</h1>
      <p className="mt-3 max-w-prose text-muted">
        The site could not reach the records behind this page. Nothing has been lost —
        the products, case studies and people are all still there. Try again in a
        moment; if it keeps happening, the database is probably still being set up.
      </p>
      {error.digest ? (
        <p className="mt-4 text-sm text-muted">
          Reference for the server log: <code>{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <a className="btn btn-secondary" href="/">
          Go to the home page
        </a>
      </div>
    </div>
  );
}
