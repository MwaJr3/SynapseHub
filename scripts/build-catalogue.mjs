#!/usr/bin/env node
/**
 * Generate the catalogue the company site publishes.
 *
 * The owner's rule (2026-10-28): a project with its own working frontend and backend
 * stays a separate deployment; a CLI-only build is catalogued on the company site
 * instead. `projects.json` records that decision, so this file is derived from it
 * rather than typed by hand — the registry test asserts the two agree, and the
 * generator is what makes agreeing cheap.
 *
 * Descriptions come from each project's own `portfolio.json` where one exists. No
 * description is invented here: a project without one gets a neutral, factual line
 * naming what it is, which is visible as such on the page.
 *
 * Usage: node scripts/build-catalogue.mjs [--check]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(REPO, 'projects.json');
const OUT = join(REPO, 'company-platform/src/content/catalogue.generated.json');

const COMPANY = {
  velaqori: { slug: 'velaqori-systems', name: 'Velaqori Systems' },
  tamuzi: { slug: 'tamuzi-learning', name: 'Tamuzi Learning' },
};

/** The project's own metadata, if it ships any. */
function portfolio(projectPath) {
  const file = join(REPO, projectPath, 'portfolio.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const readmeTitle = (projectPath) => {
  const file = join(REPO, projectPath, 'README.md');
  if (!existsSync(file)) return null;
  // Only the first H1 is a usable title; the rest of the README is prose.
  const first = readFileSync(file, 'utf8')
    .split('\n')
    .find((line) => line.startsWith('# '));
  if (!first) return null;
  return first.replace(/^#\s+/, '').split(' — ')[0].trim();
};

function build() {
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  return registry.projects
    .filter((project) => project.deployment === 'catalogue')
    .map((project) => {
      const meta = portfolio(project.path);
      const company = project.owner ? COMPANY[project.owner] : null;
      return {
        slug: project.slug,
        name: meta?.name ?? project.name ?? readmeTitle(project.path) ?? project.slug,
        path: project.path,
        companySlug: company?.slug ?? null,
        companyName: company?.name ?? null,
        // `summary` is the project's own words when it has them; otherwise it says
        // plainly what the build is, which the page also shows is machine-derived.
        summary: meta?.shortDescription ?? null,
        title: readmeTitle(project.path),
        tags: meta?.tags ?? [],
        interfaces: project.interface,
        // Nothing here is hosted. The page states this; it is never a per-entry claim.
        runnableLocally: true,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const serialised = `${JSON.stringify(build(), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== serialised) {
    console.error('catalogue.generated.json is stale — run: npm run catalogue');
    process.exit(1);
  }
  console.log('catalogue.generated.json is up to date');
} else {
  writeFileSync(OUT, serialised);
  const entries = JSON.parse(serialised);
  const owned = entries.filter((entry) => entry.companySlug).length;
  console.log(
    `${entries.length} catalogue entries · ${owned} with a company · ` +
      `${entries.filter((e) => e.summary).length} with their own description`,
  );
}
