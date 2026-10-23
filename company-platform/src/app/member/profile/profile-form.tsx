'use client';

import { useActionState, useState } from 'react';

import {
  addEntryAction,
  deleteEntryAction,
  updateProfileAction,
} from '@/app/actions/profile';
import type { ActionResult } from '@/lib/validation';

interface ProfileFormProps {
  initial: {
    displayName: string;
    pronouns: string;
    headline: string;
    shortBio: string;
    longBio: string;
    technicalSkills: string[];
    softSkills: string[];
    domains: string[];
    personalPortfolioUrl: string;
    githubUrl: string;
    professionalProfileUrl: string;
    contactVisible: boolean;
  };
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateProfileAction,
    null,
  );

  return (
    <form action={formAction} className="card grid gap-4">
      <h2 className="text-lg font-semibold">Profile fields</h2>
      <div>
        <label htmlFor="displayName" className="text-sm font-medium">Display name *</label>
        <input id="displayName" name="displayName" required defaultValue={initial.displayName} className="field mt-1" />
        {state?.fieldErrors?.displayName ? (
          <p role="alert" className="text-sm">{state.fieldErrors.displayName[0]}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pronouns" className="text-sm font-medium">Pronouns (optional)</label>
          <input id="pronouns" name="pronouns" defaultValue={initial.pronouns} className="field mt-1" />
        </div>
        <div>
          <label htmlFor="headline" className="text-sm font-medium">Headline</label>
          <input id="headline" name="headline" defaultValue={initial.headline} className="field mt-1" />
        </div>
      </div>
      <div>
        <label htmlFor="shortBio" className="text-sm font-medium">Short bio</label>
        <textarea id="shortBio" name="shortBio" rows={2} defaultValue={initial.shortBio} className="field mt-1" />
      </div>
      <div>
        <label htmlFor="longBio" className="text-sm font-medium">Full bio</label>
        <textarea id="longBio" name="longBio" rows={5} defaultValue={initial.longBio} className="field mt-1" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="technicalSkills" className="text-sm font-medium">Technical skills (comma separated)</label>
          <input id="technicalSkills" name="technicalSkills" defaultValue={initial.technicalSkills.join(', ')} className="field mt-1" />
        </div>
        <div>
          <label htmlFor="softSkills" className="text-sm font-medium">Interpersonal skills</label>
          <input id="softSkills" name="softSkills" defaultValue={initial.softSkills.join(', ')} className="field mt-1" />
        </div>
        <div>
          <label htmlFor="domains" className="text-sm font-medium">Domains</label>
          <input id="domains" name="domains" defaultValue={initial.domains.join(', ')} className="field mt-1" />
        </div>
      </div>
      <fieldset className="rounded-md border border-line p-3">
        <legend className="px-1 text-sm font-medium">Optional external links</legend>
        <p className="text-xs text-muted">
          Leave empty to hide the button. URLs are never invented — only your
          configured, full http(s) links render on the public profile.
        </p>
        <div className="mt-2 grid gap-3">
          <div>
            <label htmlFor="personalPortfolioUrl" className="text-sm font-medium">Personal portfolio URL</label>
            <input
              id="personalPortfolioUrl"
              name="personalPortfolioUrl"
              type="url"
              defaultValue={initial.personalPortfolioUrl}
              placeholder="https://…"
              className="field mt-1"
            />
            <p className="mt-1 text-xs text-muted">
              Your portfolio stays a standalone site; this adds a
              &quot;Visit Personal Portfolio&quot; button that opens it in a new tab.
            </p>
          </div>
          <div>
            <label htmlFor="githubUrl" className="text-sm font-medium">GitHub URL</label>
            <input id="githubUrl" name="githubUrl" type="url" defaultValue={initial.githubUrl} placeholder="https://…" className="field mt-1" />
          </div>
          <div>
            <label htmlFor="professionalProfileUrl" className="text-sm font-medium">Professional profile URL</label>
            <input
              id="professionalProfileUrl"
              name="professionalProfileUrl"
              type="url"
              defaultValue={initial.professionalProfileUrl}
              placeholder="https://…"
              className="field mt-1"
            />
          </div>
        </div>
        {state?.fieldErrors?.personalPortfolioUrl ? (
          <p role="alert" className="mt-1 text-sm">{state.fieldErrors.personalPortfolioUrl[0]}</p>
        ) : null}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="contactVisible"
          defaultChecked={initial.contactVisible}
          className="h-4 w-4"
        />
        Show a contact section on my public profile
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary justify-self-start">
        {pending ? 'Saving…' : 'Save profile'}
      </button>
      {state?.ok ? (
        <p role="status" className="text-sm">Profile saved.</p>
      ) : state?.error ? (
        <p role="alert" className="text-sm">{state.error}</p>
      ) : null}
    </form>
  );
}

type EntryKind = 'education' | 'experience' | 'certification' | 'link';

const ENTRY_FIELDS: Record<EntryKind, string[]> = {
  education: ['institution', 'qualification', 'subject', 'period', 'description'],
  experience: ['role', 'organization', 'period', 'description', 'linkUrl'],
  certification: ['name', 'issuer', 'period', 'note'],
  link: ['label', 'url'],
};

export function EntrySection({
  kind,
  title,
  entries,
}: {
  kind: EntryKind;
  title: string;
  entries: Array<Record<string, string>>;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    (prev, formData) => addEntryAction(kind, prev, formData),
    null,
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <section className="card space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Nothing added yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 rounded-md border border-line p-3">
              <div className="text-sm">
                <p className="font-medium">
                  {[entry.institution, entry.qualification, entry.role, entry.organization, entry.name, entry.label]
                    .filter(Boolean)
                    .join(' — ')}
                </p>
                {entry.period ? <p className="text-xs text-muted">{entry.period}</p> : null}
              </div>
              <button
                type="button"
                disabled={deleting === entry.id}
                onClick={async () => {
                  setDeleting(entry.id ?? null);
                  await deleteEntryAction(kind, entry.id ?? '');
                  setDeleting(null);
                }}
                className="btn btn-secondary"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="grid gap-2 sm:grid-cols-2">
        {ENTRY_FIELDS[kind].map((field) => (
          <div key={field}>
            <label htmlFor={`${kind}-${field}`} className="text-sm font-medium capitalize">
              {field === 'linkUrl' || field === 'url' ? `${field} (https://…)` : field}
            </label>
            <input
              id={`${kind}-${field}`}
              name={field}
              required={kind === 'link' || ['institution', 'qualification', 'role', 'organization', 'name'].includes(field)}
              className="field mt-1"
            />
          </div>
        ))}
        <button type="submit" disabled={pending} className="btn btn-secondary justify-self-start">
          {pending ? 'Adding…' : `Add ${title.toLowerCase().replace(/s$/, '')}`}
        </button>
        {state?.ok ? (
          <p role="status" className="text-sm">Added.</p>
        ) : state?.error ? (
          <p role="alert" className="text-sm">{state.error}</p>
        ) : null}
      </form>
    </section>
  );
}
