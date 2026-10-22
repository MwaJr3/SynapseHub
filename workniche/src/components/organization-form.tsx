'use client';

/** Create-organization form for employers. */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type JSX } from 'react';

import { createOrganizationAction } from '@/actions/jobs';
import { Field, FormError } from '@/components/ui';

export function OrganizationForm(): JSX.Element {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    const result = await createOrganizationAction({
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      industry,
      description,
      website: '',
      headquarters: '',
      remotePolicy: '',
      companySize: '',
      socialLinks: {},
      benefits: [],
    });
    setBusy(false);
    if (result.ok) {
      router.push('/employer');
      router.refresh();
      return;
    }
    setError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="card space-y-4">
      <FormError message={error} />
      <Field label="Company name" error={fieldErrors.name?.[0]}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field
        label="URL slug"
        error={fieldErrors.slug?.[0]}
        hint="Lowercase letters, numbers and dashes. Used in the company URL."
      >
        <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </Field>
      <Field label="Industry">
        <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} />
      </Field>
      <Field label="Description">
        <textarea
          className="input min-h-[100px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Creating…' : 'Create organization'}
      </button>
    </form>
  );
}
