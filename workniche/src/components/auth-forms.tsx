'use client';

/** Sign-in / registration forms. Submits through server actions only. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type JSX } from 'react';

import { loginAction, registerAction } from '@/actions/auth';
import { Field, FormError } from '@/components/ui';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }): JSX.Element {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'JOB_SEEKER' | 'EMPLOYER'>('JOB_SEEKER');
  const [error, setError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    const result =
      mode === 'login'
        ? await loginAction({ email, password })
        : await registerAction({ name, email, password, role });
    setBusy(false);
    if (result.ok) {
      router.push('/dashboard');
      router.refresh();
      return;
    }
    setError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          {mode === 'login' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {mode === 'login' ? (
            <>
              No account yet?{' '}
              <Link href="/register" className="font-medium text-brand-700">
                Create one
              </Link>
            </>
          ) : (
            <>
              Already registered?{' '}
              <Link href="/login" className="font-medium text-brand-700">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="card space-y-4">
        <FormError message={error} />
        {mode === 'register' ? (
          <Field label="Name" error={fieldErrors.name?.[0]}>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </Field>
        ) : null}
        <Field label="Email" error={fieldErrors.email?.[0]}>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" error={fieldErrors.password?.[0]} hint={mode === 'register' ? 'At least 10 characters.' : undefined}>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />
        </Field>
        {mode === 'register' ? (
          <Field label="I am here to" error={fieldErrors.role?.[0]}>
            <select
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value as 'JOB_SEEKER' | 'EMPLOYER')}
            >
              <option value="JOB_SEEKER">Find work</option>
              <option value="EMPLOYER">Hire people</option>
            </select>
          </Field>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
