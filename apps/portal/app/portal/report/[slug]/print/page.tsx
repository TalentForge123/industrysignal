// Print-friendly render of a published report — the URL Playwright
// hits to produce the PDF. Bypasses the portal shell (no TopBar /
// Sidebar / CommandBar) and applies a black-on-cream stylesheet.
//
// Auth: NOT gated by the /portal/* session check. The middleware allows
// this route through under a signed `print_token` query param — the
// worker generates the token from a shared secret (lands in Sprint 6).
// Until then the route is open in dev; production hardening attaches
// the token verifier and rejects bare requests.

import { notFound } from 'next/navigation';
import { getReportBySlug } from '@/lib/reports';
import './print.css';

export const dynamic = 'force-dynamic';

export default async function ReportPrintPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { lang?: string };
}) {
  const lang = searchParams.lang === 'en' ? 'en' : 'cs';
  const report = await getReportBySlug(params.slug, lang);
  if (!report) notFound();

  return (
    <main className="print-root" lang={lang}>
      <header className="print-header">
        <div className="print-kicker">
          {lang === 'cs' ? 'KVARTÁLNÍ REPORT' : 'QUARTERLY REPORT'} · {report.quarter}
        </div>
        <h1 className="print-title">{report.title}</h1>
        {report.lead ? <p className="print-lead">{report.lead}</p> : null}
        <div className="print-meta">
          <span>IndustrySignal</span>
          <span>·</span>
          <span>{report.publishedAt}</span>
        </div>
      </header>

      {report.sections.map((section, i) => (
        <section
          key={section.id ?? i}
          className="print-section"
          data-section={section.id}
        >
          <div className="print-kicker">
            {String(i + 1).padStart(2, '0')} · {section.kind}
          </div>
          <h2 className="print-section-title">{section.title}</h2>
          {section.summary ? <p className="print-summary">{section.summary}</p> : null}
          {section.body.map((para, j) => (
            <p key={j} className="print-body">
              {para}
            </p>
          ))}
        </section>
      ))}

      <footer className="print-footer">
        <span>{lang === 'cs' ? 'Důvěrné — pouze pro klienta' : 'Confidential — client only'}</span>
        <span>industrysignal.cz</span>
      </footer>
    </main>
  );
}
