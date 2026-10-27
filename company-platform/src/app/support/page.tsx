import type { Metadata } from 'next';

import { AssistantChat } from '@/components/assistant-chat';
import { Badge } from '@/components/ui';
import { ASSISTANTS } from '@/content/assistants';
import { FLOWS } from '@/content/flows';

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

      <section className="card" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-sm font-semibold">
          How this assistant works
        </h2>
        <p className="mt-1 text-xs text-muted">
          These are the steps below, in this order, and they are the ones the request actually runs — the settings
          shown here are the settings used.
        </p>
        <ol className="mt-2 grid gap-1 pl-5 text-sm text-muted" style={{ listStyle: 'decimal' }}>
          {FLOWS['velaqori-triage'].nodes.map((node) => (
            <li key={node.id}>
              <span className="font-medium text-ink">{node.label}</span> — {node.kind}
            </li>
          ))}
        </ol>
      </section>

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
