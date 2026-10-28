/**
 * Live audit lab — manipulate a component descriptor and watch the engine
 * re-audit it on every change. Every control maps to a real descriptor field,
 * so the verdicts are the same deterministic checks the CI-facing commands
 * run; the lab simply makes them observable.
 */
import { useMemo, useState } from 'react';
import {
  auditScreen,
  checkContrast,
  LAB_DEFAULT,
  type ComponentDescriptor,
  type ComponentKind,
  type LoadingStrategy,
  type ScreenDescriptor,
} from '@/features/ux-engine';
import { cn } from '@/lib/cn';
import { FindingsList } from './FindingsList';
import { ScoreGauge, SeverityBadge, Toggle } from './presenters';

const STATE_OPTIONS = [
  'default',
  'hover',
  'focus-visible',
  'pressed',
  'disabled',
  'loading',
  'optimistic',
  'success',
  'error',
  'offline',
  'empty',
  'destructive',
] as const;

const KIND_OPTIONS: ComponentKind[] = [
  'button',
  'text-field',
  'form',
  'modal',
  'toast',
  'table',
  'card',
  'toggle',
  'search',
  'upload',
  'tabs',
  'generic',
];

interface LabConfig {
  kind: ComponentKind;
  foreground: string;
  background: string;
  textSizePx: number;
  bold: boolean;
  touchTargetPx: number;
  motionDurationMs: number;
  feedbackMs: number;
  focusVisible: boolean;
  keyboardOperable: boolean;
  hoverOnlyAction: boolean;
  hasAccessibleName: boolean;
  reducedMotionSupported: boolean;
  loadingStrategy: LoadingStrategy;
  destructive: boolean;
  undoAvailable: boolean;
  validationTiming: 'blur-first' | 'on-change' | 'on-submit-only' | 'none';
  labelsVisible: boolean;
  errorHasRecovery: boolean;
  declaredStates: string[];
}

const INITIAL: LabConfig = {
  kind: 'button',
  foreground: LAB_DEFAULT.foreground,
  background: LAB_DEFAULT.background,
  textSizePx: LAB_DEFAULT.textSizePx,
  bold: LAB_DEFAULT.bold,
  touchTargetPx: LAB_DEFAULT.touchTargetPx,
  motionDurationMs: LAB_DEFAULT.motionDurationMs,
  feedbackMs: LAB_DEFAULT.feedbackMs,
  focusVisible: LAB_DEFAULT.focusVisible,
  keyboardOperable: LAB_DEFAULT.keyboardOperable,
  hoverOnlyAction: LAB_DEFAULT.hoverOnlyAction,
  hasAccessibleName: LAB_DEFAULT.hasAccessibleName,
  reducedMotionSupported: LAB_DEFAULT.reducedMotionSupported,
  loadingStrategy: LAB_DEFAULT.loadingStrategy,
  destructive: LAB_DEFAULT.destructive,
  undoAvailable: LAB_DEFAULT.undoAvailable,
  validationTiming: LAB_DEFAULT.validationTiming,
  labelsVisible: LAB_DEFAULT.labelsVisible,
  errorHasRecovery: true,
  declaredStates: [...LAB_DEFAULT.declaredStates],
};

function toScreen(config: LabConfig): ScreenDescriptor {
  const hasState = (state: string) => config.declaredStates.includes(state);
  const component: ComponentDescriptor = {
    id: 'lab-component',
    kind: config.kind,
    label: 'Lab component',
    foreground: config.foreground,
    background: config.background,
    textSizePx: config.textSizePx,
    bold: config.bold,
    touchTargetPx: config.touchTargetPx,
    motionDurationMs: config.motionDurationMs,
    feedbackMs: config.feedbackMs,
    focusVisible: config.focusVisible,
    keyboardOperable: config.keyboardOperable,
    hoverOnlyAction: config.hoverOnlyAction,
    hasAccessibleName: config.hasAccessibleName,
    loadingStrategy: config.loadingStrategy,
    destructive: config.destructive || hasState('destructive'),
    undoAvailable: config.undoAvailable,
    optimistic: hasState('optimistic'),
    rollback: hasState('optimistic'),
    validationTiming: config.validationTiming,
    labelsVisible: config.labelsVisible,
    errorHasRecovery: hasState('error') ? config.errorHasRecovery : undefined,
    emptyStateKind: hasState('empty') ? 'first-run' : undefined,
    emptyStateHasAction: hasState('empty') ? true : undefined,
    declaredStates: config.declaredStates,
  };

  return {
    id: 'lab-screen',
    name: 'Live audit lab',
    route: '/ux-engine/lab',
    user: 'Studio visitor',
    goal: 'Observe how each design decision changes the deterministic UX verdict',
    tasks: [
      'Configure the component',
      'Read the findings',
      'Apply the remediation',
    ],
    pointer: 'both',
    hover: 'both',
    reducedMotionSupported: config.reducedMotionSupported,
    viewports: ['mobile', 'tablet', 'desktop'],
    components: [component],
    competingPrimaryActions: 1,
    urlState: true,
  };
}

