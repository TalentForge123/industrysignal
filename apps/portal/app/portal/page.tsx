// Protected portal placeholder.
//
// Middleware already redirects unauthenticated requests to /login, but
// auth() is called here too — the session payload (email) is rendered
// directly. The real shell (TopBar / Sidebar / Report / Watch / Alerts)
// lands in Sprint 5 once the prototype views are ported.

import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

async function logoutAction() {
  'use server';
  await signOut({ redirectTo: '/' });
}

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const email = session.user.email ?? '—';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 64px',
        gap: 32,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span
          aria-hidden="true"
          style={{
            width: 22,
            height: 22,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--amber-300)',
            color: 'var(--fg-on-amber)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 14,
            borderRadius: 'var(--r-xs)',
          }}
        >
          B
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            color: 'var(--fg-primary)',
          }}
        >
          <span style={{ fontStyle: 'italic' }}>Industry</span>
          <strong style={{ fontWeight: 700 }}>Signal</strong>{' '}
          <span style={{ color: 'var(--fg-tertiary)', fontWeight: 400 }}>· Portál</span>
        </h1>
        <span style={{ flex: 1 }} />
        <form action={logoutAction}>
          <button
            type="submit"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              padding: '8px 14px',
              borderRadius: 'var(--r-sm)',
              border: '1px solid var(--ln-border)',
              background: 'transparent',
              color: 'var(--fg-secondary)',
              cursor: 'pointer',
            }}
          >
            Odhlásit
          </button>
        </form>
      </header>

      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--ln-divider)',
          borderRadius: 'var(--r-md)',
          padding: 32,
          maxWidth: 720,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--accent-text)',
            marginBottom: 8,
          }}
        >
          Přihlášený uživatel
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 18,
            color: 'var(--fg-primary)',
            marginBottom: 24,
          }}
        >
          {email}
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--fg-secondary)',
          }}
        >
          Auth, session a session-gate fungují. Skutečné view obrazovky (Aktuální report, Archiv,
          Watch List, Alerty) přijdou v dalších commitech sprintu 1 — port z prototypu{' '}
          <code style={{ fontFamily: 'var(--font-mono)' }}>ui_kits/portal/</code> na řádné Next.js
          routy.
        </p>
      </section>
    </main>
  );
}
