'use client';

import { useActionState } from 'react';

import type { ActionResult } from '@/lib/validation';

export function ReviewForm({
  personProfileId,
  action,
}: {
  personProfileId: string;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="mt-3 grid gap-2">
      <input type="hidden" name="personProfileId" value={personProfileId} />
      <div>
        <label htmlFor={`note-${personProfileId}`} className="text-sm font-medium">
          Reviewer note (recorded in the audit trail)
        </label>
        <textarea id={`note-${personProfileId}`} name="note" rows={2} className="field mt-1" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="APPROVE" disabled={pending} className="btn btn-primary">
          Approve &amp; publish
        </button>
        <button type="submit" name="decision" value="REJECT" disabled={pending} className="btn btn-secondary">
          Request changes
        </button>
        <button type="submit" name="decision" value="UNPUBLISH" disabled={pending} className="btn btn-secondary">
          Unpublish
        </button>
      </div>
      {state?.ok ? (
        <p role="status" className="text-sm">Decision recorded.</p>
      ) : state?.error ? (
        <p role="alert" className="text-sm">{state.error}</p>
      ) : null}
    </form>
  );
}
