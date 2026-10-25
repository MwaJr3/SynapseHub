/**
 * Personal profile configuration — the single place to edit identity details.
 *
 * IMPORTANT: fields marked `TODO` are intentionally empty. The portfolio never
 * invents an email address, profile URL, employer, qualification or award.
 * Empty values are detected by the UI, which then hides the corresponding
 * control (or shows a deliberate "not configured" state) rather than rendering
 * a fabricated link.
 */

export interface ProfileLink {
  /** Machine-readable kind, used for icons and ordering. */
  kind: 'github' | 'linkedin' | 'email' | 'website' | 'other';
  label: string;
  /** Leave as '' when the URL has not been supplied yet. */
  url: string;
}

export interface Profile {
  name: string;
  /** Used in the nav wordmark and hero. */
  role: string;
  positioning: string;
  coreMessage: string;
  supportingMessage: string;
  /** Editable biography. Kept deliberately free of invented achievements. */
  bio: string[];
  about: {
    heading: string;
    paragraphs: string[];
    interests: { title: string; body: string }[];
    values: { title: string; body: string }[];
    learning: { heading: string; paragraphs: string[] };
  };
  /** TODO: replace with a real, monitored address. Empty = contact link hidden. */
  email: string;
  /** TODO: confirm before publishing. */
  location: string;
  links: ProfileLink[];
  /** Only set these if they are independently true. Empty arrays render nothing. */
  education: { institution: string; detail: string; period: string }[];
  certifications: { name: string; issuer: string; year: string }[];
  availability: string;
}

/**
 * Addresses the contact form delivers to.
 *
 * These are the two monitored inboxes the site owner nominated. `VITE_CONTACT_EMAIL`
 * (comma-separated) overrides the list at build time; invalid entries are dropped
 * rather than shipped. The client can only ever *offer* these addresses — actual
 * delivery happens in the serverless contact endpoint (see api/contact.py).
 */
const NOMINATED_CONTACT_EMAILS = ['mwangalamackjrv2@gmail.com', 'mackjrv2@gmail.com'];

function readContactEmails(): string[] {
  const raw = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim();
  if (!raw) return NOMINATED_CONTACT_EMAILS;
  const parsed = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  return parsed.length > 0 ? parsed : NOMINATED_CONTACT_EMAILS;
}

/** Every address a contact message is delivered to. */
export const contactEmails: string[] = readContactEmails();

/** The first address, used wherever a single address must be shown. */
export const primaryContactEmail: string = contactEmails[0] ?? '';

export const profile: Profile = {
  name: 'Mwangala',
  role: 'Python Developer · Cybersecurity · Full-Stack Software Engineering',
  positioning:
    'I build practical applications that turn complex technical problems into tools people can understand and use.',
  coreMessage: 'Building Software. Understanding Security. Solving Real Problems.',
  supportingMessage:
    "I'm Mwangala, a developer focused on Python, full-stack engineering, and defensive cybersecurity. I build practical applications that transform complex technical problems into tools people can understand and use.",

  bio: [
    'I am a developer interested in building practical software, understanding how systems work, and improving the security and reliability of technology.',
    'My projects combine Python development, full-stack engineering, defensive cybersecurity, data processing, automation, and software analysis.',
    'I approach development as a process of understanding problems, designing systems, implementing solutions, testing assumptions, and continuously improving the result.',
  ],

  about: {
    heading: 'Curious by Nature. Systems-Oriented by Design.',
    paragraphs: [
      "I'm interested in how technology works beneath the surface: how applications process information, how software systems fit together, how security problems emerge, and how thoughtful engineering can make tools more useful and reliable.",
      'I use projects to explore these questions through implementation. My work spans Python development, full-stack applications, data processing, and defensive cybersecurity.',
      'For me, building software is not only about getting an interface to work. It is also about understanding the underlying problem, designing a sensible solution, testing its behaviour, and learning from the process.',
      'My goal is to keep developing as an engineer by working on increasingly challenging problems and turning what I learn into practical applications.',
    ],
    interests: [
      {
        title: 'Defensive security engineering',
        body: 'How warning signs become explainable findings — phishing indicators, network traffic patterns, file reputation, exposed services — and how to present uncertainty without overstating a conclusion.',
      },
      {
        title: 'Data processing pipelines',
        body: 'Turning messy real-world input (email headers, packet captures, third-party feeds, static-analysis output) into a consistent internal representation that a person can actually reason about.',
      },
      {
        title: 'Applied AI features',
        body: 'Using language models where they add value — transcript analysis, learning guides, revision material — while validating structured output and keeping provenance intact.',
      },
      {
        title: 'Developer and analyst tooling',
        body: 'Interfaces that respect the person using them: dense information with clear hierarchy, recoverable failures, and honest status reporting.',
      },
    ],
    values: [
      {
        title: 'Accuracy before quantity',
        body: 'A small, correct result beats a large, unreliable one. Heuristics are labelled as heuristics; missing evidence is labelled as missing.',
      },
      {
        title: 'Transparency before pretending',
        body: 'No fake integrations, no decorative buttons, no success message for work that did not happen.',
      },
      {
        title: 'Modular architecture before fragile shortcuts',
        body: 'Retrieval, parsing, analysis, storage and presentation stay separable so one can be replaced without rewriting the rest.',
      },
      {
        title: 'Security as a product requirement',
        body: 'Authorisation is enforced server-side, input is validated, untrusted content is treated as data rather than instructions, and secrets never reach the client.',
      },
      {
        title: 'User control before irreversible automation',
        body: 'People can review, edit, retry and delete. Destructive or expensive actions are explicit.',
      },
    ],
    learning: {
      heading: 'How I learn',
      paragraphs: [
        'I learn by building. Reading about packet structure is not the same as writing a parser that has to cope with a truncated capture, and reading about phishing detection is not the same as deciding what to do when an email has no SPF result at all.',
        'So each project starts with a question I genuinely want answered, moves through a design that can be tested, and ends with a written reflection on what the trade-offs cost. The case studies in this portfolio are those reflections.',
      ],
    },
  },

  email: primaryContactEmail,

  // TODO: confirm before publishing.
  location: 'Lusaka, Zambia',

  links: [
    // TODO: replace with real profile URLs. Empty `url` values are hidden by
    // the UI and asserted as such by the link tests.
    { kind: 'github', label: 'GitHub', url: '' },
    { kind: 'linkedin', label: 'LinkedIn', url: '' },
  ],

  // Left empty on purpose — no invented education history.
  education: [],
  // Left empty on purpose — no invented certifications.
  certifications: [],

  availability:
    'Open to engineering opportunities, collaboration, and technically challenging problems worth solving.',
};

/** True when at least one usable contact route exists. */
export function hasContactEmail(): boolean {
  return profile.email.trim().length > 0 && profile.email.includes('@');
}

/** Only links with a real URL are returned; the UI never renders a stub. */
export function configuredLinks(): ProfileLink[] {
  return profile.links.filter((link) => link.url.trim().length > 0);
}
