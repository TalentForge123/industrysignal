// Pipeline: render PDF for a published report, persist URL back.
//
// Called by the Inngest worker after a publish event, or manually via
// the CLI (apps/workers/src/cli/pdf-render.ts). Renders both language
// halves, persists files to `outDir`, and patches `report.pdf_url_*`.
// Upload to R2 is intentionally NOT here — the storage adapter lands
// in Sprint 6 per HANDOFF §9; for now the file path is what `pdf_url_*`
// stores, which the portal serves via a static route.

import {
  findReportById,
  setReportPdfUrls,
  type Database,
} from '@industrysignal/db';
import type { PdfRenderer, PdfRenderResult } from './render';

export interface RenderReportPdfsArgs {
  db: Database;
  reportId: string;
  /** URL the headless browser hits — typically the portal's print route. */
  printBaseUrl: string;
  outDir: string;
  renderer: PdfRenderer;
}

export interface RenderReportPdfsResult {
  cs: PdfRenderResult;
  en: PdfRenderResult;
}

export async function renderReportPdfs(
  args: RenderReportPdfsArgs,
): Promise<RenderReportPdfsResult> {
  const report = await findReportById(args.db, args.reportId);
  if (!report) throw new Error(`Report ${args.reportId} not found`);

  const cs = await args.renderer.render({
    url: buildPrintUrl(args.printBaseUrl, report.slug, 'cs'),
    baseName: `${report.slug}-cs`,
    outDir: args.outDir,
  });
  const en = await args.renderer.render({
    url: buildPrintUrl(args.printBaseUrl, report.slug, 'en'),
    baseName: `${report.slug}-en`,
    outDir: args.outDir,
  });

  await setReportPdfUrls(args.db, {
    reportId: report.id,
    pdfUrlCs: cs.publicUrl ?? cs.filePath,
    pdfUrlEn: en.publicUrl ?? en.filePath,
  });

  return { cs, en };
}

function buildPrintUrl(baseUrl: string, slug: string, lang: 'cs' | 'en'): string {
  const u = new URL(`${baseUrl.replace(/\/$/, '')}/portal/report/${slug}/print`);
  u.searchParams.set('lang', lang);
  return u.toString();
}
