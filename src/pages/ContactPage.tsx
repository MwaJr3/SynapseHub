import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/ui/Section';
import { Callout } from '@/components/ui/Callout';
import { Button } from '@/components/ui/Button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { contactConfig, links, profileConfig } from '@/config/site';
import { ArrowUpRightIcon } from '@/components/projects/ProjectExternalActions';

type FormStatus = 'idle' | 'submitting' | 'sent' | 'error';

interface FieldErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

function validate(values: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name?.trim()) errors.name = 'Tell me what to call you.';
  if (!values.email?.trim()) {
    errors.email = 'An email address is needed to reply.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = 'That email address does not look complete.';
  }
  if (!values.subject?.trim()) errors.subject = 'Add a short subject.';
  if (!values.message?.trim()) {
    errors.message = 'Describe the problem or question briefly.';
  } else if (values.message.trim().length < 20) {
    errors.message = 'A little more detail helps — 20 characters or more.';
  }
  return errors;
}

/**
 * Contact experience.
 *
 * A form is only rendered when a submission endpoint is configured: this site
 * has no backend of its own, and a form that silently discards messages would
 * be worse than no form at all. The endpoint is expected to perform its own
 * server-side validation, spam protection and rate limiting — which the page
 * states explicitly rather than pretending the browser controls are enough.
 */
