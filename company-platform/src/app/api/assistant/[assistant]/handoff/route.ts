/**
 * POST /api/assistant/<name>/handoff — raise a support request.
 *
 * The approval gate lives here, not in the UI: `confirmed` must be `true` or
 * nothing is created. A visitor cannot choose which company receives it — that
 * comes from the assistant.
 */
import { isAssistantName } from '@/content/assistants';
import { getDb } from '@/lib/db';
import { createSupportRequest, type TranscriptTurn } from '@/lib/support/requests';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseTranscript(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const role = (entry as { role?: unknown }).role;
    const text = (entry as { text?: unknown }).text;
    if (typeof text !== 'string') return [];
    return [{ role: role === 'assistant' ? 'assistant' : 'user', text }];
  });
}

export async function POST(request: Request, context: { params: Promise<{ assistant: string }> }) {
  const { assistant } = await context.params;
  if (!isAssistantName(assistant)) {
    return Response.json({ error: 'unknown_assistant' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const result = await createSupportRequest(getDb(), {
    assistant,
    confirmed: body.confirmed === true,
    name: typeof body.name === 'string' ? body.name : '',
    email: typeof body.email === 'string' ? body.email : '',
    message: typeof body.message === 'string' ? body.message : '',
    transcript: parseTranscript(body.transcript),
  });

  if (!result.ok) {
    // 409 for "you did not confirm": nothing was created, and retrying with
    // confirmation is the fix. Field problems are a 422.
    const status = result.errors.confirmed ? 409 : 422;
    return Response.json({ error: 'invalid_handoff', fieldErrors: result.errors }, { status });
  }

  return Response.json(result.created, { status: 201 });
}
