import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { CompanyLayout } from '@/components/layout/CompanyChrome';
import { RouteLoading } from '@/components/layout/RouteLoading';
import { ThemeProvider } from '@/hooks/useTheme';
import { PORTFOLIO_BASE, isPortfolioPath } from '@/config/site';
import { useScrollRestoration } from '@/lib/seo';

const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const SkillsPage = lazy(() => import('@/pages/SkillsPage'));
const ApproachPage = lazy(() => import('@/pages/ApproachPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const EarlierWorkPage = lazy(() => import('@/pages/EarlierWorkPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const CompanyHomePage = lazy(() => import('@/pages/company/CompanyHomePage'));

/**
 * The portfolio shell and its route table, router-agnostic so tests can mount it
 * inside a MemoryRouter. `App` below supplies the BrowserRouter for the browser.
 *
 * Paths here stay unprefixed (`/projects`, `/about`, …). The portfolio is served
 * under `PORTFOLIO_BASE`, so the browser router supplies that as its basename —
 * every absolute `<Link to="/projects">` therefore resolves to
 * `/portfolio/projects` in production while staying readable in tests.
 */
export function AppShell() {
  useScrollRestoration();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-fg"
      >
        Skip to main content
      </a>

      <SiteHeader />

      <main id="main" className="flex-1">
        <Suspense key={location.pathname} fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:slug" element={<ProjectDetailPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/approach" element={<ApproachPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/earlier-work" element={<EarlierWorkPage />} />

            {/* Convenience aliases for older links. */}
            <Route path="/engineering-approach" element={<Navigate to="/approach" replace />} />
            <Route path="/engineering" element={<Navigate to="/approach" replace />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}

/** The company section: a small, self-contained router rooted at `/`. */
export function CompanyShell() {
  useScrollRestoration();

  return (
    <CompanyLayout>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<CompanyHomePage />} />
          <Route
            path="*"
            element={
              <div className="container-page py-24">
                <p className="eyebrow">Not found</p>
                <h1 className="mt-3 text-3xl font-semibold text-fg">This page doesn’t exist</h1>
                <p className="mt-3 max-w-xl text-sm text-fg-muted">
                  The company site only publishes its home page. Project case studies and the rest of
                  the engineering record live in the portfolio at{' '}
                  <a href={PORTFOLIO_BASE} className="text-accent underline">
                    {PORTFOLIO_BASE}
                  </a>
                  .
                </p>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </CompanyLayout>
  );
}

export function App() {
  const pathname = typeof window === 'undefined' ? '/' : window.location.pathname;
  const portfolio = isPortfolioPath(pathname);

  return (
    <ThemeProvider>
      {portfolio ? (
        <BrowserRouter basename={PORTFOLIO_BASE}>
          <AppShell />
        </BrowserRouter>
      ) : (
        <BrowserRouter>
          <CompanyShell />
        </BrowserRouter>
      )}
    </ThemeProvider>
  );
}
