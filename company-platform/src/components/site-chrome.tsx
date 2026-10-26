/** Global header and footer — shared design system, per-company tokens. */
import Link from 'next/link';
import type { ReactNode } from 'react';

import { CompanyTokenSync } from '@/components/company-token-sync';
import { ThemeSwitcher } from '@/components/theme-switcher';
import type { Actor } from '@/lib/auth';

const PUBLIC_NAV = [
  { href: '/companies', label: 'Companies' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/products', label: 'Products' },
  { href: '/ecosystem', label: 'Learning systems' },
  { href: '/support', label: 'IT triage' },
  { href: '/study-plan', label: 'Study planning' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/people', label: 'People' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export function SiteHeader({ actor }: { actor: Actor | null }) {
  return (
    <header className="surface border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
        <Link href="/" className="text-base font-semibold">
          Velaqori &amp; Tamuzi Platform
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <nav aria-label="Company switcher" className="flex items-center gap-2 text-xs">
            <Link href="/companies/velaqori-systems" className="accent-text font-medium hover:underline">
              Velaqori
            </Link>
            <span aria-hidden="true" className="text-muted">/</span>
            <Link href="/companies/tamuzi-learning" className="accent-text font-medium hover:underline">
              Tamuzi
            </Link>
          </nav>
          <ThemeSwitcher />
          {actor ? (
            <Link href="/member/dashboard" className="btn btn-secondary">
              Dashboard
            </Link>
          ) : (
            <Link href="/member/sign-in" className="btn btn-secondary">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="surface mt-16 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-3">
        <div>
          <p className="font-semibold text-[var(--ink)]">Two independent companies</p>
          <p className="mt-2">
            Velaqori Systems (software and cybersecurity) and Tamuzi Learning
            (education technology) are separate businesses shown on one shared
            discovery platform. Working names pending trademark checks; no
            parent-subsidiary relationship exists or is implied.
          </p>
        </div>
        <div>
          <p className="font-semibold text-[var(--ink)]">Explore</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/ecosystem" className="hover:underline">The learning systems</Link></li>
            <li><Link href="/products" className="hover:underline">All products</Link></li>
            <li><Link href="/case-studies" className="hover:underline">Case studies</Link></li>
            <li><Link href="/people" className="hover:underline">People</Link></li>
            <li><Link href="/about" className="hover:underline">About the platform</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-[var(--ink)]">Legal</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/privacy/velaqori-systems" className="hover:underline">Privacy — Velaqori Systems</Link></li>
            <li><Link href="/privacy/tamuzi-learning" className="hover:underline">Privacy — Tamuzi Learning</Link></li>
            <li><Link href="/terms/velaqori-systems" className="hover:underline">Terms — Velaqori Systems</Link></li>
            <li><Link href="/terms/tamuzi-learning" className="hover:underline">Terms — Tamuzi Learning</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-xs text-muted">
        Seed content on this platform is illustrative working material derived
        from project briefs. No metrics, deployment claims, or legal details are
        asserted without configuration.
      </div>
    </footer>
  );
}

export function PageShell({
  children,
  actor,
  companySlug,
}: {
  children: ReactNode;
  actor: Actor | null;
  companySlug?: string;
}) {
  return (
    <>
      {companySlug ? <CompanyTokenSync companySlug={companySlug} /> : null}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader actor={actor} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
