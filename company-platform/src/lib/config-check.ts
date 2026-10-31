/**
 * The deployment's configuration, checked from the outside.
 *
 * Written after 2026-10-29, when a deployment sat at READY while every page
 * returned a 500 because a database had never been created. The lesson was not
 * "watch the build" — it was that a missing variable should produce a sentence
 * somebody can act on, before a visitor sees anything.
 *
 * Everything here reports on **presence and shape**, never on values. A token is
 * named (`BREVO_API_KEY`) and never echoed, hashed, or partially shown.
 *
 * Two consumers:
 * - `npm run config:check` — prints the report and exits non-zero when a
 *   deployment-critical item is missing.
 * - `/admin/settings` — renders the same report, so the answer is available to
 *   somebody who can sign in but cannot read a build log.
 */
import { assistantConfig } from '@/lib/assistant/provider';
import { storageStatus, type StorageStatus } from '@/lib/storage';

export type CheckState = 'ready' | 'missing' | 'optional';

export interface ConfigCheck {
  /** Stable id, used as a React key and in the CLI output. */
  id: string;
  label: string;
  state: CheckState;
  /** What a visitor or an operator sees when this is not configured. */
  effect: string;
  /** Variable names only — never values. */
  missing: string[];
}

export interface ConfigReport {
  checks: ConfigCheck[];
  /** True when every `required` check is satisfied. */
  ready: boolean;
  /** How many required checks are unconfigured. */
  blockers: number;
}

export interface ConfigEnv {
  [key: string]: string | undefined;
}

function present(env: ConfigEnv, name: string): boolean {
  return (env[name] ?? '').trim().length > 0;
}

/** A plausible email address — shape only, no verification. */
function looksLikeEmail(value: string | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value ?? '').trim());
}

function contactCheck(env: ConfigEnv): ConfigCheck {
  const missing: string[] = [];
  if (!present(env, 'BREVO_API_KEY')) missing.push('BREVO_API_KEY');
  if (!looksLikeEmail(env.CONTACT_FROM_EMAIL)) missing.push('CONTACT_FROM_EMAIL');
  // The two inboxes have defaults in code; a misconfigured override is reported
  // rather than silently replaced, because "the form says sent" is the failure
  // that matters here.
  for (const name of ['CONTACT_VELAQORI_EMAIL', 'CONTACT_TAMUZI_EMAIL']) {
    if (present(env, name) && !looksLikeEmail(env[name])) missing.push(name);
  }

  return {
    id: 'contact-email',
    label: 'Contact-form email (Brevo)',
    state: missing.length === 0 ? 'ready' : 'missing',
    effect:
      missing.length === 0
        ? 'A submission is emailed to the company inbox the visitor chose, and recorded in the platform inbox either way.'
        : 'The form still records every message, and tells the visitor plainly that it was not sent. No message is silently dropped and none is claimed as delivered.',
    missing,
  };
}

function storageCheck(env: ConfigEnv): ConfigCheck {
  const status: StorageStatus = storageStatus(env);
  const required = status.provider !== 'local';
  return {
    id: 'resume-storage',
    label: `Resume storage (${status.provider})`,
    state: !required ? 'optional' : status.ready ? 'ready' : 'missing',
    effect:
      status.provider === 'local'
        ? 'Local directory: correct for development, and wrong on a deployment, where the filesystem is per-instance and read-only outside /tmp.'
        : status.detail,
    missing: status.missing,
  };
}

function assistantCheck(env: ConfigEnv): ConfigCheck {
  const config = assistantConfig(env);
  const modelLabel = env.ASSISTANT_PROVIDER ? ` (${env.ASSISTANT_PROVIDER})` : '';
  return {
    id: 'assistant-model',
    label: `Assistant model${modelLabel}`,
    state: config.configured ? 'ready' : 'optional',
    effect: config.configured
      ? config.reason
      : 'The two assistants are switched off. The pages say so instead of showing a chat box that cannot answer.',
    missing: config.missing,
  };
}

function authCheck(env: ConfigEnv): ConfigCheck {
  const secret = (env.AUTH_SECRET ?? env.NEXTAUTH_SECRET ?? '').trim();
  const missing: string[] = [];
  if (secret.length === 0) missing.push('AUTH_SECRET');
  return {
    id: 'auth-secret',
    label: 'Session signing secret',
    state: missing.length === 0 ? 'ready' : 'missing',
    effect:
      missing.length === 0
        ? 'Sign-in can mint a session, and `/admin` and `/member` are reachable to the people who hold an account.'
        : 'NextAuth refuses to sign anyone in, so every `/admin` and `/member` route fails. Public pages are unaffected.',
    missing,
  };
}

function databaseCheck(env: ConfigEnv): ConfigCheck {
  const missing = present(env, 'DATABASE_URL') ? [] : ['DATABASE_URL'];
  return {
    id: 'database',
    label: 'Database',
    state: missing.length === 0 ? 'ready' : 'missing',
    effect:
      missing.length === 0
        ? 'PostgreSQL is configured; the schema and catalogue are created by the build step before the site is served.'
        : 'A deployment refuses to start embedded PGlite, so every page reports that the catalogue is unavailable.',
    missing,
  };
}

function siteUrlCheck(env: ConfigEnv): ConfigCheck {
  const url = (env.NEXT_PUBLIC_SITE_URL ?? '').trim();
  const missing = url.length > 0 && !/^https:\/\//.test(url) ? ['NEXT_PUBLIC_SITE_URL'] : [];
  return {
    id: 'site-url',
    label: 'Canonical site URL',
    state: url.length > 0 && missing.length === 0 ? 'ready' : 'optional',
    effect:
      url.length > 0
        ? 'Canonical links and `sitemap.xml` use this origin.'
        : 'No canonical origin is configured, so sitemap entries are omitted rather than pointed at a guess.',
    missing,
  };
}

/** The whole report. Deterministic order, so the CLI diff is readable. */
export function configReport(env: ConfigEnv = process.env): ConfigReport {
  const checks = [
    databaseCheck(env),
    authCheck(env),
    contactCheck(env),
    storageCheck(env),
    assistantCheck(env),
    siteUrlCheck(env),
  ];
  const blockers = checks.filter((check) => check.state === 'missing').length;
  return { checks, ready: blockers === 0, blockers };
}

/** One line per check, for a terminal. Contains no secret values by construction. */
export function formatConfigReport(report: ConfigReport): string {
  const badge: Record<CheckState, string> = {
    ready: 'ok  ',
    missing: 'MISS',
    optional: 'opt ',
  };
  const lines = report.checks.map((check) => {
    const tail =
      check.state === 'ready'
        ? ''
        : check.missing.length > 0
          ? ` — set ${check.missing.join(', ')}`
          : ` — ${check.effect}`;
    return `[${badge[check.state]}] ${check.label}${tail}`;
  });
  lines.push(
    report.ready
      ? 'All required configuration is present.'
      : `${report.blockers} required item(s) are missing.`,
  );
  return lines.join('\n');
}
