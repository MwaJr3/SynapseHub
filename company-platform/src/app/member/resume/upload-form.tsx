'use client';

import { useActionState } from 'react';

import type { ActionResult } from '@/lib/validation';

export function UploadResumeForm({
  action,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="card grid gap-3">
      <div>
        <label htmlFor="resume" className="text-sm font-medium">Upload a PDF resume</label>
        <input
          id="resume"
          name="resume"
          type="file"
          accept="application/pdf,.pdf"
          required
          className="mt-1 block w-full text-sm"
        />
        <p className="mt-1 text-xs text-muted">PDF only · 5 MB maximum · stored privately</p>
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary justify-self-start">
        {pending ? 'Uploading…' : 'Upload'}
      </button>
      {state?.ok ? (
        <p role="status" className="text-sm">Uploaded. It stays private until you publish it.</p>
      ) : state?.error ? (
        <p role="alert" className="text-sm">{state.error}</p>
      ) : null}
    </form>
  );
}
