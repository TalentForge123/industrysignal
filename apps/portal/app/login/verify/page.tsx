// Post-submit confirmation screen. Auth.js redirects here after
// /api/auth/signin/email stored the verification token and the magic
// link was dispatched (dev: console; prod: Postmark).

export default function VerifyPage() {
  const isDev = process.env.NODE_ENV !== 'production';
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--bg-card)',
          border: '1px solid var(--ln-divider)',
          borderRadius: 'var(--r-md)',
          padding: '40px 36px',
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
          Odkaz odeslán
        </div>
        <h1
          style={{
            margin: '0 0 16px',
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            color: 'var(--fg-primary)',
          }}
        >
          Zkontrolujte e-mail
        </h1>
        <p
          style={{
            margin: '0 0 16px',
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--fg-secondary)',
          }}
        >
          Odeslali jsme jednorázový přihlašovací odkaz na adresu, kterou jste zadali. Otevřením
          odkazu se přihlásíte do portálu. Platnost odkazu je 24 hodin.
        </p>
        {isDev && (
          <p
            style={{
              margin: '24px 0 0',
              padding: '12px 14px',
              background: 'var(--accent-soft)',
              border: '1px solid var(--ln-divider)',
              borderRadius: 'var(--r-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--fg-secondary)',
            }}
          >
            Vývojový režim: skutečný e-mail nebyl odeslán. Kompletní URL najdete v terminálu, kde
            běží <code>pnpm dev</code> — Cmd+klik na odkaz vás přihlásí.
          </p>
        )}
      </div>
    </main>
  );
}
