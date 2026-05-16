'use client';

// Client island for the login screen. Owns the language + theme toggles
// in the top-right corner (both backed by their respective hooks +
// localStorage) and the editorial card with the magic-link email form.
//
// The server action is passed in as a prop so this stays a pure Client
// Component — no server bindings imported here.

import { Button, Icon, Input } from '@industrysignal/ui';
import { t, type Lang } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { useTheme, type Theme } from '@/lib/use-theme';

interface LoginFormProps {
  action: (formData: FormData) => void | Promise<void>;
  error?: string | null;
}

const ERRORS: Record<string, Record<Lang, string>> = {
  invalid_email: {
    cs: 'Zadejte platnou e-mailovou adresu.',
    en: 'Enter a valid email address.',
  },
  Verification: {
    cs: 'Odkaz je neplatný nebo už vypršel. Vyžádejte si nový.',
    en: 'This link is invalid or has expired. Request a new one.',
  },
  Configuration: {
    cs: 'Chyba konfigurace autentizace. Kontaktujte redakci.',
    en: 'Authentication is not configured. Contact the editorial team.',
  },
  EmailSignin: {
    cs: 'Odeslání odkazu selhalo. Zkuste to prosím znovu.',
    en: 'Sending the link failed. Please try again.',
  },
};

const GENERIC_ERROR: Record<Lang, string> = {
  cs: 'Odeslání odkazu selhalo. Zkuste to prosím znovu.',
  en: 'Sending the link failed. Please try again.',
};

function resolveError(lang: Lang, key?: string | null): string | null {
  if (!key) return null;
  return ERRORS[key]?.[lang] ?? GENERIC_ERROR[lang];
}

export function LoginForm({ action, error }: LoginFormProps) {
  const [lang, setLang] = useLang();
  const [theme, setTheme] = useTheme();
  const errorMessage = resolveError(lang, error);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          pointerEvents: 'none',
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--graphite-700) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          maskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 20,
          zIndex: 2,
          display: 'flex',
          gap: 10,
        }}
      >
        <ToggleGroup
          options={[
            { value: 'cs', label: 'CS · ČESKY' },
            { value: 'en', label: 'EN · ENGLISH' },
          ]}
          current={lang}
          onSelect={(v) => setLang(v as Lang)}
        />
        <ToggleGroup
          options={[
            { value: 'editorial', label: 'ED · EDITORIAL' },
            { value: 'graphite', label: 'GR · TERMINAL' },
          ]}
          current={theme}
          onSelect={(v) => setTheme(v as Theme)}
        />
      </div>

      <form
        action={action}
        style={{
          position: 'relative',
          zIndex: 1,
          width: 380,
          background: 'var(--bg-card)',
          border: '1px solid var(--ln-divider)',
          borderRadius: 'var(--r-lg)',
          padding: '36px 36px 28px',
          boxShadow: 'var(--elev-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <span
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              background: 'var(--amber-300)',
              color: 'var(--fg-on-amber)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: 22,
              letterSpacing: '-0.04em',
            }}
          >
            B
          </span>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 700,
              fontStyle: 'italic',
              letterSpacing: '-0.01em',
              color: 'var(--fg-primary)',
            }}
          >
            <span style={{ color: 'var(--amber-300)' }}>Industry</span>Signal
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            fontSize: 22,
            color: 'var(--fg-primary)',
            margin: '0 0 6px',
            letterSpacing: '-0.01em',
          }}
        >
          {t(lang, 'login_title')}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--fg-tertiary)',
            margin: '0 0 22px',
            lineHeight: 1.5,
          }}
        >
          {t(lang, 'login_sub')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label={t(lang, 'login_email')}
            name="email"
            type="email"
            required
            icon="user"
            autoComplete="email"
            autoFocus
            placeholder="vy@firma.cz"
          />
          {errorMessage && (
            <div
              role="alert"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.04em',
                color: 'var(--signal-down)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                border: '1px solid rgba(226,92,92,0.4)',
                borderRadius: 'var(--r-sm)',
                background: 'var(--signal-down-bg)',
              }}
            >
              <Icon name="alert-triangle" size={12} />
              {errorMessage}
            </div>
          )}
          <Button kind="primary" iconRight="chevron-right">
            {t(lang, 'login_submit')}
          </Button>
        </div>

        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: '1px solid var(--ln-divider)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
            }}
          >
            {t(lang, 'login_meta')}
          </span>
        </div>
      </form>
    </div>
  );
}

interface ToggleGroupProps {
  options: { value: string; label: string }[];
  current: string;
  onSelect: (value: string) => void;
}

function ToggleGroup({ options, current, onSelect }: ToggleGroupProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid var(--ln-border)',
        background: 'var(--bg-card)',
      }}
    >
      {options.map((opt, i) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            style={{
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              whiteSpace: 'nowrap',
              color: active ? 'var(--fg-on-amber)' : 'var(--fg-tertiary)',
              background: active ? 'var(--amber-300)' : 'transparent',
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              border: 'none',
              borderRight:
                i < options.length - 1 ? '1px solid var(--ln-border)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
