import { useEffect, useRef, useState } from 'react';
import { BrowserEngine, browserEngineSupported, ENGINE_SOURCE } from './engine/browserEngine';
import { formatScore } from './engine/uci';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

type ServerStatus = { available: boolean; message: string; source?: string | null };

export function EnginePanel() {
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const engine = useRef<BrowserEngine | null>(null);

  useEffect(() => {
    fetch('/api/engine/status', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setServer(d.server))
      .catch(() => setServer({ available: false, message: 'Engine status unavailable (backend unreachable).' }));
    return () => engine.current?.dispose();
  }, []);

  const support = browserEngineSupported();

  async function test() {
    setBusy(true);
    setResult('');
    try {
      engine.current ??= new BrowserEngine();
      const r = await engine.current.analyse(START_FEN, { depth: 10, movetimeMs: 2000 });
      setResult(
        r.info
          ? `Start position, depth ${r.info.depth}: ${formatScore(r.info.score)} (best ${r.best ?? 'n/a'}) - source: ${r.source}`
          : 'Engine returned no evaluation.',
      );
    } catch (e) {
      setResult(`Engine unavailable: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 text-sm text-slate-300">
      <p>
        <strong>Server engine:</strong> {server ? (server.available ? 'available' : 'unavailable') : 'checking...'}
        {server ? <span className="text-slate-400"> - {server.message}</span> : null}
      </p>
      <p>
        <strong>Browser engine:</strong> {support.ok ? ENGINE_SOURCE : `unavailable - ${support.reason}`}
      </p>
      <button className="btn-ghost" disabled={busy || !support.ok} onClick={test}>
        {busy ? 'Evaluating...' : 'Test browser engine'}
      </button>
      <p role="status" aria-live="polite" className="text-slate-200">
        {result}
      </p>
      <p className="text-xs text-slate-400">
        Every evaluation is labelled with its source. If no engine runs, no evaluation is shown.
      </p>
    </div>
  );
}
