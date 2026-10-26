import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/common';

export function NotFound({ inApp = false }: { inApp?: boolean }) {
  const body = (
    <EmptyState icon={<Compass size={28} />} title="This page doesn’t exist" actions={<Link className="btn btn-primary" to={inApp ? '/app' : '/'}>{inApp ? 'Back to your articles' : 'Go to Frontpage'}</Link>}>
      <p>The link may be old or mistyped.</p>
    </EmptyState>
  );
  return inApp ? <div className="page">{body}</div> : <main className="auth-page" id="main">{body}</main>;
}
