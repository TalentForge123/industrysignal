// Edge-safe slice of the Auth.js config.
//
// Imported by middleware.ts and by the full auth.ts. Must not import the
// Drizzle adapter, postgres-js client, or anything else that touches Node
// APIs — middleware runs on the Vercel Edge runtime where those crash.
//
// Adapter + email provider live in auth.ts (Node-only).

import type { NextAuthConfig } from 'next-auth';

const PROTECTED_PREFIX = '/portal';

export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    verifyRequest: '/login/verify',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isOnProtected = nextUrl.pathname.startsWith(PROTECTED_PREFIX);
      if (!isOnProtected) return true;
      if (isLoggedIn) return true;
      const redirect = new URL('/login', nextUrl.origin);
      redirect.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search);
      return Response.redirect(redirect);
    },
    // JWT strategy means the session callback only receives `token`,
    // not `user`. We surface `token.sub` (the standard JWT subject =
    // user id from the adapter) onto `session.user.id` so server code
    // can read it without re-fetching.
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;
