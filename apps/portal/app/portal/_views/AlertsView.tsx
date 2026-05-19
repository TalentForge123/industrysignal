'use client';

// Alert log — Bloomberg-style monitor backed by the real `alert` table
// (HANDOFF §7 + §16). The diff scheduler in @industrysignal/jobs writes
// rows; this view just reads them. Fresh rows (status='new') get a
// subtle amber wash; tone dot + label per row are derived from priority.

import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import type { AlertView as AlertRow } from '@/lib/alerts';

interface AlertsViewProps {
  alerts: AlertRow[];
}

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

// Kind taxonomy lives in §16; the dictionary has one key per kind plus
// an `_other` fallback for kinds the diff scheduler may emit before the
// view ships their translation.
function kindLabel(lang: 'cs' | 'en', kind: string): string {
  const key = `alert_kind_${kind}`;
  const label = t(lang, key);
  if (label === key) return t(lang, 'alert_kind_other');
  return label;
}

// Same-day → "HH:MM"; same year → "DD. M." (cs) / "Mon D" (en); older → ISO date.
function formatTime(iso: string, lang: 'cs' | 'en'): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const locale = lang === 'en' ? 'en-US' : 'cs-CZ';
  if (sameDay) {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }
  if (d.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric' }).format(d);
  }
  return d.toISOString().slice(0, 10);
}

export function AlertsView({ alerts }: AlertsViewProps) {
  const [lang] = useLang();
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

      {alerts.length === 0 ? (
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
          {t(lang, 'alerts_empty')}
        </div>
      ) : (
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
                  <td style={{ color: 'var(--fg-tertiary)' }}>{formatTime(a.createdAt, lang)}</td>
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
                      {kindLabel(lang, a.kind).toUpperCase()}
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
                    {a.sourceUrl && (
                      <>
                        {' '}
                        <a
                          href={a.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--amber-300)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          [{t(lang, 'alerts_source_link')}]
                        </a>
                      </>
                    )}
                  </td>
                  <td style={{ color: a.fresh ? 'var(--amber-300)' : 'var(--fg-muted)' }}>
                    {a.fresh ? t(lang, 'state_new') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
