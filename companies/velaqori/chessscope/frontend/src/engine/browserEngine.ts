import { clampDepth, MAX_MOVETIME_MS, parseBestMove, parseInfoLine, type EngineInfo } from './uci';

export const ENGINE_URL = '/engine/stockfish-18-lite-single.js';
export const ENGINE_SOURCE = 'Stockfish 18 lite (WebAssembly, in your browser)';

export interface AnalyseResult {
  best: string | null;
  info: EngineInfo | null;
  source: string;
}

export type EngineAvailability = { ok: true } | { ok: false; reason: string };

export function browserEngineSupported(): EngineAvailability {
  if (typeof Worker === 'undefined') return { ok: false, reason: 'Web Workers are not supported in this browser.' };
  if (typeof WebAssembly === 'undefined') return { ok: false, reason: 'WebAssembly is not supported in this browser.' };
  return { ok: true };
}

/** Thin client around the WASM Stockfish Web Worker. One search at a time, hard timeout. */
export class BrowserEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;

  private start(): Promise<void> {
    if (this.ready) return this.ready;
    const support = browserEngineSupported();
    if (!support.ok) return Promise.reject(new Error(support.reason));
    this.ready = new Promise<void>((resolve, reject) => {
      let w: Worker;
      try {
        w = new Worker(ENGINE_URL);
      } catch (e) {
        reject(new Error('Engine worker could not be created.'));
        return;
      }
      this.worker = w;
      const timer = setTimeout(() => reject(new Error('Engine did not start (timeout).')), 15000);
      w.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Engine failed to load. Run `npm run dev` or `npm run build` so the WASM files are copied.'));
      };
      w.onmessage = (ev: MessageEvent) => {
        if (String(ev.data).trim() === 'uciok') {
          clearTimeout(timer);
          resolve();
        }
      };
      w.postMessage('uci');
    });
    this.ready.catch(() => this.dispose());
    return this.ready;
  }

  async analyse(fen: string, opts: { depth?: number; movetimeMs?: number } = {}): Promise<AnalyseResult> {
    await this.start();
    const w = this.worker;
    if (!w) throw new Error('Engine unavailable.');
    const depth = clampDepth(opts.depth ?? 12);
    const movetime = Math.max(50, Math.min(MAX_MOVETIME_MS, opts.movetimeMs ?? 1500));
    const whiteToMove = (fen.split(' ')[1] ?? 'w') === 'w';
    return new Promise<AnalyseResult>((resolve, reject) => {
      let last: EngineInfo | null = null;
      const timer = setTimeout(() => {
        w.postMessage('stop');
      }, movetime);
      const hard = setTimeout(() => {
        w.onmessage = null;
        reject(new Error('Engine search timed out.'));
        this.dispose();
      }, movetime + 5000);
      w.onmessage = (ev: MessageEvent) => {
        const line = String(ev.data);
        const info = parseInfoLine(line, whiteToMove);
        if (info) last = info;
        const best = parseBestMove(line);
        if (line.startsWith('bestmove')) {
          clearTimeout(timer);
          clearTimeout(hard);
          resolve({ best, info: last, source: ENGINE_SOURCE });
        }
      };
      w.postMessage('ucinewgame');
      w.postMessage(`position fen ${fen}`);
      w.postMessage(`go depth ${depth}`);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }
}
