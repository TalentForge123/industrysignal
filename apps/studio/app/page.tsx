// Studio inbox — all reports, ordered by workflow priority.
//
// First touchpoint when an editor opens the CMS. Reviews and drafts sit
// on top (work that needs an editor), published / archived below for
// reference. Each row links into the editor / preview / activity panels.

import Link from 'next/link';
import { listReportsForStudio, type ReportRow } from '@industrysignal/db';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function StudioInbox() {
  const rows = await listReportsForStudio(db);
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 14,
          borderBottom: '1px solid var(--graphite-800)',
          marginBottom: 18,
        }}
      >
        <div>
          <div className="studio-label">IndustrySignal · Studio</div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 700,
              margin: '6px 0 0',
              color: 'var(--fg-primary)',
            }}
          >
            Reporty
          </h1>
        </div>
        <Link
          href="/reports/new"
          className="studio-btn"
          data-variant="primary"
          style={{ textDecoration: 'none' }}
        >
          + Nový report
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="studio-card">
          <div className="studio-label">Inbox</div>
          <p style={{ color: 'var(--fg-tertiary)', margin: '8px 0 0' }}>
            Zatím nemáte žádné reporty. Začněte tlačítkem výše.
          </p>
        </div>
      ) : (
        <ReportTable rows={rows} />
      )}
    </main>
  );
}

function ReportTable({ rows }: { rows: ReportRow[] }) {
  return (
    <div style={{ border: '1px solid var(--graphite-800)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 100px 160px 120px',
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
          background: 'var(--graphite-900)',
          borderBottom: '1px solid var(--graphite-800)',
        }}
      >
        <span>Kvartál</span>
        <span>Titulek</span>
        <span>Stav</span>
        <span>Upraveno</span>
        <span style={{ textAlign: 'right' }}>Akce</span>
      </div>
      {rows.map((row) => (
        <Link
          key={row.id}
          // App Router rejects object-form hrefs for dynamic routes — interpolate.
          href={`/reports/${row.id}` as never}
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 100px 160px 120px',
            padding: '10px 12px',
            borderBottom: '1px solid var(--graphite-800)',
            color: 'inherit',
            textDecoration: 'none',
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.quarter}</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}>
            {row.titleCs}
            <span style={{ display: 'block', color: 'var(--fg-muted)', fontSize: 11, fontStyle: 'italic' }}>
              {row.titleEn}
            </span>
          </span>
          <span className="studio-pill" data-status={row.status} style={{ justifySelf: 'start' }}>
            {row.status}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--fg-tertiary)',
            }}
          >
            {row.updatedAt ? new Date(row.updatedAt).toISOString().slice(0, 16).replace('T', ' ') : '—'}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--amber-300)',
              textAlign: 'right',
            }}
          >
            otevřít →
          </span>
        </Link>
      ))}
    </div>
  );
}
