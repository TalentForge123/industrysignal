'use client';

// Archive view — table of past quarterly reports + per-row PDF download.
// 1:1 port of ui_kits/portal/ArchiveView.jsx.
//
// PDFs are built client-side in pure JS (see ./pdf.ts) and exposed via
// blob: URLs on real <a download> anchors so the browser's native
// download path handles them — programmatic .click() can be blocked by
// sandboxed iframes (CLAUDE.md caveat). Playwright-rendered editorial
// PDFs from real report sections replace this in Sprint 4.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { getArchive } from '@/lib/mock-data';
import { buildSimplePdf, slugify } from './pdf';

export function ArchiveView() {
  const [lang] = useLang();
  const rows = getArchive(lang);
  const [toast, setToast] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const pdfBody = (() => {
      const v = (t as never as (l: string, k: string) => unknown)(lang, 'pdf_body');
      return Array.isArray(v) ? (v as string[]) : [String(v)];
    })();
    const subtitle = t(lang, 'pdf_subtitle');
    const next: Record<string, string> = {};
    rows.forEach((r) => {
      const blob = buildSimplePdf({
        title: r.title.toUpperCase(),
        quarter: r.q,
        date: r.date,
        subtitle,
        body: pdfBody,
      });
      next[r.q] = URL.createObjectURL(blob);
    });
    setUrls(next);
    return () => {
      Object.values(next).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [lang, rows]);

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

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
          ARCH · {t(lang, 'arch_title')}
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
          {t(lang, 'arch_meta', rows.length)}
        </span>
      </div>

      <table className="bbg-table">
        <thead>
          <tr>
            <th style={{ width: 90 }}>{t(lang, 'col_quarter')}</th>
            <th style={{ width: 140 }}>{t(lang, 'col_published')}</th>
            <th>{t(lang, 'col_title')}</th>
            <th className="num" style={{ width: 70 }}>{t(lang, 'col_pages')}</th>
            <th className="num" style={{ width: 70 }}>{t(lang, 'col_sections')}</th>
            <th className="num" style={{ width: 90 }}>{t(lang, 'col_companies')}</th>
            <th style={{ width: 90 }}>{t(lang, 'col_status')}</th>
            <th style={{ width: 130 }}>{t(lang, 'col_actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const filename = `IndustrySignal_${r.q.replace(' ', '')}_${slugify(r.title)}.pdf`;
            return (
              <tr key={r.q}>
                <td>
                  <span className="key">{r.q.replace(' ', '')}</span>
                </td>
                <td style={{ color: 'var(--fg-tertiary)' }}>{r.date}</td>
                <td
                  style={{
                    color: 'var(--fg-primary)',
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 700,
                    letterSpacing: 0,
                  }}
                >
                  {r.title}
                </td>
                <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{32 - i * 2}</td>
                <td className="num" style={{ color: 'var(--fg-tertiary)' }}>5</td>
                <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{147 - i * 4}</td>
                <td>
                  <span
                    style={{
                      padding: '0 6px',
                      color: 'var(--signal-up)',
                      border: '1px solid currentColor',
                      fontSize: 10,
                    }}
                  >
                    {t(lang, 'status_open')}
                  </span>
                </td>
                <td>
                  <Link
                    href={'/portal/report' as never}
                    onClick={() => flash(`${t(lang, 'opening')} ${r.q}…`)}
                    style={{
                      color: 'var(--accent-text)',
                      cursor: 'pointer',
                      marginRight: 12,
                      userSelect: 'none',
                      textDecoration: 'none',
                    }}
                  >
                    {t(lang, 'open').toUpperCase()}
                  </Link>
                  <a
                    href={urls[r.q] ?? '#'}
                    download={filename}
                    target="_blank"
                    rel="noopener"
                    onClick={() => flash(`${t(lang, 'pdf_done')} · ${filename}`)}
                    style={{
                      color: 'var(--fg-tertiary)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      textDecoration: 'none',
                    }}
                  >
                    {t(lang, 'pdf')} ↓
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 36,
            right: 24,
            background: 'var(--graphite-900)',
            border: '1px solid var(--amber-300)',
            color: 'var(--fg-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            padding: '10px 14px',
            letterSpacing: '0.04em',
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
