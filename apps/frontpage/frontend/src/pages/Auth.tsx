import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Brand';
import { Spinner } from '../components/common';
import { errorMessage } from '../lib/format';
import { api } from '../lib/api';
import { useSession } from '../state/session';

function AuthFrame({ title, intro, children, footer }: { title: string; intro?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="auth-page" id="main">
      <div className="auth-card">
        <Link to="/" className="brand" aria-label="Frontpage home"><Logo /><span>Frontpage</span></Link>
        <h1>{title}</h1>
        {intro && <p className="muted">{intro}</p>}
        {children}
        {footer && <p className="auth-footer">{footer}</p>}
      </div>
    </main>
  );
}

function Field({ label, error, hint, ...props }: { label: string; error?: string | null; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const described = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={described} aria-required={props.required} {...props} />
      {hint && <small id={`${id}-hint`} className="muted">{hint}</small>}
      {error && <small id={`${id}-err`} className="field-error">{error}</small>}
    </div>
  );
}

function useGuestStart() {
  const { startGuest } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    setBusy(true); setError(null);
    try { await startGuest(); navigate('/app'); } catch (e) { setError(errorMessage(e)); setBusy(false); }
  };
  return { busy, error, start };
}

export function GuestButton({ className = 'btn btn-lg' }: { className?: string }) {
  const { busy, error, start } = useGuestStart();
  return (
    <>
      <button className={className} onClick={start} disabled={busy}>{busy ? <><Spinner /> Loading a sample front page…</> : 'Try as guest'}</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}

export function SignIn() {
  const { state, signIn } = useSession();
  const navigate = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const from = (loc.state as { from?: string } | null)?.from ?? '/app';
  if (state.status === 'ready') return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await signIn(email, password); navigate(from, { replace: true }); } catch (err) { setError(errorMessage(err)); setBusy(false); }
  };
  return (
    <AuthFrame title="Sign in" footer={<>New here? <Link to="/sign-up">Create an account</Link></>}>
      <form onSubmit={submit} noValidate>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || !email || !password}>{busy ? <><Spinner /> Signing in…</> : 'Sign in'}</button>
        <p className="auth-aside"><Link to="/forgot-password">Forgot your password?</Link></p>
      </form>
      <div className="auth-divider"><span>or</span></div>
      <GuestButton className="btn btn-block" />
    </AuthFrame>
  );
}

export function SignUp() {
  const { state, signUp } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A guest who decides to sign up should still see this form.
  if (state.status === 'ready' && !state.user.is_guest) return <Navigate to="/app" replace />;

  const tooShort = password.length > 0 && password.length < 8;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return;
    setBusy(true); setError(null);
    try { await signUp(email, password, name); navigate('/app', { replace: true }); } catch (err) { setError(errorMessage(err)); setBusy(false); }
  };
  return (
    <AuthFrame title="Create your account" intro="Keep your feeds, read state and layouts across devices." footer={<>Already have an account? <Link to="/sign-in">Sign in</Link></>}>
      <form onSubmit={submit} noValidate>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <Field label="Name (optional)" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." error={tooShort ? 'Use at least 8 characters.' : null} />
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || !email || password.length < 8}>{busy ? <><Spinner /> Creating account…</> : 'Create account'}</button>
      </form>
    </AuthFrame>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ message: string; token?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { const r = await api.resetRequest(email); setDone({ message: r.message, token: r.dev_token }); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title="Reset your password" intro="Enter your email and we’ll prepare a reset link." footer={<Link to="/sign-in">Back to sign in</Link>}>
      {done ? (
        <div className="notice" role="status">
          <p>{done.message}</p>
          {done.token && <p>Demo mode: <Link to={`/reset-password?token=${encodeURIComponent(done.token)}`}>open your reset link</Link>.</p>}
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || !email}>{busy ? <><Spinner /> Sending…</> : 'Send reset link'}</button>
        </form>
      )}
    </AuthFrame>
  );
}

export function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await api.resetConfirm(token, password); setDone(true); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  if (!token) return <AuthFrame title="Reset link missing" footer={<Link to="/forgot-password">Request a new link</Link>}><p className="muted">Open the link from your reset message, or request a new one.</p></AuthFrame>;
  return (
    <AuthFrame title="Choose a new password" footer={<Link to="/sign-in">Back to sign in</Link>}>
      {done ? (
        <div className="notice" role="status"><p>Password updated. You’ve been signed out everywhere, so <Link to="/sign-in">sign in with the new password</Link>.</p></div>
      ) : (
        <form onSubmit={submit} noValidate>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <Field label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." />
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || password.length < 8}>{busy ? <><Spinner /> Saving…</> : 'Update password'}</button>
        </form>
      )}
    </AuthFrame>
  );
}
