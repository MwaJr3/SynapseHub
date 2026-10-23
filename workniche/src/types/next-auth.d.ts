import type { DefaultSession } from 'next-auth';

/**
 * Auth.js session augmentation: every session user carries the database id
 * and role so authorization never depends on client-supplied claims.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
  }
}
