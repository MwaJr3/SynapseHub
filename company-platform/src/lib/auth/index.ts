/** Session helpers for server components and actions. */
import { cache } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth/config';
import { lookupActor, type LookupActor } from '@/lib/auth/actor-lookup';

export type Actor = LookupActor;

export async function loadActor(userId: string): Promise<Actor | null> {
  return lookupActor(userId);
}

export const getSessionActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return loadActor(userId);
});

export async function requireUser(): Promise<Actor> {
  const actor = await getSessionActor();
  if (!actor) redirect('/member/sign-in');
  return actor;
}
