/**
 * The configuration report.
 *
 * This is the answer to "the deployment is READY and every page 500s". A missing
 * variable has to produce a sentence that names the variable and describes what
 * a visitor will see — before anyone opens the site.
 *
 * The assertions that matter most are the negative ones: a secret value must
 * never appear in the report or the printed form, because this output goes into
 * build logs and an admin page.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { configReport, formatConfigReport } from '@/lib/config-check';

const original = { ...process.env };

const COMPLETE = {
  DATABASE_URL: 'postgresql://user:pass@db.example.com/app',
  AUTH_SECRET: 'a'.repeat(44),
  BREVO_API_KEY: 'xkeysib-a-secret-key-value',
  CONTACT_FROM_EMAIL: 'noreply@example.com',
  STORAGE_PROVIDER: 'postgres',
  ASSISTANT_PROVIDER: 'openjarvis',
  ASSISTANT_MODEL: 'qwen2.5:3b',
};

beforeEach(() => {
  process.env = { ...original };
  for (const name of Object.keys(COMPLETE)) delete process.env[name];
  delete process.env.ASSISTANT_BASE_URL;
  delete process.env.ASSISTANT_API_KEY;
});

afterEach(() => {
  process.env = { ...original };
});

describe('config report', () => {
  it('is clean when every deployment-critical item is present', () => {
    Object.assign(process.env, COMPLETE);

    const report = configReport();
    expect(report.ready).toBe(true);
    expect(report.blockers).toBe(0);
    for (const check of report.checks) expect(check.state).not.toBe('missing');
  });

  it('treats a missing database and missing auth secret as blockers', () => {
    const report = configReport({});
    expect(report.ready).toBe(false);

    const database = report.checks.find((check) => check.id === 'database');
    const auth = report.checks.find((check) => check.id === 'auth-secret');
    expect(database?.state).toBe('missing');
    expect(database?.missing).toEqual(['DATABASE_URL']);
    expect(auth?.state).toBe('missing');
    expect(auth?.missing).toEqual(['AUTH_SECRET']);
  });

  it('keeps the assistants optional, and says what a visitor gets instead', () => {
    const report = configReport({ DATABASE_URL: 'x', AUTH_SECRET: 'y' });
    const assistant = report.checks.find((check) => check.id === 'assistant-model');

    expect(assistant?.state).toBe('optional');
    expect(assistant?.effect).toMatch(/switched off/);
  });

  it('reports a malformed sender address rather than accepting it', () => {
    const report = configReport({ BREVO_API_KEY: 'key', CONTACT_FROM_EMAIL: 'not-an-address' });
    const contact = report.checks.find((check) => check.id === 'contact-email');

    expect(contact?.state).toBe('missing');
    expect(contact?.missing).toEqual(['CONTACT_FROM_EMAIL']);
  });

  it('treats an http canonical URL as unconfigured', () => {
    const report = configReport({ NEXT_PUBLIC_SITE_URL: 'http://example.com' });
    const site = report.checks.find((check) => check.id === 'site-url');

    expect(site?.state).toBe('optional');
    expect(site?.missing).toEqual(['NEXT_PUBLIC_SITE_URL']);
  });

  it('reports storage problems through the storage module', () => {
    const report = configReport({ STORAGE_PROVIDER: 'postgres' });
    const storage = report.checks.find((check) => check.id === 'resume-storage');

    expect(storage?.label).toContain('postgres');
    expect(storage?.state).toBe('missing');
    expect(storage?.missing).toEqual(['DATABASE_URL']);
  });

  it('never prints a secret value', () => {
    Object.assign(process.env, COMPLETE);

    const printed = formatConfigReport(configReport());
    expect(printed).not.toContain('xkeysib-a-secret-key-value');
    expect(printed).not.toContain('a'.repeat(44));
    expect(printed).not.toContain('user:pass');
    // Variable names are the point of the report, so those must be there.
    expect(printed).toContain('Database');
  });

  it('exits-ready language names the count when something is missing', () => {
    const printed = formatConfigReport(configReport({}));
    expect(printed).toContain('MISS');
    expect(printed).toMatch(/required item\(s\) are missing/);
  });
});
