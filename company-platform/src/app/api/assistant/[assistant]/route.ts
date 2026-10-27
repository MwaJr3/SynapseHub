/**
 * POST /api/assistant/<name> — one streamed turn for one assistant.
 *
 * Server side only: the provider token never reaches the browser. An unknown
 * assistant is a 404 rather than a default, so the two companies cannot leak
 * into each other by accident.
 */
import { isAssistantName } from '@/content/assistants';
import { assistantConfig } from '@/lib/assistant/provider';
import { streamAnswer, type Turn } from '@/lib/assistant/stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  message?: unknown;
  history?: unknown;
}

function parseHistory(value: unknown): Turn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const role = (entry as { role?: unknown }).role;
    const text = (entry as { text?: unknown }).text;
    if ((role !== 'user' && role !== 'assistant') || typeof text !== 'string') return [];
    return [{ role, text }];
  });
}

export async function POST(request: Request, context: { params: Promise<{ assistant: string }> }) {
  const { assistant } = await context.params;
  if (!isAssistantName(assistant)) {
    return Response.json({ error: 'unknown_assistant' }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 2 || message.length > 4000) {
    return Response.json({ error: 'invalid_message' }, { status: 422 });
  }

  const config = assistantConfig();
  if (!config.configured) {
    // 503 with the reason, not a chat box that cannot answer.
    return Response.json(
      { error: 'assistant_not_configured', missing: config.missing, reason: config.reason },
      { status: 503 },
    );
  }

  const stream = streamAnswer(assistant, message, parseHistory(body.history), { config });
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const frame of stream) {
            controller.enqueue(encoder.encode(frame));
          }
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        'x-accel-buffering': 'no',
      },
    },
  );
}
