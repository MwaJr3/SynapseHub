/**
 * Support requests: the human handoff at the end of an assistant conversation.
 *
 * Modelled on what a support inbox actually needs (Chatwoot's core idea) without
 * importing a helpdesk: one record per conversation, a short reference the
 * visitor can quote, the transcript, and a status a person can move.
 *
 * Two deliberate constraints:
 *
 * - **Nothing is created without explicit confirmation.** Raising a request is a
 *   side effect on somebody else's queue, so the client must send
 *   `confirmed: true`. The UI asks first; the server refuses otherwise. That is
 *   the approval gate, and it is checked here rather than trusted from the UI.
 * - **The company is decided from the assistant, never from the request body.**
 *   A visitor cannot file into the other company's queue.
 */
import { eq, inArray } from 'drizzle-orm';

import { ASSISTANTS, type AssistantName } from '@/content/assistants';
import type { Db } from '@/lib/db';
import { companies, supportRequests } from '@/lib/db/schema';

export type SupportStatus = 'OPEN' | 'ACKED' | 'CLOSED';

export interface TranscriptTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface HandoffInput {
  assistant: AssistantName;
  confirmed: boolean;
  name: string;
  email: string;
  message: string;
  transcript: TranscriptTurn[];
}

export interface HandoffErrors {
  name?: string;
  email?: string;
  message?: string;
  confirmed?: string;
  transcript?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Pure validation so the rules can be tested without a database. */
export function validateHandoff(input: Partial<HandoffInput>): HandoffErrors {
  const errors: HandoffErrors = {};
  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim();
  const message = (input.message ?? '').trim();
  const transcript = input.transcript ?? [];

  if (name.length < 2) errors.name = 'Please give a name to reply to.';
  if (name.length > 120) errors.name = 'That name is too long.';
  if (!EMAIL.test(email)) errors.email = 'A reply address is needed.';
  if (message.length < 10) errors.message = 'Describe what you need a person to look at.';
  if (message.length > 4000) errors.message = 'That message is too long.';
  if (input.confirmed !== true) {
    errors.confirmed = 'Confirm you want this sent to the team before it is created.';
  }
  if (!Array.isArray(transcript) || transcript.some((turn) => !turn || typeof turn.text !== 'string')) {
    errors.transcript = 'The conversation could not be read.';
  }
  if (transcript.length > 40) errors.transcript = 'That conversation is too long to send.';
  return errors;
}

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** A code a person can read aloud: no 0/O/1/I. */
export function makeReference(prefix: string, random: () => number = Math.random): string {
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    code += ALPHABET[Math.floor(random() * ALPHABET.length)] ?? 'X';
  }
  return `${prefix}-${code}`;
}

const PREFIX: Record<AssistantName, string> = {
  'velaqori-triage': 'VLQ',
  'tamuzi-study-plan': 'TMZ',
};

export interface CreatedRequest {
  reference: string;
  status: SupportStatus;
  companyName: string;
}

/**
 * Store the request. The company is resolved from the assistant's own record —
 * the body never says which company this belongs to.
 */
export async function createSupportRequest(
  db: Db,
  input: HandoffInput,
): Promise<{ ok: true; created: CreatedRequest } | { ok: false; errors: HandoffErrors }> {
  const errors = validateHandoff(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const assistant = ASSISTANTS[input.assistant];
  const [company] = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.slug, assistant.companySlug))
    .limit(1);
  if (!company) {
    return { ok: false, errors: { message: 'That company is not configured on this deployment.' } };
  }

  const reference = makeReference(PREFIX[input.assistant]);
  await db.insert(supportRequests).values({
    reference,
    companyId: company.id,
    assistant: input.assistant,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    message: input.message.trim(),
    transcript: input.transcript.slice(-40).map((turn) => ({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      text: turn.text.slice(0, 4000),
    })),
  });

  return { ok: true, created: { reference, status: 'OPEN', companyName: company.name } };
}

export interface InboxRow {
  id: string;
  reference: string;
  companyName: string;
  assistant: string;
  name: string;
  email: string;
  message: string;
  status: SupportStatus;
  createdAt: Date;
  turns: number;
}

/** The inbox is scoped to the companies the viewer holds a role in. */
export async function listSupportRequests(db: Db, companyIds: string[]): Promise<InboxRow[]> {
  if (companyIds.length === 0) return [];
  const rows = await db
    .select({
      id: supportRequests.id,
      reference: supportRequests.reference,
      companyName: companies.name,
      assistant: supportRequests.assistant,
      name: supportRequests.name,
      email: supportRequests.email,
      message: supportRequests.message,
      status: supportRequests.status,
      createdAt: supportRequests.createdAt,
      transcript: supportRequests.transcript,
    })
    .from(supportRequests)
    .innerJoin(companies, eq(companies.id, supportRequests.companyId))
    .where(inArray(supportRequests.companyId, companyIds))
    .orderBy(supportRequests.createdAt);

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    companyName: row.companyName,
    assistant: row.assistant,
    name: row.name,
    email: row.email,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
    turns: row.transcript?.length ?? 0,
  }));
}
