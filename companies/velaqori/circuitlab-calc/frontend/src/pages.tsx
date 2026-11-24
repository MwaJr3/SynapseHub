import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type CalcResult, type User } from './api';
import { formatValue } from './utils';
import { BlurFade } from './decor';
import { downloadText, toCsv } from './export';
import { Card, ConfirmButton, EmptyState, ErrorBanner, Field, Loading } from './ui';

type ToolId = 'ohm' | 'power' | 'network' | 'divider' | 'two-mesh' | 'convert';

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'ohm', label: "Ohm's law" },
  { id: 'power', label: 'Power' },
  { id: 'network', label: 'Series / parallel' },
  { id: 'divider', label: 'Voltage divider' },
  { id: 'two-mesh', label: 'Two-mesh solver' },
  { id: 'convert', label: 'Unit conversion' },
];

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <input className="input" type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function ResultPanel({ result, onSave }: { result: CalcResult; onSave: (name: string) => void }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
      <div className="text-lg font-medium text-amber-200">{formatValue(result.value, result.unit)}</div>
      {result.assumption ? <p className="mt-1 text-xs text-amber-300/80">{result.assumption}</p> : null}
      <details open className="mt-2">
        <summary className="cursor-pointer text-sm text-slate-300">Working steps & formulas</summary>
        <ul className="mt-2 space-y-1">
          {result.steps.map((step, i) => (
            <li key={i} className="font-mono text-xs text-slate-400">
              {step}
            </li>
          ))}
        </ul>
      </details>
      <button
        className="btn-ghost mt-3"
        onClick={() => {
          const name = window.prompt('Name this calculation:');
          if (name) onSave(name);
        }}
      >
        Save this calculation
      </button>
    </div>
  );
}

