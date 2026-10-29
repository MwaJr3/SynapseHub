import { isEmail } from './links';

/**
 * Contact form validation and composition.
 *
 * Kept as pure functions so the rules can be tested without rendering, and so
 * the component only deals with state.
 */

export interface ContactFormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot: must stay empty. Bots fill it, people never see it. */
  company: string;
}

export type ContactField = 'name' | 'email' | 'subject' | 'message';

export type ContactErrors = Partial<Record<ContactField, string>>;

export const MESSAGE_MIN = 20;
export const MESSAGE_MAX = 4000;
export const NAME_MAX = 120;
export const SUBJECT_MAX = 160;

export const emptyContactForm: ContactFormValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
  company: '',
};

export function validateContactForm(values: ContactFormValues): ContactErrors {
  const errors: ContactErrors = {};

  const name = values.name.trim();
  if (name.length === 0) {
    errors.name = 'Please add a name so the reply can address you.';
  } else if (name.length > NAME_MAX) {
    errors.name = `That name is longer than ${NAME_MAX} characters.`;
  }

  const email = values.email.trim();
  if (email.length === 0) {
    errors.email = 'A reply address is required — otherwise there is no way to answer.';
  } else if (!isEmail(email)) {
    errors.email = 'That does not look like a valid email address.';
  }

  const subject = values.subject.trim();
  if (subject.length === 0) {
    errors.subject = 'Add a short subject so the message can be prioritised.';
  } else if (subject.length > SUBJECT_MAX) {
    errors.subject = `Keep the subject under ${SUBJECT_MAX} characters.`;
  }

  const message = values.message.trim();
  if (message.length === 0) {
    errors.message = 'The message is empty.';
  } else if (message.length < MESSAGE_MIN) {
    errors.message = `Please add at least ${MESSAGE_MIN} characters — a little context makes a reply useful.`;
  } else if (message.length > MESSAGE_MAX) {
    errors.message = `That is longer than ${MESSAGE_MAX} characters. Please trim it or attach a document reference.`;
  }

  return errors;
}

export function isContactFormValid(values: ContactFormValues): boolean {
  return Object.keys(validateContactForm(values)).length === 0;
}

/** Composes the message body used for the mailto hand-off or the POST payload. */
export function composeContactMessage(values: ContactFormValues): string {
  return [
    `Name: ${values.name.trim()}`,
    `Reply to: ${values.email.trim()}`,
    `Subject: ${values.subject.trim()}`,
    '',
    values.message.trim(),
    '',
    '—',
    'Sent from the portfolio contact form.',
  ].join('\n');
}

export function composeMailtoHref(to: string, values: ContactFormValues): string {
  const params = new URLSearchParams({
    subject: values.subject.trim(),
    body: composeContactMessage(values),
  });
  return `mailto:${to}?${params.toString()}`;
}

export interface ContactSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Sent so a receiving backend can apply its own spam checks. */
  honeypot: string;
  submittedAt: string;
}

export function toSubmissionPayload(values: ContactFormValues): ContactSubmission {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    subject: values.subject.trim(),
    message: values.message.trim(),
    honeypot: values.company,
    submittedAt: new Date().toISOString(),
  };
}
