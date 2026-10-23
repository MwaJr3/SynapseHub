'use client';

import { useActionState } from 'react';

import { submitContactAction } from '@/app/actions/contact';
import type { ActionResult } from '@/lib/validation';

type ContactResult = ActionResult & {
  deliveryState?: 'received' | 'setup-required';
  deliveryMessage?: string;
};

export function ContactForm({ companySlug }: { companySlug?: string }) {
  const [state, formAction, pending] = useActionState<ContactResult | null, FormData>(
    submitContactAction,
    null,
  );

  return (
    <form action={formAction} className="card grid gap-4" aria-label="Contact form">
      <div>
        <label htmlFor="companySlug" className="text-sm font-medium">
          Which company are you contacting?
        </label>
        <select
          id="companySlug"
          name="companySlug"
          required
          defaultValue={companySlug ?? 'velaqori-systems'}
          className="field mt-1"
        >
          <option value="velaqori-systems">Velaqori Systems</option>
          <option value="tamuzi-learning">Tamuzi Learning</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          Messages go to the selected company only. The companies are separate
          businesses and do not share inboxes.
        </p>
      </div>
      <div>
        <label htmlFor="name" className="text-sm font-medium">Your name</label>
        <input id="name" name="name" required minLength={2} className="field mt-1" />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium">Your email</label>
        <input id="email" name="email" type="email" required className="field mt-1" />
      </div>
      <div>
        <label htmlFor="subject" className="text-sm font-medium">Subject</label>
        <input id="subject" name="subject" required minLength={2} className="field mt-1" />
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium">Message</label>
        <textarea id="message" name="message" required minLength={10} rows={6} className="field mt-1" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary justify-self-start">
        {pending ? 'Sending…' : 'Send message'}
      </button>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-[color:var(--accent-strong)]">
          {state.error ?? 'Please correct the highlighted fields.'}
        </p>
      ) : null}
      {state?.ok && state.deliveryMessage ? (
        <div
          role="status"
          className={`rounded-md border p-4 text-sm ${
            state.deliveryState === 'setup-required'
              ? 'border-[color:var(--accent-strong)]'
              : 'border-line'
          }`}
        >
          <strong className="block font-medium">
            {state.deliveryState === 'setup-required'
              ? 'Recorded — delivery not yet configured'
              : 'Message recorded'}
          </strong>
          <p className="mt-1 text-muted">{state.deliveryMessage}</p>
        </div>
      ) : null}
    </form>
  );
}
