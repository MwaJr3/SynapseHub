import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type User } from './api';
import { FAIRNESS_RULE, LEDGER_RULE, appStatusTone, planLabel } from './utils';
import { Badge, Card, EmptyState, ErrorBanner, Loading, StatCard } from './ui';

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): [T | null, string, () => void] {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setError('');
    loader().then((r) => { if (alive) setData(r); })
      .catch((err: unknown) => { if (alive) setError(err instanceof ApiError ? err.message : 'Loading failed.'); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return [data, error, reload];
}

export function PlansPage({ user: _user }: { user: User }) {
  const [courses, error, reload] = useAsync(() => api.courses(), []);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Access plans</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <p className="text-xs text-slate-400">{FAIRNESS_RULE}</p>
      {!courses ? <Loading /> : courses.length === 0 ? (
        <EmptyState title="No courses" hint="Providers can publish courses with access plans." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} title={course.title}>
              <div className="text-xs text-slate-400">{course.provider}</div>
              <p className="mt-1 text-sm text-slate-300">{course.description}</p>
              <ul className="mt-3 space-y-2">
                {course.plans.map((plan) => (
                  <li key={plan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{planLabel(plan.kind, plan.price)}</div>
                      {plan.evidence_required ? <div className="text-xs text-slate-400">Evidence: {plan.evidence_required}</div> : null}
                    </div>
                    <button className="btn-primary" onClick={async () => {
                      setActionError('');
                      try {
                        const statement = plan.kind === 'paid' ? '' : (window.prompt('Short statement (kept minimal — no sensitive documents):') ?? '');
                        await api.apply(plan.id, statement);
                        setMessage('Application submitted. A human reviewer will decide — decisions always record a reason.');
                        reload();
                      } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Apply failed.'); }
                    }}>{plan.kind === 'paid' ? 'Enroll' : 'Apply'}</button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApplicationsPage({ user }: { user: User }) {
  const [applications, error, reload] = useAsync(() => api.applications(), []);
  const [pools] = useAsync(() => api.pools(), []);
  const [actionError, setActionError] = useState('');
  const canDecide = user.role === 'reviewer' || user.role === 'admin';
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Applications & review</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {!applications ? <Loading /> : applications.length === 0 ? (
        <EmptyState title="No applications" hint="Apply from an access plan to get started." />
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <div key={app.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone={appStatusTone(app.status)}>{app.status}</Badge>
                    <span className="text-xs text-slate-400">plan {app.plan_id} · {app.uid.slice(0, 8)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{app.statement || '(no statement)'}</p>
                  {app.decision_reason ? <p className="mt-1 text-xs text-slate-400">Decision reason: {app.decision_reason}</p> : null}
                </div>
                {canDecide ? (
                  <div className="flex flex-wrap gap-2">
                    {['under_review', 'approved', 'waitlisted', 'declined', 'enrolled', 'completed'].map((status) => (
                      <button key={status} className="btn-ghost" onClick={async () => {
                        setActionError('');
                        try {
                          const reason = window.prompt(`Decision reason for "${status}" (required, recorded):`) ?? '';
                          if (!reason.trim()) return;
                          const poolId = status === 'approved' ? pools?.[0]?.id : undefined;
                          await api.decide(app.id, status, reason, poolId);
                          reload();
                        } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Decision failed.'); }
                      }}>{status}</button>
                    ))}
                  </div>
                ) : (
                  <button className="btn-ghost" onClick={async () => {
                    const reason = window.prompt('Appeal reason (available for declined/waitlisted):');
                    if (reason) {
                      try {
                        await api.appeal(app.id, reason);
                        reload();
                      } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Appeal failed.'); }
                    }
                  }}>Appeal</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FinancePage({ user }: { user: User }) {
  const [pools, error] = useAsync(() => api.pools(), []);
  const [ledger, ledgerError] = useAsync(
    () => (user.role === 'finance' || user.role === 'admin' ? api.ledger() : Promise.resolve(null)),
    [user.role],
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Funding pools & reconciliation</h1>
      {error || ledgerError ? <ErrorBanner message={error || ledgerError} /> : null}
      <Card title="Seat allocations">
        {!pools ? <Loading /> : pools.length === 0 ? (
          <EmptyState title="No pools visible" hint={user.role === 'sponsor' ? 'Sponsors see only their own pools.' : 'Create a pool to sponsor seats.'} />
        ) : (
          <ul className="space-y-2">
            {pools.map((pool) => (
              <li key={pool.id} className="rounded-lg border border-slate-800 p-3">
                <div className="font-medium">{pool.name}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>total: {pool.seats_total}</span>
                  <span>committed: {pool.seats_committed}</span>
                  <span className="text-emerald-300">available: {pool.seats_available}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">Criteria: {pool.criteria || 'documented in pool; human review decides'}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {ledger ? (
        <Card title="Ledger (manual reconciliation — no payment provider in demo)">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Settled in" value={`$${ledger.balance.settled_in.toFixed(2)}`} />
            <StatCard label="Settled out" value={`$${ledger.balance.settled_out.toFixed(2)}`} />
            <StatCard label="Balance" value={`$${ledger.balance.balance.toFixed(2)}`} tone="text-emerald-300" />
            <StatCard label="Pending (NOT settled)" value={`$${ledger.balance.pending_not_settled.toFixed(2)}`} tone="text-amber-300" />
          </div>
          <p className="mt-2 text-xs text-slate-400">{LEDGER_RULE}</p>
          <ul className="mt-2 space-y-1">
            {ledger.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-xs">
                <span>{t.kind} · {t.reference || '—'}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={t.status === 'settled' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : t.status === 'pending' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}>{t.status}</Badge>
                  ${t.amount.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card title="Ledger">
          <p className="text-sm text-slate-400">Visible to finance administrators only.</p>
        </Card>
      )}
    </div>
  );
}

export function SettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">{user.display_name} · <span className="text-slate-400">{user.email}</span> · role: {user.role}</p>
      </Card>
      <Card title="Fairness & financial rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>{FAIRNESS_RULE}</li>
          <li>{LEDGER_RULE}</li>
          <li>Seat allocation is capped by pool capacity — never over-allocated (waitlist instead).</li>
          <li>Appeals are available for declined and waitlisted decisions.</li>
          <li>Applications collect a short statement only — no sensitive documents in this demo.</li>
          <li>Demo data is simulated and fictional.</li>
        </ul>
      </Card>
    </div>
  );
}
