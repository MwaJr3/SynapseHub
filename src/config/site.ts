/**
 * Site configuration.
 *
 * Everything here is optional and environment-driven. A value that is empty,
 * malformed, or not an http(s) URL is treated as *not configured*: the
 * related button/link/section is never rendered, so the site can never point a
 * visitor at an invented destination. See `docs/CONNECTING_PROJECTS.md`.
 */

export interface ContactConfig {
  email: string;
  /** HTTPS endpoint receiving `{ name, email, subject, message }` as JSON. */
  formEndpoint: string;
  /** Optional sentence describing availability. Empty means "no statement". */
  availabilityStatement: string;
}

export interface ProfileConfig {
  name: string;
  monogram: string;
  role: string;
  location?: string;
  githubUrl: string;
  linkedinUrl: string;
}

export interface SiteConfig {
  title: string;
  shortTitle: string;
  description: string;
  /** Production origin used for canonical + Open Graph URLs. */
  url: string;
  ogImagePath: string;
}

const rawEnv = import.meta.env as unknown as Record<string, string | undefined>;

const readEnv = (key: string): string => (rawEnv[key] ?? '').trim();

export const siteConfig: SiteConfig = {
  title: 'Mwangala — Building Better Ways to Learn',
  shortTitle: 'Mwangala',
  description:
    'Mwangala builds education-technology software: offline-first learning, AI-assisted tutoring, assessment, teacher tools, analytics, low-bandwidth delivery and affordable access.',
  url: readEnv('VITE_SITE_URL').replace(/\/+$/, ''),
  ogImagePath: '/og-image.png',
};

export const profileConfig: ProfileConfig = {
  name: 'Mwangala',
  monogram: 'M',
  role: 'Python Developer | Software Engineering | AI-Powered Learning Tools',
  githubUrl: readEnv('VITE_GITHUB_URL'),
  linkedinUrl: readEnv('VITE_LINKEDIN_URL'),
};

export const contactConfig: ContactConfig = {
  email: readEnv('VITE_CONTACT_EMAIL'),
  formEndpoint: readEnv('VITE_CONTACT_ENDPOINT'),
  availabilityStatement: readEnv('VITE_AVAILABILITY_STATEMENT'),
};

/** Local development origins are allowed for demo links; everything else must be HTTPS. */
export const LOCAL_DEV_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Returns a safe absolute http(s) URL, or `undefined` when the input is empty,
 * malformed, or uses a scheme that should never be rendered as a link
 * (`javascript:`, `data:`, `vbscript:`, …). Plain `http:` URLs are only
 * accepted for local development hosts so a deployed portfolio cannot send
 * visitors to insecure destinations.
 */
export function resolveExternalUrl(
  value: string | undefined | null,
): string | undefined {
  if (!value) return undefined;
  const candidate = value.trim();
  if (!candidate) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return undefined;
  }

  if (parsed.protocol === 'https:') {
    return parsed.toString();
  }

  if (
    parsed.protocol === 'http:' &&
    LOCAL_DEV_HOSTS.includes(parsed.hostname)
  ) {
    return parsed.toString();
  }

  return undefined;
}

/** True when a configuration value will actually render as a link. */
export function isConfigured(value: string | undefined | null): boolean {
  return resolveExternalUrl(value) !== undefined;
}

export const links = {
  get github(): string | undefined {
    return resolveExternalUrl(profileConfig.githubUrl);
  },
  get linkedin(): string | undefined {
    return resolveExternalUrl(profileConfig.linkedinUrl);
  },
  get email(): string | undefined {
    return contactConfig.email ? contactConfig.email : undefined;
  },
  get mailto(): string | undefined {
    return contactConfig.email ? `mailto:${contactConfig.email}` : undefined;
  },
  get contactForm(): string | undefined {
    return resolveExternalUrl(contactConfig.formEndpoint);
  },
};
