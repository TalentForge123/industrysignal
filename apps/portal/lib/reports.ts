// Portal-side report helpers — thin DB lookups returning bilingual
// shapes the ReportView component already understands.
//
// The portal renders the latest published row from the `report` table.
// When the table is empty (early dev, fresh DB) callers fall back to
// the mock fixture in `lib/mock-data.ts` — clearly labelled in the UI
// so analysts know they're seeing placeholder copy.

import {
  findLatestPublishedReport,
  findReportBySlug,
  listPublishedReports,
  parseReportBody,
  type ReportRow,
} from '@industrysignal/db';
import type { Lang } from '@industrysignal/i18n';
import { db } from './db';
import type {
  Report as ReportShape,
  ReportKpi,
  ReportRelatedAlert,
  ReportSection,
} from './mock-data';

export interface PortalReport extends ReportShape {
  id: string;
  slug: string;
  /** True when the report was hydrated from the `report` DB row rather than the mock fallback. */
  fromDb: true;
}

export async function getLatestReport(lang: Lang): Promise<PortalReport | null> {
  const row = await findLatestPublishedReport(db);
  if (!row) return null;
  return rowToReport(row, lang);
}

/**
 * Single DB hit, both language halves at once — what the report server
 * page uses to avoid a duplicate `SELECT ... ORDER BY published_at`.
 */
export async function getLatestReportBilingual(): Promise<
  { cs: PortalReport; en: PortalReport } | null
> {
  const row = await findLatestPublishedReport(db);
  if (!row) return null;
  return { cs: rowToReport(row, 'cs'), en: rowToReport(row, 'en') };
}

export async function getReportBySlug(
  slug: string,
  lang: Lang,
): Promise<PortalReport | null> {
  const row = await findReportBySlug(db, slug);
  // Both published and archived issues are visible to subscribers — the
  // archive list links to old quarters. Drafts/reviews stay hidden.
  if (!row || (row.status !== 'published' && row.status !== 'archived')) return null;
  return rowToReport(row, lang);
}

export async function listArchivedReports(lang: Lang): Promise<
  Array<{ slug: string; quarter: string; date: string; title: string }>
> {
  const rows = await listPublishedReports(db);
  return rows.map((row) => ({
    slug: row.slug,
    quarter: row.quarter,
    date: row.publishedAt ? formatDate(row.publishedAt, lang) : '—',
    title: lang === 'cs' ? row.titleCs : row.titleEn,
  }));
}

function rowToReport(row: ReportRow, lang: Lang): PortalReport {
  const body = parseReportBody(lang === 'cs' ? row.bodyCs : row.bodyEn);
  const title = lang === 'cs' ? row.titleCs : row.titleEn;
  return {
    id: row.id,
    slug: row.slug,
    fromDb: true,
    quarter: row.quarter,
    publishedAt: row.publishedAt ? formatDate(row.publishedAt, lang) : '',
    title,
    lead: body.lead,
    keyRatios: body.keyRatios as ReportKpi[],
    sections: body.sections.map((section) => {
      const sec = section as ReportSection & { kind?: string; kpis?: ReportKpi[] };
      return {
        id: sec.id,
        kind: sec.kind ?? sec.id,
        title: sec.title,
        summary: sec.summary,
        body: sec.body,
        kpis: Array.isArray(sec.kpis) ? sec.kpis : undefined,
      };
    }),
    relatedAlerts: (body as { relatedAlerts: unknown[] }).relatedAlerts as ReportRelatedAlert[],
  };
}

function formatDate(d: Date, lang: Lang): string {
  if (lang === 'cs') {
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}
