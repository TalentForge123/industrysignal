// /dev-login — DEVELOPMENT-ONLY bypass that skips the magic-link
// email flow and signs in directly. Provisions the user row + org
// + default watchlist on first use (same path as a real first-time
// magic-link login, via the Credentials provider in ../auth.ts).
//
// TWO-TIER GATE — both must hold for this to work:
//   1. The Credentials provider is registered only when
//      NODE_ENV === 'development' (see auth.ts).
//   2. This page returns 404 when NODE_ENV !== 'development', so even
//      if a deploy somehow shipped the route file the URL is invisible.
//
// Reachable at http://localhost:3000/dev-login. The form pre-fills a
// throwaway address; override to test multi-user behavior. After
// sign-in the user lands at /portal and the rest of the app behaves
// exactly as for an Email-provider login.

import { notFound, redirect } from 'next/navigation';
import { signIn } from '../../auth';

const DEFAULT_EMAIL = 'dev@industrysignal.local';

export const dynamic = 'force-dynamic';

export default function DevLoginPage({
  searchParams,
}: {
  searchParams?: { email?: string; error?: string };
}) {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  async function devSignInAction(formData: FormData) {
    'use server';
    if (process.env.NODE_ENV !== 'development') {
      // Belt-and-braces — if the gate above is somehow bypassed (CDN
      // cache, etc.), refuse to honor the action.
      notFound();
    }
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      redirect('/dev-login?error=invalid_email');
    }
    // `signIn` from Auth.js v5 handles cookie set + redirect itself.
    // We pass redirectTo so the destination is /portal regardless of
    // any earlier callbackUrl the middleware might have stashed.
    await signIn('dev-bypass', { email, redirectTo: '/portal' });
  }

  const prefill = searchParams?.email ?? DEFAULT_EMAIL;
  const errorKey = searchParams?.error;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--graphite-1000)',
        color: 'var(--fg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          border: '1px solid var(--graphite-800)',
          background: 'var(--graphite-900)',
          padding: 32,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            background: 'var(--signal-warn)',
            color: 'var(--graphite-1000)',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          Development mode
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            margin: '0 0 8px',
            color: 'var(--fg-primary)',
          }}
        >
          Dev login bypass
        </h1>
        <p
          style={{
            fontSize: 12,
            color: 'var(--fg-tertiary)',
            margin: '0 0 24px',
            lineHeight: 1.6,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Skips the magic-link email flow. Signs in directly as the
          submitted address, provisioning a personal org + default
          watchlist on first use. Disabled outside of{' '}
          <code>NODE_ENV=development</code>.
        </p>

        <form action={devSignInAction}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={prefill}
            autoFocus
            style={{
              width: '100%',
              padding: '8px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              background: 'var(--graphite-1000)',
              border: '1px solid var(--graphite-800)',
              color: 'var(--fg-primary)',
              marginBottom: 16,
              boxSizing: 'border-box',
            }}
          />
          {errorKey && (
            <div
              style={{
                color: 'var(--signal-down)',
                fontSize: 11,
                marginBottom: 12,
              }}
            >
              {errorKey === 'invalid_email'
                ? 'Zadejte platnou e-mailovou adresu.'
                : 'Sign-in failed. Check the dev server logs.'}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--graphite-1000)',
              background: 'var(--amber-300)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Sign in &amp; continue →
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--graphite-800)',
            fontSize: 10,
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
            lineHeight: 1.6,
          }}
        >
          For the real magic-link flow visit{' '}
          <a href="/login" style={{ color: 'var(--amber-300)' }}>
            /login
          </a>
          .
        </div>
      </div>
    </main>
  );
}
