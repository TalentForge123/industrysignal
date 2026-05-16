'use client';

// Function-index panel. 1:1 port of ui_kits/portal/Sidebar.jsx — 3 nav
// groups (Reports / Monitoring / Intelligence), a "Report sections" hash
// jump list, a static risk-map widget (real data lands with srsc_scores
// in Sprint 5+ per HANDOFF §22), and a footer user card.

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { RISK_MAP } from '@/lib/mock-data';

interface SidebarProps {
  user: { name: string; org: string };
  alertsCount: number;
}

interface NavItem {
  id: string;
  code: string;
  labelKey: string;
  href: string;
  badged?: boolean;
  newTag?: boolean;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: 'nav_reports',
    items: [
      { id: 'report', code: 'RPRT', labelKey: 'nav_current', href: '/portal/report' },
      { id: 'archive', code: 'ARCH', labelKey: 'nav_archive_full', href: '/portal/archive' },
    ],
  },
  {
    titleKey: 'nav_monitor',
    items: [
      { id: 'watchlist', code: 'WTCH', labelKey: 'nav_watchlist', href: '/portal/watchlist' },
      { id: 'alerts', code: 'ALRT', labelKey: 'nav_alerts_full', href: '/portal/alerts', badged: true },
    ],
  },
  {
    titleKey: 'nav_intelligence',
    items: [
      { id: 'srsc', code: 'SRSC', labelKey: 'nav_srsc', href: '/portal/srsc', newTag: true },
      { id: 'xmap', code: 'XMAP', labelKey: 'nav_xmap', href: '/portal/xmap', newTag: true },
    ],
  },
];

const SECTIONS = [
  { id: 'macro', labelKey: 'sec_macro' },
  { id: 'segments', labelKey: 'sec_segments' },
  { id: 'risks', labelKey: 'sec_risks' },
  { id: 'companies', labelKey: 'sec_companies' },
  { id: 'outlook', labelKey: 'sec_outlook' },
];

export function Sidebar({ user, alertsCount }: SidebarProps) {
  const [lang] = useLang();
  const pathname = usePathname();
  const [hover, setHover] = useState<string | null>(null);

  const userInitials = user.name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join('');

  return (
    <nav
      style={{
        width: 200,
        height: '100%',
        background: 'var(--graphite-1000)',
        borderRight: '1px solid var(--graphite-800)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-mono)',
        overflow: 'auto',
      }}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.titleKey} style={groupStyle}>
          <div style={groupTitleStyle}>{t(lang, group.titleKey)}</div>
          {group.items.map((item) => {
            const active = pathname?.startsWith(item.href) ?? false;
            const isHover = hover === item.id;
            return (
              <Link
                key={item.id}
                href={item.href as never}
                onMouseEnter={() => setHover(item.id)}
                onMouseLeave={() => setHover(null)}
                style={navItemStyle(active, isHover)}
              >
                <span style={codeStyle}>{item.code}</span>
                <span>{t(lang, item.labelKey)}</span>
                {item.badged && alertsCount > 0 && (
                  <span style={badgeStyle}>{alertsCount}</span>
                )}
                {item.newTag && <span style={newTagStyle}>NEW</span>}
              </Link>
            );
          })}
        </div>
      ))}

      <div style={groupStyle}>
        <div style={groupTitleStyle}>{t(lang, 'nav_section')}</div>
        {SECTIONS.map((sec, i) => {
          const key = 'sec' + i;
          const isHover = hover === key;
          return (
            <Link
              key={sec.id}
              href={`/portal/report#${sec.id}` as never}
              onMouseEnter={() => setHover(key)}
              onMouseLeave={() => setHover(null)}
              style={navItemStyle(false, isHover)}
            >
              <span style={codeStyle}>{String(i + 1).padStart(2, '0')}</span>
              <span>{t(lang, sec.labelKey)}</span>
            </Link>
          );
        })}
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--graphite-800)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: '0.12em',
            color: 'var(--fg-muted)',
            textTransform: 'uppercase',
          }}
        >
          {t(lang, 'risk_map')}
        </div>
        <RiskRow label={t(lang, 'risk_high')} value={RISK_MAP.high} pct={60} color="var(--signal-down)" />
        <RiskRow label={t(lang, 'risk_med')} value={RISK_MAP.med} pct={80} color="var(--signal-warn)" />
        <RiskRow label={t(lang, 'risk_low')} value={RISK_MAP.low} pct={40} color="var(--signal-up)" />
      </div>

      <div
        style={{
          marginTop: 'auto',
          padding: '8px 12px',
          fontSize: 9,
          color: 'var(--fg-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          borderTop: '1px solid var(--graphite-800)',
        }}
      >
        <div>
          {t(lang, 'user')} · {userInitials}
        </div>
        <div style={{ marginTop: 2 }}>{user.org}</div>
      </div>
    </nav>
  );
}

function RiskRow({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10,
        color: 'var(--fg-tertiary)',
        letterSpacing: '0.04em',
      }}
    >
      <span
        style={{
          width: 38,
          color: 'var(--fg-muted)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 4,
          background: 'var(--graphite-800)',
          position: 'relative',
          borderRadius: 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: pct + '%',
            background: color,
          }}
        />
      </div>
      <span
        style={{
          width: 38,
          textAlign: 'right',
          color: 'var(--fg-primary)',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const groupStyle: CSSProperties = { borderBottom: '1px solid var(--graphite-800)' };

const groupTitleStyle: CSSProperties = {
  padding: '6px 12px',
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--amber-300)',
  background: 'var(--graphite-900)',
  borderBottom: '1px solid var(--graphite-800)',
  fontWeight: 600,
};

const codeStyle: CSSProperties = {
  fontWeight: 700,
  color: 'var(--accent-text)',
  fontSize: 10,
  letterSpacing: '0.08em',
};

const badgeStyle: CSSProperties = {
  fontSize: 9,
  padding: '0 4px',
  borderRadius: 2,
  background: 'var(--signal-down)',
  color: 'var(--fg-on-amber)',
  fontWeight: 700,
};

const newTagStyle: CSSProperties = {
  fontSize: 8,
  padding: '0 4px',
  borderRadius: 1,
  background: 'var(--amber-300)',
  color: 'var(--fg-on-amber)',
  fontWeight: 700,
  letterSpacing: '0.08em',
};

function navItemStyle(active: boolean, hover: boolean): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: '36px 1fr auto',
    alignItems: 'center',
    padding: '4px 12px',
    color: active
      ? 'var(--amber-300)'
      : hover
        ? 'var(--fg-primary)'
        : 'var(--fg-secondary)',
    fontSize: 11,
    cursor: 'pointer',
    background: active
      ? 'rgba(242,187,84,0.08)'
      : hover
        ? 'var(--graphite-900)'
        : 'transparent',
    borderLeft: active ? '2px solid var(--amber-300)' : '2px solid transparent',
    paddingLeft: active ? 10 : 12,
    letterSpacing: '0.04em',
    textDecoration: 'none',
  };
}
