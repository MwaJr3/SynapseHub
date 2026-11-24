export function sessionTone(status: string): string {
  switch (status) {
    case 'live': return 'bg-rose-950 text-rose-300 border border-rose-800';
    case 'starting': return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'scheduled': return 'bg-sky-950 text-sky-300 border border-sky-800';
    case 'ended': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export function localTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export const NO_FAKE_VIDEO =
  'When no WebRTC provider is configured the live-call integration shows as unavailable — asynchronous workflows continue and a real call is never faked.';

/** Plain-text copy of a session's chat and questions, so nothing is lost when the class ends. */
export function chatToText(messages: { kind: string; body: string }[]): string {
  return messages.map((m) => `[${m.kind}] ${m.body}`).join('\n');
}
