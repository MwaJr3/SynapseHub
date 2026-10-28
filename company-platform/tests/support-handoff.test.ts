/**
 * The handoff is the only place a visitor's words are written to a queue a person
 * reads, so the rules around it are tested rather than assumed:
 *
 * - nothing is created without explicit confirmation;
 * - the company comes from the assistant, never from the caller;
 * - the inbox is scoped to the viewer's companies;
 * - the reference is readable and unique enough to quote.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db';
import { companies, supportRequests } from '@/lib/db/schema';
import {
  createSupportRequest,
  listSupportRequests,
  makeReference,
  validateHandoff,
} from '@/lib/support/requests';

/**
 * The handoff resolves the company from the assistant's slug, so the real slugs
 * have to exist. Tests insert them rather than relying on a seeded catalogue.
 */
async function ensureCompany(slug: string, name: string): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(companies);
  if (rows.some((row) => row.slug === slug)) return;
  await db.insert(companies).values({ id: `co-${slug}`, slug, name });
}

beforeAll(async () => {
  await ensureCompany('velaqori-systems', 'Velaqori Systems');
  await ensureCompany('tamuzi-learning', 'Tamuzi Learning');
});

const VALID = {
  assistant: 'velaqori-triage' as const,
  confirmed: true,
  name: 'A Visitor',
  email: 'visitor@example.net',
  message: 'A laptop is behaving strangely since yesterday.',
  transcript: [
    { role: 'user' as const, text: 'a laptop is behaving strangely' },
    { role: 'assistant' as const, text: 'Rotate the credential first.' },
  ],
};

describe('validateHandoff', () => {
  it('accepts a complete, confirmed handoff', () => {
    expect(validateHandoff(VALID)).toEqual({});
  });

  it('refuses to create anything without confirmation', () => {
    const errors = validateHandoff({ ...VALID, confirmed: false });
    expect(errors.confirmed).toContain('Confirm');
  });

  it('treats a missing confirmation as no confirmation', () => {
    const { confirmed: _omitted, ...withoutFlag } = VALID;
    expect(validateHandoff(withoutFlag).confirmed).toBeDefined();
  });

  it('requires a reply address that looks like one', () => {
    expect(validateHandoff({ ...VALID, email: 'not-an-email' }).email).toBeDefined();
    expect(validateHandoff({ ...VALID, email: '' }).email).toBeDefined();
  });

  it('requires a description a person can act on', () => {
    expect(validateHandoff({ ...VALID, message: 'help' }).message).toBeDefined();
  });

  it('caps the transcript length', () => {
    const long = Array.from({ length: 41 }, () => ({ role: 'user' as const, text: 'hi' }));
    expect(validateHandoff({ ...VALID, transcript: long }).transcript).toBeDefined();
  });

  it('rejects a transcript it cannot read', () => {
    const broken = [{ role: 'user', text: 5 }] as unknown as typeof VALID.transcript;
    expect(validateHandoff({ ...VALID, transcript: broken }).transcript).toBeDefined();
  });
});

describe('makeReference', () => {
  it('uses a company prefix and avoids characters that are misread aloud', () => {
    const reference = makeReference('VLQ');
    expect(reference).toMatch(/^VLQ-[2-9A-HJ-NP-Z]{6}$/);
    expect(reference).not.toMatch(/[01OI]/);
  });

  it('is deterministic when the randomness is supplied', () => {
    expect(makeReference('TMZ', () => 0)).toBe('TMZ-222222');
  });
});

describe('createSupportRequest', () => {
  it('stores the request against the assistant’s own company', async () => {
    const db = getDb();
    const result = await createSupportRequest(db, VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created.companyName).toBe('Velaqori Systems');
    expect(result.created.status).toBe('OPEN');

    const stored = await db.select().from(supportRequests);
    const mine = stored.find((row) => row.reference === result.created.reference);
    expect(mine).toBeDefined();
    expect(mine?.transcript).toHaveLength(2);
    expect(mine?.email).toBe('visitor@example.net');
  });

  it('routes the study planner to the other company', async () => {
    const db = getDb();
    const result = await createSupportRequest(db, { ...VALID, assistant: 'tamuzi-study-plan' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created.companyName).toBe('Tamuzi Learning');
    expect(result.created.reference.startsWith('TMZ-')).toBe(true);
  });

  it('creates nothing when the confirmation is missing', async () => {
    const db = getDb();
    const before = (await db.select().from(supportRequests)).length;
    const result = await createSupportRequest(db, { ...VALID, confirmed: false });
    expect(result.ok).toBe(false);
    const after = (await db.select().from(supportRequests)).length;
    expect(after).toBe(before);
  });
});

describe('listSupportRequests', () => {
  it('returns nothing when the viewer holds no company', async () => {
    expect(await listSupportRequests(getDb(), [])).toEqual([]);
  });

  it('only returns requests for the companies asked for', async () => {
    const db = getDb();
    const velaqori = await createSupportRequest(db, { ...VALID, message: 'Scoping check one, please.' });
    const tamuzi = await createSupportRequest(db, {
      ...VALID,
      assistant: 'tamuzi-study-plan',
      message: 'Scoping check two, please.',
    });
    expect(velaqori.ok && tamuzi.ok).toBe(true);
    if (!velaqori.ok || !tamuzi.ok) return;

    const rows = await db.select().from(supportRequests);
    const velaqoriCompany = rows.find((row) => row.reference === velaqori.created.reference)?.companyId;
    expect(velaqoriCompany).toBeDefined();

    const scoped = await listSupportRequests(db, [velaqoriCompany as string]);
    expect(scoped.every((row) => row.companyName === 'Velaqori Systems')).toBe(true);
    expect(scoped.some((row) => row.reference === velaqori.created.reference)).toBe(true);
    expect(scoped.some((row) => row.reference === tamuzi.created.reference)).toBe(false);
  });
});
