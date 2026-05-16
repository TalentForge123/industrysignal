// Session gate for /portal/*. Uses the edge-safe auth.config so the
// Drizzle adapter (Node-only) never lands in the middleware bundle.

import NextAuth from 'next-auth';
import authConfig from './auth.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on every request except Next internals + the auth route handlers
  // (those terminate inside the route, no need for middleware checks).
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
