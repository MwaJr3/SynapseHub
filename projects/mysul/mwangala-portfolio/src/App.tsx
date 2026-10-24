import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { RouteLoading } from '@/components/layout/RouteLoading';
import { ThemeProvider } from '@/hooks/useTheme';
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

/**
 * The application shell and route table, router-agnostic so tests can mount it
 * inside a MemoryRouter. `App` below supplies the BrowserRouter for the browser.
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

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ThemeProvider>
  );
}
