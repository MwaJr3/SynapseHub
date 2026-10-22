'use client';

/** Profile editor. One server action, Zod-validated on the way in. */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type JSX } from 'react';

import { saveProfileAction } from '@/actions/profiles';
import { Field, FormError } from '@/components/ui';

interface ProfileValues {
  headline: string;
  bio: string;
  location: string;
  remotePreference: string;
  yearsExperience: number;
  skills: string[];
  technologies: string[];
  availability: string;
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  visibility: string;
  showEmail: boolean;
}

export function ProfileForm({ initial }: { initial: ProfileValues }): JSX.Element {
  const router = useRouter();
  const [values, setValues] = useState<ProfileValues>(initial);
  const [skillsText, setSkillsText] = useState(initial.skills.join(', '));
  const [techText, setTechText] = useState(initial.technologies.join(', '));
  const [error, setError] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]): void {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    const result = await saveProfileAction({
      ...values,
      skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
      technologies: techText.split(',').map((s) => s.trim()).filter(Boolean),
      education: [],
      certifications: [],
      preferredEmploymentTypes: [],
      salaryExpectationMin: null,
      salaryExpectationMax: null,
      salaryCurrency: 'USD',
    });
    setBusy(false);
    if (result.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setError(result.error ?? Object.values(result.fieldErrors ?? {}).flat().join(' '));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="card space-y-4">
      <FormError message={error} />
      {saved ? (
        <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-signal-ok">
          Profile saved.
        </p>
      ) : null}
      <Field label="Headline">
        <input
          className="input"
          value={values.headline}
          onChange={(event) => set('headline', event.target.value)}
          maxLength={160}
        />
      </Field>
      <Field label="About you">
        <textarea
          className="input min-h-[120px]"
          value={values.bio}
          onChange={(event) => set('bio', event.target.value)}
          maxLength={4000}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location">
          <input
            className="input"
            value={values.location}
            onChange={(event) => set('location', event.target.value)}
          />
        </Field>
        <Field label="Years of experience">
          <input
            type="number"
            className="input"
            min={0}
            max={80}
            value={values.yearsExperience}
            onChange={(event) => set('yearsExperience', Number(event.target.value))}
          />
        </Field>
        <Field label="Remote preference">
          <select
            className="input"
            value={values.remotePreference}
            onChange={(event) => set('remotePreference', event.target.value)}
          >
            <option value="ANY">Any</option>
            <option value="REMOTE_ONLY">Remote only</option>
            <option value="HYBRID_OK">Hybrid ok</option>
            <option value="ONSITE_OK">On-site ok</option>
          </select>
        </Field>
        <Field label="Availability">
          <input
            className="input"
            value={values.availability}
            onChange={(event) => set('availability', event.target.value)}
            placeholder="e.g. From next month"
          />
        </Field>
      </div>
      <Field label="Skills" hint="Comma-separated. These drive your recommendations.">
        <input
          className="input"
          value={skillsText}
          onChange={(event) => setSkillsText(event.target.value)}
        />
      </Field>
      <Field label="Technologies" hint="Comma-separated.">
        <input
          className="input"
          value={techText}
          onChange={(event) => setTechText(event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Portfolio URL" error={undefined}>
          <input
            className="input"
            value={values.portfolioUrl}
            onChange={(event) => set('portfolioUrl', event.target.value)}
            placeholder="https://…"
          />
        </Field>
        <Field label="GitHub URL">
          <input
            className="input"
            value={values.githubUrl}
            onChange={(event) => set('githubUrl', event.target.value)}
            placeholder="https://…"
          />
        </Field>
        <Field label="LinkedIn URL">
          <input
            className="input"
            value={values.linkedinUrl}
            onChange={(event) => set('linkedinUrl', event.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>
      <Field label="Profile visibility">
        <select
          className="input"
          value={values.visibility}
          onChange={(event) => set('visibility', event.target.value)}
        >
          <option value="VERIFIED_EMPLOYERS">Hiring teams of verified employers</option>
          <option value="PUBLIC">Everyone</option>
          <option value="PRIVATE">Only me</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.showEmail}
          onChange={(event) => set('showEmail', event.target.checked)}
        />
        Show my email address to viewers who can see this profile
      </label>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
