'use client';

/**
 * Small action-triggering buttons/forms for employer and admin pages.
 * Each one calls a server action and refreshes the server-rendered data.
 */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type JSX } from 'react';

import {
  addCandidateNoteAction,
  assignCandidateAction,
  updateApplicationStatusAction,
} from '@/actions/applications';
import {
  inviteMemberAction,
  setJobStatusAction,
} from '@/actions/jobs';
import {
  moderateReportAction,
  setOrganizationVerificationAction,
  setUserSuspendedAction,
} from '@/actions/admin';
import { Field, FormError } from '@/components/ui';

export function JobStatusButtons({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}): JSX.Element {
  const router = useRouter();
  const next: Record<string, Array<'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED'>> = {
    DRAFT: ['PUBLISHED', 'ARCHIVED'],
    PUBLISHED: ['PAUSED', 'CLOSED'],
    PAUSED: ['PUBLISHED', 'CLOSED'],
    CLOSED: ['ARCHIVED'],
    ARCHIVED: [],
  };
  const labels: Record<string, string> = {
    PUBLISHED: 'Publish',
    PAUSED: 'Pause',
    CLOSED: 'Close',
    ARCHIVED: 'Archive',
  };
  return (
    <div className="flex flex-wrap gap-2">
      {(next[status] ?? []).map((target) => (
        <button
          key={target}
          type="button"
          className={target === 'CLOSED' ? 'btn-secondary' : 'btn-primary'}
          onClick={async () => {
            await setJobStatusAction(jobId, target);
            router.refresh();
          }}
        >
          {labels[target]}
        </button>
      ))}
    </div>
  );
}

export function StatusSelect({
  applicationId,
  current,
}: {
  applicationId: string;
  current: string;
}): JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`status-${applicationId}`} className="sr-only">
        Application status
      </label>
      <select
        id={`status-${applicationId}`}
        className="input w-auto"
        value={status}
        onChange={async (event) => {
          const next = event.target.value;
          setStatus(next);
          await updateApplicationStatusAction({ applicationId, status: next, note: '' });
          router.refresh();
        }}
      >
        {['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED', 'HIRED', 'WITHDRAWN'].map(
          (option) => (
            <option key={option} value={option}>
              {option.replace('_', ' ')}
            </option>
          ),
        )}
      </select>
    </div>
  );
}

export function NoteForm({ applicationId }: { applicationId: string }): JSX.Element {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <form
      className="space-y-2"
      onSubmit={async (event: FormEvent) => {
        event.preventDefault();
        const result = await addCandidateNoteAction({ applicationId, body });
        if (result.ok) {
          setBody('');
          setError(undefined);
          router.refresh();
        } else {
          setError(result.error ?? 'Could not save the note.');
        }
      }}
    >
      <Field label="Private note" hint="Never visible to the candidate.">
        <textarea
          className="input min-h-[70px]"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </Field>
      <FormError message={error} />
      <button type="submit" className="btn-secondary">Add note</button>
    </form>
  );
}

export function AssignSelect({
  applicationId,
  current,
  members,
}: {
  applicationId: string;
  current: string | null;
  members: Array<{ userId: string; name: string }>;
}): JSX.Element {
  const router = useRouter();
  return (
    <select
      className="input w-auto"
      aria-label="Assigned to"
      defaultValue={current ?? ''}
      onChange={async (event) => {
        const value = event.target.value;
        await assignCandidateAction(applicationId, value === '' ? null : value);
        router.refresh();
      }}
    >
      <option value="">Unassigned</option>
      {members.map((member) => (
        <option key={member.userId} value={member.userId}>
          {member.name}
        </option>
      ))}
    </select>
  );
}

export function InviteMemberForm({
  organizationId,
}: {
  organizationId: string;
}): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'RECRUITER'>('RECRUITER');
  const [message, setMessage] = useState<string | undefined>(undefined);
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await inviteMemberAction(organizationId, email, role);
        setMessage(
          result.ok ? 'Member added.' : result.error ?? 'Could not add the member.',
        );
        if (result.ok) {
          setEmail('');
          router.refresh();
        }
      }}
    >
      <Field label="Email of an existing account">
        <input
          type="email"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field label="Role">
        <select
          className="input"
          value={role}
          onChange={(event) => setRole(event.target.value as 'ADMIN' | 'RECRUITER')}
        >
          <option value="RECRUITER">Recruiter</option>
          <option value="ADMIN">Admin</option>
        </select>
      </Field>
      <button type="submit" className="btn-primary">Add member</button>
      {message ? <p role="status" className="text-sm">{message}</p> : null}
    </form>
  );
}

export function VerifyOrgButtons({
  organizationId,
  current,
}: {
  organizationId: string;
  current: string;
}): JSX.Element {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {(['VERIFIED', 'UNDER_REVIEW', 'UNVERIFIED', 'SUSPENDED'] as const)
        .filter((status) => status !== current)
        .map((status) => (
          <button
            key={status}
            type="button"
            className="btn-secondary"
            onClick={async () => {
              await setOrganizationVerificationAction(organizationId, status);
              router.refresh();
            }}
          >
            Set {status}
          </button>
        ))}
    </div>
  );
}

export function SuspendUserButton({
  userId,
  suspended,
}: {
  userId: string;
  suspended: boolean;
}): JSX.Element {
  const router = useRouter();
  return (
    <button
      type="button"
      className={suspended ? 'btn-secondary' : 'btn-danger'}
      onClick={async () => {
        await setUserSuspendedAction(userId, !suspended);
        router.refresh();
      }}
    >
      {suspended ? 'Lift suspension' : 'Suspend'}
    </button>
  );
}

export function ModerationForm({ reportId }: { reportId: string }): JSX.Element {
  const router = useRouter();
  const [note, setNote] = useState('');
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter as
          | HTMLButtonElement
          | null;
        const action = submitter?.dataset.action ?? 'RESOLVE';
        await moderateReportAction({ reportId, action, note });
        router.refresh();
      }}
    >
      <Field label="Resolution note">
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <button type="submit" data-action="RESOLVE" className="btn-primary">Resolve</button>
      <button type="submit" data-action="DISMISS" className="btn-secondary">Dismiss</button>
      <button type="submit" data-action="REMOVE_JOB" className="btn-danger">Remove job</button>
      <button type="submit" data-action="SUSPEND_ORG" className="btn-danger">Suspend org</button>
    </form>
  );
}
