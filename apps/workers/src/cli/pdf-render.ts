// CLI: render PDF for a given report id. Uses the stub renderer by
// default (no Playwright dependency); pass --playwright to opt in once
// the dependency is installed (Sprint 6).
//
// Usage:
//   pnpm --filter @industrysignal/workers pdf:render <reportId>
//   pnpm --filter @industrysignal/workers pdf:render --playwright <reportId>

import { config as loadEnv } from 'dotenv';
import { createDb } from '@industrysignal/db';
import { makeStubPdfRenderer, renderReportPdfs } from '../pdf';

loadEnv({ path: '../../.env' });
loadEnv({ path: '../../.env.local', override: true });

async function main() {
  const argv = process.argv.slice(2);
  const usePlaywright = argv.includes('--playwright');
  const reportId = argv.find((a) => !a.startsWith('--'));
  if (!reportId) {
    console.error('usage: pdf-render [--playwright] <reportId>');
    process.exit(2);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }
  const db = createDb(url, { max: 1 });
  const printBaseUrl = process.env.PORTAL_PRINT_BASE_URL ?? 'http://localhost:3000';
  const outDir = process.env.PDF_OUT_DIR ?? './out/pdf';

  const renderer = usePlaywright
    ? await (await import('../pdf/playwright-render')).createPlaywrightRenderer()
    : makeStubPdfRenderer();

  const out = await renderReportPdfs({
    db,
    reportId,
    printBaseUrl,
    outDir,
    renderer,
  });
  console.log('rendered:');
  console.log('  cs:', out.cs.filePath, `(${out.cs.bytes} bytes)`);
  console.log('  en:', out.en.filePath, `(${out.en.bytes} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
