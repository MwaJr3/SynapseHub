/**
 * Test stub for `@/lib/auth`. The signed-in actor is a mutable test value so
 * authorization tests can switch users freely.
 */
import type { Actor } from './actor-type';

export type { Actor };

let currentActor: Actor | null = null;

export function setTestActor(actor: Actor | null): void {
  currentActor = actor;
}

export async function getSessionActor(): Promise<Actor | null> {
  return currentActor;
}

export async function requireUser(): Promise<Actor> {
  if (!currentActor) throw new Error('Not signed in (test stub)');
  return currentActor;
}

export async function loadActor(userId: string): Promise<Actor | null> {
  // Real behaviour (including disabled-account checks) is exercised through
  // the database-backed tests in authorization.test.ts.
  return currentActor && currentActor.id === userId ? currentActor : null;
}
