import type { Metadata } from 'next';

import { AssistantChat } from '@/components/assistant-chat';
import { Badge } from '@/components/ui';
import { ASSISTANTS } from '@/content/assistants';

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
          <li>It does not know your grades, timetable or progress, and will not invent them.</li>
          <li>It cannot enrol you in anything or promise an outcome. You decide what to keep.</li>
        </ul>
      </div>

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
