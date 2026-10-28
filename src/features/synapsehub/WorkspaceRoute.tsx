import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { auth } from './auth';
import SynapseHubPage from './SynapseHubPage';
export default function WorkspaceRoute() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!auth);
  const [failure, setFailure] = useState('');
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!auth) return;
    let mounted = true;
    auth.auth
      .getSession()
      .then(({ data, error }) => {
        if (mounted) {
          setSession(data.session);
          setFailure(error?.message ?? '');
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setFailure(
            'Could not restore sign-in. Local mode remains available.',
          );
          setReady(true);
        }
      });
    const { data } = auth.auth.onAuthStateChange((event, next) => {
      if (mounted) {
        setSession(next);
        setReady(true);
        setRecovery(event === 'PASSWORD_RECOVERY');
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);
  if (!ready) return <p role="status">Restoring your session…</p>;
  return (
    <>
      <div role="status">{failure}</div>
      <SynapseHubPage
        key={session?.user.id ?? 'guest'}
        session={session}
        recovery={recovery}
        onRecovered={() => setRecovery(false)}
      />
    </>
  );
}
