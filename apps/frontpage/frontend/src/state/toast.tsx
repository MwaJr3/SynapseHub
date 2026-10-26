import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type Tone = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  action?: { label: string; run: () => void };
}
interface ToastApi {
  show: (message: string, opts?: { tone?: Tone; action?: ToastItem['action']; ms?: number }) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi['show']>((message, opts = {}) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, message, tone: opts.tone ?? 'info', action: opts.action }]);
    window.setTimeout(() => dismiss(id), opts.ms ?? (opts.tone === 'error' ? 7000 : 4500));
  }, [dismiss]);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
            {t.tone === 'success' ? <CheckCircle2 size={18} aria-hidden /> : t.tone === 'error' ? <TriangleAlert size={18} aria-hidden /> : <Info size={18} aria-hidden />}
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button className="btn btn-ghost btn-sm" onClick={() => { t.action?.run(); dismiss(t.id); }}>{t.action.label}</button>
            )}
            <button className="icon-btn icon-btn-sm" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}><X size={16} aria-hidden /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
