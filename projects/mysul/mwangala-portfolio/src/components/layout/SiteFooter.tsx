import { Link } from 'react-router-dom';
import { primaryNav } from '@/config/nav';
import { profile, configuredLinks, hasContactEmail } from '@/config/profile';
import { site } from '@/config/site';
import { projects } from '@/data/projects';
import { isUsableLink } from '@/lib/links';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Layout';
import { Wordmark } from './Wordmark';

const linkIcon: Record<string, IconName> = {
  github: 'github',
  linkedin: 'linkedin',
  website: 'external',
  other: 'external',
  email: 'mail',
};

/**
 * The footer sits on the dark technical surface by default (part of the hybrid
 * composition) and collapses to the site scheme when Light or Dark is chosen.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const links = configuredLinks();

  return (
    <footer data-panel="dark" className="border-t border-line bg-canvas text-fg">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">{profile.positioning}</p>
            <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-fg-subtle">
              {profile.coreMessage}
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="eyebrow mb-3">Navigate</h2>
            <ul className="space-y-2">
              {primaryNav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Projects">
            <h2 className="eyebrow mb-3">Projects</h2>
            <ul className="space-y-2">
              {projects.map((project) => (
                <li key={project.slug}>
                  <Link
                    to={`/projects/${project.slug}`}
                    className="text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow mb-3">Elsewhere</h2>
            {links.length === 0 && !hasContactEmail() ? (
              <p className="text-sm leading-relaxed text-fg-subtle">
                Profile links and contact details are configured in{' '}
                <code className="font-mono text-[0.78rem] text-fg-muted">src/config/profile.ts</code>. None are
                published yet, so nothing here links to a placeholder destination.
              </p>
            ) : (
              <ul className="space-y-2">
                {hasContactEmail() ? (
                  <li>
                    <a
                      href={`mailto:${profile.email}`}
                      className="inline-flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-accent"
                    >
                      <Icon name="mail" size={15} aria-hidden />
                      {profile.email}
                    </a>
                  </li>
                ) : null}
                {links.map((link) =>
                  isUsableLink(link.url) ? (
                    <li key={link.kind}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-accent"
                      >
                        <Icon name={linkIcon[link.kind] ?? 'external'} size={15} aria-hidden />
                        {link.label}
                        <Icon name="arrow-up-right" size={12} aria-hidden />
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            )}

            <h2 className="eyebrow mb-3 mt-6">Privacy</h2>
            <p className="text-sm leading-relaxed text-fg-subtle">
              This site is a static build. It sets no cookies, runs no analytics and stores nothing about
              visitors — the only browser storage used is your own theme preference.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {profile.name}. {site.buildNote}
          </p>
          <p className="max-w-xl sm:text-right">
            Project artwork on this site is representative preview artwork drawn from each project&apos;s
            documented feature set — not screenshots of deployed instances.
          </p>
        </div>
      </Container>
    </footer>
  );
}
