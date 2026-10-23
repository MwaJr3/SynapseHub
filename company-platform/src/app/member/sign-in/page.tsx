import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getSessionActor } from '@/lib/auth';
import { SignInForm } from './sign-in-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  const actor = await getSessionActor();
  if (actor) redirect('/member/dashboard');
  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Member sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to manage your profile, resume, and publication status.
        </p>
      </header>
      <SignInForm />
    </div>
  );
}
