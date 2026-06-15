'use client';

// Missions dashboard — terminal-style list of the operator's relationship-map
// engagements. Each row links to the mission detail (Sprint B). The "New
// mission" action opens the brief wizard. Styling follows the editorial /
// terminal chrome shared with Watch / Alerts (var(--graphite-*) tokens
// resolve under data-theme="editorial").

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type CSSProperties } from 'react';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';

export interface MissionListRow {
  code: string;
  clientName: string;
  intent: string;
  sourceMarket: string | null;
  targetMarket: string | null;
  status: string;
  deadline: string | null;
}

interface MissionListViewProps {
  rows: MissionListRow[];
}

const STATUS_TONE: Record<string, string> = {
  active: 'var(--signal-up)',
  draft: 'var(--fg-tertiary)',
  delivered: 'var(--amber-300)',
  monitoring: 'var(--signal-info)',
};

export function MissionListView({ rows }: MissionListViewProps) {
  const [lang] = useLang();
  const router = useRouter();

  return (
    <div style={{ padding: 0, fontFamily: 'var(--font-mono)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--graphite-800)',
          background: 'var(--graphite-1000)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--amber-300)',
            fontWeight: 600,
          }}
        >
          MSN · {t(lang, 'missions_title')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--fg-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {t(lang, 'missions_meta', rows.length)}
          </span>
          <Link href={'/portal/missions/new' as never} style={newButtonStyle()}>
            + {t(lang, 'missions_new').toUpperCase()}
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: 'var(--fg-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
          }}
        >
          {t(lang, 'missions_empty')}
        </div>
      ) : (
        <table className="bbg-table">
          <thead>
            <tr>
              <th style={{ width: 130 }}>{t(lang, 'col_msn_code')}</th>
              <th>{t(lang, 'col_msn_client')}</th>
              <th style={{ width: 110 }}>{t(lang, 'col_msn_intent')}</th>
              <th style={{ width: 110 }}>{t(lang, 'col_msn_market')}</th>
              <th style={{ width: 120 }}>{t(lang, 'col_msn_status')}</th>
              <th style={{ width: 110 }}>{t(lang, 'col_msn_deadline')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.code}
                onClick={() => router.push(`/portal/missions/${encodeURIComponent(r.code)}` as never)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <span className="key">{r.code}</span>
                </td>
                <td style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{r.clientName}</td>
                <td style={{ color: 'var(--fg-tertiary)' }}>{t(lang, `intent_${r.intent}`)}</td>
                <td style={{ color: 'var(--fg-tertiary)' }}>
                  {r.sourceMarket && r.targetMarket
                    ? `${r.sourceMarket} → ${r.targetMarket}`
                    : (r.targetMarket ?? r.sourceMarket ?? '—')}
                </td>
                <td>
                  <span
                    style={{
                      padding: '0 6px',
                      fontSize: 10,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: STATUS_TONE[r.status] ?? 'var(--fg-tertiary)',
                      border: '1px solid currentColor',
                    }}
                  >
                    {t(lang, `mstatus_${r.status}`)}
                  </span>
                </td>
                <td style={{ color: 'var(--fg-muted)' }}>
                  {r.deadline ? formatDate(r.deadline, lang) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatDate(iso: string, lang: 'cs' | 'en'): string {
  // `iso` is a 'YYYY-MM-DD' date string from Postgres `date`. Parse as a
  // calendar date (no TZ shift) and format per locale.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

function newButtonStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--graphite-1000)',
    background: 'var(--amber-300)',
    border: '1px solid var(--amber-300)',
    padding: '5px 12px',
    cursor: 'pointer',
    fontWeight: 600,
    textDecoration: 'none',
  };
}
