// Single-report editor.
//
// The body editor is intentionally raw JSON for Sprint 4 — the editorial
// schema is in flux and a structured rich-text editor would lock the
// shape too early. Once §4 LLM enrichment produces stable per-section
// templates (Sprint 6), this swaps for a sectioned form. Until then a
// JSON textarea + a parse-error inline message is fast to iterate on
// and survives schema changes without UI rework.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  findReportById,
  listReportAudit,
  parseReportBody,
} from '@industrysignal/db';
import { db } from '@/lib/db';
import { SaveBodyForm } from './SaveBodyForm';
import { WorkflowActions } from './WorkflowActions';
import { LlmDraftPanel } from './LlmDraftPanel';

export const dynamic = 'force-dynamic';

export default async function ReportEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const row = await findReportById(db, params.id);
  if (!row) notFound();

  const audit = await listReportAudit(db, row.id);
  const cs = parseReportBody(row.bodyCs);
  const en = parseReportBody(row.bodyEn);
  const sectionCount = Math.max(cs.sections.length, en.sections.length);
  const editable = row.status === 'draft';

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg-muted)',
          textDecoration: 'none',
        }}
      >
        ← Zpět na seznam
      </Link>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 0',
          borderBottom: '1px solid var(--graphite-800)',
          marginBottom: 16,
        }}
      >
        <div>
          <div className="studio-label">{row.quarter} · {row.slug}</div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 700,
              margin: '6px 0 4px',
            }}
          >
            {row.titleCs}
          </h1>
          <div style={{ color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: 13 }}>
            {row.titleEn}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="studio-pill" data-status={row.status}>
            {row.status}
          </span>
          <Link
            href={`/reports/${row.id}/preview` as never}
            className="studio-btn"
            style={{ textDecoration: 'none' }}
          >
            Náhled
          </Link>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <section>
          <div className="studio-card" style={{ marginBottom: 12 }}>
            <div className="studio-label">Tělo reportu</div>
            <p style={{ color: 'var(--fg-tertiary)', fontSize: 12, margin: '6px 0 0' }}>
              {sectionCount} sekcí · CS {cs.sections.length} / EN {en.sections.length}.
              Editor pracuje s JSON shape {`{ lead, key_ratios, sections, related_alerts }`}.
              {editable ? ' Draft — uložení přepíše obsah.' : ' Po review jen ke čtení.'}
            </p>
          </div>

          <SaveBodyForm
            reportId={row.id}
            titleCs={row.titleCs}
            titleEn={row.titleEn}
            bodyCs={row.bodyCs}
            bodyEn={row.bodyEn}
            disabled={!editable}
          />
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <WorkflowActions reportId={row.id} status={row.status} />

          {row.status === 'draft' ? (
            <LlmDraftPanel reportId={row.id} />
          ) : null}

          <div className="studio-card">
            <div className="studio-label">Workflow</div>
            <ul
              style={{
                margin: '8px 0 0',
                padding: 0,
                listStyle: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg-tertiary)',
                lineHeight: 1.7,
              }}
            >
              <li>1. draft → review (Odeslat k revizi)</li>
              <li>2. review → published (Schválit)</li>
              <li>2'. review → draft (Vrátit s důvodem)</li>
              <li>3. published → archived (Archivovat)</li>
            </ul>
          </div>

          <div className="studio-card">
            <div className="studio-label">Audit ({audit.length})</div>
            <ul
              style={{
                margin: '8px 0 0',
                padding: 0,
                listStyle: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg-tertiary)',
              }}
            >
              {audit.length === 0 ? (
                <li style={{ color: 'var(--fg-muted)' }}>žádné události</li>
              ) : (
                audit.slice(0, 20).map((ev) => (
                  <li
                    key={ev.id}
                    style={{
                      padding: '5px 0',
                      borderBottom: '1px solid var(--graphite-800)',
                    }}
                  >
                    <div style={{ color: 'var(--fg-secondary)' }}>{ev.action}</div>
                    <div style={{ color: 'var(--fg-muted)' }}>
                      {ev.fromStatus ?? '—'} → {ev.toStatus ?? '—'} ·{' '}
                      {new Date(ev.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                    </div>
                    {ev.note ? (
                      <div style={{ color: 'var(--fg-tertiary)', marginTop: 2 }}>{ev.note}</div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