export default function ContactPage() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failureMessage, setFailureMessage] = useState<string>('');

  usePageMeta({
    title: 'Contact',
    description:
      'Contact channels for discussing education-technology work: offline-first learning, teaching workflows, assessment, analytics, low-bandwidth delivery and responsible AI support.',
    path: '/contact',
  });

  const channels = [
    links.email && {
      label: 'Email',
      value: contactConfig.email,
      href: links.mailto,
      note: 'Direct email',
    },
    links.github && {
      label: 'GitHub',
      value: 'Source and projects',
      href: links.github,
      note: 'Opens in a new tab',
    },
    links.linkedin && {
      label: 'Professional profile',
      value: 'Experience and updates',
      href: links.linkedin,
      note: 'Opens in a new tab',
    },
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    href?: string;
    note: string;
  }>;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const endpoint = links.contactForm;
    if (!endpoint) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const values = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      subject: String(data.get('subject') ?? ''),
      message: String(data.get('message') ?? ''),
    };

    const validation = validate(values);
    setErrors(validation);
    setFailureMessage('');
    if (Object.keys(validation).length > 0) {
      setStatus('idle');
      return;
    }

    setStatus('submitting');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        setStatus('error');
        setFailureMessage(
          `The form service responded with status ${response.status}. Nothing was sent — please try again or use another channel.`,
        );
        return;
      }

      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
      setFailureMessage(
        'The request could not reach the form service. Nothing was sent — check the connection and retry.',
      );
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Describe the problem, the constraint and the outcome you want"
        summary={
          <>
            The most useful first message says who is learning, what currently
            gets in the way, and what a good result would look like. Offline
            constraints, device realities and privacy requirements are all worth
            mentioning early.
          </>
        }
      />

      <Section
        id="channels"
        tone="surface"
        eyebrow="01 — Channels"
        title="Where to reach me"
      >
        {channels.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <li key={channel.label} className="card flex flex-col gap-2 p-5">
                <span className="eyebrow">{channel.label}</span>
                {channel.href ? (
                  <a
                    href={channel.href}
                    className="link-inline text-sm"
                    {...(channel.href.startsWith('mailto:')
                      ? {}
                      : { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    {channel.value}
                    {!channel.href.startsWith('mailto:') && (
                      <span className="sr-only"> (opens in a new tab)</span>
                    )}
                  </a>
                ) : (
                  <span className="text-sm text-ink">{channel.value}</span>
                )}
                <span className="mono-meta">{channel.note}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Callout title="No contact channel is configured yet" variant="setup">
            This deployment has no email address, profile link or form endpoint
            configured, so none is displayed. Add the values in{' '}
            <code className="font-mono text-xs">.env.local</code> (see{' '}
            <code className="font-mono text-xs">.env.example</code>) and they
            will appear here automatically. Until then, this page deliberately
            offers nothing that pretends to work.
          </Callout>
        )}
      </Section>

      <Section
        id="message"
        tone="quiet"
        eyebrow="02 — Send a message"
        title={
          links.contactForm
            ? 'Message form'
            : 'Form not enabled on this deployment'
        }
        description={
          links.contactForm
            ? 'Your message is submitted to the configured form endpoint. Fields are validated in the browser for fast feedback, and the endpoint is expected to validate again server-side.'
            : 'A contact form requires a real submission endpoint. This deployment has none configured, so no form is shown — a form that silently discards messages would be worse than no form.'
        }
      >
        {links.contactForm ? (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="grid max-w-2xl gap-4"
          >
            {(['name', 'email', 'subject'] as const).map((field) => (
              <div key={field}>
                <label htmlFor={field} className="eyebrow block">
                  {field === 'name'
                    ? 'Name'
                    : field === 'email'
                      ? 'Email'
                      : 'Subject'}
                </label>
                <input
                  id={field}
                  name={field}
                  type={field === 'email' ? 'email' : 'text'}
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={
                    errors[field] ? `${field}-error` : undefined
                  }
                  className="mt-2 w-full rounded-card border border-line bg-panel px-4 py-2.5 text-sm text-ink"
                />
                {errors[field] && (
                  <p
                    id={`${field}-error`}
                    className="mt-2 text-xs text-caution"
                  >
                    {errors[field]}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label htmlFor="message" className="eyebrow block">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'message-error' : undefined}
                className="mt-2 w-full rounded-card border border-line bg-panel px-4 py-2.5 text-sm text-ink"
              />
              {errors.message && (
                <p id="message-error" className="mt-2 text-xs text-caution">
                  {errors.message}
                </p>
              )}
            </div>

            {/* Simple honeypot: helpful, but the endpoint must do its own spam filtering. */}
            <div aria-hidden="true" className="hidden">
              <label htmlFor="company">Company</label>
              <input
                id="company"
                name="company"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" type="submit" onClick={() => undefined}>
                {status === 'submitting' ? 'Sending…' : 'Send message'}
              </Button>
              <span
                role="status"
                aria-live="polite"
                className="text-sm text-ink-muted"
              >
                {status === 'sent' && 'Message accepted by the form service.'}
                {status === 'error' && failureMessage}
                {status === 'submitting' && 'Submitting your message…'}
              </span>
            </div>
          </form>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <Callout title="What the form needs" variant="setup">
              Set{' '}
              <code className="font-mono text-xs">VITE_CONTACT_ENDPOINT</code>{' '}
              to an HTTPS endpoint that accepts{' '}
              <code className="font-mono text-xs">
                {'{ name, email, subject, message }'}
              </code>{' '}
              as JSON. The endpoint must perform server-side validation, spam
              protection and rate limiting, and must return a non-2xx status
              when delivery fails — the page reports failure honestly rather
              than showing a success message.
            </Callout>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink">Meanwhile</h3>
              <p className="prose-body mt-2 text-sm">
                The case studies are the most detailed explanation of the work
                available right now. Project links are added to each case study
                as applications and repositories are connected.
              </p>
              <Button
                to="/projects"
                variant="secondary"
                size="sm"
                className="mt-4"
              >
                Read the case studies
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section
        id="privacy"
        tone="contrast"
        eyebrow="03 — Privacy"
        title="What happens to a message"
        description="Practical expectations rather than a policy document."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-card border border-line bg-panel p-5">
            <h3 className="text-sm font-semibold text-ink">Minimum data</h3>
            <p className="prose-body mt-2 text-sm">
              The form asks for a name, reply address, subject and message.
              Nothing else is required, and no analytics or tracking scripts are
              loaded on this site.
            </p>
          </div>
          <div className="rounded-card border border-line bg-panel p-5">
            <h3 className="text-sm font-semibold text-ink">
              Delivery is verified
            </h3>
            <p className="prose-body mt-2 text-sm">
              Success is only reported when the configured endpoint returns a
              successful response. A failed request shows an error and invites a
              retry or another channel.
            </p>
          </div>
          <div className="rounded-card border border-line bg-panel p-5">
            <h3 className="text-sm font-semibold text-ink">
              No fake availability
            </h3>
            <p className="prose-body mt-2 text-sm">
              {contactConfig.availabilityStatement
                ? contactConfig.availabilityStatement
                : 'No statement about paid work, employment, consulting or partnerships is made unless an accurate availability note is configured.'}
            </p>
          </div>
        </div>

        {links.github && (
          <Button
            href={links.github}
            variant="secondary"
            className="mt-6"
            icon={<ArrowUpRightIcon />}
          >
            {profileConfig.name} on GitHub
          </Button>
        )}
      </Section>
    </>
  );
}
