import { useState, type FormEvent, type ReactNode } from 'react';
import { today } from './data';
import type { PersonalSystemData } from './types';
import type { PersonalSystemUpdater } from './ExecutionSpace';

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function GrowthPanel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function GrowthSpace({
  data,
  update,
}: {
  data: PersonalSystemData;
  update: PersonalSystemUpdater;
}) {
  const [learning, setLearning] = useState({ skill: '', currentLevel: '', targetCapability: '', nextAction: '', evidence: '', reviewDate: '' });
  const [relationship, setRelationship] = useState({ displayName: '', category: 'Active relationship', sharedContext: '', nextContact: '', mutualValue: '', notes: '' });
  const [doctrine, setDoctrine] = useState({ title: '', statement: '', practicalImplication: '', limitation: '', relatedValue: '' });
  const [financial, setFinancial] = useState({ kind: 'income' as 'income' | 'expense' | 'saving', amount: '', currency: 'ZMW', category: '', note: '' });

  const addLearning = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!learning.skill.trim()) return;
    update((previous) => ({
      ...previous,
      learningPaths: [{ id: makeId('learning'), relatedProjectId: '', ...learning, skill: learning.skill.trim(), currentLevel: learning.currentLevel.trim(), targetCapability: learning.targetCapability.trim(), nextAction: learning.nextAction.trim(), evidence: learning.evidence.trim() }, ...previous.learningPaths],
    }));
    setLearning({ skill: '', currentLevel: '', targetCapability: '', nextAction: '', evidence: '', reviewDate: '' });
  };

  const addRelationship = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!relationship.displayName.trim()) return;
    update((previous) => ({
      ...previous,
      relationships: [{ id: makeId('relationship'), lastContact: '', ...relationship, displayName: relationship.displayName.trim(), sharedContext: relationship.sharedContext.trim(), mutualValue: relationship.mutualValue.trim(), notes: relationship.notes.trim() }, ...previous.relationships],
    }));
    setRelationship({ displayName: '', category: 'Active relationship', sharedContext: '', nextContact: '', mutualValue: '', notes: '' });
  };

  const addDoctrine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!doctrine.title.trim() || !doctrine.statement.trim()) return;
    update((previous) => ({
      ...previous,
      doctrines: [{ id: makeId('doctrine'), status: 'active', ...doctrine, title: doctrine.title.trim(), statement: doctrine.statement.trim(), practicalImplication: doctrine.practicalImplication.trim(), limitation: doctrine.limitation.trim(), relatedValue: doctrine.relatedValue.trim() }, ...previous.doctrines],
    }));
    setDoctrine({ title: '', statement: '', practicalImplication: '', limitation: '', relatedValue: '' });
  };

  const addFinancial = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(financial.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    update((previous) => ({
      ...previous,
      financialEntries: [{ id: makeId('finance'), date: today(), kind: financial.kind, amount, currency: financial.currency.trim() || 'ZMW', category: financial.category.trim(), note: financial.note.trim() }, ...previous.financialEntries],
    }));
    setFinancial((current) => ({ ...current, amount: '', category: '', note: '' }));
  };

  const recentMeaning = [...data.meaningEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const financialTotals = data.financialEntries.reduce<Record<string, { income: number; expense: number; saving: number }>>(
    (totals, entry) => {
      const currency = entry.currency || 'Unspecified';
      const current = totals[currency] ?? { income: 0, expense: 0, saving: 0 };
      current[entry.kind] += entry.amount;
      totals[currency] = current;
      return totals;
    },
    {},
  );

  return (
    <div id="system-panel-growth" role="tabpanel" aria-labelledby="system-tab-growth" className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <GrowthPanel eyebrow="Learning architecture" title="Learn → apply → explain → test">
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">A resource is only an input. Record what capability you are developing, the next practice move, and the evidence that would make the learning real.</p>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addLearning}>
            <label className="system-field"><span>Skill / subject</span><input required value={learning.skill} onChange={(event) => setLearning((current) => ({ ...current, skill: event.target.value }))} placeholder="e.g. Python testing" /></label>
            <label className="system-field"><span>Review date</span><input type="date" value={learning.reviewDate} onChange={(event) => setLearning((current) => ({ ...current, reviewDate: event.target.value }))} /></label>
            <label className="system-field"><span>Current level</span><input value={learning.currentLevel} onChange={(event) => setLearning((current) => ({ ...current, currentLevel: event.target.value }))} placeholder="What can you do now?" /></label>
            <label className="system-field"><span>Target capability</span><input value={learning.targetCapability} onChange={(event) => setLearning((current) => ({ ...current, targetCapability: event.target.value }))} placeholder="What will you be able to do?" /></label>
            <label className="system-field sm:col-span-2"><span>Next applied action</span><input value={learning.nextAction} onChange={(event) => setLearning((current) => ({ ...current, nextAction: event.target.value }))} placeholder="Solve, build, explain, or test something." /></label>
            <label className="system-field sm:col-span-2"><span>Evidence of competence</span><input value={learning.evidence} onChange={(event) => setLearning((current) => ({ ...current, evidence: event.target.value }))} placeholder="A project, exercise, explanation, or feedback." /></label>
            <div className="sm:col-span-2"><button type="submit" className="btn btn-primary">Add learning path</button></div>
          </form>
          {data.learningPaths.length > 0 && <ul className="mt-5 grid gap-3 border-t border-line pt-5">{data.learningPaths.map((item) => <li key={item.id} className="rounded-card border border-line bg-panel-strong p-3"><p className="text-sm font-semibold text-ink">{item.skill}</p><p className="mt-1 text-xs text-ink-muted">Next: {item.nextAction || 'Choose an applied next action.'}</p><button type="button" className="mt-2 text-xs font-medium text-red-600 underline underline-offset-4 dark:text-red-300" onClick={() => update((previous) => ({ ...previous, learningPaths: previous.learningPaths.filter((path) => path.id !== item.id) }))}>Remove</button></li>)}</ul>}
        </GrowthPanel>

        <GrowthPanel eyebrow="Relationships" title="Treat people as people, not productivity assets">
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">Keep this minimal and private. The useful question is not “how many contacts?” but “what sincere follow-up or mutual contribution matters now?”</p>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addRelationship}>
            <label className="system-field"><span>Display name</span><input required value={relationship.displayName} onChange={(event) => setRelationship((current) => ({ ...current, displayName: event.target.value }))} /></label>
            <label className="system-field"><span>Relationship category</span><select value={relationship.category} onChange={(event) => setRelationship((current) => ({ ...current, category: event.target.value }))}><option>Inner circle</option><option>Active relationship</option><option>Weak tie</option><option>Mentor / expert</option><option>Academic collaborator</option><option>Project collaborator</option></select></label>
            <label className="system-field"><span>Shared context</span><input value={relationship.sharedContext} onChange={(event) => setRelationship((current) => ({ ...current, sharedContext: event.target.value }))} /></label>
            <label className="system-field"><span>Next contact</span><input type="date" value={relationship.nextContact} onChange={(event) => setRelationship((current) => ({ ...current, nextContact: event.target.value }))} /></label>
            <label className="system-field sm:col-span-2"><span>Possible mutual value</span><input value={relationship.mutualValue} onChange={(event) => setRelationship((current) => ({ ...current, mutualValue: event.target.value }))} placeholder="Shared interest, appropriate support, or a useful question." /></label>
            <label className="system-field sm:col-span-2"><span>Private note <small>optional</small></span><textarea rows={2} value={relationship.notes} onChange={(event) => setRelationship((current) => ({ ...current, notes: event.target.value }))} /></label>
            <div className="sm:col-span-2"><button type="submit" className="btn btn-primary">Add relationship</button></div>
          </form>
          {data.relationships.length > 0 && <ul className="mt-5 grid gap-3 border-t border-line pt-5">{data.relationships.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 rounded-card border border-line bg-panel-strong p-3"><div><p className="text-sm font-semibold text-ink">{item.displayName}</p><p className="mt-1 text-xs text-ink-muted">{item.category}{item.nextContact ? ` · follow up ${item.nextContact}` : ''}</p></div><button type="button" className="text-xs font-medium text-red-600 underline underline-offset-4 dark:text-red-300" onClick={() => update((previous) => ({ ...previous, relationships: previous.relationships.filter((contact) => contact.id !== item.id) }))}>Remove</button></li>)}</ul>}
        </GrowthPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GrowthPanel eyebrow="Personal doctrine" title="Principles should change a decision">
          <form className="mt-5 grid gap-3" onSubmit={addDoctrine}>
            <label className="system-field"><span>Principle title</span><input required value={doctrine.title} onChange={(event) => setDoctrine((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Act with calibrated confidence" /></label>
            <label className="system-field"><span>Statement</span><textarea required rows={2} value={doctrine.statement} onChange={(event) => setDoctrine((current) => ({ ...current, statement: event.target.value }))} placeholder="Clarity is valuable; certainty is not required for reversible action." /></label>
            <label className="system-field"><span>Practical implication</span><input value={doctrine.practicalImplication} onChange={(event) => setDoctrine((current) => ({ ...current, practicalImplication: event.target.value }))} placeholder="Use a Type A or B decision deadline." /></label>
            <label className="system-field"><span>Limitation / counterexample</span><input value={doctrine.limitation} onChange={(event) => setDoctrine((current) => ({ ...current, limitation: event.target.value }))} placeholder="High-risk decisions need more evidence." /></label>
            <label className="system-field"><span>Related value</span><input value={doctrine.relatedValue} onChange={(event) => setDoctrine((current) => ({ ...current, relatedValue: event.target.value }))} /></label>
            <div><button type="submit" className="btn btn-primary">Add principle</button></div>
          </form>
          {data.doctrines.length > 0 && <ul className="mt-5 grid gap-3 border-t border-line pt-5">{data.doctrines.map((item) => <li key={item.id} className="rounded-card border border-line bg-panel-strong p-3"><p className="text-sm font-semibold text-ink">{item.title}</p><p className="mt-1 text-sm leading-relaxed text-ink-muted">{item.statement}</p><p className="mt-2 text-xs text-accent">Practice: {item.practicalImplication || 'Add a concrete implication.'}</p><button type="button" className="mt-2 text-xs font-medium text-red-600 underline underline-offset-4 dark:text-red-300" onClick={() => update((previous) => ({ ...previous, doctrines: previous.doctrines.filter((principle) => principle.id !== item.id) }))}>Remove</button></li>)}</ul>}
        </GrowthPanel>

        <GrowthPanel eyebrow="Finance and leverage" title="Record reality; do not count speculation as income">
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">This lightweight ledger is for deliberate review. It does not require bank access and it does not make claims about financial advice or future earnings.</p>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addFinancial}>
            <label className="system-field"><span>Kind</span><select value={financial.kind} onChange={(event) => setFinancial((current) => ({ ...current, kind: event.target.value as typeof financial.kind }))}><option value="income">Income</option><option value="expense">Expense</option><option value="saving">Saving</option></select></label>
            <label className="system-field"><span>Amount</span><input required min="0.01" step="0.01" type="number" value={financial.amount} onChange={(event) => setFinancial((current) => ({ ...current, amount: event.target.value }))} /></label>
            <label className="system-field"><span>Currency</span><input value={financial.currency} onChange={(event) => setFinancial((current) => ({ ...current, currency: event.target.value }))} /></label>
            <label className="system-field"><span>Category</span><input value={financial.category} onChange={(event) => setFinancial((current) => ({ ...current, category: event.target.value }))} placeholder="Transport, freelance work…" /></label>
            <label className="system-field sm:col-span-2"><span>Note <small>optional</small></span><input value={financial.note} onChange={(event) => setFinancial((current) => ({ ...current, note: event.target.value }))} /></label>
            <div className="sm:col-span-2"><button type="submit" className="btn btn-primary">Record entry</button></div>
          </form>
          <div className="mt-5 border-t border-line pt-5">
            {Object.keys(financialTotals).length ? <div className="grid gap-3 sm:grid-cols-2">{Object.entries(financialTotals).map(([currency, totals]) => <div key={currency} className="rounded-card border border-line bg-panel-strong p-3"><p className="eyebrow">{currency} totals</p><p className="mt-2 text-sm text-ink">Income {totals.income.toFixed(2)} · Expenses {totals.expense.toFixed(2)} · Savings {totals.saving.toFixed(2)}</p></div>)}</div> : <p className="text-sm text-ink-muted">No financial records yet. Totals are kept separate by currency and never converted or summed across currencies.</p>}
          </div>
          {data.financialEntries.length > 0 && <ul className="mt-4 grid gap-2">{data.financialEntries.slice(0, 5).map((entry) => <li key={entry.id} className="flex justify-between gap-3 rounded-card border border-line bg-panel-strong p-3 text-sm"><span className="text-ink">{entry.kind} · {entry.category || 'Uncategorised'}</span><span className="font-mono text-ink-muted">{entry.amount.toFixed(2)} {entry.currency}</span></li>)}</ul>}
        </GrowthPanel>
      </div>

      <GrowthPanel eyebrow="Meaning log" title="Connect one real action to the direction it serves">
        {recentMeaning.length ? <><ul className="mt-4 grid gap-3">{recentMeaning.map((entry) => <li key={entry.id} className="rounded-card border border-line bg-panel-strong p-4"><p className="font-mono text-2xs uppercase tracking-[0.1em] text-accent">{entry.date} · {entry.value || 'No value named'}</p><p className="mt-2 text-sm font-semibold text-ink">{entry.activity}</p><p className="mt-1 text-sm leading-relaxed text-ink-muted">{entry.visionConnection}</p></li>)}</ul>{data.meaningEntries.length > recentMeaning.length && <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-ink">Browse all {data.meaningEntries.length} meaning entries</summary><ul className="mt-3 grid gap-2">{data.meaningEntries.slice(recentMeaning.length).map((entry) => <li key={entry.id} className="rounded-card border border-line bg-panel-strong p-3 text-sm"><p className="font-semibold text-ink">{entry.activity}</p><p className="mt-1 text-ink-muted">{entry.visionConnection}</p></li>)}</ul></details>}</> : <p className="mt-4 text-sm leading-relaxed text-ink-muted">Meaning entries are created in the weekly review so they remain connected to actual work rather than abstract intention.</p>}
      </GrowthPanel>
    </div>
  );
}
