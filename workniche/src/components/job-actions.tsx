'use client';

/** Job actions: save/unsave, withdraw, report. All call server actions. */
import { useRouter } from 'next/navigation';
import { useState, type JSX } from 'react';

import {
  saveJobAction,
  unsaveJobAction,
} from '@/actions/jobs';
import { withdrawApplicationAction } from '@/actions/applications';
import { createReportAction } from '@/actions/reports';

export function SaveJobButton({
  jobId,
  saved,
}: {
  jobId: string;
  saved: boolean;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={saved ? 'btn-secondary' : 'btn-primary'}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        if (saved) await unsaveJobAction(jobId);
        else await saveJobAction(jobId);
        setBusy(false);
        router.refresh();
      }}
    >
      {saved ? 'Saved — remove' : 'Save job'}
    </button>
  );
}

export function WithdrawButton({
  applicationId,
}: {
  applicationId: string;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className="btn-secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await withdrawApplicationAction(applicationId);
          setBusy(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        }}
      >
        {busy ? 'Withdrawing…' : 'Withdraw application'}
      </button>
      {error ? <span role="alert" className="field-error">{error}</span> : null}
    </span>
  );
}

export function ReportButton({
  jobId,
  organizationId,
}: {
  jobId?: string;
  organizationId?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('MISLEADING');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Report this listing
      </button>
      {open ? (
        <form
          className="card mt-3 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            const result = await createReportAction({
              jobId: jobId ?? null,
              organizationId: organizationId ?? null,
              reason,
              details,
            });
            setBusy(false);
            setMessage(
              result.ok
                ? 'Thank you — the report is in the moderation queue.'
                : result.error ?? 'Could not file the report.',
            );
          }}
        >
          <label className="block text-sm">
            <span className="label">Reason</span>
            <select className="input" value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="FRAUD">Fraud</option>
              <option value="MISLEADING">Misleading</option>
              <option value="DISCRIMINATION">Discrimination</option>
              <option value="SPAM">Spam</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="label">Details</span>
            <textarea
              className="input min-h-[80px]"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>
            Submit report
          </button>
          {message ? <p role="status" className="text-sm">{message}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
