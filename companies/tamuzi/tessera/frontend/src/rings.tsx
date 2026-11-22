/**
 * Score rings — the one visual where the picture *is* the number.
 *
 * A ring is only drawn from a real score. A missing score gets a dashed, empty
 * track and the words "not supplied", never a zero-length ring that could be
 * mistaken for a measured 0%. That distinction is the whole point of the profile,
 * so it has to survive the decoration.
 */
import type { ReactNode } from 'react';

import { formatScore, ringShare } from './utils';

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({
  value,
  min,
  max,
  label,
  caption,
}: {
  value: number | null;
  min: number;
  max: number;
  label: string;
  caption?: string;
}) {
  const missing = value === null;
  const share = missing ? 0 : ringShare(value, min, max);
  const offset = CIRCUMFERENCE * (1 - share);
  const description = missing
    ? `${label}: not supplied`
    : `${label}: ${formatScore(value, min, max)}`;

  return (
    <figure className="flex flex-col items-center gap-1 text-center">
      <svg
        className="h-16 w-16"
        viewBox="0 0 64 64"
        role="img"
        aria-label={description}
        data-missing={missing ? 'true' : 'false'}
      >
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          stroke="var(--line)"
          strokeWidth="6"
          strokeDasharray={missing ? '4 5' : undefined}
        />
        {!missing && share > 0 ? (
          <circle
            className="ring-fill"
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90 32 32)"
          />
        ) : null}
      </svg>
      <figcaption className="text-xs">
        <span className="block font-medium">{label}</span>
        <span className="block text-[color:var(--muted)]">
          {missing ? (
            <span className="unsupplied inline-block rounded px-1">not supplied</span>
          ) : (
            formatScore(value, min, max)
          )}
        </span>
        {caption ? <span className="block text-[10px] text-[color:var(--muted)]">{caption}</span> : null}
      </figcaption>
    </figure>
  );
}

export function EmptyRing({ label }: { label: string }) {
  return (
    <figure className="flex flex-col items-center gap-1 text-center">
      <svg className="h-16 w-16" viewBox="0 0 64 64" role="img" aria-label={`${label}: not supplied`}>
        <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="var(--line)" strokeWidth="6" strokeDasharray="4 5" />
      </svg>
      <figcaption className="text-xs">
        <span className="block font-medium">{label}</span>
        <span className="block text-[color:var(--muted)]">not supplied</span>
      </figcaption>
    </figure>
  );
}

/** The header: layered light, an image, and one sentence of orientation. */
export function HeroPanel({ children }: { children: ReactNode }) {
  return (
    <section className="aurora stage border p-6 md:p-8" style={{ borderColor: 'var(--line)' }}>
      <div className="grid items-center gap-6 md:grid-cols-[1.2fr_1fr]">
        <div>{children}</div>
        <div className="tilt hidden rounded-[14px] md:block" aria-hidden="true">
          <img className="hero-image max-h-52" src="/hero-tessera.png" alt="" width={1376} height={768} style={{ height: 'auto', maxWidth: '100%' }} loading="lazy" decoding="async" />
        </div>
      </div>
    </section>
  );
}
