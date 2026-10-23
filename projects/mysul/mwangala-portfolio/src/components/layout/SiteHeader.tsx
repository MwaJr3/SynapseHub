import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { primaryNav } from '@/config/nav';
import { profile } from '@/config/profile';
import { projects } from '@/data/projects';
import { useBodyScrollLock } from '@/hooks/useUi';
import { Icon } from '@/components/ui/Icon';
import { LinkButton } from '@/components/ui/Button';
import { ThemeControl } from './ThemeControl';
import { Wordmark } from './Wordmark';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  useBodyScrollLock(menuOpen);

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  // Escape closes and returns focus to the toggle.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    // Move focus into the panel when it opens.
    firstLinkRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'text-fg' : 'text-fg-muted hover:text-fg',
    );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-3 sm:gap-4">
          <Link
            to="/"
            className="min-w-0 rounded-md transition-opacity hover:opacity-85"
            aria-label="Mwangala — home"
          >
            <Wordmark className="min-w-0" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.match === 'exact'}
                className={navLinkClass}
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden font-mono text-[0.68rem] text-fg-subtle xl:inline">
              {projects.length} projects
            </span>
            <ThemeControl />
            {/* Wrapped rather than given `hidden sm:inline-flex` directly:
                LinkButton's own display utility would otherwise win the
                specificity-free cascade against `hidden`. */}
            <span className="hidden sm:inline-flex">
              <LinkButton to="/projects" variant="primary" size="sm">
                Explore projects
              </LinkButton>
            </span>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted transition-colors hover:text-fg lg:hidden"
            >
              <span className="sr-only">{menuOpen ? 'Close navigation menu' : 'Open navigation menu'}</span>
              <Icon name={menuOpen ? 'close' : 'menu'} size={18} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="mobile-navigation"
          className="animate-fade-in border-t border-line bg-surface lg:hidden"
        >
          <nav aria-label="Mobile" className="container-page py-3">
            <ul className="flex flex-col">
              {primaryNav.map((item, index) => (
                <li key={item.to}>
                  <NavLink
                    ref={index === 0 ? firstLinkRef : undefined}
                    to={item.to}
                    end={item.match === 'exact'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium transition-colors',
                        isActive ? 'bg-accent-soft text-fg' : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                      )
                    }
                  >
                    {item.label}
                    <Icon name="chevron-right" size={16} aria-hidden />
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mt-3 border-t border-line pt-3">
              <p className="eyebrow mb-2 px-1">Projects</p>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {projects.map((project) => (
                  <li key={project.slug}>
                    <Link
                      to={`/projects/${project.slug}`}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
                    >
                      <span
                        aria-hidden="true"
                        data-accent={project.accent}
                        className="size-2 shrink-0 rounded-full bg-[var(--prj)]"
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-col gap-2 px-1 pb-2 sm:flex-row">
              <LinkButton to="/projects" variant="primary" size="md" className="flex-1">
                Explore projects
              </LinkButton>
              <LinkButton to="/contact" variant="outline" size="md" className="flex-1">
                {profile.email ? 'Get in touch' : 'Contact'}
              </LinkButton>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
