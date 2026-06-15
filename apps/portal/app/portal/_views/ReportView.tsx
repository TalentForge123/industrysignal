'use client';

// Quarterly report view — Bloomberg-style dense grid (editorial header +
// KPI strip + section rows with sidecar). Source of truth shifted from
// the mock fixture (Sprint 1) to Postgres (Sprint 4): the parent server
// component resolves the latest published row and hands a bilingual
// `dbReport` payload here. When it's null (table empty in early dev),
// the view falls back to the mock fixture with a small "preview" hint
// — so the page still renders against a fresh DB.

import { type CSSProperties } from 'react';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { getReport, type KpiDir, type Report } from '@/lib/mock-data';

interface Props {
  dbReport: { cs: Report; en: Report } | null;
}

export function ReportView({ dbReport }: Props) {
  const [lang] = useLang();
  const report = dbReport ? dbReport[lang] : getReport(lang);
  const fromDb = dbReport != null;

  return (
    <div style={{ background: 'var(--bg-app)', color: 'var(--fg-primary)', minHeight: '100%' }}>
      {!fromDb ? (
        <div
          style={{
            padding: '8px 24px',
            background: 'var(--graphite-900)',
            borderBottom: '1px solid var(--graphite-800)',
            color: 'var(--fg-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {lang === 'cs'
            ? 'NÁHLED — žádný publikovaný report v DB, zobrazena ukázková data.'
            : 'PREVIEW — no published report in DB, sample fixture shown.'}
        </div>
      ) : null}
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          borderBottom: '1px solid var(--graphite-800)',
        }}
      >
        <div style={{ padding: '20px 24px 18px', borderRight: '1px solid var(--graphite-800)' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--amber-300)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <span style={{ width: 18, height: 1, background: 'var(--amber-300)' }} />
            {t(lang, 'kicker_qrep', report.quarter, report.publishedAt.toUpperCase())}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              fontSize: 28,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              color: 'var(--fg-primary)',
              margin: '0 0 10px',
            }}
          >
            {report.title}
          </h1>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
              display: 'flex',
              gap: 14,
            }}
          >
            <span>{t(lang, 'report_byline')}</span>
            <span>·</span>
            <span>{t(lang, 'five_sections')}</span>
            <span>·</span>
            <span>{t(lang, 'thirtytwo_pages')}</span>
            <span>·</span>
            <span>{t(lang, 'n_companies')}</span>
          </div>
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={miniTitleStyle}>{t(lang, 'key_ratios')}</div>
          {report.keyRatios.map((ratio) => (
            <div
              key={ratio.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                gap: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
              }}
            >
              <span style={{ color: 'var(--fg-tertiary)', letterSpacing: '0.04em' }}>{ratio.label}</span>
              <span
                style={{
                  color: 'var(--fg-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                }}
              >
                {ratio.value}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: dirColor(ratio.dir) }}>
                {ratio.delta}
              </span>
            </div>
          ))}
        </div>
      </header>

      {report.sections.map((section, i) => (
        <section
          key={section.id}
          data-section={section.id}
          id={section.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr 320px',
            borderBottom: '1px solid var(--graphite-800)',
            minHeight: 220,
            scrollMarginTop: 24,
          }}
        >
          <div
            style={{
              borderRight: '1px solid var(--graphite-800)',
              padding: '14px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ fontSize: 18, color: 'var(--amber-300)', fontWeight: 600 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                color: 'var(--fg-muted)',
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                marginTop: 8,
                textTransform: 'uppercase',
              }}
            >
              {section.kind.toUpperCase()}
            </span>
          </div>
          <div style={{ padding: '16px 24px 18px' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--amber-300)',
              }}
            >
              {section.kind}
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--fg-primary)',
                margin: '6px 0 8px',
              }}
            >
              {section.title}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--fg-secondary)',
                maxWidth: 680,
                margin: '0 0 12px',
              }}
            >
              {section.summary}
            </p>
            {section.body.map((para, j) => (
              <p
                key={j}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: 'var(--fg-tertiary)',
                  margin: '0 0 8px',
                  maxWidth: 680,
                }}
              >
                {para}
              </p>
            ))}
          </div>
          <aside
            style={{
              borderLeft: '1px solid var(--graphite-800)',
              padding: '14px 16px',
              background: 'var(--graphite-1000)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={miniTitleStyle}>{t(lang, 'key_metrics')}</div>
            {section.kpis ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1,
                  background: 'var(--graphite-800)',
                }}
              >
                {section.kpis.map((k) => (
                  <div
                    key={k.label}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--graphite-1000)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--fg-muted)',
                      }}
                    >
                      {k.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 14,
                        color: 'var(--fg-primary)',
                        fontWeight: 600,
                      }}
                    >
                      {k.value}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: dirColor(k.dir) }}>
                      {k.delta}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                {t(lang, 'no_table_data')}
              </div>
            )}
            <div style={miniTitleStyle}>{t(lang, 'related_alerts')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {report.relatedAlerts.map((alert) => (
                <div
                  key={alert.ticker}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--fg-tertiary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--graphite-800)',
                    paddingBottom: 4,
                  }}
                >
                  <span>{alert.ticker}</span>
                  <span style={{ color: alert.dir === 'up' ? 'var(--signal-up)' : 'var(--signal-down)' }}>
                    {alert.delta}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </section>
      ))}
    </div>
  );
}

const miniTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

function dirColor(dir: KpiDir): string {
  switch (dir) {
    case 'up':
      return 'var(--signal-up)';
    case 'dn':
      return 'var(--signal-down)';
    case 'warn':
      return 'var(--signal-warn)';
  }
}
