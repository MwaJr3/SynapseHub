'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';

import { signOutAction } from '@/actions/auth';

export function SignOutButton(): JSX.Element {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        await signOutAction();
        router.push('/');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
