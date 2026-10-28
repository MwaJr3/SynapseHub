'use client';

import { useActionState } from 'react';

import { setSupportStatusAction } from '@/app/actions/support';
import type { ActionResult } from '@/lib/validation';

const NEXT: Record<string, { value: string; label: string }> = {
  OPEN: { value: 'ACKED', label: 'Mark acknowledged' },
  ACKED: { value: 'CLOSED', label: 'Mark closed' },
  CLOSED: { value: 'OPEN', label: 'Reopen' },
};

export function SupportStatusForm({
  id,
  status,
  reference,
}: {
  id: string;
  status: string;
  reference: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(setSupportStatusAction, null);
  const next = NEXT[status] ?? NEXT.OPEN;

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next?.value} />
      <button
        type="submit"
        className="btn btn-secondary"
        disabled={pending}
        aria-label={`${next?.label} — ${reference}`}
      >
        {pending ? '…' : next?.label}
      </button>
      {state && !state.ok ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
