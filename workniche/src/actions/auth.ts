'use server';

/** Account actions: registration and credentials sign-in. */
import { eq } from 'drizzle-orm';
import { AuthError } from 'next-auth';

import { signIn, signOut } from '@/lib/auth/config';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { audit } from '@/lib/audit';
import {
  registerSchema,
  loginSchema,
  zodFieldErrors,
  type ActionResult,
} from '@/lib/validation';

export async function registerAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const email = parsed.data.email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return {
      ok: false,
      fieldErrors: { email: ['An account with this email already exists'] },
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [created] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
    })
    .returning({ id: users.id });

  await audit({
    actorId: created?.id ?? null,
    action: 'auth.register',
    resourceType: 'user',
    resourceId: created?.id ?? null,
    metadata: { role: parsed.data.role },
  });

  // Sign in through the same credentials flow the login form uses.
  await signIn('credentials', {
    email,
    password: parsed.data.password,
    redirect: false,
  });
  return { ok: true };
}

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  try {
    await signIn('credentials', {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: 'Email or password is incorrect.' };
    }
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirect: false });
}
