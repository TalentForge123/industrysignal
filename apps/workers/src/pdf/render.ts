// PDF rendering — Playwright-based, server-side. HANDOFF §2 + §8 Week 4.
//
// The actual `chromium.launch()` call is dependency-injected so this
// module can be imported from a Next API route (which would normally
// fail to bundle Playwright) and so unit tests can stub it. The
// Playwright import lives in `./playwright-render.ts`, which is only
// loaded when the worker process explicitly resolves it.
//
// Render contract: we hit the portal's `/portal/report/<slug>/print`
// route which serves the same body the on-screen renderer uses, but
// with a print-stylesheet attached. Playwright loads that URL with a
// signed `?print_token=<sig>` query parameter so we don't need to deal
// with the session cookie for an internal headless browser.

export interface PdfRenderArgs {
  /** Full URL to fetch — typically `http://portal-internal/portal/report/<slug>/print?print_token=...`. */
  url: string;
  /** Human-readable filename (no extension). */
  baseName: string;
  /** Output directory for the generated PDF. */
  outDir: string;
  /** A4 by default, hardcoded here — editorial PDFs only ship A4. */
  format?: 'A4' | 'Letter';
}

export interface PdfRenderResult {
  filePath: string;
  bytes: number;
  /** Public URL the portal serves to subscribers — null when stored locally only. */
  publicUrl: string | null;
}

export interface PdfRenderer {
  render(args: PdfRenderArgs): Promise<PdfRenderResult>;
}

/**
 * Build a stub renderer that emits a placeholder PDF byte string. Lets
 * the rest of the pipeline (storage, DB writeback) be exercised without
 * Playwright installed.
 */
export function makeStubPdfRenderer(): PdfRenderer {
  return {
    async render({ url, baseName, outDir }) {
      const { writeFile, mkdir } = await import('node:fs/promises');
      const { join } = await import('node:path');
      await mkdir(outDir, { recursive: true });
      const filePath = join(outDir, `${baseName}.pdf`);
      const placeholder = `%PDF-1.4\n% stub renderer\n% Source URL: ${url}\n`;
      const buf = new TextEncoder().encode(placeholder);
      await writeFile(filePath, buf);
      return { filePath, bytes: buf.byteLength, publicUrl: null };
    },
  };
}