export function CalculatorPage() {
  const [tool, setTool] = useState<ToolId>('ohm');
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState('');
  const [ohmKnown, setOhmKnown] = useState('v');
  const [powerKnown, setPowerKnown] = useState('vi');
  const [networkKind, setNetworkKind] = useState('series');
  const [f, setF] = useState<Record<string, string>>({});
  const set = (key: string) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));

  const run = async (endpoint: string, body: unknown) => {
    setError('');
    setResult(null);
    try {
      setResult(await api.calc(endpoint, body));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Calculation failed.');
    }
  };

  const num = (key: string) => (f[key] === undefined || f[key] === '' ? null : Number(f[key]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Calculators</h1>
      <div className="flex flex-wrap gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTool(t.id);
              setResult(null);
              setError('');
            }}
            className={`rounded-lg px-3 py-2 text-sm ${
              tool === t.id ? 'bg-amber-950 text-amber-200' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      <Card title={TOOLS.find((t) => t.id === tool)?.label ?? ''}>
        <form
          onSubmit={(e) => e.preventDefault()}
        >
        {tool === 'ohm' ? (
          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Solve for">
              <select className="input" value={ohmKnown} onChange={(e) => setOhmKnown(e.target.value)}>
                <option value="v">Voltage V</option>
                <option value="i">Current I</option>
                <option value="r">Resistance R</option>
              </select>
            </Field>
            {ohmKnown !== 'v' ? <NumField label="Voltage (V)" value={f.voltage_v ?? ''} onChange={set('voltage_v')} /> : null}
            {ohmKnown !== 'i' ? <NumField label="Current (A)" value={f.current_a ?? ''} onChange={set('current_a')} /> : null}
            {ohmKnown !== 'r' ? <NumField label="Resistance (ohm)" value={f.resistance_ohm ?? ''} onChange={set('resistance_ohm')} /> : null}
            <button
              type="submit"
              className="btn-primary justify-center"
              onClick={() => run('ohm', { known: ohmKnown, voltage_v: num('voltage_v'), current_a: num('current_a'), resistance_ohm: num('resistance_ohm') })}
            >
              Calculate
            </button>
          </div>
        ) : null}
        {tool === 'power' ? (
          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Known pair">
              <select className="input" value={powerKnown} onChange={(e) => setPowerKnown(e.target.value)}>
                <option value="vi">V and I</option>
                <option value="ir">I and R</option>
                <option value="vr">V and R</option>
              </select>
            </Field>
            {powerKnown !== 'vi' ? <NumField label="Voltage (V)" value={f.voltage_v ?? ''} onChange={set('voltage_v')} /> : null}
            {powerKnown !== 'vr' ? <NumField label="Current (A)" value={f.current_a ?? ''} onChange={set('current_a')} /> : null}
            {powerKnown !== 'ir' ? <NumField label="Resistance (ohm)" value={f.resistance_ohm ?? ''} onChange={set('resistance_ohm')} /> : null}
            <button
              type="submit"
              className="btn-primary justify-center"
              onClick={() => run('power', { known: powerKnown, voltage_v: num('voltage_v'), current_a: num('current_a'), resistance_ohm: num('resistance_ohm') })}
            >
              Calculate
            </button>
          </div>
        ) : null}
        {tool === 'network' ? (
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Connection">
              <select className="input" value={networkKind} onChange={(e) => setNetworkKind(e.target.value)}>
                <option value="series">Series</option>
                <option value="parallel">Parallel</option>
              </select>
            </Field>
            <Field label="Resistors (comma-separated, ohm)">
              <input
                className="input"
                placeholder="100, 220"
                value={f.resistors ?? ''}
                onChange={(e) => set('resistors')(e.target.value)}
              />
            </Field>
            <button
              type="submit"
              className="btn-primary justify-center"
              onClick={() => {
                const list = (f.resistors ?? '')
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n));
                void run('network', { kind: networkKind, resistors: list });
              }}
            >
              Calculate
            </button>
          </div>
        ) : null}
        {tool === 'divider' ? (
          <div className="grid gap-3 md:grid-cols-5">
            <NumField label="Supply (V)" value={f.supply_v ?? ''} onChange={set('supply_v')} />
            <NumField label="R1 (ohm)" value={f.r1 ?? ''} onChange={set('r1')} />
            <NumField label="R2 (ohm)" value={f.r2 ?? ''} onChange={set('r2')} />
            <button
              type="submit"
              className="btn-primary justify-center"
              onClick={() => run('divider', { supply_v: num('supply_v'), r1: num('r1'), r2: num('r2') })}
            >
              Calculate
            </button>
          </div>
        ) : null}
        {tool === 'two-mesh' ? (
          <div className="grid gap-3 md:grid-cols-6">
            <NumField label="V1 (V)" value={f.v1 ?? ''} onChange={set('v1')} />
            <NumField label="V2 (V)" value={f.v2 ?? ''} onChange={set('v2')} />
            <NumField label="R1 (ohm)" value={f.r1 ?? ''} onChange={set('r1')} />
            <NumField label="R2 (ohm)" value={f.r2 ?? ''} onChange={set('r2')} />
            <NumField label="R3 (ohm)" value={f.r3 ?? ''} onChange={set('r3')} />
            <button
              type="submit"
              className="btn-primary justify-center"
              onClick={() => run('two-mesh', { v1: num('v1'), v2: num('v2'), r1: num('r1'), r2: num('r2'), r3: num('r3') })}
            >
              Calculate
            </button>
          </div>
        ) : null}
        {tool === 'convert' ? (
          <div className="grid gap-3 md:grid-cols-6">
            <NumField label="Value" value={f.value ?? ''} onChange={set('value')} />
            <Field label="Quantity">
              <select className="input" value={f.kind ?? 'V'} onChange={(e) => set('kind')(e.target.value)}>
                <option value="V">Voltage</option>
                <option value="A">Current</option>
                <option value="R">Resistance</option>
                <option value="P">Power</option>
                <option value="F">Frequency</option>
              </select>
            </Field>
            <Field label="From unit">
              <input className="input" placeholder="kohm" value={f.from_unit ?? ''} onChange={(e) => set('from_unit')(e.target.value)} />
            </Field>
            <Field label="To unit">
              <input className="input" placeholder="ohm" value={f.to_unit ?? ''} onChange={(e) => set('to_unit')(e.target.value)} />
            </Field>
            <button
              type="submit"
              className="btn-primary justify-center"
              onClick={() =>
                run('convert', { value: num('value'), kind: f.kind ?? 'V', from_unit: f.from_unit, to_unit: f.to_unit })
              }
            >
              Calculate
            </button>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-slate-400">Tip: press Enter in any field to calculate.</p>
        </form>
      </Card>
      {result ? (
        <ResultPanel
          result={result}
          onSave={async (name) => {
            await api.saveCalculation(name, tool, f, { value: result.value, unit: result.unit });
          }}
        />
      ) : null}
    </div>
  );
}

export function SavedPage() {
  const [saved, setSaved] = useState<import('./api').SavedCalc[] | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    api
      .calculations()
      .then(setSaved)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Loading failed.'));
  }, []);
  useEffect(() => reload(), [reload]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Saved calculations</h1>
      {error ? <ErrorBanner message={error} /> : null}
      {!saved ? (
        <Loading />
      ) : saved.length === 0 ? (
        <EmptyState title="Nothing saved yet" hint="Calculate something and use 'Save this calculation'." />
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => downloadText('saved-calculations.json', JSON.stringify(saved, null, 2), 'application/json')}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                downloadText('saved-calculations.csv', toCsv(saved.map((s) => ({ name: s.name, kind: s.kind, saved: s.created_at, inputs: JSON.stringify(s.inputs), result: JSON.stringify(s.result) })), ['name', 'kind', 'saved', 'inputs', 'result']))
              }
            >
              Export CSV
            </button>
            <span className="text-xs text-slate-400">Your saved work is yours to take with you.</span>
          </div>
          {saved.map((s) => (
            <div key={s.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-slate-400">
                  {s.kind} · saved {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                </div>
                <div className="mt-1 font-mono text-xs text-slate-400">{JSON.stringify(s.result)}</div>
              </div>
              <ConfirmButton
                label="Delete"
                confirmMessage={`Delete "${s.name}"?`}
                onConfirm={async () => {
                  await api.deleteCalculation(s.id);
                  reload();
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <BlurFade>
      <Card title="Account">
        <p className="text-sm text-slate-300">
          {user.display_name} · <span className="text-slate-400">{user.email}</span>
        </p>
      </Card>
      </BlurFade>
      <BlurFade delayMs={80}>
      <Card title="How results are presented">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>Every calculation shows its working steps and formulas.</li>
          <li>Approximations (e.g. the unloaded divider) are labelled as approximations — never presented as exact.</li>
          <li>Unsolvable inputs (short circuit, open circuit, singular mesh systems) return explicit errors.</li>
          <li>The calculation core is the tested Python module vendored from the portfolio's circuit_math.py.</li>
        </ul>
      </Card>
      </BlurFade>
    </div>
  );
}
