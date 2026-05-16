// Full Auth.js v5 wiring — Node runtime only.
//
// Magic-link email is the only sign-in method (HANDOFF §6: "žádná hesla").
// Sessions ride in JWT cookies, so the `session` table the adapter signs
// up for stays empty; only `user` and `verification_token` see writes.

import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { schema } from '@industrysignal/db';
import authConfig from './auth.config';
import { db } from './lib/db';
import { sendMagicLink } from './lib/mail';

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
  ],
});
