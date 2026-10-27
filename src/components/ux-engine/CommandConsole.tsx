/**
 * Command console — runs the blueprint slash commands against the worked
 * fixtures and free-text pattern queries, rendering the structured sections,
 * generated code and audit reports the engine returns.
 */
import { useMemo, useState } from 'react';
import {
  COMMAND_SUMMARIES,
  FLAWED_CHECKOUT,
  POLISHED_CHECKOUT,
  uxAudit,
  uxDesign,
  uxPattern,
  uxReview,
  uxTest,
  type CommandName,
  type CommandResult,
  type ScreenDescriptor,
} from '@/features/ux-engine';
import { cn } from '@/lib/cn';
import {
  CodeBlock,
  MarkdownLite,
  ScoreGauge,
  SeverityBadge,
} from './presenters';
import { FindingsList } from './FindingsList';

type FixtureId = 'flawed' | 'polished';

const FIXTURES: Record<FixtureId, ScreenDescriptor> = {
  flawed: FLAWED_CHECKOUT,
  polished: POLISHED_CHECKOUT,
};

const SCREEN_COMMANDS: Array<{
  name: CommandName;
  run: (screen: ScreenDescriptor) => CommandResult;
}> = [
  { name: 'ux-review', run: uxReview },
  { name: 'ux-audit', run: uxAudit },
  { name: 'ux-test', run: uxTest },
];

export function CommandConsole() {
  const [fixtureId, setFixtureId] = useState<FixtureId>('flawed');
  const [lastCommand, setLastCommand] = useState<CommandName>('ux-audit');
  const [result, setResult] = useState<CommandResult>(() =>
    uxAudit(FLAWED_CHECKOUT),
  );
  const [patternQuery, setPatternQuery] = useState('modal overlay focus trap');
  const [activePattern, setActivePattern] = useState<CommandResult>(() =>
    uxPattern({ text: 'modal overlay focus trap', limit: 5 }),
  );

  const runCommand = (
    name: CommandName,
    nextFixture: FixtureId = fixtureId,
  ) => {
    const command = SCREEN_COMMANDS.find((entry) => entry.name === name);
    if (!command) return;
    setLastCommand(name);
    setResult(command.run(FIXTURES[nextFixture]));
  };

  const switchFixture = (nextFixture: FixtureId) => {
    setFixtureId(nextFixture);
    runCommand(lastCommand, nextFixture);
  };
  const designSpec = useMemo(
    () =>
      uxDesign({
        name: 'Team invite flow',
        route: '/invite',
        user: 'Workspace admin',
        goal: 'Invite teammates and confirm acceptance',
        tasks: ['Enter emails', 'Pick roles', 'Send invites'],
        componentKinds: ['form', 'button', 'toast'],
      }),
    [],
  );

  return (
    <div className="space-y-8">
      <section aria-labelledby="console-screen">
        <h3 id="console-screen" className="text-sm font-semibold text-ink">
          Screen commands — /ux-review · /ux-audit · /ux-test
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          {COMMAND_SUMMARIES['ux-audit']}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-pill border border-line bg-panel p-1"
            role="group"
            aria-label="Choose fixture screen"
          >
            {(['flawed', 'polished'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => switchFixture(id)}
                aria-pressed={fixtureId === id}
                className={cn(
                  'rounded-pill px-4 py-2 text-xs font-medium transition-colors',
                  fixtureId === id
                    ? 'bg-accent text-accent-ink'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {id} checkout
              </button>
            ))}
          </div>
          {SCREEN_COMMANDS.map((command) => (
            <button
              key={command.name}
              type="button"
              className="btn btn-secondary px-3.5 py-2 text-xs"
              onClick={() => runCommand(command.name)}
            >
              /{command.name}
            </button>
          ))}
        </div>

        <CommandResultView result={result} includeReport />
      </section>

      <section aria-labelledby="console-pattern">
        <h3 id="console-pattern" className="text-sm font-semibold text-ink">
          /ux-pattern — retrieve, explain trade-offs, generate a rule set
        </h3>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setActivePattern(uxPattern({ text: patternQuery, limit: 5 }));
          }}
        >
          <label htmlFor="pattern-query" className="sr-only">
            UI problem to match against the 76-pattern library
          </label>
          <input
            id="pattern-query"
            type="search"
            value={patternQuery}
            onChange={(event) => setPatternQuery(event.target.value)}
            className="min-w-[16rem] flex-1 rounded-card border border-line-strong bg-surface-raised px-4 py-2.5 text-sm"
            placeholder="Describe the UI problem…"
          />
          <button type="submit" className="btn btn-primary px-4 py-2.5 text-sm">
            Retrieve patterns
          </button>
        </form>
        <CommandResultView result={activePattern} />
      </section>

      <section aria-labelledby="console-design">
        <h3 id="console-design" className="text-sm font-semibold text-ink">
          /ux-design — implementation-ready specification (worked example)
        </h3>
        <CommandResultView result={designSpec} />
      </section>
    </div>
  );
}

function CommandResultView({
  result,
  includeReport = false,
}: {
  result: CommandResult;
  includeReport?: boolean;
}) {
  return (
    <div className="mt-5 rounded-card border border-line bg-panel p-5 sm:p-6">
      <p className="font-mono text-2xs uppercase tracking-[0.14em] text-accent">
        /{result.command}
      </p>
      <h4 className="mt-1 text-base font-semibold text-ink">{result.title}</h4>

      {result.report && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface-raised p-4">
          <ScoreGauge score={result.report.score} grade={result.report.grade} />
          <div className="flex gap-2">
            {(['critical', 'major', 'minor', 'nice'] as const).map(
              (severity) => (
                <span
                  key={severity}
                  className="flex flex-col items-center gap-1"
                >
                  <SeverityBadge severity={severity} />
                  <span className="font-mono text-sm text-ink">
                    {result.report!.counts[severity]}
                  </span>
                </span>
              ),
            )}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-6">
        {result.sections
          .filter((section) => section.body.length > 0)
          .map((section) => (
            <section key={section.heading}>
              <h5 className="mb-2 text-sm font-semibold text-ink">
                {section.heading}
              </h5>
              <MarkdownLite text={section.body} />
            </section>
          ))}
      </div>

      {result.code && (
        <div className="mt-6 space-y-4">
          {result.code.map((artifact) => (
            <CodeBlock
              key={artifact.label}
              label={artifact.label}
              language={artifact.language}
              content={artifact.content}
            />
          ))}
        </div>
      )}

      {includeReport && result.report && (
        <div className="mt-6 border-t border-line pt-6">
          <FindingsList report={result.report} />
        </div>
      )}

      {result.patternIds.length > 0 && (
        <p className="mono-meta mt-6 border-t border-line pt-4">
          Traceability: {result.patternIds.join(' · ')}
        </p>
      )}
    </div>
  );
}
