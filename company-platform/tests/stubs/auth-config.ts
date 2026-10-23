/** Test stub for `@/lib/auth/config`. */
export const handlers = { GET: async () => null, POST: async () => null };

export async function signIn(): Promise<void> {
  // no-op in tests
}

export async function signOut(): Promise<void> {
  // no-op in tests
}

export async function auth(): Promise<null> {
  return null;
}
