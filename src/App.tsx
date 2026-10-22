import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RootLayout } from '@/components/navigation/RootLayout';

// Route-level code splitting: the case-study template and the secondary pages
// are only downloaded when a visitor navigates to them.
const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const SkillsPage = lazy(() => import('@/pages/SkillsPage'));
const JourneyPage = lazy(() => import('@/pages/JourneyPage'));
const ApproachPage = lazy(() => import('@/pages/ApproachPage'));
const OperationsPage = lazy(() => import('@/pages/OperationsPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const SystemPage = lazy(() => import('@/pages/SystemPage'));

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
        <Route path="skills" element={<SkillsPage />} />
        <Route path="journey" element={<JourneyPage />} />
        <Route path="approach" element={<ApproachPage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="system" element={<SystemPage />} />
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
