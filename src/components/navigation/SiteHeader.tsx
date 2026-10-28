import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { profileConfig } from '@/config/site';
import { ThemeSwitcher } from './ThemeSwitcher';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/system', label: 'System' },
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { to: '/apps', label: 'Apps' },
  { to: '/skills', label: 'Skills' },
  { to: '/journey', label: 'Journey' },
  { to: '/approach', label: 'Approach' },
  { to: '/operations', label: 'Operations' },
  { to: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  // Close the mobile menu on navigation so it never lingers over new content.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Move focus into the menu so keyboard users are not left behind the toggle.
    const firstLink = menuRef.current?.querySelector<HTMLAnchorElement>('a');
    firstLink?.focus();

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-surface/90 backdrop-blur transition-shadow duration-300',
        scrolled ? 'border-line shadow-raised' : 'border-transparent',
      )}
    >
      <div className="shell flex items-center justify-between gap-4 py-3">
        <Link
          to="/"
          className="group flex items-center gap-3"
          aria-label={`${profileConfig.name} — home`}
        >
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-line-strong bg-panel-strong font-mono text-sm font-semibold text-accent transition-colors duration-300 group-hover:border-accent"
          >
            {profileConfig.monogram}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-ink">
              {profileConfig.name}
            </span>
            <span className="mono-meta hidden sm:inline">
              Frontend development · UI engineering
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-pill px-3 py-2 text-sm transition-colors duration-200',
                      isActive
                        ? 'bg-panel-strong text-ink'
                        : 'text-ink-muted hover:bg-panel-strong hover:text-ink',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeSwitcher className="hidden sm:flex" />
          <Link
            to="/projects"
            className="btn btn-primary hidden md:inline-flex px-3.5 py-2 text-sm"
          >
            Explore projects
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="btn btn-secondary px-3 py-2 text-sm lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" className="grid gap-1">
              <span className="block h-[1.5px] w-4 bg-current" />
              <span className="block h-[1.5px] w-4 bg-current" />
              <span className="block h-[1.5px] w-4 bg-current" />
            </span>
            <span>{menuOpen ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        ref={menuRef}
        hidden={!menuOpen}
        className="border-t border-line bg-surface lg:hidden"
      >
        <nav aria-label="Mobile" className="shell py-4">
          <ul className="grid gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between rounded-card border px-4 py-3 text-sm',
                      isActive
                        ? 'border-accent/50 bg-accent/[0.08] text-ink'
                        : 'border-line bg-panel text-ink-muted hover:text-ink',
                    )
                  }
                >
                  {item.label}
                  <span aria-hidden="true" className="mono-meta">
                    →
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-3">
            <ThemeSwitcher compact />
            <Link
              to="/projects"
              className="btn btn-primary px-3.5 py-2 text-sm"
            >
              Explore projects
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
