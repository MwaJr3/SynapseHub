import Link from 'next/link';
import type { JSX } from 'react';

export default function NotFound(): JSX.Element {
  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-ink-muted">
        The page you asked for does not exist — it may have been removed, or the
        link may be wrong.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/" className="btn-primary">Go home</Link>
        <Link href="/jobs" className="btn-secondary">Browse jobs</Link>
      </div>
    </div>
  );
}
