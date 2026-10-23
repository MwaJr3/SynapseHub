'use client';

import { useActionState } from 'react';

import { setPublicationStateAction } from '@/app/actions/admin';
import type { ActionResult } from '@/lib/validation';

const NEXT_STATE: Record<string, string> = {
  PUBLISHED: 'UNPUBLISHED',
  DRAFT: 'PUBLISHED',
  PENDING_REVIEW: 'PUBLISHED',
  UNPUBLISHED: 'PUBLISHED',
  REJECTED: 'PUBLISHED',
};

export function PublishToggle({
  entityType,
  entityId,
  currentState,
  label,
}: {
  entityType: 'PRODUCT' | 'CASE_STUDY' | 'SOLUTION';
  entityId: string;
  currentState: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    setPublicationStateAction,
    null,
  );
  const next = currentState === 'PUBLISHED' ? 'UNPUBLISHED' : 'PUBLISHED';
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="publicationState" value={NEXT_STATE[currentState] ?? 'PUBLISHED'} />
      <button type="submit" disabled={pending} className="btn btn-secondary" aria-label={`${next === 'PUBLISHED' ? 'Publish' : 'Unpublish'} ${label}`}>
        {pending ? '…' : next === 'PUBLISHED' ? 'Publish' : 'Unpublish'}
      </button>
      {state && !state.ok ? (
        <span role="alert" className="text-xs">{state.error}</span>
      ) : null}
    </form>
  );
}
