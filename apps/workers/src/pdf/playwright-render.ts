// Playwright-backed PDF renderer. Imported lazily by callers that have
// `playwright` available — the dependency is intentionally not added to
// package.json yet (Sprint 4 ships the worker skeleton + stub; real
// Playwright wiring lands when the install + Hetzner provisioning is
// done in Sprint 6 per HANDOFF §9).
//
// To use:
//   pnpm add playwright -F @industrysignal/workers
//   pnpm exec playwright install --with-deps chromium
// then import this module and pass the returned renderer in.

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PdfRenderArgs, PdfRenderResult, PdfRenderer } from './render';

export async function createPlaywrightRenderer(): Promise<PdfRenderer> {
  // Dynamic import keeps the static module graph clean. The
  // `@ts-expect-error` comment is the price for not adding playwright
  // to package.json until the Hetzner provisioning lands; once it's a
  // declared dependency, drop the directive.
  // @ts-expect-error - `playwright` is an optional dependency installed only on the worker host.
  const playwright = await import('playwright').catch((err: unknown) => {
    throw new Error(
      'createPlaywrightRenderer: `playwright` is not installed. Run ' +
        '`pnpm add playwright -F @industrysignal/workers` and `playwright install chromium`. ' +
        `Original error: ${(err as Error).message}`,
    );
  });

  const browser = await playwright.chromium.launch({ headless: true });

  return {
    async render(args: PdfRenderArgs): Promise<PdfRenderResult> {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.goto(args.url, { waitUntil: 'networkidle' });
        const pdfBuf: Buffer = await page.pdf({
          format: args.format ?? 'A4',
          printBackground: true,
          // Bloomberg-style dense margins. Editorial PDFs need a little
          // breathing room on the inside binding edge — bumped from
          // the Chrome default 1cm.
          margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '18mm' },
        });
        await mkdir(args.outDir, { recursive: true });
        const filePath = join(args.outDir, `${args.baseName}.pdf`);
        await writeFile(filePath, pdfBuf);
        return { filePath, bytes: pdfBuf.byteLength, publicUrl: null };
      } finally {
        await context.close();
      }
    },
  };
}
