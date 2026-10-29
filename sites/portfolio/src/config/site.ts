/**
 * Site-wide configuration.
 *
 * Anything that changes per deployment lives here and is read from environment
 * variables at build time (Vite exposes only `VITE_`-prefixed values to the
 * client — never put a secret in this file).
 */

const env = import.meta.env;

/** Absolute origin of the deployed site, e.g. https://mwangala.dev.
 *  Left empty on purpose: canonical URLs and og:url are only emitted when a
 *  real production domain has been configured. */
export const siteUrl: string = (env.VITE_SITE_URL ?? '').replace(/\/+$/, '');

/** Optional backend that accepts contact-form submissions (POST, JSON).
 *  When empty the contact page falls back to an explicit mailto: hand-off and
 *  says so instead of pretending a message was delivered. */
export const contactEndpoint: string = env.VITE_CONTACT_ENDPOINT ?? '';

/**
 * The portfolio lives in a sub-section of the company site.
 *
 * The company landing page owns `/`; everything documented as portfolio work is
 * served under this prefix. Keeping it in one constant means the router, the
 * sitemap generator and outbound links cannot drift apart.
 */
/** Name shown for the company section. Override with VITE_COMPANY_NAME. */
export const companyName: string =
  (env.VITE_COMPANY_NAME as string | undefined)?.trim() || 'SynapseHub';

export const PORTFOLIO_BASE = '/portfolio';

/** Absolute path to a portfolio page, e.g. portfolioPath('/projects') -> '/portfolio/projects'. */
export function portfolioPath(path = '/'): string {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${PORTFOLIO_BASE}${clean}`;
}

export const site = {
  name: 'Mwangala',
  shortName: 'MW',
  title: 'Mwangala — Python Developer · Cybersecurity · Full-Stack Engineering',
  description:
    'Portfolio of Mwangala, a developer building practical Python, full-stack and defensive-cybersecurity applications. Nine project case studies with the engineering decisions behind them.',
  keywords: [
    'Mwangala',
    'Python developer portfolio',
    'full-stack engineer',
    'defensive cybersecurity',
    'FastAPI',
    'React',
    'TypeScript',
    'security tooling',
  ],
  locale: 'en',
  url: siteUrl,
  contactEndpoint,
  /** Shown in the footer; kept honest and non-committal. */
  buildNote: 'Built with React, TypeScript, Vite and Tailwind CSS.',
} as const;

/** Canonical absolute URL when a production domain is configured, else null. */
export function absoluteUrl(path: string): string | null {
  if (!siteUrl) return null;
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * True when a URL belongs to the portfolio section.
 *
 * `App` uses this to pick the router: the portfolio mounts with
 * `basename={PORTFOLIO_BASE}`, which is what keeps its unprefixed internal
 * routes (`/projects`, `/about`) working under the public prefix.
 */
export function isPortfolioPath(pathname: string): boolean {
  return pathname === PORTFOLIO_BASE || pathname.startsWith(`${PORTFOLIO_BASE}/`);
}
