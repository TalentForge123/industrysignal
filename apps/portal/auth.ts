// Full Auth.js v5 wiring — Node runtime only.
//
// Magic-link email is the only sign-in method (HANDOFF §6: "žádná hesla").
// Sessions ride in JWT cookies, so the `session` table the adapter signs
// up for stays empty; only `user` and `verification_token` see writes.

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { schema } from '@industrysignal/db';
import { eq } from 'drizzle-orm';
import authConfig from './auth.config';
import { db } from './lib/db';
import { sendMagicLink } from './lib/mail';
import { getOrCreateDefaultOrgForUser } from './lib/orgs';

const IS_DEV = process.env.NODE_ENV === 'development';

// Dev-only bypass: a Credentials provider that trusts whatever email
// is submitted, upserts the user row, and seeds the org via the same
// idempotent helper the production createUser event uses. Gated on
// NODE_ENV so it cannot reach the production bundle — see /dev-login
// page for the matching UI entry point.
//
// SECURITY: do NOT add an extra knob (env var, etc.) to enable this in
// production. The two-tier gate (NODE_ENV + page-level notFound) is the
// guarantee that a bad-deploy can't unlock it accidentally.
const devBypassProvider = Credentials({
  id: 'dev-bypass',
  name: 'Dev bypass',
  credentials: {
    email: { label: 'Email', type: 'email' },
  },
  async authorize(creds) {
    if (!IS_DEV) return null;
    const raw = creds?.email;
    const email = (typeof raw === 'string' ? raw : '').toLowerCase().trim();
    if (!email || !email.includes('@')) return null;

    // Upsert via direct Drizzle — Credentials providers bypass the
    // adapter so we maintain the `user` row + run org provisioning
    // ourselves. Keeps the dev login path within the same invariants
    // production magic-link users get.
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    let user = existing[0];
    if (!user) {
      const [inserted] = await db
        .insert(schema.users)
        .values({ email, emailVerified: new Date() })
        .returning();
      if (!inserted) return null;
      user = inserted;
    }

    await getOrCreateDefaultOrgForUser({
      userId: user.id,
      email: user.email,
      displayName: user.name ?? null,
    });

    return { id: user.id, email: user.email, name: user.name };
  },
});

if (IS_DEV) {
  // Loud-by-design — operators should never see this in a prod log.
  process.stderr.write(
    '[auth] DEV bypass enabled — /dev-login route active. Should not appear in production.\n',
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    {
      id: 'email',
      type: 'email',
      name: 'Email',
      from: process.env.POSTMARK_FROM_EMAIL ?? 'portal@industrysignal.cz',
      maxAge: 24 * 60 * 60, // 24 hours
      options: {},
      sendVerificationRequest: async ({ identifier, url, expires }) => {
        await sendMagicLink({ to: identifier, url, expiresAt: expires });
      },
    },
    ...(IS_DEV ? [devBypassProvider] : []),
  ],
  events: {
    // Fires exactly once per user, when the adapter inserts their row.
    // We provision a personal org + admin role + default watchlist
    // synchronously so the very first call to /portal/* already has
    // org-scoped data to render.
    async createUser({ user }) {
      if (!user.id) return;
      await getOrCreateDefaultOrgForUser({
        userId: user.id,
        email: user.email ?? null,
        displayName: user.name ?? null,
      });
    },
  },
});
