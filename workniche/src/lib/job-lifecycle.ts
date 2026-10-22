/**
 * The job lifecycle is a product invariant, enforced here and validated
 * again in the action layer:
 * DRAFT → PUBLISHED | ARCHIVED
 * PUBLISHED → PAUSED | CLOSED
 * PAUSED → PUBLISHED | CLOSED
 * CLOSED → ARCHIVED
 */
export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['PAUSED', 'CLOSED'],
  PAUSED: ['PUBLISHED', 'CLOSED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return (JOB_TRANSITIONS[from] ?? []).includes(to);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 72)
    .replace(/^-|-$/g, '');
}
