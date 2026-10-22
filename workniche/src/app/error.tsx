'use client';

import Link from 'next/link';
import type { JSX } from 'react';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-ink-muted">
        The page hit an unexpected error. Nothing you submitted is lost — try
        again, or go back to safety.
      </p>
      <div className="flex justify-center gap-3">
        <button type="button" className="btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn-secondary">Go home</Link>
      </div>
    </div>
  );
}
