/**
 * Auth.js (next-auth v5) configuration. Credentials sign-in only — no OAuth
 * secrets required for this platform. Disabled accounts are cut off at the
 * session layer, and role claims come from the database on every request.
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST !== 'false',
  session: { strategy: 'jwt' },
  pages: { signIn: '/member/sign-in' },
  providers: [
    Credentials({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const db = getDb();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email.toLowerCase()))
          .limit(1);
        if (!user || !user.passwordHash || user.disabledAt != null) return null;
        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'MEMBER';
      }
      if (token.id) {
        const db = getDb();
        const [row] = await db
          .select({ disabledAt: users.disabledAt })
          .from(users)
          .where(eq(users.id, String(token.id)))
          .limit(1);
        if (!row || row.disabledAt != null) return {};
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id) return session;
      session.user.id = String(token.id);
      session.user.role = String(token.role ?? 'MEMBER');
      return session;
    },
  },
});
