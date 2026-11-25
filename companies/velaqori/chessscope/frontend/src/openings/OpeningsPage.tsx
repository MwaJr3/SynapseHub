import { useCallback, useEffect, useState } from 'react';
import type { Square } from 'chess.js';
import { api, ApiError, openingsApi, type ExploreResult, type OpeningCardView, type OpeningRecord, type ReviewResult } from '../api';
import { Board } from '../board/Board';
import { playMove, START_FEN } from '../board/gameModel';
import { Badge, Card, EmptyState, ErrorBanner } from '../ui';
import { fenAfter, isLegalUci, opponentReply } from './drill';

const toUci = (from: Square, to: Square, promo?: string) => `${from}${to}${promo ?? ''}`;

function Provenance({ o }: { o: OpeningRecord }) {
  const p = o.provenance;
  return (
    <p className="text-xs text-slate-400">
      Line data: {p.line_source} ({p.line_license}), commit {p.line_commit}.{' '}
      {p.explanation_source ? `Explanation: ${p.explanation_source}.` : 'No ChessScope explanation written for this line yet.'}
    </p>
  );
}

function OpeningDetail({ o, onAdded }: { o: OpeningRecord; onAdded: () => void }) {
  const [full, setFull] = useState<OpeningRecord | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    openingsApi.detail(o.id).then(setFull).catch(() => setFull(null));
  }, [o.id]);
  const add = async (side: 'white' | 'black') => {
    try {
      await openingsApi.addCard(o.id, side);
      setMsg(`Added to your repertoire as ${side}.`);
      onAdded();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Could not add.');
    }
  };
  const n = full?.explanation;
  return (
    <div className="space-y-2 text-sm">
      <div className="font-medium text-slate-100">
        <Badge tone="bg-slate-700 text-slate-200">{o.eco}</Badge> {o.name}
      </div>
      <div className="text-slate-300">{o.san.join(' ')}</div>
      {n ? (
        <dl className="space-y-1 text-slate-300">
          <div><dt className="inline font-medium">Structure: </dt><dd className="inline">{n.structure}</dd></div>
          <div><dt className="inline font-medium">White plan: </dt><dd className="inline">{n.white_plan}</dd></div>
          <div><dt className="inline font-medium">Black plan: </dt><dd className="inline">{n.black_plan}</dd></div>
          <div><dt className="inline font-medium">Typical mistakes: </dt><dd className="inline">{n.pitfalls}</dd></div>
        </dl>
      ) : null}
      <div className="flex gap-2">
        <button className="btn" onClick={() => add('white')}>Drill as White</button>
        <button className="btn" onClick={() => add('black')}>Drill as Black</button>
      </div>
      {msg ? <p role="status" className="text-emerald-300">{msg}</p> : null}
      <Provenance o={full ?? o} />
    </div>
  );
}

