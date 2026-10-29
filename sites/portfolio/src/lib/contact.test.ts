import { describe, expect, it } from 'vitest';
import { isEmail, isUsableLink, displayUrl, urlHost } from './links';
import {
  MESSAGE_MAX,
  MESSAGE_MIN,
  composeContactMessage,
  composeMailtoHref,
  emptyContactForm,
  isContactFormValid,
  toSubmissionPayload,
  validateContactForm,
  type ContactFormValues,
} from './contact';

const valid: ContactFormValues = {
  name: 'Ada',
  email: 'ada@example.org',
  subject: 'Question about NetScope',
  message: 'I read the case study and wanted to ask about the streaming parser.',
  company: '',
};

describe('isUsableLink', () => {
  it.each([
    'https://github.com/someone/repo',
    'https://mwangala.dev',
    'mailto:hello@example.org',
    'tel:+260970000000',
  ])('accepts %s', (value) => {
    expect(isUsableLink(value)).toBe(true);
  });

  it.each(['', '   ', null, undefined, 'http://insecure.example', 'javascript:alert(1)', 'not a url', '#anchor'])(
    'rejects %j',
    (value) => {
      expect(isUsableLink(value as string)).toBe(false);
    },
  );

  it('rejects http so no link downgrades a visitor to an insecure origin', () => {
    expect(isUsableLink('http://example.com')).toBe(false);
  });
});

describe('isEmail', () => {
  it.each(['ada@example.org', 'a.b+c@sub.domain.co.zm', 'x@y.io'])('accepts %s', (value) => {
    expect(isEmail(value)).toBe(true);
  });

  it.each(['', 'ada', 'ada@', '@example.org', 'ada@example', 'a b@example.org', 'ada@@example.org'])(
    'rejects %j',
    (value) => {
      expect(isEmail(value)).toBe(false);
    },
  );

  it('rejects an address longer than 254 characters', () => {
    expect(isEmail(`${'a'.repeat(250)}@example.org`)).toBe(false);
  });
});

describe('displayUrl / urlHost', () => {
  it('strips the protocol and trailing slash', () => {
    expect(displayUrl('https://github.com/owner/repo/')).toBe('github.com/owner/repo');
    expect(displayUrl('https://mwangala.dev/')).toBe('mwangala.dev');
  });

  it('shows the address for mailto links', () => {
    expect(displayUrl('mailto:hello@example.org')).toBe('hello@example.org');
  });

  it('returns the input unchanged when it is not a URL', () => {
    expect(displayUrl('not a url')).toBe('not a url');
    expect(urlHost('not a url')).toBe('not a url');
  });

  it('extracts the host', () => {
    expect(urlHost('https://github.com/owner/repo')).toBe('github.com');
  });
});

describe('validateContactForm', () => {
  it('accepts a complete, well-formed submission', () => {
    expect(validateContactForm(valid)).toEqual({});
    expect(isContactFormValid(valid)).toBe(true);
  });

  it('rejects the empty form with one error per field', () => {
    const errors = validateContactForm(emptyContactForm);
    expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name', 'subject']);
  });

  it('flags an invalid email address', () => {
    expect(validateContactForm({ ...valid, email: 'nope' }).email).toMatch(/valid email/i);
  });

  it('flags a message that is too short', () => {
    const errors = validateContactForm({ ...valid, message: 'too short' });
    expect(errors.message).toContain(String(MESSAGE_MIN));
  });

  it('flags a message that is too long', () => {
    const errors = validateContactForm({ ...valid, message: 'x'.repeat(MESSAGE_MAX + 1) });
    expect(errors.message).toContain(String(MESSAGE_MAX));
  });

  it('trims surrounding whitespace before validating', () => {
    expect(validateContactForm({ ...valid, name: '  Ada  ', message: `  ${valid.message}  ` })).toEqual({});
  });

  it('enforces maximum lengths for name and subject', () => {
    expect(validateContactForm({ ...valid, name: 'a'.repeat(200) }).name).toBeDefined();
    expect(validateContactForm({ ...valid, subject: 's'.repeat(300) }).subject).toBeDefined();
  });

  it('ignores the honeypot field when validating (it is handled separately)', () => {
    expect(validateContactForm({ ...valid, company: 'spam' })).toEqual({});
  });
});

describe('composeContactMessage', () => {
  it('includes the reply address and the message body', () => {
    const composed = composeContactMessage(valid);
    expect(composed).toContain('Ada');
    expect(composed).toContain('ada@example.org');
    expect(composed).toContain(valid.message);
  });

  it('trims values', () => {
    expect(composeContactMessage({ ...valid, name: '  Ada  ' })).toContain('Name: Ada');
  });
});

describe('composeMailtoHref', () => {
  it('builds a valid mailto URL with encoded subject and body', () => {
    const href = composeMailtoHref('hello@example.org', valid);
    expect(href.startsWith('mailto:hello@example.org?')).toBe(true);
    const url = new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.searchParams.get('subject')).toBe(valid.subject);
    expect(url.searchParams.get('body')).toContain(valid.message);
  });

  it('survives ampersands and newlines in the message', () => {
    const href = composeMailtoHref('a@b.org', { ...valid, message: 'line one & two\nline three' });
    const url = new URL(href);
    expect(url.searchParams.get('body')).toContain('line one & two');
    expect(url.searchParams.get('body')).toContain('line three');
  });
});

describe('toSubmissionPayload', () => {
  it('trims fields and stamps the submission time', () => {
    const payload = toSubmissionPayload({ ...valid, name: ' Ada ', message: ` ${valid.message} ` });
    expect(payload.name).toBe('Ada');
    expect(payload.message).toBe(valid.message);
    expect(new Date(payload.submittedAt).toISOString()).toBe(payload.submittedAt);
  });

  it('forwards the honeypot value so a backend can apply its own check', () => {
    expect(toSubmissionPayload({ ...valid, company: 'bot' }).honeypot).toBe('bot');
  });
});
