import type { Metadata } from 'next';

import { AssistantChat } from '@/components/assistant-chat';
import { Badge } from '@/components/ui';
import { ASSISTANTS } from '@/content/assistants';

export const metadata: Metadata = {
  title: 'IT and security triage — Velaqori Systems',
  description:
    'Describe an IT or security problem and get the next steps ordered, then a route to a person at Velaqori Systems.',
};

const triage = ASSISTANTS['velaqori-triage'];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <header>
        <Badge tone="accent">{triage.company}</Badge>
        <h1 className="mt-2 text-2xl font-semibold">{triage.title}</h1>
        <p className="mt-2 max-w-prose text-muted">{triage.intro}</p>
      </header>

      <div className="card">
        <h2 className="text-sm font-semibold">What it will and will not tell you</h2>
        <ul className="mt-2 grid gap-1 text-sm text-muted">
          <li>It orders next steps from Velaqori’s own guidance — it does not assess your systems.</li>
          <li>It does not promise response times or prices, and cannot confirm whether a breach happened.</li>
          <li>For anything live, use the contact form: a person decides scope and timing.</li>
        </ul>
      </div>

      <AssistantChat
        name={triage.name}
        title={triage.title}
        intro={triage.intro}
        scope={triage.scope}
        starters={triage.starters}
      />
    </div>
  );
}