function Explorer({ onAdded }: { onAdded: () => void }) {
  const [moves, setMoves] = useState<string[]>([]);
  const [data, setData] = useState<ExploreResult | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<OpeningRecord[]>([]);
  const [picked, setPicked] = useState<OpeningRecord | null>(null);

  useEffect(() => {
    openingsApi.explore(moves).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message));
  }, [moves]);
  const fen = fenAfter(moves) ?? START_FEN;

  const search = async () => {
    try {
      setResults((await openingsApi.search(q)).results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    }
  };
  const loadLine = (o: OpeningRecord) => { setMoves(o.uci); setPicked(o); };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-2">
        <Board
          fen={fen}
          label="Opening explorer board"
          onMove={(f, t, p) => {
            const ply = playMove(fen, f, t, p);
            if (ply) setMoves([...moves, toUci(f, t, p)]);
          }}
        />
        <div className="flex gap-2">
          <button className="btn" onClick={() => setMoves(moves.slice(0, -1))} disabled={!moves.length}>Undo</button>
          <button className="btn" onClick={() => { setMoves([]); setPicked(null); }}>Start position</button>
        </div>
      </div>
      <div className="space-y-3">
        {error ? <ErrorBanner message={error} /> : null}
        <Card title="Position">
          {data?.position_names.length ? (
            <ul className="text-sm text-slate-200">
              {data.position_names.map((n) => <li key={n.id}><Badge tone="bg-slate-700 text-slate-200">{n.eco}</Badge> {n.name}</li>)}
            </ul>
          ) : <p className="text-sm text-slate-400">No named opening at exactly this position.</p>}
          <h3 className="mt-3 text-xs uppercase tracking-wide text-slate-400">Named continuations ({data?.turn ?? 'white'} to move)</h3>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            {(data?.moves ?? []).slice(0, 14).map((m) => (
              <li key={m.uci}>
                <button className="btn w-full justify-between" onClick={() => setMoves([...moves, m.uci])}>
                  <span className="font-semibold">{m.san}</span>
                  <span className="text-xs text-slate-400">{m.lines} lines, e.g. {m.example.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Find an opening">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search(); }}>
            <input className="input flex-1" aria-label="Search opening names" placeholder="e.g. Sicilian, Nimzo" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn" type="submit">Search</button>
          </form>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm">
            {results.map((r) => (
              <li key={r.id}><button className="text-left text-sky-300 underline" onClick={() => loadLine(r)}>{r.eco} {r.name}</button></li>
            ))}
          </ul>
        </Card>
        {picked ? <Card title="Opening"><OpeningDetail o={picked} onAdded={onAdded} /></Card> : null}
      </div>
    </div>
  );
}

function Drill({ card, onDone }: { card: OpeningCardView; onDone: () => void }) {
  const [opp, setOpp] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [mine, setMine] = useState<string[]>([]);
  const [played, setPlayed] = useState<string[]>([]);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState('');
  const side = card.side;

  const submit = useCallback(async (moves: string[]) => {
    try {
      setResult(await openingsApi.review(card.id, moves));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review failed');
    }
  }, [card.id]);

  useEffect(() => {
    openingsApi.drill(card.id).then((d) => {
      setOpp(d.opponent_moves);
      setTotal(d.user_moves);
      if (side === 'black' && d.opponent_moves[0]) setPlayed([d.opponent_moves[0]]);
    }).catch((e) => setError(e.message));
  }, [card.id, side]);

  const fen = fenAfter(played) ?? START_FEN;

  function onMove(f: Square, t: Square, p?: string) {
    if (result) return;
    const u = toUci(f, t, p);
    const nextMine = [...mine, u];
    const after = [...played, u];
    setMine(nextMine);
    if (nextMine.length >= total) { setPlayed(after); void submit(nextMine); return; }
    const reply = opponentReply(opp, nextMine.length, side);
    const f2 = fenAfter(after);
    if (reply && f2 && isLegalUci(f2, reply)) setPlayed([...after, reply]);
    else { setPlayed(after); void submit(nextMine); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Board fen={fen} orientation={side === 'white' ? 'w' : 'b'} interactive={!result} onMove={onMove} label={`Drill board, you play ${side}`} />
      <div className="space-y-3">
        <Card title={`Recall: ${card.name}`}>
          <p className="text-sm text-slate-300">You play {side}. Play your moves of this line from memory ({mine.length}/{total || '?'}). The line is revealed only after you finish.</p>
          {error ? <ErrorBanner message={error} /> : null}
          {result ? (
            <div className="mt-3 space-y-2 text-sm" role="status">
              <p className={result.correct ? 'text-emerald-300' : 'text-rose-300'}>
                {result.correct ? 'Correct. Next review scheduled.' : `Not quite: your move ${(result.first_error_index ?? 0) + 1} differed from the line.`}
              </p>
              <p className="text-slate-300">Line: {result.line_san.join(' ')}</p>
              <p className="text-slate-400">Next due: {new Date(result.card.due_at).toLocaleString()} (estimate from a simple model, not a guarantee).</p>
              {result.opening.explanation ? <p className="text-slate-300">{side === 'white' ? result.opening.explanation.white_plan : result.opening.explanation.black_plan}</p> : null}
              <Provenance o={result.opening} />
              <button className="btn" onClick={onDone}>Back to repertoire</button>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function Repertoire({ cards, reload }: { cards: OpeningCardView[]; reload: () => void }) {
  const [active, setActive] = useState<OpeningCardView | null>(null);
  if (active) return <Drill card={active} onDone={() => { setActive(null); reload(); }} />;
  if (!cards.length) return <EmptyState title="No lines in your repertoire yet" hint="Open the Explorer, search an opening and choose 'Drill as White/Black'." />;
  const due = cards.filter((c) => c.due);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300" aria-live="polite">{due.length} due now, {cards.length} total.</p>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium text-slate-100">{c.eco} {c.name} <span className="text-xs text-slate-400">as {c.side}</span></div>
              <div className="text-xs text-slate-400">
                {c.reps} reviews, {c.lapses} lapses, {c.due ? 'due now' : `due ${new Date(c.due_at).toLocaleDateString()}`}
                {c.recall_estimate !== null ? `, estimated recall ${Math.round(c.recall_estimate * 100)}%` : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => setActive(c)}>{c.due ? 'Review' : 'Practise early'}</button>
              <button className="btn" onClick={async () => { await openingsApi.deleteCard(c.id); reload(); }} aria-label={`Remove ${c.name}`}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OpeningsPage() {
  const [tab, setTab] = useState<'explore' | 'repertoire'>('explore');
  const [cards, setCards] = useState<OpeningCardView[]>([]);
  const reload = useCallback(() => { openingsApi.cards().then((r) => setCards(r.cards)).catch(() => undefined); }, []);
  useEffect(reload, [reload]);
  void api;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Openings</h1>
      <p className="text-sm text-slate-400">Opening lines come from the Lichess chess-openings dataset (CC0). Explanations are original to ChessScope and exist only for well-known openings.</p>
      <div role="tablist" className="flex gap-2">
        {(['explore', 'repertoire'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`btn ${tab === t ? 'ring-2 ring-sky-400' : ''}`} onClick={() => setTab(t)}>
            {t === 'explore' ? 'Explorer' : `Repertoire drill (${cards.filter((c) => c.due).length} due)`}
          </button>
        ))}
      </div>
      {tab === 'explore' ? <Explorer onAdded={reload} /> : <Repertoire cards={cards} reload={reload} />}
    </div>
  );
}
