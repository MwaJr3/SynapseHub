import type { Metadata } from 'next';
import Link from 'next/link';

import { resolveSystems, unconfiguredLabel } from '@/content/ecosystem';
import { externalAnchorProps } from '@/lib/links';

export const metadata: Metadata = {
  title: 'The learning systems',
  description:
    'How Tamuzi Learning’s products fit together: one catalogue, one learner model, one access route — each product doing a different job.',
};

/**
 * The umbrella: the company site is where the systems are explained and reached
 * from. Every link here is configured; where none is, the system says so instead
 * of offering a destination that does not exist.
 */
export default function EcosystemPage() {
  const systems = resolveSystems(process.env);
  const live = systems.filter((system) => system.url !== null);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider accent-text">Tamuzi Learning</p>
        <h1 className="mt-1 text-2xl font-semibold">The learning systems</h1>
        <p className="mt-2 max-w-prose text-muted">
          These are separate products with separate jobs. They are listed here together because they
          are meant to be used together — not because they are one application, and not because this
          platform owns your data in any of them. {live.length} of {systems.length} currently has an
          address to open.
        </p>
      </header>

      <ul className="grid gap-4 md:grid-cols-2">
        {systems.map((system) => (
          <li key={system.id} className="stage">
            <article
              className="card tilt h-full"
              id={system.id}
              aria-labelledby={`${system.id}-name`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`${system.id}-name`} className="text-lg font-semibold">
                  {system.name}
                </h2>
                {system.url ? (
                  <a className="btn btn-primary text-sm" href={system.url} {...externalAnchorProps}>
                    Open {system.name}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                    {unconfiguredLabel(system.status)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm">{system.tagline}</p>
              <p className="mt-3 text-xs text-muted">{system.distinctFrom}</p>
            </article>
          </li>
        ))}
      </ul>

      <section className="card">
        <h2 className="text-lg font-semibold">Why they are separate</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          A catalogue, an access route and a learner model fail in different ways and change at
          different speeds. Keeping them apart means one can be replaced without discarding the
          other, and it means a learner&rsquo;s progress in Tessera is not hostage to a course
          catalogue&rsquo;s redesign. The cost is real: separate sign-ins, and data that does not move
          between them yet. That cost is listed rather than hidden.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/products" className="accent-text hover:underline">
            See the full product catalogue
          </Link>
        </p>
      </section>
    </div>
  );
}
