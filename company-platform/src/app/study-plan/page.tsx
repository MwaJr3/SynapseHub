import type { Metadata } from 'next';

import { AssistantChat } from '@/components/assistant-chat';
import { TesseraConnection } from '@/components/tessera-connection';
import { Badge } from '@/components/ui';
import { ASSISTANTS } from '@/content/assistants';
import { FLOWS } from '@/content/flows';

export const metadata: Metadata = {
  title: 'Study planning — Tamuzi Learning',
  description: 'Shape a realistic study week from Tamuzi Learning’s published study principles.',
};

const planner = ASSISTANTS['tamuzi-study-plan'];

export default function StudyPlanPage() {
  return (
    <div className="space-y-6">
      <header>
        <Badge tone="accent">{planner.company}</Badge>
        <h1 className="mt-2 text-2xl font-semibold">{planner.title}</h1>
        <p className="mt-2 max-w-prose text-muted">{planner.intro}</p>
      </header>

      <div className="card">
        <h2 className="text-sm font-semibold">What it will and will not tell you</h2>
        <ul className="mt-2 grid gap-1 text-sm text-muted">
          <li>It builds a plan from the study principles published on this site.</li>
          <li>
            It does not know your grades, timetable or progress unless you connect Tessera, and it
            will not invent what it does not have.
          </li>
          <li>It cannot enrol you in anything or promise an outcome. You decide what to keep.</li>
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
          {FLOWS['tamuzi-study-plan'].nodes.map((node) => (
            <li key={node.id}>
              <span className="font-medium text-ink">{node.label}</span> — {node.kind}
            </li>
          ))}
        </ol>
      </section>

      <TesseraConnection />

      <AssistantChat
        name={planner.name}
        title={planner.title}
        intro={planner.intro}
        scope={planner.scope}
        starters={planner.starters}
      />
    </div>
  );
}
