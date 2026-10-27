/**
 * State machine studio — pick a component kind and inspect its complete state
 * matrix (behavior, entry, feedback, ARIA, recovery, persistence), canonical
 * transitions and the coverage gap against declared states.
 */
import { useMemo, useState } from 'react';
import {
  buildStateMatrix,
  requiredStatesFor,
  type ComponentKind,
  type CoreState,
} from '@/features/ux-engine';
import { cn } from '@/lib/cn';

const KINDS: ComponentKind[] = [
  'button',
  'text-field',
  'form',
  'modal',
  'sheet',
  'toast',
  'table',
  'card',
  'tabs',
  'dropdown',
  'nav',
  'search',
  'upload',
  'slider',
  'toggle',
  'rating',
  'wizard',
  'pagination',
  'accordion',
  'date-picker',
  'otp',
  'command-palette',
  'filter',
  'generic',
];

const ALL_STATES: CoreState[] = [
  'default',
  'hover',
  'focus-visible',
  'pressed',
  'selected',
  'disabled',
  'loading',
  'optimistic',
  'success',
  'error',
  'offline',
  'empty',
  'permission',
  'destructive',
];

export function StateMatrixView() {
  const [kind, setKind] = useState<ComponentKind>('button');
  const [declared, setDeclared] = useState<string[]>(
    requiredStatesFor('button'),
  );
  const [optimistic, setOptimistic] = useState(false);
  const [destructive, setDestructive] = useState(false);
  const [offline, setOffline] = useState(false);

  const matrix = useMemo(
    () =>
      buildStateMatrix(kind, declared, {
        optimistic,
        destructive,
        offlineQueue: offline,
      }),
    [kind, declared, optimistic, destructive, offline],
  );

  const changeKind = (next: ComponentKind) => {
    setKind(next);
    setDeclared(requiredStatesFor(next));
  };

  const toggleDeclared = (state: string) =>
    setDeclared((current) =>
      current.includes(state)
        ? current.filter((item) => item !== state)
        : [...current, state],
    );

  return (
    <div className="space-y-8">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <label className="text-sm text-ink-muted">
          Component kind
          <select
            className="mt-2 w-full rounded-card border border-line-strong bg-surface-raised px-3 py-2.5 text-sm text-ink"
            value={kind}
            onChange={(event) =>
              changeKind(event.target.value as ComponentKind)
            }
          >
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Capabilities
          </legend>
          <div className="flex flex-wrap gap-2">
            <CapabilityChip
              active={optimistic}
              onClick={() => setOptimistic((v) => !v)}
              label="optimistic writes"
            />
            <CapabilityChip
              active={destructive}
              onClick={() => setDestructive((v) => !v)}
              label="destructive action"
            />
            <CapabilityChip
              active={offline}
              onClick={() => setOffline((v) => !v)}
              label="offline queue"
            />
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend className="mb-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
          States declared in the descriptor — missing states are flagged below
        </legend>
        <div className="flex flex-wrap gap-2">
          {ALL_STATES.map((state) => {
            const active = declared.includes(state);
            const required = matrix.requiredStates.includes(state);
            return (
              <button
                key={state}
                type="button"
                aria-pressed={active}
                onClick={() => toggleDeclared(state)}
                className={cn(
                  'chip chip-interactive',
                  active && 'chip-active',
                  !active && required && 'border-caution/60 text-caution',
                )}
                title={
                  required
                    ? 'Required for this component'
                    : 'Optional for this component'
                }
              >
                {state}
                {required && !active && ' · required'}
              </button>
            );
          })}
        </div>
      </fieldset>

      {matrix.missing.length > 0 ? (
        <p
          className="rounded-card border border-caution/50 bg-caution/[0.07] p-4 text-sm text-ink"
          role="status"
        >
          Coverage gap — missing required {matrix.missing.length}:{' '}
          <strong>{matrix.missing.join(', ')}</strong>
        </p>
      ) : (
        <p
          className="rounded-card border border-emerald-500/40 bg-emerald-500/[0.07] p-4 text-sm text-ink"
          role="status"
        >
          All {matrix.requiredStates.length} required states are declared.
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[46rem] text-left text-xs">
          <thead className="bg-panel-strong font-mono text-2xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Minimum behavior</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">ARIA</th>
              <th className="px-4 py-3">Recovery</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.state} className="border-t border-line align-top">
                <th
                  scope="row"
                  className="whitespace-nowrap px-4 py-3 font-semibold text-ink"
                >
                  {row.state}
                </th>
                <td className="px-4 py-3 text-ink-muted">
                  {row.minimumBehavior}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {row.entryConditions}
                </td>
                <td className="px-4 py-3 text-ink-muted">{row.aria}</td>
                <td className="px-4 py-3 text-ink-muted">{row.recovery}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="ux-transitions">
        <h3 id="ux-transitions" className="mb-3 text-sm font-semibold text-ink">
          Canonical transitions
        </h3>
        <ul className="grid gap-2 md:grid-cols-2">
          {matrix.transitions.map((transition, index) => (
            <li
              key={`${transition.from}-${transition.to}-${index}`}
              className="rounded-card border border-line bg-panel p-3 text-xs text-ink-muted"
            >
              <span className="font-mono text-accent">
                {transition.from} → {transition.to}
              </span>
              <p className="mt-1">
                {transition.trigger}
                {transition.guard ? ` · guard: ${transition.guard}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CapabilityChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('chip chip-interactive', active && 'chip-active')}
    >
      {label}
    </button>
  );
}
