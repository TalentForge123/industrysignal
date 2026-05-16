'use client';

// Alert log — 1:1 port of ui_kits/portal/AlertsView.jsx. Real diff
// engine + email/SMS delivery lands in Sprint 3 (HANDOFF §7 + §8 Týden 3).
// Fresh rows get a subtle amber wash; tone dot + label per row.

import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { getAlerts } from '@/lib/mock-data';

function toneToken(tone: 'up' | 'dn' | 'warn'): string {
  switch (tone) {
    case 'up':
      return 'var(--signal-up)';
    case 'dn':
      return 'var(--signal-down)';
    case 'warn':
      return 'var(--signal-warn)';
  }
}

function toneLabelKey(tone: 'up' | 'dn' | 'warn'): string {
  switch (tone) {
    case 'up':
      return 'tone_pos';
    case 'dn':
      return 'tone_neg';
    case 'warn':
      return 'tone_warn';
  }
}

export function AlertsView() {
  const [lang] = useLang();
  const alerts = getAlerts(lang);
  const freshCount = alerts.filter((a) => a.fresh).length;

  return (
    <div style={{ fontFamily: 'var(--font-mono)' }}>
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
          ALRT · {t(lang, 'alerts_title')}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {t(lang, 'alerts_meta', alerts.length, freshCount)}
        </span>
      </div>

      <table className="bbg-table">
        <thead>
          <tr>
            <th style={{ width: 64 }}>{t(lang, 'col_time')}</th>
            <th style={{ width: 80 }}>{t(lang, 'col_tone')}</th>
            <th style={{ width: 70 }}>{t(lang, 'col_ticker')}</th>
            <th style={{ width: 100 }}>{t(lang, 'col_kind')}</th>
            <th style={{ width: 170 }}>{t(lang, 'col_target')}</th>
            <th>{t(lang, 'col_message')}</th>
            <th style={{ width: 60 }}>{t(lang, 'col_state')}</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => {
            const tone = toneToken(a.tone);
            return (
              <tr key={a.id} style={a.fresh ? { background: 'rgba(242, 187, 84, 0.04)' } : undefined}>
                <td style={{ color: 'var(--fg-tertiary)' }}>{a.time}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: tone }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        background: tone,
                        borderRadius: '50%',
                      }}
                    />
                    {t(lang, toneLabelKey(a.tone))}
                  </span>
                </td>
                <td>
                  <span className="key">{a.ticker ?? '—'}</span>
                </td>
                <td>
                  <span className="key" style={{ color: 'var(--fg-tertiary)' }}>
                    {a.kind.toUpperCase()}
                  </span>
                </td>
                <td style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{a.target}</td>
                <td
                  style={{
                    color: 'var(--fg-secondary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    letterSpacing: 0,
                  }}
                >
                  {a.body}
                </td>
                <td style={{ color: a.fresh ? 'var(--amber-300)' : 'var(--fg-muted)' }}>
                  {a.fresh ? t(lang, 'state_new') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
