export const AI_DISCLAIMER =
  'AI-generated responses can be wrong. Check the cited sources and ask a teacher when unsure.';

export function modeTone(demo: boolean): string {
  return demo
    ? 'bg-amber-950 text-amber-300 border border-amber-800'
    : 'bg-emerald-950 text-emerald-300 border border-emerald-800';
}

export function supportLabel(supported: boolean): string {
  return supported ? 'Answered from approved sources' : 'Not covered by approved material';
}

/** A learner-owned copy of a conversation, including the AI disclaimer and cited sources. */
export function conversationToText(
  thread: { role: string; text: string; sources: { title: string; topic: string }[]; demo_response: boolean }[],
): string {
  const lines: string[] = ['TutorSpring conversation', AI_DISCLAIMER, ''];
  for (const m of thread) {
    lines.push(`${m.role === 'user' ? 'Me' : m.demo_response ? 'Tutor (demo response)' : 'Tutor'}: ${m.text}`);
    if (m.sources.length > 0) lines.push(`  Sources: ${m.sources.map((s) => `${s.title} (${s.topic})`).join('; ')}`);
    lines.push('');
  }
  return lines.join('\n');
}
