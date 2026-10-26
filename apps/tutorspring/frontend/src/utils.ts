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
