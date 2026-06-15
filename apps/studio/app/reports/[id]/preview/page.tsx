// Preview = the same DB-rendered shape that /portal/report shows
// subscribers. Editors hit this before "Submit for review" and again
// before "Approve and publish".
//
// We render both language halves stacked so the reviewer can scan parity
// at a glance — divergence in section ids or count is the most common
// editorial bug at this stage.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { findReportById, parseReportBody } from '@industrysignal/db';
import { db } from '@/lib/db';
import { ReportRenderer } from './ReportRenderer';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const row = await findReportById(db, params.id);
  if (!row) notFound();

  const cs = parseReportBody(row.bodyCs);
  const en = parseReportBody(row.bodyEn);

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Link
          href={`/reports/${row.id}` as never}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg-muted)',
            textDecoration: 'none',
          }}
        >
          ← Zpět do editoru
        </Link>
        <span className="studio-pill" data-status={row.status}>
          {row.status}
        </span>
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26,
          margin: '10px 0 18px',
        }}
      >
        Náhled · {row.quarter}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <ReportRenderer lang="cs" title={row.titleCs} body={cs} />
        <ReportRenderer lang="en" title={row.titleEn} body={en} />
      </div>
    </main>
  );
}
