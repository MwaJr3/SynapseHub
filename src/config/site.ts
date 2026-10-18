/** Optional identity/contact configuration. Empty values never render fake links. */
export interface ContactConfig { email: string }
export interface ProfileConfig {
  name: string;
  monogram: string;
  role: string;
  githubUrl: string;
  linkedinUrl: string;
}
export interface SiteConfig {
  title: string;
  shortTitle: string;
  description: string;
  /** Production origin used for canonical and Open Graph URLs. */
  url: string;
  ogImagePath: string;
}

const rawEnv = import.meta.env as unknown as Record<string, string | undefined>;
const readEnv = (key: string): string => (rawEnv[key] ?? '').trim();

export const siteConfig: SiteConfig = {
  title: 'Mwangala — Frontend Developer',
  shortTitle: 'Mwangala',
  description: 'Frontend development portfolio catalogue of 60 Frontend Mentor challenge briefs; independent implementation status is clearly identified.',
  url: readEnv('VITE_SITE_URL').replace(/\/+$/, ''),
  ogImagePath: '/og-image.png',
};

export const profileConfig: ProfileConfig = {
  name: 'Mwangala',
  monogram: 'M',
  role: 'Frontend Developer | UI Engineering | Interactive Web Applications',
  githubUrl: readEnv('VITE_GITHUB_URL'),
  linkedinUrl: readEnv('VITE_LINKEDIN_URL'),
};

export const contactConfig: ContactConfig = { email: readEnv('VITE_CONTACT_EMAIL') };

export const LOCAL_DEV_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/** Return a safe absolute HTTP(S) URL or undefined for invalid destinations. */
export function resolveExternalUrl(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  let parsed: URL;
  try { parsed = new URL(value.trim()); } catch { return undefined; }
  if (parsed.protocol === 'https:') return parsed.toString();
  if (parsed.protocol === 'http:' && LOCAL_DEV_HOSTS.includes(parsed.hostname)) return parsed.toString();
  return undefined;
}

export function isConfigured(value: string | undefined | null): boolean {
  return resolveExternalUrl(value) !== undefined;
}

export const links = {
  get github(): string | undefined { return resolveExternalUrl(profileConfig.githubUrl); },
  get linkedin(): string | undefined { return resolveExternalUrl(profileConfig.linkedinUrl); },
  get email(): string | undefined { return contactConfig.email || undefined; },
  get mailto(): string | undefined { return contactConfig.email ? `mailto:${contactConfig.email}` : undefined; },
};
