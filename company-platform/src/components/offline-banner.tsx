'use client';
import { useEffect, useState } from 'react';

/** Tells the visitor when the browser is offline and what still works (pages already loaded stay readable). */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  if (online) return <div role="status" aria-live="polite" />;
  return (
    <div role="status" aria-live="polite" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      You are offline. Pages you already opened stay readable; forms and new pages will work again when you reconnect.
    </div>
  );
}
