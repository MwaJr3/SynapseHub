'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';

import { signIn, signOut } from '@/lib/auth/config';
import { getSessionActor } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema';
import { signInSchema, type ActionResult } from '@/lib/validation';

export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: undefined, error: 'Enter a valid email and password.' };
  }
  try {
    await signIn('credentials', {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: '/member/dashboard',
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: 'Sign-in failed. Check your credentials.' };
    }
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  const actor = await getSessionActor();
  if (actor) {
    const db = getDb();
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: 'auth.signout',
      resourceType: 'session',
      resourceId: actor.id,
    });
  }
  await signOut({ redirectTo: '/' });
}

export async function requireActorOrRedirect() {
  const actor = await getSessionActor();
  if (!actor) redirect('/member/sign-in');
  return actor;
}
