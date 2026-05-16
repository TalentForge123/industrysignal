// Magic-link sign-in form.
//
// Server Component + inline server action — submits the email to Auth.js,
// which writes a verification token to the DB and calls our sendMagicLink
// function (dev: console.log; prod: Postmark). On success Auth.js
// redirects to /login/verify; the developer (in dev) or the user (in prod)
// then opens the magic link from terminal/email.

import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { t } from '@industrysignal/i18n';

const ERRORS: Record<string, string> = {
  invalid_email: 'Zadejte platnou e-mailovou adresu.',
  Verification: 'Odkaz je neplatný nebo už vypršel. Vyžádejte si nový.',
  Configuration: 'Chyba konfigurace autentizace. Kontaktujte redakci.',
  EmailSignin: 'Odeslání odkazu selhalo. Zkuste to prosím znovu.',
};

async function loginAction(formData: FormData) {
  'use server';
  const email = formData.get('email');
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/login?error=invalid_email');
  }
  await signIn('email', {
    email,
    redirectTo: '/login/verify',
  });
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; callbackUrl?: string };
}) {
  const errorKey = searchParams?.error;
  const errorMessage = errorKey ? (ERRORS[errorKey] ?? ERRORS.EmailSignin) : null;

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
          maxWidth: 420,
          background: 'var(--bg-card)',
          border: '1px solid var(--ln-divider)',
          borderRadius: 'var(--r-md)',
          padding: '40px 36px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
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
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '-0.015em',
              color: 'var(--fg-primary)',
            }}
          >
            <span style={{ fontStyle: 'italic' }}>Industry</span>
            <strong style={{ fontWeight: 700 }}>Signal</strong>
          </span>
        </div>

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
          {t('cs', 'login_title')}
        </div>
        <p
          style={{
            margin: '0 0 28px',
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--fg-secondary)',
          }}
        >
          Zadejte pracovní e-mail. Zašleme vám jednorázový přihlašovací odkaz; vstup je vyhrazen
          předplatitelům.
        </p>

        <form action={loginAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--fg-tertiary)',
              }}
            >
              {t('cs', 'login_email')}
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="vy@firma.cz"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                background: 'var(--bg-input)',
                color: 'var(--fg-primary)',
                border: `1px solid ${errorMessage ? 'var(--signal-down)' : 'var(--ln-border)'}`,
                borderRadius: 'var(--r-sm)',
                padding: '9px 12px',
                width: '100%',
                outline: 'none',
              }}
            />
          </label>

          {errorMessage && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--signal-down)',
              }}
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              padding: '10px 14px',
              borderRadius: 'var(--r-sm)',
              border: '1px solid transparent',
              background: 'var(--amber-300)',
              color: 'var(--fg-on-amber)',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            {t('cs', 'login_submit')}
          </button>
        </form>

        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid var(--ln-divider)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--fg-tertiary)',
          }}
        >
          {t('cs', 'login_meta')}
        </div>
      </div>
    </main>
  );
}
