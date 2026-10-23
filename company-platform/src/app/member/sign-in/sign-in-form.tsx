'use client';

import { useActionState } from 'react';

import { signInAction } from '@/app/actions/auth';
import type { ActionResult } from '@/lib/validation';

export function SignInForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    signInAction,
    null,
  );
  return (
    <form action={formAction} className="card grid gap-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field mt-1" />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field mt-1"
        />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary justify-self-start">
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      {state && !state.ok ? (
        <p role="alert" className="text-sm">{state.error}</p>
      ) : null}
    </form>
  );
}
