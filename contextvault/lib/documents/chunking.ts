export interface Segment { text: string; page?: number | null; section?: string | null }
export interface Chunk { content: string; page_number: number | null; section_title: string | null; token_count: number; }
export function normalizeText(text: string): string {
  return text.normalize('NFKC').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
export function textSegments(text: string, markdown = false, page?: number): Segment[] {
  const blocks = normalizeText(text).split(/\n\s*\n/).filter(Boolean);
  let section: string | null = null;
  const result: Segment[] = [];
  for (const block of blocks) {
    const lines = block.split('\n'); let rest: string[] = [];
    const flush = () => { if (rest.length) { result.push({ text: rest.join('\n').trim(), section, page }); rest = []; } };
    for (const line of lines) {
      const heading = markdown && line.match(/^#{1,4}\s+(.{1,160})$/);
      if (heading) { flush(); section = heading[1].trim(); } else rest.push(line);
    }
    flush();
  }
  return result;
}
function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/); const parts: string[] = []; let current = '';
  for (const sentence of sentences) {
    if (sentence.length > max) {
      if (current) { parts.push(current); current = ''; }
      let remaining = sentence;
      while (remaining.length > max) {
        let cut = remaining.lastIndexOf(' ', max); if (cut < max / 2) cut = max;
        parts.push(remaining.slice(0,cut).trim()); remaining = remaining.slice(cut).trim();
      }
      current = remaining;
    } else if ((current + ' ' + sentence).trim().length > max) { parts.push(current); current = sentence; }
    else current = (current + ' ' + sentence).trim();
  }
  if (current) parts.push(current); return parts.filter(Boolean);
}
export function chunkSegments(segments: Segment[], size = 900, overlap = 120): Chunk[] {
  if (size < 100 || overlap < 0 || overlap >= size) throw new Error('Invalid chunk configuration.');
  const chunks: Chunk[] = []; let buffer = ''; let page: number | null = null; let section: string | null = null;
  const flush = () => { const content = buffer.trim(); if (content) chunks.push({ content, page_number: page, section_title: section, token_count: Math.ceil(content.length/4) }); };
  for (const segment of segments) {
    const nextPage = segment.page ?? null, nextSection = segment.section ?? null;
    if (buffer && (page !== nextPage || section !== nextSection)) { flush(); buffer = ''; }
    page = nextPage; section = nextSection;
    for (const piece of splitLong(normalizeText(segment.text), size)) {
      if (buffer && buffer.length + piece.length + 2 > size) {
        flush();
        let tail = overlap ? buffer.slice(-overlap) : '';
        if (tail && tail.length < buffer.length) tail = tail.replace(/^\S*\s+/, '');
        // Do not let overlap displace the next paragraph or exceed the size.
        buffer = tail && tail.length + piece.length + 2 <= size ? tail : '';
      }
      buffer = (buffer ? buffer + '\n\n' : '') + piece;
    }
  }
  flush(); return chunks;
}
