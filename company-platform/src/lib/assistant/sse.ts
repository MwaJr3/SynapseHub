/**
 * Client-side parsing of the assistant's event stream.
 *
 * Pure and framework-free so it can be unit-tested: a network chunk can end in
 * the middle of a frame, and an unparseable frame is dropped rather than shown
 * to a visitor as half an answer.
 */

export interface AssistantEvent {
  name: string;
  data: Record<string, unknown>;
}

export interface ParsedFrames {
  events: AssistantEvent[];
  rest: string;
}

export function takeFrames(buffer: string): ParsedFrames {
  const events: AssistantEvent[] = [];
  const blocks = buffer.split('\n\n');
  const rest = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim()) continue;
    let name = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) continue;
    try {
      const parsed: unknown = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        events.push({ name, data: parsed as Record<string, unknown> });
      }
    } catch {
      // Skip it.
    }
  }
  return { events, rest };
}

export function textField(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

export interface Citation {
  id: string;
  title: string;
}

export function citationsFrom(payload: Record<string, unknown>): Citation[] {
  const raw = payload.citations;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const id = (entry as { id?: unknown }).id;
    const title = (entry as { title?: unknown }).title;
    if (typeof id !== 'string' || typeof title !== 'string') return [];
    return [{ id, title }];
  });
}
