import { Suspense, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Command,
  House,
  Layers,
  Library,
  Menu,
  Monitor,
  Moon,
  Plus,
  Settings2,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Brand, Spinner } from './ui'
import { useSession } from '../lib/session'
import { useAuthDialog } from '../lib/ui'
import { patch, request } from '../lib/api'
import { useTheme } from '../lib/theme'
import type { Stats, Theme } from '../lib/types'
import { cx } from '../lib/utils'

export function ThemeMenu() {
  const { theme, setTheme } = useTheme()
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  return (
    <details className="dropdown theme-dropdown">
      <summary className="icon-button" aria-label="Change color theme" title="Change color theme">
        <Icon size={18} />
      </summary>
      <div className="dropdown-menu">
        <span className="dropdown-label">Appearance</span>
        {(
          [
            ['light', Sun, 'Light'],
            ['dark', Moon, 'Dark'],
            ['system', Monitor, 'System'],
          ] as const
        ).map(([value, ItemIcon, label]) => (
          <button
            key={value}
            className={cx(theme === value && 'selected')}
            onClick={(e) => {
              setTheme(value as Theme)
              const parent = e.currentTarget.closest('details')
              if (parent) parent.open = false
              patch('/preferences', { theme: value }).catch(() =>
                toast.info('Theme saved in this browser. Server preference could not be updated.'),
              )
            }}
          >
            <ItemIcon size={15} />
            {label}
            {theme === value && <span className="menu-check">✓</span>}
          </button>
        ))}
      </div>
    </details>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { session } = useSession()
  const openAuth = useAuthDialog()
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => request<Stats>('/stats') })
  return (
    <>
      <div className="sidebar-brand">
        <Brand />
      </div>
      <div className="workspace-label">
        <span className="workspace-symbol">
          <BookOpen size={14} />
        </span>
        <div>
          <strong>Personal workspace</strong>
          <span>
            {session.user.is_guest
              ? 'A little room to think'
              : `${session.user.display_name.split(' ')[0]}'s learning space`}
          </span>
        </div>
      </div>
      <Link to="/new" onClick={onNavigate} className="sidebar-new">
        <Plus size={17} />
        <span>New learning guide</span>
        <span className="key-hint">
          <Command size={10} /> K
        </span>
      </Link>
      <div className="nav-label">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/" end onClick={onNavigate}>
          <House size={18} />
          <span>Overview</span>
          <span className="active-dot" />
        </NavLink>
        <NavLink to="/library" onClick={onNavigate}>
          <Library size={18} />
          <span>My library</span>
          {!!stats?.guides && <span className="nav-count">{stats.guides}</span>}
        </NavLink>
        <NavLink to="/flashcards" onClick={onNavigate}>
          <Layers size={18} />
          <span>Flashcards</span>
        </NavLink>
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note">
        <span className="little-spark">
          <Sparkles size={18} />
        </span>
        <strong>Make knowledge yours.</strong>
        <p>
          Don’t just save another video.
          <br />
          Save what you learn.
        </p>
        <Link to="/about" onClick={onNavigate}>
          A better way to learn <ArrowUpRight size={14} />
        </Link>
      </div>
      <nav className="main-nav secondary-nav" aria-label="Workspace support">
        <NavLink to="/help" onClick={onNavigate}>
          <CircleHelp size={17} />
          <span>Help & getting started</span>
        </NavLink>
        <NavLink to="/settings" onClick={onNavigate}>
          <Settings2 size={17} />
          <span>Settings</span>
        </NavLink>
      </nav>
      <div className="sidebar-profile">
        {session.user.is_guest ? (
          <button
            onClick={() => {
              onNavigate?.()
              openAuth('register')
            }}
          >
            <span className="avatar">G</span>
            <span>
              <strong>Guest workspace</strong>
              <small>Create an account to save</small>
            </span>
            <ChevronRight size={15} />
          </button>
        ) : (
          <Link to="/settings" onClick={onNavigate}>
            <span className="avatar">{session.user.display_name.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{session.user.display_name}</strong>
              <small>Personal account</small>
            </span>
            <ChevronRight size={15} />
          </Link>
        )}
      </div>
    </>
  )
}
export function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useSession()
  const titles: [string, string][] = [
    ['/new', 'New learning guide'],
    ['/review', 'Review transcript'],
    ['/guide', 'Learning workspace'],
    ['/library', 'My library'],
    ['/flashcards', 'Flashcards'],
    ['/settings', 'Settings'],
    ['/help', 'Getting started'],
  ]
  const title = titles.find(([path]) => location.pathname.startsWith(path))?.[1] || 'Overview'
  // A useful shortcut, not a decorative key hint.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navigate('/new')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <SidebarContent />
      </aside>
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-start">
            <button
              className="icon-button mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumbs">
              <span className="breadcrumb-icon">
                <BookOpen size={14} />
              </span>
              <Link to="/">Workspace</Link>
              <ChevronRight size={13} />
              <span>{title}</span>
            </div>
          </div>
          <div className="topbar-end">
            <span className="topbar-tagline">
              <span /> A little wiser, every day.
            </span>
            <span className="topbar-divider" />
            <ThemeMenu />
            <Link className="icon-button" aria-label="Help and getting started" to="/help">
              <CircleHelp size={18} />
            </Link>
            <button
              className="topbar-avatar"
              aria-label="Open account settings"
              onClick={() => navigate('/settings')}
            >
              {session.user.is_guest ? 'G' : session.user.display_name[0]}
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Suspense
            fallback={
              <div className="workspace-page">
                <Spinner label="Opening your workspace…" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="mobile-sidebar">
            <Dialog.Title className="sr-only">Workspace navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Navigate TranscriptWise</Dialog.Description>
            <Dialog.Close className="icon-button mobile-close" aria-label="Close navigation">
              <X size={18} />
            </Dialog.Close>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
