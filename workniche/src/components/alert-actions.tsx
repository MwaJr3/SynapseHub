'use client';

/** Job-alert create/toggle/delete forms. */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type JSX } from 'react';

import {
  createJobAlertAction,
  deleteJobAlertAction,
  toggleJobAlertAction,
} from '@/actions/career';
import { Field, FormError } from '@/components/ui';

export function AlertForm(): JSX.Element {
  const router = useRouter();
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    const result = await createJobAlertAction({
      keywords,
      location,
      remoteOnly,
      categories: [],
      skills: [],
      salaryMin: null,
      employmentTypes: [],
      enabled: true,
    });
    setBusy(false);
    if (result.ok) {
      setKeywords('');
      setLocation('');
      router.refresh();
    } else {
      setError(result.error ?? Object.values(result.fieldErrors ?? {}).flat()[0]);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="card space-y-4">
      <h2 className="text-lg font-semibold">Create an alert</h2>
      <FormError message={error} />
      <Field label="Keywords" hint="Comma-separated terms matched against title and description.">
        <input
          className="input"
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="backend, platform"
        />
      </Field>
      <Field label="Location">
        <input
          className="input"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Remote, Lusaka, …"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={remoteOnly}
          onChange={(event) => setRemoteOnly(event.target.checked)}
        />
        Remote roles only
      </label>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Create alert'}
      </button>
    </form>
  );
}

export function AlertRow({
  alertId,
  enabled,
}: {
  alertId: string;
  enabled: boolean;
}): JSX.Element {
  const router = useRouter();
  return (
    <span className="flex gap-2">
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          await toggleJobAlertAction(alertId, !enabled);
          router.refresh();
        }}
      >
        {enabled ? 'Pause' : 'Enable'}
      </button>
      <button
        type="button"
        className="btn-danger"
        onClick={async () => {
          await deleteJobAlertAction(alertId);
          router.refresh();
        }}
      >
        Delete
      </button>
    </span>
  );
}
