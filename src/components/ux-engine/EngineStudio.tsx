/**
 * UX engine studio — tabbed workspace exposing every engine layer:
 * live audit lab, the 76-pattern knowledge layer, the state-machine studio,
 * the design-system/token studio and the slash-command console.
 */
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { AuditLab } from './AuditLab';
import { PatternLibrary } from './PatternLibrary';
import { StateMatrixView } from './StateMatrixView';
import { TokenSystemView } from './TokenSystemView';
import { CommandConsole } from './CommandConsole';

type StudioTab = 'lab' | 'patterns' | 'states' | 'system' | 'console';

const TABS: Array<{ id: StudioTab; label: string; blurb: string }> = [
  {
    id: 'lab',
    label: 'Audit lab',
    blurb: 'Live deterministic audit of a configurable component',
  },
  {
    id: 'patterns',
    label: 'Pattern library',
    blurb: 'All 76 patterns with rules, evidence and trade-offs',
  },
  {
    id: 'states',
    label: 'State matrix',
    blurb: 'Fourteen-state models, transitions and coverage gaps',
  },
  {
    id: 'system',
    label: 'Design system',
    blurb: 'Token graph, scales, restyle and framework adapters',
  },
  {
    id: 'console',
    label: 'Command console',
    blurb: '/ux-review, /ux-audit, /ux-test, /ux-pattern, /ux-design',
  },
];

export function EngineStudio() {
  const [tab, setTab] = useState<StudioTab>('lab');

  return (
    <div>
      <div className="overflow-x-auto border-b border-line pb-px">
        <div
          className="flex min-w-max gap-1"
          role="tablist"
          aria-label="UX engine studio sections"
        >
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`ux-tab-${entry.id}`}
              aria-selected={tab === entry.id}
              aria-controls={`ux-panel-${entry.id}`}
              onClick={() => setTab(entry.id)}
              className={cn(
                'rounded-t-card border-b-2 px-4 py-3 text-left text-sm transition-colors',
                tab === entry.id
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              <span className="block font-medium">{entry.label}</span>
              <span className="mt-0.5 hidden max-w-[12rem] text-2xs text-ink-subtle sm:block">
                {entry.blurb}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-10">
        {TABS.map((entry) => (
          <div
            key={entry.id}
            role="tabpanel"
            id={`ux-panel-${entry.id}`}
            aria-labelledby={`ux-tab-${entry.id}`}
            hidden={tab !== entry.id}
          >
            {entry.id === 'lab' && <AuditLab />}
            {entry.id === 'patterns' && <PatternLibrary />}
            {entry.id === 'states' && <StateMatrixView />}
            {entry.id === 'system' && <TokenSystemView />}
            {entry.id === 'console' && <CommandConsole />}
          </div>
        ))}
      </div>
    </div>
  );
}
