import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, type User } from './api';
import { LICENSE_CAUTION, attributionCsv, licenseTone, readQueryParam, reuseLabel, translationStatusTone, writeQueryParam } from './utils';
import { BlurFade } from './decor';
import { Badge, Card, EmptyState, ErrorBanner, Field, Loading } from './ui';

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

export function LibraryPage({ user }: { user: User }) {
  const [q, setQ] = useState(() => readQueryParam('q'));
  useEffect(() => { writeQueryParam('q', q); }, [q]);
  const [resources, error, reload] = useAsync(() => api.resources(q), [q]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<import('./api').ResourceDetail | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [actionError] = useState('');

  return (
    <div className="space-y-4">
      <BlurFade><h1 className="text-xl font-semibold">Resource library</h1></BlurFade>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <input className="input max-w-md" aria-label="Search titles" placeholder="Search titles…" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="text-xs text-slate-400">{LICENSE_CAUTION}</p>
      {resources && resources.length > 0 ? (
        <button type="button" className="btn-ghost" onClick={() => {
          const url = URL.createObjectURL(new Blob([attributionCsv(resources)], { type: 'text/csv' }));
          const a = document.createElement('a'); a.href = url; a.download = 'resource-attributions.csv'; a.click(); URL.revokeObjectURL(url);
        }}>Download titles, licenses &amp; attributions (CSV)</button>
      ) : null}
      {!resources ? <Loading /> : resources.length === 0 ? (
        <EmptyState title="No resources found" hint="Try a different search or contribute one in the studio." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {resources.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {r.resource_type} · {r.subject || '—'} · {r.level || '—'} · {r.language} · {r.connectivity}
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{r.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={licenseTone(r.reuse.uncertain)}>{r.license}</Badge>
                    <span className="text-xs text-slate-400">{reuseLabel(r.reuse)}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{r.reuse.obligation}</div>
                  <div className="mt-1 text-xs text-slate-400">{r.offline_note}</div>
                  <div className="mt-1 text-xs text-slate-400">Attribution: {r.attribution}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="btn-ghost" onClick={async () => {
                    setSelected(r.id);
                    setDetail(await api.resource(r.id));
                  }}>Open</button>
                  <button className="btn-ghost" onClick={() => setPicked((prev) => prev.includes(r.id) ? prev.filter((i) => i !== r.id) : [...prev, r.id])}>
                    {picked.includes(r.id) ? 'In collection ✓' : 'Add to collection'}
                  </button>
                  <button className="btn-ghost" onClick={async () => {
                    const reason = window.prompt('Report reason (rights/takedown):');
                    if (reason) {
                      await api.report(r.id, reason);
                      setMessage('Report submitted for moderator review.');
                      reload();
                    }
                  }}>Report</button>
                </div>
              </div>
              {selected === r.id && detail ? (
                <div className="mt-3 border-t border-slate-800 pt-3 text-sm text-slate-300">
                  {detail.body || '(no body stored — link-only entry)'}
                  {(user.role === 'reviewer' || user.role === 'admin') ? (
                    <div className="mt-2 flex gap-2">
                      <button className="btn-primary" onClick={async () => { await api.review(detail.id, 'approved'); reload(); }}>Approve</button>
                      <button className="btn-ghost" onClick={async () => { await api.review(detail.id, 'takedown'); reload(); }}>Takedown</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
      {picked.length > 0 ? (
        <button className="btn-primary" onClick={async () => {
          const title = window.prompt('Collection title:');
          if (title) {
            const collection = await api.createCollection(title, picked);
            const attribution = await api.collectionAttribution(collection.id);
            setMessage(`Collection "${attribution.collection}" created.\n${attribution.attribution}`);
            setPicked([]);
          }
        }}>Create collection from {picked.length} item(s) with attribution export</button>
      ) : null}
    </div>
  );
}

const STUDIO_DRAFT_KEY = 'openlearn.studioDraft';
function loadStudioDraft(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STUDIO_DRAFT_KEY) || '{}') as Record<string, string>; } catch { return {}; }
}

export function StudioPage({ user: _user }: { user: User }) {
  const initial = loadStudioDraft();
  const [title, setTitle] = useState(initial.title ?? '');
  const [license, setLicense] = useState(initial.license ?? 'Unknown');
  const [creator, setCreator] = useState(initial.creator ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const hasDraft = Boolean(title || creator || sourceUrl || description);
  useEffect(() => {
    try {
      if (hasDraft) localStorage.setItem(STUDIO_DRAFT_KEY, JSON.stringify({ title, license, creator, sourceUrl, description }));
      else localStorage.removeItem(STUDIO_DRAFT_KEY);
    } catch { /* storage unavailable */ }
  }, [title, license, creator, sourceUrl, description, hasDraft]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Contributor studio</h1>
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <Card title="Add a catalogue entry">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={async (e) => {
          e.preventDefault();
          setActionError('');
          try {
            await api.createResource({ title, license, creator, source_url: sourceUrl, description, host_status: sourceUrl ? 'link_only' : 'hosted_local' });
            setMessage('Entry submitted. Uploading confirms you hold the necessary rights.');
            setTitle(''); setCreator(''); setSourceUrl(''); setDescription('');
          } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Create failed.'); }
        }}>
          <Field label="Title"><input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Creator / attribution name"><input className="input" value={creator} onChange={(e) => setCreator(e.target.value)} /></Field>
          <Field label="License">
            <select className="input" value={license} onChange={(e) => setLicense(e.target.value)}>
              <option>CC BY 4.0</option>
              <option>CC BY-SA 4.0</option>
              <option>CC BY-NC 4.0</option>
              <option>CC BY-NC-SA 4.0</option>
              <option>CC0 1.0</option>
              <option>Public Domain</option>
              <option>All Rights Reserved</option>
              <option>Unknown</option>
            </select>
          </Field>
          <Field label="Source URL (optional)"><input className="input" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} /></Field>
          <Field label="Description"><textarea className="input h-20 md:col-span-2" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <button className="btn-primary md:col-span-2 justify-center">Submit entry (rights confirmation required)</button>
        </form>
        {hasDraft ? <p role="status" className="mt-2 text-xs text-slate-400">Draft saved on this device until you submit.</p> : null}
        <p className="mt-2 text-xs text-slate-400">{LICENSE_CAUTION}</p>
      </Card>
    </div>
  );
}

export function AdaptWorkspacePage({ user }: { user: User }) {
  const [resources] = useAsync(() => api.resources(), []);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [, setAdaptationId] = useState<number | null>(null);
  const [detail, setDetail] = useState<import('./api').AdaptationDetail | null>(null);
  const [targetText, setTargetText] = useState('');
  const [language, setLanguage] = useState('fr');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const sourceSelect = useRef<HTMLSelectElement>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Adaptation & translation workspace</h1>
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <select ref={sourceSelect} className="input max-w-md" aria-label="Source resource" value={sourceId ?? ''} onChange={(e) => { setSourceId(Number(e.target.value)); setActionError(''); }}>
          <option value="">Select a source resource…</option>
          {(resources ?? []).map((r) => <option key={r.id} value={r.id}>{r.title} ({r.license})</option>)}
        </select>
        <button className="btn-primary" onClick={async () => {
          if (!sourceId) {
            // A disabled button cannot be focused or read out, so the condition it
            // depends on would be impossible to discover with a keyboard.
            setActionError('Choose a source resource first — the adaptation is created from it.');
            sourceSelect.current?.focus();
            return;
          }
          setActionError('');
          try {
            const created = await api.adapt(sourceId!, 'Adaptation of selected resource', 'Adapted body (demo).');
            setAdaptationId(created.id);
            setDetail(await api.adaptation(created.id));
            setMessage(`Adaptation created. License obligation: ${created.license_obligation}`);
          } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Adaptation failed.'); }
        }}>Create adaptation</button>
      </div>
      {detail ? (
        <Card title={detail.title}>
          <div className="text-xs text-slate-400">Source: {detail.source.attribution}</div>
          <p className="mt-2 text-sm text-slate-300">{detail.body}</p>
          <h2 className="mt-4 text-sm font-medium text-slate-300">Translations (side-by-side review)</h2>
          <ul className="mt-2 space-y-2">
            {detail.translations.map((t) => (
              <li key={t.id} className="rounded-lg border border-slate-800 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={translationStatusTone(t.status)}>{t.status}</Badge>
                  <span className="text-xs text-slate-400">{t.language}{t.machine ? ' · machine draft (unverified)' : ''}</span>
                  {user.role === 'reviewer' || user.role === 'admin' ? (
                    <span className="flex gap-2">
                      <button className="btn-ghost" onClick={async () => {
                        await api.transition(t.id, 'in_review'); setDetail(await api.adaptation(detail.id));
                      }}>Send to review</button>
                      <button className="btn-primary" onClick={async () => {
                        await api.transition(t.id, 'approved', 'Reviewed by human translator.');
                        setDetail(await api.adaptation(detail.id));
                      }}>Approve</button>
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-900 p-2 text-xs text-slate-400">{detail.source.title}</div>
                  <div className="rounded-lg bg-slate-900 p-2 text-xs text-slate-300">{t.target_text || '(hidden until approved)'}</div>
                </div>
              </li>
            ))}
          </ul>
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={async (e) => {
            e.preventDefault();
            setActionError('');
            try {
              const created = await api.addTranslation(detail.id, language, targetText, 'yes');
              setMessage(created.label);
              setTargetText('');
              setDetail(await api.adaptation(detail.id));
            } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Save failed.'); }
          }}>
            <input className="input w-20" aria-label="Language code" value={language} onChange={(e) => setLanguage(e.target.value)} />
            <input className="input flex-1" aria-label="Target-language text" placeholder="Target-language text (saved as machine draft)" value={targetText} onChange={(e) => setTargetText(e.target.value)} />
            <button className="btn-ghost">Add translation draft</button>
          </form>
          <p className="mt-2 text-xs text-slate-400">Machine drafts stay labelled and hidden until a reviewer approves them.</p>
        </Card>
      ) : null}
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
      <Card title="Rights & trust rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>{LICENSE_CAUTION}</li>
          <li>Uploads require explicit rights confirmation; duplicates are blocked.</li>
          <li>Unapproved translations and private review notes are never exposed publicly.</li>
          <li>Link-only entries are marked as such — the catalogue never claims to host what it does not.</li>
          <li>Takedown/reporting is available on every resource.</li>
          <li>Demo content is simulated with clearly stated demonstration licenses.</li>
        </ul>
      </Card>
    </div>
  );
}
