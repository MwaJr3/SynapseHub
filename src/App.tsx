import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RootLayout } from '@/components/navigation/RootLayout';

// Route-level code splitting: the case-study template and the secondary pages
// are only downloaded when a visitor navigates to them.
const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const AppHubPage = lazy(() => import('@/pages/AppHubPage'));
const ChallengeAppPage = lazy(() => import('@/pages/ChallengeAppPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const SkillsPage = lazy(() => import('@/pages/SkillsPage'));
const JourneyPage = lazy(() => import('@/pages/JourneyPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function RouteFallback() {
  return (
    <div className="shell py-24" role="status" aria-live="polite">
      <p className="eyebrow">Loading</p>
      <p className="prose-body mt-3 text-sm">Preparing this page…</p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:slug" element={<ProjectDetailPage />} />
        <Route path="apps" element={<AppHubPage />} />
        <Route path="apps/:slug" element={<ChallengeAppPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="journey" element={<JourneyPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <AppRoutes />
    </Suspense>
  );
}
