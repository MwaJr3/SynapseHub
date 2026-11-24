export function appStatusTone(status: string): string {
  switch (status) {
    case 'approved': case 'enrolled': case 'completed': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'waitlisted': case 'needs_info': return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'declined': return 'bg-rose-950 text-rose-300 border border-rose-800';
    default: return 'bg-sky-950 text-sky-300 border border-sky-800';
  }
}

export function planLabel(kind: string, price: number): string {
  switch (kind) {
    case 'free': return 'Free';
    case 'subsidized': return `Subsidized — $${price.toFixed(2)}`;
    case 'scholarship': return 'Scholarship-funded';
    case 'sponsor': return 'Sponsor-funded seat';
    default: return `Paid — $${price.toFixed(2)}`;
  }
}

export const LEDGER_RULE =
  'Pending payments are NOT settled funds. Refunds and reversals are recorded as distinct entries.';

export const FAIRNESS_RULE =
  'Consequential decisions require recorded human review — no opaque scoring, sponsors never see applicant details.';

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function applicationsToCsv(apps: { id: unknown; plan_id: unknown; status: unknown; statement?: unknown; decision_reason?: unknown }[]): string {
  const rows = apps.map((a) => [a.id, a.plan_id, a.status, a.statement, a.decision_reason].map(csvCell).join(','));
  return ['application,plan,status,statement,decision_reason', ...rows].join('\n');
}
