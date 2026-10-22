/** Presentation helpers shared by server and client. No invented numbers. */

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null,
): string {
  const code = currency ?? 'USD';
  const symbol = code === 'USD' ? '$' : `${code} `;
  const periodLabel: Record<string, string> = {
    YEAR: 'yr',
    MONTH: 'mo',
    WEEK: 'wk',
    DAY: 'day',
    HOUR: 'hr',
  };
  const suffix =
    periodLabel[period ?? ''] ?? (period ?? 'year').toLowerCase();
  const fmt = (value: number) =>
    `${symbol}${Intl.NumberFormat('en', { notation: 'compact' }).format(value)}`;
  if (min != null && max != null && min !== max) {
    return `${fmt(min)}–${fmt(max)}/${suffix}`;
  }
  if (max != null) return `Up to ${fmt(max)}/${suffix}`;
  if (min != null) return `From ${fmt(min)}/${suffix}`;
  return 'Not disclosed';
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelative(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(abs / 60_000);
  if (minutes < 60) return rtf.format(Math.sign(diffMs) * minutes, 'minute');
  const hours = Math.round(abs / 3_600_000);
  if (hours < 24) return rtf.format(Math.sign(diffMs) * hours, 'hour');
  const days = Math.round(abs / 86_400_000);
  if (days < 30) return rtf.format(Math.sign(diffMs) * days, 'day');
  return formatDate(date);
}

export function daysUntil(value: Date | null | undefined): number | null {
  if (!value) return null;
  return Math.ceil((value.getTime() - Date.now()) / 86_400_000);
}

export const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
};

export const WORKPLACE_LABELS: Record<string, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'On-site',
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  INTERN: 'Intern',
  JUNIOR: 'Junior',
  MID: 'Mid-level',
  SENIOR: 'Senior',
  LEAD: 'Lead',
  EXECUTIVE: 'Executive',
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  PAUSED: 'Paused',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Not selected',
  WITHDRAWN: 'Withdrawn',
  HIRED: 'Hired',
};

export const VERIFICATION_LABELS: Record<string, string> = {
  VERIFIED: 'Verified',
  UNDER_REVIEW: 'Under review',
  UNVERIFIED: 'Unverified',
  SUSPENDED: 'Suspended',
};

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
