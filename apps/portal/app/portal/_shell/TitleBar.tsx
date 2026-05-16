'use client';

// Bloomberg-style title bar — brand, tabs, tickers, CS/EN + ED/GR toggles,
// user initials, exit. Ported 1:1 from ui_kits/portal/TopBar.jsx with the
// onNav callback replaced by Next.js Link routing.

import { useTransition, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t, type Lang } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { useTheme } from '@/lib/use-theme';
import { TICKERS } from '@/lib/mock-data';

interface TitleBarProps {
  user: { name: string; org: string };
  alertsCount: number;
  logoutAction: () => Promise<void>;
}

interface Tab {
  id: string;
  code: string;
  labelKey: string;
  href: string;
  newTag?: boolean;
}

const TABS: Tab[] = [
  { id: 'report', code: 'RPRT', labelKey: 'tab_report', href: '/portal/report' },
  { id: 'archive', code: 'ARCH', labelKey: 'tab_archive', href: '/portal/archive' },
  { id: 'watchlist', code: 'WTCH', labelKey: 'tab_watch', href: '/portal/watchlist' },
  { id: 'alerts', code: 'ALRT', labelKey: 'tab_alerts', href: '/portal/alerts' },
  { id: 'srsc', code: 'SRSC', labelKey: 'tab_srsc', href: '/portal/srsc', newTag: true },
  { id: 'xmap', code: 'XMAP', labelKey: 'tab_xmap', href: '/portal/xmap', newTag: true },
];

export function TitleBar({ user, alertsCount, logoutAction }: TitleBarProps) {
  const [lang, setLang] = useLang();
  const [theme, setTheme] = useTheme();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const userInitials = user.name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join('');
  const orgShort = user.org.split(/\s+/)[0] ?? '';

  return (
    <div
      style={{
        height: 32,
        background: 'var(--graphite-1000)',
        borderBottom: '1px solid var(--graphite-800)',
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--fg-tertiary)',
        letterSpacing: '0.04em',
      }}
    >
      <div
        style={{
          width: 200,
          padding: '0 12px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--graphite-1000)',
          borderRight: '1px solid var(--graphite-800)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 18,
            height: 18,
            background: 'var(--amber-300)',
            color: 'var(--fg-on-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 14,
            letterSpacing: '-0.04em',
            flexShrink: 0,
          }}
        >
          B
        </span>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 14,
            fontWeight: 700,
            fontStyle: 'italic',
            letterSpacing: '-0.01em',
            color: 'var(--fg-primary)',
          }}
        >
          <span style={{ color: 'var(--amber-300)' }}>Industry</span>Signal
        </span>
      </div>

      <div style={{ display: 'flex', height: '100%', alignItems: 'stretch', minWidth: 0, overflow: 'hidden' }}>
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href) ?? false;
          return (
            <Link
              key={tab.id}
              href={tab.href as never}
              style={tabStyle(active)}
            >
              <span
                style={{
                  color: active ? 'var(--amber-300)' : 'var(--fg-muted)',
                  marginRight: 6,
                  fontWeight: 600,
                }}
              >
                {tab.code}
              </span>
              {t(lang, tab.labelKey)}
              {tab.newTag && (
                <span
                  style={{
                    marginLeft: 6,
                    padding: '0 4px',
                    background: 'var(--amber-300)',
                    color: 'var(--fg-on-amber)',
                    borderRadius: 1,
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                  }}
                >
                  NEW
                </span>
              )}
              {tab.id === 'alerts' && alertsCount > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    padding: '0 4px',
                    background: 'var(--signal-down)',
                    color: 'var(--fg-on-amber)',
                    borderRadius: 2,
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  {alertsCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div style={{ flex: 1, minWidth: 8 }} />

      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 12px',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {TICKERS.map((tk) => (
          <div key={tk.key} style={metricStyle}>
            <span style={{ color: 'var(--fg-muted)' }}>{tk.key}</span>
            <span style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{tk.value}</span>
            <span style={{ color: tk.dir === 'up' ? 'var(--signal-up)' : 'var(--signal-down)' }}>
              {tk.delta}
            </span>
          </div>
        ))}

        <Toggle
          title={lang === 'cs' ? 'Jazyk · CS aktivní' : 'Language · EN active'}
          options={[
            { value: 'cs', label: 'CS' },
            { value: 'en', label: 'EN' },
          ]}
          current={lang}
          onSelect={(v) => setLang(v as Lang)}
        />
        <Toggle
          title={theme === 'editorial' ? 'Editorial → Terminal' : 'Terminal → Editorial'}
          options={[
            { value: 'editorial', label: 'ED' },
            { value: 'graphite', label: 'GR' },
          ]}
          current={theme}
          onSelect={(v) => setTheme(v as 'editorial' | 'graphite')}
        />

        <div style={metricStyle}>
          <span style={{ color: 'var(--fg-muted)' }}>{userInitials}</span>
          <span style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{orgShort}</span>
        </div>
        <button
          type="button"
          onClick={() => startTransition(logoutAction)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {t(lang, 'exit').toUpperCase()}
        </button>
      </div>
    </div>
  );
}

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: '0 10px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: active ? 'var(--amber-300)' : 'var(--fg-tertiary)',
    background: active ? 'var(--graphite-900)' : 'transparent',
    borderRight: '1px solid var(--graphite-800)',
    cursor: 'pointer',
    gap: 6,
    textDecoration: 'none',
  };
}

const metricStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 6,
  whiteSpace: 'nowrap',
};

interface ToggleProps {
  options: { value: string; label: string }[];
  current: string;
  onSelect: (value: string) => void;
  title?: string;
}

function Toggle({ options, current, onSelect, title }: ToggleProps) {
  return (
    <div
      title={title}
      style={{
        display: 'inline-flex',
        height: 18,
        border: '1px solid var(--amber-400)',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.08em',
        flexShrink: 0,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            style={{
              padding: '0 6px',
              display: 'flex',
              alignItems: 'center',
              background: active ? 'var(--amber-300)' : 'transparent',
              color: active ? 'var(--fg-on-amber)' : 'var(--fg-tertiary)',
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              textTransform: 'uppercase',
              border: 'none',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              letterSpacing: 'inherit',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
