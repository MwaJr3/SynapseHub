export function jobTone(state: string): string {
  switch (state) {
    case 'delivered': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'sent': return 'bg-sky-950 text-sky-300 border border-sky-800';
    case 'queued': return 'bg-amber-950 text-amber-300 border border-amber-800';
    default: return 'bg-rose-950 text-rose-300 border border-rose-800';
  }
}

export const SIMULATOR_NOTICE =
  'SIMULATOR MODE — messages are recorded locally and are never real carrier delivery.';

export function channelTone(channel: string): string {
  switch (channel) {
    case 'sms': return 'bg-indigo-950 text-indigo-300 border border-indigo-800';
    case 'ussd': return 'bg-teal-950 text-teal-300 border border-teal-800';
    case 'ivr': return 'bg-violet-950 text-violet-300 border border-violet-800';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}
