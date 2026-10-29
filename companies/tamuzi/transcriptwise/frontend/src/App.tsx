import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Toaster } from 'sonner'
import { ThemeProvider } from './lib/theme'
import { SessionProvider } from './lib/session'
import { UIProvider } from './lib/ui'
import { Shell } from './components/Shell'
import { EmptyState, Spinner } from './components/ui'
import { Dashboard, NewAnalysis } from './pages/Dashboard'
const Review = lazy(() => import('./pages/Review').then((module) => ({ default: module.Review })))
const GuidePage = lazy(() => import('./pages/GuidePage').then((module) => ({ default: module.GuidePage })))
const Library = lazy(() => import('./pages/Library').then((module) => ({ default: module.Library })))
const FlashcardsPage = lazy(() =>
  import('./pages/FlashcardsPage').then((module) => ({ default: module.FlashcardsPage })),
)
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })))
const Help = lazy(() => import('./pages/Help').then((module) => ({ default: module.Help })))
const About = lazy(() => import('./pages/About').then((module) => ({ default: module.About })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      retry: (count, error) => count < 1 && !('status' in error && Number(error.status) < 500),
      refetchOnWindowFocus: false,
    },
  },
})
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const title = pathname.startsWith('/guide')
      ? 'Learning workspace'
      : pathname.startsWith('/library')
        ? 'My library'
        : pathname.startsWith('/settings')
          ? 'Settings'
          : pathname.startsWith('/new')
            ? 'New learning guide'
            : pathname.startsWith('/review')
              ? 'Review transcript'
              : pathname.startsWith('/flashcards')
                ? 'Flashcards'
                : 'Make knowledge yours'
    document.title = `${title} · TranscriptWise`
  }, [pathname])
  return null
}
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <SessionProvider>
            <UIProvider>
              <ScrollToTop />
              <Routes>
                <Route
                  path="/about"
                  element={
                    <Suspense
                      fallback={
                        <div className="boot-screen">
                          <Spinner label="Opening TranscriptWise…" />
                        </div>
                      }
                    >
                      <About />
                    </Suspense>
                  }
                />
                <Route element={<Shell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="/new" element={<NewAnalysis />} />
                  <Route path="/review/:id" element={<Review />} />
                  <Route path="/guide/:id" element={<GuidePage />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/flashcards" element={<FlashcardsPage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/help" element={<Help />} />
                  <Route
                    path="*"
                    element={
                      <div className="workspace-page">
                        <EmptyState
                          icon={<BookOpen size={32} />}
                          title="A little off the beaten path."
                          description="That page isn’t in this workspace. Let’s get you back to your next good idea."
                          action={
                            <Link className="button primary" to="/">
                              <ArrowLeft size={15} />
                              Back to overview
                            </Link>
                          }
                        />
                      </div>
                    }
                  />
                </Route>
              </Routes>
              <Toaster position="bottom-right" closeButton richColors duration={4500} />
            </UIProvider>
          </SessionProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
