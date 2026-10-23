'use client';

/** Employer job create/edit form. Maps fields to the Zod job payload. */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type JSX } from 'react';

import { createJobAction, updateJobAction } from '@/actions/jobs';
import { Field, FormError } from '@/components/ui';

export interface JobFormValues {
  title: string;
  department: string;
  employmentType: string;
  experienceLevel: string;
  workplaceType: string;
  location: string;
  description: string;
  responsibilities: string;
  requiredQualifications: string;
  preferredQualifications: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  applicationMethod: string;
  externalApplicationUrl: string;
  applicationDeadline: string;
  skills: string;
  questions: string;
}

export const emptyJobForm: JobFormValues = {
  title: '',
  department: '',
  employmentType: 'FULL_TIME',
  experienceLevel: 'MID',
  workplaceType: 'REMOTE',
  location: '',
  description: '',
  responsibilities: '',
  requiredQualifications: '',
  preferredQualifications: '',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  salaryPeriod: 'YEAR',
  applicationMethod: 'INTERNAL',
  externalApplicationUrl: '',
  applicationDeadline: '',
  skills: '',
  questions: '',
};

function toPayload(values: JobFormValues): Record<string, unknown> {
  return {
    title: values.title,
    slug: '',
    department: values.department,
    categoryId: null,
    employmentType: values.employmentType,
    experienceLevel: values.experienceLevel,
    workplaceType: values.workplaceType,
    location: values.location,
    country: '',
    region: '',
    city: '',
    remoteRegions: [],
    salaryMin: values.salaryMin === '' ? null : Number(values.salaryMin),
    salaryMax: values.salaryMax === '' ? null : Number(values.salaryMax),
    salaryCurrency: values.salaryCurrency,
    salaryPeriod: values.salaryPeriod,
    benefits: [],
    description: values.description,
    responsibilities: values.responsibilities,
    requiredQualifications: values.requiredQualifications,
    preferredQualifications: values.preferredQualifications,
    applicationMethod: values.applicationMethod,
    externalApplicationUrl: values.externalApplicationUrl,
    applicationDeadline: values.applicationDeadline === '' ? null : values.applicationDeadline,
    skills: values.skills.split(',').map((s) => s.trim()).filter(Boolean),
    questions: values.questions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((question) => ({ question, required: true })),
  };
}

export function JobForm({
  organizationId,
  jobId,
  initial,
}: {
  organizationId: string;
  jobId?: string;
  initial?: JobFormValues;
}): JSX.Element {
  const router = useRouter();
  const [values, setValues] = useState<JobFormValues>(initial ?? emptyJobForm);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  function set(key: keyof JobFormValues, value: string): void {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    const result = jobId
      ? await updateJobAction(jobId, toPayload(values))
      : await createJobAction(organizationId, toPayload(values));
    setBusy(false);
    if (result.ok) {
      const target = jobId ?? ('jobId' in result ? (result.jobId as string) : '');
      router.push(target ? `/employer/jobs/${target}` : '/employer/jobs');
      router.refresh();
      return;
    }
    setError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="card space-y-4">
      <FormError message={error} />
      <Field label="Job title" error={fieldErrors.title?.[0]}>
        <input className="input" value={values.title} onChange={(e) => set('title', e.target.value)} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Employment type" error={fieldErrors.employmentType?.[0]}>
          <select className="input" value={values.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
            {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Experience level" error={fieldErrors.experienceLevel?.[0]}>
          <select className="input" value={values.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>
            {['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Workplace" error={fieldErrors.workplaceType?.[0]}>
          <select className="input" value={values.workplaceType} onChange={(e) => set('workplaceType', e.target.value)}>
            {['REMOTE', 'HYBRID', 'ONSITE'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location" error={fieldErrors.location?.[0]}>
          <input className="input" value={values.location} onChange={(e) => set('location', e.target.value)} placeholder="Remote (Africa)" />
        </Field>
        <Field label="Department">
          <input className="input" value={values.department} onChange={(e) => set('department', e.target.value)} />
        </Field>
      </div>
      <Field label="Description" error={fieldErrors.description?.[0]} hint="What the role is about. At least 40 characters.">
        <textarea className="input min-h-[120px]" value={values.description} onChange={(e) => set('description', e.target.value)} required />
      </Field>
      <Field label="Responsibilities">
        <textarea className="input min-h-[80px]" value={values.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} />
      </Field>
      <Field label="Required qualifications">
        <textarea className="input min-h-[80px]" value={values.requiredQualifications} onChange={(e) => set('requiredQualifications', e.target.value)} />
      </Field>
      <Field label="Preferred qualifications">
        <textarea className="input min-h-[80px]" value={values.preferredQualifications} onChange={(e) => set('preferredQualifications', e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Salary min" error={fieldErrors.salaryMin?.[0]}>
          <input type="number" className="input" value={values.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} min={0} />
        </Field>
        <Field label="Salary max" error={fieldErrors.salaryMax?.[0]}>
          <input type="number" className="input" value={values.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} min={0} />
        </Field>
        <Field label="Currency">
          <input className="input" value={values.salaryCurrency} onChange={(e) => set('salaryCurrency', e.target.value)} maxLength={8} />
        </Field>
        <Field label="Period">
          <select className="input" value={values.salaryPeriod} onChange={(e) => set('salaryPeriod', e.target.value)}>
            {['YEAR', 'MONTH', 'WEEK', 'DAY', 'HOUR'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Application method">
          <select className="input" value={values.applicationMethod} onChange={(e) => set('applicationMethod', e.target.value)}>
            <option value="INTERNAL">Apply inside WorkNiche</option>
            <option value="EXTERNAL">Apply on our own careers page</option>
          </select>
        </Field>
        {values.applicationMethod === 'EXTERNAL' ? (
          <Field label="Careers-page URL" error={fieldErrors.externalApplicationUrl?.[0]}>
            <input
              className="input"
              value={values.externalApplicationUrl}
              onChange={(e) => set('externalApplicationUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>
        ) : (
          <Field label="Application deadline (optional)">
            <input
              type="date"
              className="input"
              value={values.applicationDeadline}
              onChange={(e) => set('applicationDeadline', e.target.value)}
            />
          </Field>
        )}
      </div>
      <Field label="Skills" hint="Comma-separated." error={fieldErrors.skills?.[0]}>
        <input className="input" value={values.skills} onChange={(e) => set('skills', e.target.value)} placeholder="TypeScript, PostgreSQL" />
      </Field>
      <Field label="Screening questions" hint="One question per line." error={fieldErrors.questions?.[0]}>
        <textarea className="input min-h-[80px]" value={values.questions} onChange={(e) => set('questions', e.target.value)} />
      </Field>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Saving…' : jobId ? 'Save changes' : 'Create job'}
      </button>
    </form>
  );
}
