import type { Metadata } from 'next';

import entries from '@/content/catalogue.generated.json';

export const metadata: Metadata = {
  title: 'Catalogue',
  description:
    'The educational builds: command-line tools and exercises that are catalogued here rather than deployed. Each runs locally from its own folder in the repository.',
};

/**
 * The catalogue of builds that are not hosted.
 *
 * These are the command-line tools and exercises — work that has no browser
 * front end, so there is nothing to deploy and a separate site would be an empty
 * shell. They are listed here so the work is reachable, with an honest statement
 * of what a visitor can and cannot do: read the source and run it locally. None
 * of them has a live demo, and this page never pretends otherwise.
 *
 * The list is generated from `projects.json` (`npm run catalogue`), so a project
 * marked `deployment: "catalogue"` appears here without anyone editing this page,
 * and a project that stops being a catalogue entry disappears from it.
 */

interface CatalogueEntry {
  slug: string;
  name: string;
  path: string;
  companySlug: string | null;
  companyName: string | null;
  summary: string | null;
  title: string | null;
  tags: string[];
  interfaces: string[];
}

const catalogue = entries as CatalogueEntry[];

const byCompany = new Map<string, CatalogueEntry[]>();
for (const entry of catalogue) {
  const key = entry.companyName ?? 'Independent builds';
  byCompany.set(key, [...(byCompany.get(key) ?? []), entry]);
}

export default function CataloguePage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider accent-text">Catalogue</p>
        <h1 className="mt-1 text-2xl font-semibold">Educational builds</h1>
        <p className="mt-2 max-w-prose text-muted">
          {catalogue.length} self-contained builds — command-line tools, exercises and reference
          implementations. Each one lives in its own folder with its own tests and README. They are
          catalogued rather than deployed: there is no browser interface to open, so a hosted site
          would show an empty page. Run any of them locally from the repository.
        </p>
      </header>

      <p className="card text-sm">
        <strong className="font-semibold">What is and is not here.</strong> Every entry below is
        working code with tests you can run. None of them is hosted, and none has a public demo —
        so a link is not offered where a link would 404. Projects with their own working front end
        and back end are deployed separately instead, and appear under{' '}
        <a className="accent-text underline" href="/products">
          products
        </a>
        .
      </p>

      {[...byCompany.entries()].map(([company, group]) => (
        <section key={company} aria-labelledby={`catalogue-${company}`} className="space-y-4">
          <h2 id={`catalogue-${company}`} className="text-lg font-semibold">
            {company}
            <span className="ml-2 text-sm font-normal text-muted">({group.length})</span>
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {group.map((entry) => (
              <li key={entry.slug}>
                <article className="card h-full" id={entry.slug} aria-labelledby={`${entry.slug}-name`}>
                  <h3 id={`${entry.slug}-name`} className="text-base font-semibold">
                    {entry.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {entry.summary ?? `${entry.title ?? entry.name} — a command-line build.`}
                  </p>
                  <p className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    <code className="rounded border border-line px-1.5 py-0.5">{entry.path}</code>
                    {entry.interfaces.map((surface) => (
                      <span key={surface} className="rounded border border-line px-1.5 py-0.5">
                        {surface}
                      </span>
                    ))}
                  </p>
                  {entry.tags.length > 0 ? (
                    <p className="mt-2 text-xs text-muted">{entry.tags.join(' · ')}</p>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
