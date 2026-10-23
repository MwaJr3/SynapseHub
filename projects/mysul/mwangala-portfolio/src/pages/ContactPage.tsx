import { useEffect, useRef, useState, type FormEvent } from 'react';
import { site } from '@/config/site';
import { profile, configuredLinks, hasContactEmail } from '@/config/profile';
import { projects } from '@/data/projects';
import { usePageMeta } from '@/lib/seo';
import { isUsableLink } from '@/lib/links';
import { cn } from '@/lib/cn';
import {
  MESSAGE_MAX,
  composeContactMessage,
  composeMailtoHref,
  emptyContactForm,
  toSubmissionPayload,
  validateContactForm,
  type ContactErrors,
  type ContactField,
  type ContactFormValues,
} from '@/lib/contact';
import { Container, Section, SectionSpacing } from '@/components/ui/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button, LinkButton } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { StateBlock, Spinner } from '@/components/ui/StateBlock';
import { CopyButton } from '@/components/ui/CopyButton';

type DeliveryState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'sent'; detail: string }
  | { status: 'drafted'; detail: string }
  | { status: 'error'; detail: string };

const COOLDOWN_KEY = 'mw-contact-last';
const COOLDOWN_MS = 30_000;

export default function ContactPage() {
  usePageMeta({
    title: `Contact — ${profile.name}`,
    description:
      'How to get in touch with Mwangala about engineering work, collaboration or a technical problem worth solving.',
    path: '/contact',
  });

  const endpoint = site.contactEndpoint.trim();
  const emailConfigured = hasContactEmail();
  const canDeliver = endpoint.length > 0 || emailConfigured;

  const [values, setValues] = useState<ContactFormValues>(emptyContactForm);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [delivery, setDelivery] = useState<DeliveryState>({ status: 'idle' });
  const [remaining, setRemaining] = useState(0);
  const mailtoRef = useRef<HTMLAnchorElement | null>(null);

  /* Short cooldown between submissions. It is a courtesy control, not a
     security boundary — real rate limiting belongs on a backend. */
  useEffect(() => {
    let last = 0;
    try {
      last = Number(window.sessionStorage.getItem(COOLDOWN_KEY) ?? 0) || 0;
    } catch {
      last = 0;
    }
    const elapsed = Date.now() - last;
    if (elapsed < COOLDOWN_MS) setRemaining(Math.ceil((COOLDOWN_MS - elapsed) / 1000));
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  const update = (field: keyof ContactFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (field !== 'company' && touched[field as ContactField]) {
      setErrors(validateContactForm({ ...values, [field]: value }));
    }
    if (delivery.status === 'error' || delivery.status === 'sent' || delivery.status === 'drafted') {
      setDelivery({ status: 'idle' });
    }
  };

  const blur = (field: ContactField) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validateContactForm(values));
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateContactForm(values);
    setErrors(nextErrors);
    setTouched({ name: true, email: true, subject: true, message: true });

    if (Object.keys(nextErrors).length > 0) {
      setDelivery({
        status: 'error',
        detail: `${Object.keys(nextErrors).length} field${Object.keys(nextErrors).length === 1 ? '' : 's'} need attention before the message can go anywhere.`,
      });
      const first = document.getElementById(`contact-${Object.keys(nextErrors)[0]}`);
      first?.focus();
      return;
    }

    if (values.company.trim().length > 0) {
      // Honeypot filled: almost certainly a bot. Do not deliver, do not
      // explain which field gave it away.
      setDelivery({ status: 'idle' });
      return;
    }

    if (!canDeliver) {
      setDelivery({
        status: 'error',
        detail:
          'No delivery route is configured, so this message has not been sent anywhere. Configure VITE_CONTACT_ENDPOINT or a contact email address to enable the form.',
      });
      return;
    }

    if (remaining > 0) {
      setDelivery({
        status: 'error',
        detail: `Please wait ${remaining}s before sending another message.`,
      });
      return;
    }

    /* --- Route 1: configured backend endpoint --------------------------- */
    if (endpoint.length > 0) {
      setDelivery({ status: 'submitting' });
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(toSubmissionPayload(values)),
        });
        if (!response.ok) {
          setDelivery({
            status: 'error',
            detail: `The contact service responded ${response.status} ${response.statusText}. The message was not delivered — please try again or use email directly.`,
          });
          return;
        }
        try {
          window.sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        } catch {
          /* storage blocked — the cooldown simply does not persist */
        }
        setRemaining(Math.ceil(COOLDOWN_MS / 1000));
        setDelivery({
          status: 'sent',
          detail: `Accepted by the contact service (HTTP ${response.status}). Nothing further is stored in this browser.`,
        });
        setValues(emptyContactForm);
        setTouched({});
      } catch {
        setDelivery({
          status: 'error',
          detail:
            'The contact service could not be reached, so the message was not delivered. Nothing has been sent — please retry, or use the email address on this page.',
        });
      }
      return;
    }

    /* --- Route 2: explicit hand-off to the visitor's mail client --------- */
    const href = composeMailtoHref(profile.email, values);
    if (mailtoRef.current) {
      mailtoRef.current.href = href;
      mailtoRef.current.click();
    } else {
      window.location.href = href;
    }
    try {
      window.sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setRemaining(Math.ceil(COOLDOWN_MS / 1000));
    setDelivery({
      status: 'drafted',
      detail: `Your email application was asked to open a draft addressed to ${profile.email}. This site cannot confirm it was sent — the message leaves from your mail client, not from here.`,
    });
  }

  const messageLength = values.message.trim().length;
  const errorCount = Object.keys(errors).length;

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Have a Problem Worth Solving? Let's Talk."
        lead="I'm interested in opportunities to build useful software, learn from challenging technical problems, and contribute to meaningful projects. If you have read a case study and disagree with a decision, that is also a good reason to write."
      />

      <Section tone="light">
        <SectionSpacing>
          <Container>
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
              {/* --------------------------------------------------- form -- */}
              <div>
                {!canDeliver ? (
                  <StateBlock tone="warning" icon="alert" title="The contact form cannot deliver messages yet">
                    <p>
                      No delivery route has been configured, so submitting would do nothing. Rather than show a
                      success message for a message that was never sent, the form is disabled. Set{' '}
                      <code className="font-mono text-[0.85em]">VITE_CONTACT_ENDPOINT</code> to a backend that
                      accepts submissions, or{' '}
                      <code className="font-mono text-[0.85em]">VITE_CONTACT_EMAIL</code> / the{' '}
                      <code className="font-mono text-[0.85em]">email</code> field in{' '}
                      <code className="font-mono text-[0.85em]">src/config/profile.ts</code> to enable the
                      mail-client hand-off.
                    </p>
                  </StateBlock>
                ) : null}

                {endpoint.length === 0 && emailConfigured ? (
                  <StateBlock tone="info" icon="info" title="How this form delivers your message">
                    <p>
                      This portfolio is a static build with no server of its own. Submitting composes a
                      pre-filled email and hands it to <strong>your</strong> mail application — nothing is sent
                      from this site, stored by it, or passed to a third party. If you would rather not use the
                      form, write directly to{' '}
                      <a
                        href={`mailto:${profile.email}`}
                        className="font-medium text-accent underline-offset-4 hover:underline"
                      >
                        {profile.email}
                      </a>
                      .
                    </p>
                  </StateBlock>
                ) : null}

                <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5" aria-describedby="contact-status">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      id="contact-name"
                      label="Your name"
                      value={values.name}
                      error={touched.name ? errors.name : undefined}
                      onChange={(value) => update('name', value)}
                      onBlur={() => blur('name')}
                      autoComplete="name"
                      required
                    />
                    <Field
                      id="contact-email"
                      label="Email address"
                      type="email"
                      value={values.email}
                      error={touched.email ? errors.email : undefined}
                      onChange={(value) => update('email', value)}
                      onBlur={() => blur('email')}
                      autoComplete="email"
                      required
                      hint="Used only to reply."
                    />
                  </div>

                  <Field
                    id="contact-subject"
                    label="Subject"
                    value={values.subject}
                    error={touched.subject ? errors.subject : undefined}
                    onChange={(value) => update('subject', value)}
                    onBlur={() => blur('subject')}
                    placeholder="For example: a question about the NetScope parsing pipeline"
                    required
                  />

                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <label htmlFor="contact-message" className="text-sm font-medium text-fg">
                        Message <span aria-hidden className="text-danger">*</span>
                      </label>
                      <span
                        className={cn(
                          'font-mono text-[0.7rem]',
                          messageLength > MESSAGE_MAX ? 'text-danger' : 'text-fg-subtle',
                        )}
                        aria-live="off"
                      >
                        {messageLength}/{MESSAGE_MAX}
                      </span>
                    </div>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={8}
                      value={values.message}
                      onChange={(event) => update('message', event.target.value)}
                      onBlur={() => blur('message')}
                      aria-required="true"
                      aria-invalid={touched.message && errors.message ? true : undefined}
                      aria-describedby={touched.message && errors.message ? 'contact-message-error' : undefined}
                      className={cn(
                        'mt-2 w-full rounded-lg border bg-surface px-3.5 py-3 text-sm leading-relaxed text-fg',
                        'placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/25',
                        touched.message && errors.message ? 'border-danger' : 'border-line focus:border-accent-line',
                      )}
                      placeholder="What are you working on, and what would you like to know?"
                    />
                    {touched.message && errors.message ? (
                      <p id="contact-message-error" className="mt-1.5 text-xs text-danger">
                        {errors.message}
                      </p>
                    ) : null}
                  </div>

                  {/* Honeypot: visually hidden, labelled as a bot trap for
                      assistive technology so a human is never confused by it. */}
                  <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <label htmlFor="contact-company">Company (leave this field empty)</label>
                    <input
                      id="contact-company"
                      name="company"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={values.company}
                      onChange={(event) => update('company', event.target.value)}
                    />
                  </div>

                  <div
                    id="contact-status"
                    role="status"
                    aria-live="polite"
                    className="min-h-[1.5rem]"
                  >
                    {delivery.status === 'submitting' ? <Spinner label="Sending your message…" /> : null}
                    {delivery.status === 'sent' ? (
                      <p className="flex gap-2 text-sm text-success">
                        <Icon name="check" size={16} className="mt-0.5 shrink-0" aria-hidden />
                        <span>
                          Message accepted by the contact service. {delivery.detail}
                        </span>
                      </p>
                    ) : null}
                    {delivery.status === 'drafted' ? (
                      <p className="flex gap-2 text-sm text-info">
                        <Icon name="mail" size={16} className="mt-0.5 shrink-0" aria-hidden />
                        <span>{delivery.detail}</span>
                      </p>
                    ) : null}
                    {delivery.status === 'error' ? (
                      <p className="flex gap-2 text-sm text-danger">
                        <Icon name="alert" size={16} className="mt-0.5 shrink-0" aria-hidden />
                        <span>{delivery.detail}</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      icon={endpoint ? 'mail' : 'arrow-up-right'}
                      disabled={!canDeliver || delivery.status === 'submitting' || remaining > 0}
                    >
                      {remaining > 0
                        ? `Wait ${remaining}s`
                        : endpoint
                          ? 'Send message'
                          : 'Open in my email app'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      onClick={() => {
                        setValues(emptyContactForm);
                        setErrors({});
                        setTouched({});
                        setDelivery({ status: 'idle' });
                      }}
                      disabled={values === emptyContactForm}
                    >
                      Clear form
                    </Button>
                    {errorCount > 0 && Object.keys(touched).length > 0 ? (
                      <span className="text-xs text-fg-subtle">{errorCount} field(s) need attention</span>
                    ) : null}
                  </div>

                  <p className="text-xs leading-relaxed text-fg-subtle">
                    Spam protection: an empty hidden field that only automated submissions fill, plus a short
                    cooldown between sends. Both are courtesy controls — this static site has no backend to
                    enforce anything, and it does not attempt to pretend otherwise.
                  </p>

                  {/* Hidden anchor used for the mailto hand-off. */}
                  <a ref={mailtoRef} href="#contact" className="sr-only" tabIndex={-1} aria-hidden="true">
                    Open mail client
                  </a>
                </form>
              </div>

              {/* ------------------------------------------------ sidebar -- */}
              <aside className="flex flex-col gap-4">
                <Panel className="bg-surface">
                  <h2 className="text-sm font-semibold text-fg">Direct contact</h2>
                  <ul className="mt-4 flex flex-col gap-3">
                    <ContactRow
                      icon="mail"
                      label="Email"
                      value={emailConfigured ? profile.email : 'Not published yet'}
                      href={emailConfigured ? `mailto:${profile.email}` : undefined}
                      unavailable={!emailConfigured}
                    />
                    {configuredLinks().map((link) => (
                      <ContactRow
                        key={link.kind}
                        icon={link.kind === 'github' ? 'github' : link.kind === 'linkedin' ? 'linkedin' : 'external'}
                        label={link.label}
                        value={link.url.replace(/^https?:\/\//, '')}
                        href={link.url}
                        external
                      />
                    ))}
                    <ContactRow icon="user" label="Based in" value={profile.location || 'Not published yet'} />
                  </ul>
                  {configuredLinks().length === 0 ? (
                    <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-fg-subtle">
                      Code-hosting and professional profile links have not been configured, so none are shown.
                      They are read from <code className="font-mono">src/config/profile.ts</code> and{' '}
                      <code className="font-mono">.env</code>; a placeholder URL is never rendered as a real
                      destination.
                    </p>
                  ) : null}
                </Panel>

                <Panel className="bg-surface">
                  <h2 className="text-sm font-semibold text-fg">What happens to your message</h2>
                  <ul className="mt-3 space-y-2.5 text-[0.85rem] leading-relaxed text-fg-muted">
                    {[
                      endpoint
                        ? 'It is posted to the configured contact endpoint over HTTPS. The response determines the status shown above — a success message only appears if the service actually accepted it.'
                        : 'It is composed into a mailto: link and opened in your own mail application. This site transmits nothing and stores nothing beyond a short cooldown timer in session storage.',
                      'No analytics, no cookies, no third-party scripts. The only persistent browser storage on this site is your theme preference.',
                      'Nothing you write is logged or retained by the portfolio itself.',
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Icon name="check" size={14} className="mt-1 shrink-0 text-accent" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel className="bg-surface-sunken/60" tone="none">
                  <h2 className="text-sm font-semibold text-fg">Prefer to start with the work?</h2>
                  <p className="mt-2 text-[0.85rem] leading-relaxed text-fg-muted">
                    The case studies document the engineering decisions, testing approach and limitations for
                    all {projects.length} projects — usually a faster way to judge fit than an email exchange.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <LinkButton to="/projects" variant="secondary" size="sm">
                      Project directory
                    </LinkButton>
                    <LinkButton to="/skills" variant="ghost" size="sm">
                      Skills &amp; evidence
                    </LinkButton>
                  </div>
                </Panel>

                {emailConfigured ? (
                  <Panel className="bg-surface">
                    <h2 className="text-sm font-semibold text-fg">Copy the message instead</h2>
                    <p className="mt-2 text-[0.85rem] leading-relaxed text-fg-muted">
                      If the mail hand-off does not work in your environment, copy the composed message and
                      paste it into any client.
                    </p>
                    <div className="mt-3">
                      <CopyButton
                        label="Copy the composed contact message"
                        value={composeContactMessage(values)}
                      >
                        Copy composed message
                      </CopyButton>
                    </div>
                  </Panel>
                ) : null}
              </aside>
            </div>
          </Container>
        </SectionSpacing>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------- fragments -- */

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  type = 'text',
  placeholder,
  autoComplete,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string | undefined;
  hint?: string | undefined;
  type?: string;
  placeholder?: string | undefined;
  autoComplete?: string | undefined;
  required?: boolean;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label} {required ? <span aria-hidden className="text-danger">*</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="mt-0.5 text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        name={id.replace('contact-', '')}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'mt-2 h-10 w-full rounded-lg border bg-surface px-3.5 text-sm text-fg',
          'placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/25',
          error ? 'border-danger' : 'border-line focus:border-accent-line',
        )}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  external = false,
  unavailable = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  href?: string | undefined;
  external?: boolean;
  unavailable?: boolean;
}) {
  const usable = href ? isUsableLink(href) : false;
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-sunken text-fg-muted">
        <Icon name={icon} size={15} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-fg-subtle">{label}</span>
        {usable ? (
          <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="block truncate text-sm font-medium text-fg underline-offset-4 hover:text-accent hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className={cn('block truncate text-sm', unavailable ? 'text-fg-subtle' : 'text-fg')}>{value}</span>
        )}
      </span>
    </li>
  );
}
