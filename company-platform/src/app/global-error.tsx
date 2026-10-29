'use client';

/**
 * Last-resort boundary: replaces the root layout when the layout itself fails.
 *
 * The layout is not decoration — it resolves the session on every request, which
 * means a missing `AUTH_SECRET` takes down every page before a single component
 * renders. `error.tsx` cannot catch that, because it renders *inside* the layout it
 * depends on. This one ships its own `<html>` and `<body>`, and therefore its own
 * styles: inline, no Tailwind, because the stylesheet import lives in the layout.
 */
import { useEffect } from 'react';

const palette = {
  background: '#0b1020',
  surface: '#141a2e',
  text: '#e8ecf7',
  muted: '#a8b2c9',
  accent: '#7ea2ff',
  border: 'rgba(126, 162, 255, 0.28)',
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] root layout failed', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          background: palette.background,
          color: palette.text,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: '40rem' }}>
          <p style={{ margin: 0, color: palette.accent, fontSize: '0.875rem', fontWeight: 600 }}>
            Temporarily unavailable
          </p>
          <h1 style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', lineHeight: 1.25 }}>
            The site could not start this page
          </h1>
          <p style={{ margin: '0.75rem 0 0', color: palette.muted }}>
            Something the page depends on — the database or the sign-in configuration —
            is not available. The content is intact; this is a configuration problem,
            not lost data.
          </p>
          {error.digest ? (
            <p style={{ margin: '1rem 0 0', color: palette.muted, fontSize: '0.875rem' }}>
              Reference for the server log: <code>{error.digest}</code>
            </p>
          ) : null}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: 'pointer',
                borderRadius: '0.5rem',
                border: `1px solid ${palette.border}`,
                background: palette.surface,
                color: palette.accent,
                padding: '0.55rem 1rem',
                font: 'inherit',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                borderRadius: '0.5rem',
                border: `1px solid ${palette.border}`,
                background: 'transparent',
                color: palette.text,
                padding: '0.55rem 1rem',
                textDecoration: 'none',
              }}
            >
              Go to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