export function AuditLab() {
  const [config, setConfig] = useState<LabConfig>(INITIAL);
  const update = <K extends keyof LabConfig>(key: K, value: LabConfig[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));

  const toggleState = (state: string) =>
    setConfig((current) => ({
      ...current,
      declaredStates: current.declaredStates.includes(state)
        ? current.declaredStates.filter((item) => item !== state)
        : [...current.declaredStates, state],
    }));

  const screen = useMemo(() => toScreen(config), [config]);
  const report = useMemo(() => auditScreen(screen), [screen]);
  const contrast = useMemo(
    () =>
      checkContrast(config.foreground, config.background, {
        textSizePx: config.textSizePx,
        bold: config.bold,
      }),
    [config.foreground, config.background, config.textSizePx, config.bold],
  );

  const presets: Array<{ label: string; apply: () => void }> = [
    {
      label: 'Reset to flawed',
      apply: () => setConfig(INITIAL),
    },
    {
      label: 'Apply all remediations',
      apply: () =>
        setConfig({
          ...INITIAL,
          foreground: '#ffffff',
          background: '#2547d6',
          bold: true,
          touchTargetPx: 48,
          motionDurationMs: 150,
          feedbackMs: 80,
          focusVisible: true,
          hoverOnlyAction: false,
          reducedMotionSupported: true,
          loadingStrategy: 'spinner',
          validationTiming: 'blur-first',
          declaredStates: [
            'default',
            'hover',
            'focus-visible',
            'pressed',
            'disabled',
            'loading',
            'success',
            'error',
          ],
        }),
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* --- Controls ----------------------------------------------------- */}
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="btn btn-secondary px-3 py-2 text-xs"
              onClick={preset.apply}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <fieldset className="rounded-card border border-line bg-panel p-4">
          <legend className="px-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Component
          </legend>
          <label className="mb-4 block text-sm">
            <span className="mb-1 block text-ink-muted">Component kind</span>
            <select
              className="w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-2 text-sm"
              value={config.kind}
              onChange={(event) =>
                update('kind', event.target.value as ComponentKind)
              }
            >
              {KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="Foreground"
              value={config.foreground}
              onChange={(value) => update('foreground', value)}
            />
            <ColorField
              label="Background"
              value={config.background}
              onChange={(value) => update('background', value)}
            />
          </div>
          <p
            className={cn(
              'mt-2 font-mono text-2xs',
              contrast.ratio >= contrast.required
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-500',
            )}
          >
            contrast {contrast.ratio}:1 · needs {contrast.required}:1 ·{' '}
            {contrast.ratio >= contrast.required ? 'pass' : 'fail'}
          </p>

          <RangeField
            label="Touch target"
            value={config.touchTargetPx}
            min={24}
            max={64}
            step={2}
            unit="px"
            onChange={(value) => update('touchTargetPx', value)}
          />
          <RangeField
            label="Text size"
            value={config.textSizePx}
            min={12}
            max={32}
            step={1}
            unit="px"
            onChange={(value) => update('textSizePx', value)}
          />
          <RangeField
            label="Motion duration"
            value={config.motionDurationMs}
            min={0}
            max={800}
            step={10}
            unit="ms"
            onChange={(value) => update('motionDurationMs', value)}
          />
          <RangeField
            label="Feedback latency"
            value={config.feedbackMs}
            min={0}
            max={1500}
            step={20}
            unit="ms"
            onChange={(value) => update('feedbackMs', value)}
          />

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-ink-muted">
              Loading strategy
              <select
                className="mt-1 w-full rounded-lg border border-line-strong bg-surface-raised px-2 py-2 text-xs"
                value={config.loadingStrategy}
                onChange={(event) =>
                  update(
                    'loadingStrategy',
                    event.target.value as LoadingStrategy,
                  )
                }
              >
                {(
                  [
                    'none',
                    'spinner',
                    'skeleton',
                    'progress',
                    'optimistic',
                  ] as LoadingStrategy[]
                ).map((strategy) => (
                  <option key={strategy} value={strategy}>
                    {strategy}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-muted">
              Validation timing
              <select
                className="mt-1 w-full rounded-lg border border-line-strong bg-surface-raised px-2 py-2 text-xs"
                value={config.validationTiming}
                onChange={(event) =>
                  update(
                    'validationTiming',
                    event.target.value as LabConfig['validationTiming'],
                  )
                }
              >
                {(
                  ['blur-first', 'on-change', 'on-submit-only', 'none'] as const
                ).map((timing) => (
                  <option key={timing} value={timing}>
                    {timing}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-card border border-line bg-panel p-4">
          <legend className="px-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Capabilities
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              checked={config.focusVisible}
              onChange={(value) => update('focusVisible', value)}
              label="Visible focus ring"
              hint="A11Y-FOCUS-01"
            />
            <Toggle
              checked={config.keyboardOperable}
              onChange={(value) => update('keyboardOperable', value)}
              label="Keyboard operable"
              hint="A11Y-KEYBOARD-01"
            />
            <Toggle
              checked={config.hoverOnlyAction}
              onChange={(value) => update('hoverOnlyAction', value)}
              label="Hover-only action"
              hint="RESP-HOVER-01"
            />
            <Toggle
              checked={config.hasAccessibleName}
              onChange={(value) => update('hasAccessibleName', value)}
              label="Accessible name"
              hint="A11Y-NAME-01"
            />
            <Toggle
              checked={config.reducedMotionSupported}
              onChange={(value) => update('reducedMotionSupported', value)}
              label="Reduced-motion fallback"
              hint="MOTION-REDUCED-01"
            />
            <Toggle
              checked={config.labelsVisible}
              onChange={(value) => update('labelsVisible', value)}
              label="Visible labels"
              hint="FORM-LABEL-01"
            />
            <Toggle
              checked={config.destructive}
              onChange={(value) => update('destructive', value)}
              label="Destructive action"
              hint="STATE-DESTRUCTIVE-01"
            />
            <Toggle
              checked={config.undoAvailable}
              onChange={(value) => update('undoAvailable', value)}
              label="Undo available"
              hint="SYSTEM-UNDO-01"
            />
          </div>
        </fieldset>

        <fieldset className="rounded-card border border-line bg-panel p-4">
          <legend className="px-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Declared states
          </legend>
          <div className="flex flex-wrap gap-2">
            {STATE_OPTIONS.map((state) => {
              const active = config.declaredStates.includes(state);
              return (
                <button
                  key={state}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleState(state)}
                  className={cn(
                    'chip chip-interactive',
                    active && 'chip-active',
                  )}
                >
                  {state}
                </button>
              );
            })}
          </div>
          {config.declaredStates.includes('error') && (
            <div className="mt-3">
              <Toggle
                checked={config.errorHasRecovery}
                onChange={(value) => update('errorHasRecovery', value)}
                label="Error state offers a recovery action"
                hint="CONTENT-ERROR-01"
              />
            </div>
          )}
        </fieldset>
      </div>

      {/* --- Live report -------------------------------------------------- */}
      <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-card border border-line bg-panel p-5">
          <p className="eyebrow mb-4">Live preview</p>
          <div className="grid place-items-center rounded-xl border border-line bg-surface-raised p-8">
            <button
              type="button"
              aria-label={
                config.hasAccessibleName ? 'Preview action' : undefined
              }
              className="inline-flex items-center justify-center rounded-pill px-5"
              style={{
                backgroundColor: config.background,
                color: config.foreground,
                minWidth: config.touchTargetPx,
                minHeight: config.touchTargetPx,
                fontSize: config.textSizePx,
                fontWeight: config.bold ? 700 : 500,
                transitionDuration: `${config.motionDurationMs}ms`,
              }}
            >
              Preview action
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <ScoreGauge score={report.score} grade={report.grade} />
            <div className="flex gap-2">
              {(['critical', 'major', 'minor', 'nice'] as const).map(
                (severity) => (
                  <span
                    key={severity}
                    className="flex flex-col items-center gap-1"
                  >
                    <SeverityBadge severity={severity} />
                    <span className="font-mono text-sm text-ink">
                      {report.counts[severity]}
                    </span>
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        {report.topFixes.length > 0 && (
          <div className="rounded-card border border-caution/40 bg-caution/[0.06] p-5">
            <p className="mb-3 text-sm font-semibold text-ink">
              Top three fixes
            </p>
            <ol className="space-y-2">
              {report.topFixes.map((finding, index) => (
                <li
                  key={finding.id}
                  className="flex gap-3 text-sm text-ink-muted"
                >
                  <span className="font-mono text-ink-subtle">
                    {index + 1}.
                  </span>
                  <span>
                    <strong className="text-ink">{finding.ruleId}</strong> —{' '}
                    {finding.remediation}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <FindingsList report={report} />
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-ink-muted">
      {label}
      <span className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface-raised px-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={`${label} colour picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent font-mono text-xs text-ink"
          aria-label={`${label} hex value`}
        />
      </span>
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mt-4 block text-xs text-ink-muted">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-mono text-ink">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-[rgb(var(--accent))]"
      />
    </label>
  );
}
