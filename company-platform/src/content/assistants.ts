/**
 * The two assistants, and the material each is allowed to speak from.
 *
 * Both are grounded: the model may only use the passages retrieved from the
 * corpus below. That corpus is deliberately small and written for this site —
 * no invented service levels, no invented certifications, no claims about
 * response times. Where a real answer needs a human, the assistant is told to
 * say so and point at the contact form.
 *
 * The two are separate products for separate companies. They do not share a
 * corpus, a prompt, or a conversation.
 */

export const ASSISTANT_NAMES = ['velaqori-triage', 'tamuzi-study-plan'] as const;
export type AssistantName = (typeof ASSISTANT_NAMES)[number];

export interface CorpusEntry {
  id: string;
  title: string;
  text: string;
}

export interface AssistantDefinition {
  name: AssistantName;
  company: string;
  companySlug: string;
  title: string;
  intro: string;
  /** Shown above the composer so the scope is clear before anyone types. */
  scope: string;
  /** What the assistant must refuse to do, in its own words. */
  guardrails: string[];
  starters: string[];
  corpus: CorpusEntry[];
}

const VELAQORI_CORPUS: CorpusEntry[] = [
  {
    id: 'services',
    title: 'What Velaqori Systems does',
    text:
      'Velaqori Systems works on cybersecurity and IT services alongside software development. ' +
      'Typical engagements cover security reviews, hardening advice, monitoring and response support, ' +
      'and building or fixing internal tooling. Every engagement is scoped per client; the site does ' +
      'not publish fixed packages, prices or service levels.',
  },
  {
    id: 'triage',
    title: 'How to triage an IT or security problem',
    text:
      'A useful first report answers five things: what stopped working, when it started, who is affected, ' +
      'what changed immediately before it, and whether anything is still exposed. Restarting a service or ' +
      'rotating a credential is usually safe to do first; deleting data, rebuilding a machine, or emailing ' +
      'everyone is not. Preserve logs and timestamps before clearing anything.',
  },
  {
    id: 'severity',
    title: 'Deciding how urgent something is',
    text:
      'Urgency comes from impact and exposure, not from how annoying the problem is: a leaked credential or ' +
      'an exposed administrative interface is urgent even if nothing is broken yet; a slow report is not ' +
      'urgent even if it is frustrating. If credentials may have leaked, rotate them before investigating ' +
      'further. If personal data may have been exposed, keep evidence and involve whoever owns the ' +
      'obligation to notify; do not speculate about scope in writing.',
  },
  {
    id: 'contact',
    title: 'Getting a human involved',
    text:
      'The contact form on this site reaches the company inbox directly. Include what you have observed, ' +
      'what you have already tried, and how to reach you. Do not paste passwords, keys or personal data ' +
      'into the form — say that you have them and share them through an agreed channel instead. Response ' +
      'times are not promised here; an engagement is agreed in writing before work starts.',
  },
  {
    id: 'velaqori-limits',
    title: 'What this assistant cannot do',
    text:
      'It cannot confirm whether a breach happened, cannot promise a response time, cannot quote a price, ' +
      'and cannot see your systems. It will not produce destructive instructions or help conceal activity. ' +
      'Its suggestions are general guidance from the pages above, not an assessment of your environment.',
  },
];

const TAMUZI_CORPUS: CorpusEntry[] = [
  {
    id: 'approach',
    title: 'How Tamuzi Learning approaches study',
    text:
      'Study is scheduled around evidence rather than ambition. A learner answers questions, and those answers ' +
      'decide what is strong, what is decaying, and what to do next. The promise is not "you completed this"; ' +
      'it is "here is what you are likely to still remember, and here is why".',
  },
  {
    id: 'spacing',
    title: 'Spacing and review',
    text:
      'Reviewing something just before you would have forgotten it is more valuable than reviewing it while it ' +
      'is fresh. Sessions should therefore revisit material at growing intervals rather than re-reading it ' +
      'nightly. Short, regular sessions beat one long session, and reviewing beats re-reading.',
  },
  {
    id: 'planning',
    title: 'Planning a realistic week',
    text:
      'Pick the number of minutes you can actually protect — twenty minutes on four days is a better plan than ' +
      'two hours on one. Put review before new material, because forgetting is what loses progress. Leave one ' +
      'slot empty for the week going badly. Track what you finished, not what you intended.',
  },
  {
    id: 'practice',
    title: 'Practice with feedback',
    text:
      'Retrieval practice — answering from memory, then checking — is what makes knowledge durable. ' +
      'A wrong answer is useful when it shows which specific idea was misunderstood; that is why the platform ' +
      'asks for confidence and explains the misconception rather than only marking right or wrong.',
  },
  {
    id: 'tamuzi-limits',
    title: 'What this helper cannot do',
    text:
      'It does not know your grades, your timetable, or your mastery scores, and it will not invent them. ' +
      'It cannot enrol you in a course or promise an outcome. It offers a plan shaped from the principles on ' +
      'this site; you decide what to keep.',
  },
];

export const ASSISTANTS: Record<AssistantName, AssistantDefinition> = {
  'velaqori-triage': {
    name: 'velaqori-triage',
    company: 'Velaqori Systems',
    companySlug: 'velaqori-systems',
    title: 'IT and security triage',
    intro:
      'Describe what went wrong and this will help you order the next steps — then hand you to a person.',
    scope:
      'General guidance from Velaqori Systems’ own pages. Not an assessment of your systems, and not a promise of response times.',
    guardrails: [
      'Answer only from the retrieved passages and the conversation. If they do not cover it, say so and point at the contact form.',
      'Never promise a response time, a price, or an outcome, and never claim a breach has or has not happened.',
      'Never give destructive instructions (deleting data, rebuilding machines, mass password resets) as a first step.',
      'Never ask for or repeat passwords, keys, or personal data. Tell the user to share them through an agreed channel.',
      'End with the single most useful next action, and mention the contact form when a human is needed.',
    ],
    starters: [
      'A staff laptop is behaving strangely — where do I start?',
      'I think a credential may have leaked. What now?',
      'A server is up but the admin page is publicly reachable.',
    ],
    corpus: VELAQORI_CORPUS,
  },
  'tamuzi-study-plan': {
    name: 'tamuzi-study-plan',
    company: 'Tamuzi Learning',
    companySlug: 'tamuzi-learning',
    title: 'Study planning',
    intro: 'Say what you are studying and how much time you really have, and this will shape a week around it.',
    scope:
      'A plan built from Tamuzi Learning’s published study principles. It does not know your grades or progress.',
    guardrails: [
      'Answer only from the retrieved passages and the conversation. If they do not cover it, say so plainly.',
      'Never invent mastery, grades, test results or progress, and never promise an outcome.',
      'Never claim the user is enrolled in, or entitled to, a course.',
      'Keep the plan concrete: how many minutes, on which days, and what to do in each slot.',
      'Ask for the missing constraint (time available, subject, deadline) rather than assuming it.',
    ],
    starters: [
      'I have 20 minutes on four weekdays and a test in three weeks.',
      'I keep re-reading and it is not sticking.',
      'Help me plan revision around a full-time job.',
    ],
    corpus: TAMUZI_CORPUS,
  },
};

export function isAssistantName(value: string): value is AssistantName {
  return (ASSISTANT_NAMES as readonly string[]).includes(value);
}
