'use client';

/**
 * Application form. Submits through the server action; the unique
 * (job, applicant) constraint is enforced server-side and surfaced as a
 * friendly message here.
 */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type JSX } from 'react';

import { applyToJobAction } from '@/actions/applications';
import { Field, FormError } from '@/components/ui';

export function ApplyForm({
  jobId,
  questions,
  defaultResumeId,
}: {
  jobId: string;
  questions: Array<{ id: string; question: string; required: boolean }>;
  defaultResumeId: string | null;
}): JSX.Element {
  const router = useRouter();
  const [coverLetter, setCoverLetter] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachResume, setAttachResume] = useState(defaultResumeId != null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);
    setFieldErrors({});
    const result = await applyToJobAction({
      jobId,
      resumeId: attachResume ? defaultResumeId : null,
      coverLetter,
      answers: questions.map((question) => ({
        question: question.question,
        answer: answers[question.id] ?? '',
      })).filter((entry) => entry.answer.trim() !== ''),
    });
    setSubmitting(false);
    if (result.ok) {
      router.push('/dashboard/applications');
      router.refresh();
      return;
    }
    setError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="card space-y-4">
      <h2 className="text-lg font-semibold">Apply for this role</h2>
      <FormError message={error} />
      <Field label="Cover letter" hint="Explain what draws you to this role." error={fieldErrors.coverLetter?.[0]}>
        <textarea
          className="input min-h-[120px]"
          value={coverLetter}
          onChange={(event) => setCoverLetter(event.target.value)}
          maxLength={8000}
        />
      </Field>
      {questions.map((question) => (
        <Field
          key={question.id}
          label={question.question}
          error={fieldErrors[`answers`]?.[0]}
        >
          <textarea
            className="input min-h-[80px]"
            required={question.required}
            value={answers[question.id] ?? ''}
            onChange={(event) =>
              setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))
            }
          />
        </Field>
      ))}
      {defaultResumeId ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={attachResume}
            onChange={(event) => setAttachResume(event.target.checked)}
          />
          Attach my saved resume (your default document)
        </label>
      ) : (
        <p className="text-sm text-ink-muted">
          No resume saved yet. You can still apply and add one from your dashboard.
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}
