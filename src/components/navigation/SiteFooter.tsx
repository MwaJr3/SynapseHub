import { Link } from 'react-router-dom';
import { contactConfig, links, profileConfig } from '@/config/site';
import { projects } from '@/data/projects';
import { unconnectedSlugs } from '@/config/deployment';
import { pluralise } from '@/lib/format';

const footerNav = [
  { to: '/projects', label: 'All projects' },
  { to: '/about', label: 'About' },
  { to: '/skills', label: 'Skills' },
  { to: '/journey', label: 'Journey' },
  { to: '/approach', label: 'Approach' },
  { to: '/operations', label: 'Operations' },
  { to: '/contact', label: 'Contact' },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  const pending = unconnectedSlugs();
  const connectedCount = projects.length - pending.length;

  return (
    <footer
      data-tone="contrast"
      className="border-t border-line bg-surface text-ink"
    >
      <div className="shell grid gap-12 py-14 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="eyebrow">Portfolio</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">
            {profileConfig.name}
          </p>
          <p className="prose-body mt-3 max-w-sm text-sm">
            Software that explores how technology can make learning more
            accessible, personalized and useful — offline-first study, teaching
            workflows, assessment, analytics and responsible AI support.
          </p>
          <p className="mono-meta mt-5">{profileConfig.role}</p>
        </div>

        <nav aria-label="Footer">
          <p className="eyebrow">Navigate</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {footerNav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-ink-muted transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="eyebrow">Elsewhere</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {links.github && (
              <li>
                <a
                  href={links.github}
                  className="text-ink-muted transition-colors hover:text-accent"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub profile
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
            {links.linkedin && (
              <li>
                <a
                  href={links.linkedin}
                  className="text-ink-muted transition-colors hover:text-accent"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Professional profile
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
            {links.mailto && (
              <li>
                <a
                  href={links.mailto}
                  className="text-ink-muted transition-colors hover:text-accent"
                >
                  {contactConfig.email}
                </a>
              </li>
            )}
            {!links.github && !links.linkedin && !links.mailto && (
              <li className="prose-body text-xs">
                No external profiles are configured yet. See{' '}
                <code className="font-mono">.env.example</code> and{' '}
                <span className="font-mono">docs/CONNECTING_PROJECTS.md</span>.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="shell flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="mono-meta">
            © {year} {profileConfig.name}. Case studies are illustrative of
            intended capability.
          </p>
          <p className="mono-meta">
            {pluralise(projects.length, 'project')} documented ·{' '}
            {connectedCount} connected · {pending.length} awaiting application
            and repository links
          </p>
        </div>
      </div>
    </footer>
  );
}
