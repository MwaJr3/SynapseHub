'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';

import { deleteResumeAction, setDefaultResumeAction } from '@/actions/profiles';

export function ResumeActions({
  resumeId,
  isDefault,
}: {
  resumeId: string;
  isDefault: boolean;
}): JSX.Element {
  const router = useRouter();
  return (
    <span className="flex gap-2">
      {!isDefault ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            await setDefaultResumeAction(resumeId);
            router.refresh();
          }}
        >
          Make default
        </button>
      ) : null}
      <button
        type="button"
        className="btn-danger"
        onClick={async () => {
          await deleteResumeAction(resumeId);
          router.refresh();
        }}
      >
        Delete
      </button>
    </span>
  );
}
