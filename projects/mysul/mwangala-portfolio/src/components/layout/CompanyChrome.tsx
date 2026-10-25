import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PORTFOLIO_BASE, companyName, absoluteUrl } from '@/config/site';
import { contactEmails } from '@/config/profile';
import { Container } from '@/components/ui/Layout';
import { LinkButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ThemeControl } from './ThemeControl';

/**
 * Chrome for the company section (`/`).
 *
 * Deliberately separate from the portfolio shell: portfolio navigation points at
 * `/about`, `/projects` and so on, which only exist under the portfolio's router
 * basename. Mixing the two would produce dead links, so the company site has its
 * own minimal navigation that always resolves.
 */

const companyNav = [
  { label: 'What we build', href: '#capabilities' },
  { label: 'How we work', href: '#principles' },
];

export function CompanyHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4">
          <a
            href="/"
            className="min-w-0 rounded-md font-semibold tracking-tight text-fg transition-opacity hover:opacity-85"
            aria-label={`${companyName} — company home`}
          >
            {companyName}
          </a>

          <nav aria-label="Company" className="hidden items-center gap-1 md:flex">
            {companyNav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <LinkButton to={PORTFOLIO_BASE} variant="secondary" size="sm" className="hidden sm:inline-flex">
              Portfolio
              <Icon name="arrow-right" className="ml-1.5 h-4 w-4" />
            </LinkButton>
            <ThemeControl />
          </div>
        </div>
      </div>
    </header>
  );
}

export function CompanyFooter() {
  const year = new Date().getFullYear();

  return (
    <footer data-panel="dark" className="border-t border-line bg-canvas text-fg">
      <Container className="py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="text-base font-semibold tracking-tight text-fg">{companyName}</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">
              Defensive-security analysis tools and full-stack applications. The engineering record
              lives in the portfolio, including what each project cannot do.
            </p>
          </div>

          <nav aria-label="Site sections">
            <h2 className="eyebrow mb-3">Sections</h2>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a href="/" className="text-fg-muted transition-colors hover:text-fg">
                  Company home
                </a>
              </li>
              <li>
                <Link to={PORTFOLIO_BASE} className="text-fg-muted transition-colors hover:text-fg">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link
                  to={`${PORTFOLIO_BASE}/projects`}
                  className="text-fg-muted transition-colors hover:text-fg"
                >
                  Case studies
                </Link>
              </li>
              <li>
                <Link
                  to={`${PORTFOLIO_BASE}/contact`}
                  className="text-fg-muted transition-colors hover:text-fg"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow mb-3">Enquiries</h2>
            <ul className="flex flex-col gap-1.5">
              {contactEmails.map((email) => (
                <li key={email}>
                  <a
                    href={`mailto:${email}`}
                    className="font-mono text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    {email}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-fg-subtle">
          © {year} {companyName}.{' '}
          {siteUrlConfigured() ? (
            <>
              Canonical address: <code className="font-mono">{absoluteUrl('/')}</code>.
            </>
          ) : (
            <>No custom domain is configured yet, so no canonical URL is emitted.</>
          )}
        </p>
      </Container>
    </footer>
  );
}

function siteUrlConfigured(): boolean {
  return absoluteUrl('/') !== null;
}

export function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-fg"
      >
        Skip to main content
      </a>
      <CompanyHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <CompanyFooter />
    </div>
  );
}
