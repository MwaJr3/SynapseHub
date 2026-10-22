/**
 * Auth.js (next-auth v5) configuration. Credentials sign-in is the default
 * path and works with no third-party services; Google/GitHub activate only
 * when their environment variables are set. Suspended accounts cannot sign
 * in or resume a session.
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function optionalProviders() {
  const providers = [];
  const googleId = process.env.AUTH_GOOGLE_ID;
  const googleSecret = process.env.AUTH_GOOGLE_SECRET;
  if (googleId && googleSecret) {
    providers.push(Google({ clientId: googleId, clientSecret: googleSecret }));
  }
  const githubId = process.env.AUTH_GITHUB_ID;
  const githubSecret = process.env.AUTH_GITHUB_SECRET;
  if (githubId && githubSecret) {
    providers.push(GitHub({ clientId: githubId, clientSecret: githubSecret }));
  }
  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Behind the platform preview proxy; AUTH_TRUST_HOST can override.
  trustHost: process.env.AUTH_TRUST_HOST !== 'false',
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    ...optionalProviders(),
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
        if (!user || !user.passwordHash) return null;
        if (user.suspendedAt != null) return null;
        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'JOB_SEEKER';
      }
      // Drop suspended accounts on the next request.
      if (token.id) {
        const db = getDb();
        const [row] = await db
          .select({ suspendedAt: users.suspendedAt })
          .from(users)
          .where(eq(users.id, String(token.id)))
          .limit(1);
        if (!row || row.suspendedAt != null) return {};
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id) return session;
      session.user.id = String(token.id);
      session.user.role = String(token.role ?? 'JOB_SEEKER');
      return session;
    },
  },
});
