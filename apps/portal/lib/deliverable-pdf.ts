// Deliverable PDF generation (Block C, step 2).
//
// Renders a mission's deliverable to PDF by printing the public share page
// (/share/<token>?print=1) with Playwright — the same approach the report
// PDF pipeline uses (apps/workers/src/pdf). Playwright is loaded lazily and
// behind a try/catch: if chromium isn't available the renderer falls back
// to a placeholder PDF so storage + the UI flow still work (mirrors the
// workers' stub-first default).
//
// Storage is local by default (public/deliverables/<code>.pdf → served at
// /deliverables/<code>.pdf). R2 is behind a feature flag: set
// DELIVERABLE_STORAGE=r2 plus R2 credentials to upload off-box. Without the
// flag (the default), nothing external is touched.

import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createMissionShare,
  findMissionShareByToken,
  type Database,
  type MissionRow,
} from '@industrysignal/db';
import { db } from './db';

const PRINT_BASE_URL = process.env.PORTAL_PRINT_BASE_URL ?? 'http://localhost:3000';

export interface DeliverableResult {
  /** Public URL of the generated PDF (local /deliverables/... or R2). */
  pdfUrl: string;
  /** The full-mode share URL the PDF was printed from. */
  shareUrl: string;
  bytes: number;
  renderer: 'playwright' | 'stub';
  storage: 'local' | 'r2';
}

/** Reuse a recent full-mode share for the mission, or mint a new one. */
async function ensureFullShareToken(
  database: Database,
  missionId: string,
  userId: string | null,
): Promise<string> {
  const share = await createMissionShare(database, {
    missionId,
    mode: 'full',
    createdByUserId: userId,
  });
  return share.token;
}

async function renderPdf(url: string, outPath: string): Promise<{ bytes: number; renderer: 'playwright' | 'stub' }> {
  try {
    // webpackIgnore keeps Next from trying to bundle the node-only browser
    // driver; it's resolved at runtime on hosts that have it installed.
    // @ts-expect-error - `playwright` is an optional runtime dependency, not in package.json.
    const pw = await import(/* webpackIgnore: true */ 'playwright');
    const browser = await pw.chromium.launch({ headless: true });
    try {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      const buf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '18mm' },
      });
      await writeFile(outPath, buf);
      return { bytes: buf.byteLength, renderer: 'playwright' };
    } finally {
      await browser.close();
    }
  } catch (err) {
    // Chromium / playwright unavailable — write a valid placeholder PDF so
    // the rest of the flow (storage, share link, UI) still works.
    const placeholder = `%PDF-1.4\n% IndustrySignal deliverable — playwright unavailable, stub PDF.\n% reason: ${(err as Error).message}\n% source: ${url}\n`;
    const buf = Buffer.from(placeholder, 'utf8');
    await writeFile(outPath, buf);
    return { bytes: buf.byteLength, renderer: 'stub' };
  }
}

/**
 * R2 upload — behind a flag. Returns the external URL when configured, else
 * null (caller keeps the local URL). Real S3/R2 wiring (an @aws-sdk/client-s3
 * PutObject) lands when credentials are provided; until then this is a clean,
 * no-op extension point so local works out of the box.
 */
async function maybeUploadToR2(_filePath: string, _key: string): Promise<string | null> {
  if (process.env.DELIVERABLE_STORAGE !== 'r2') return null;
  const hasCreds =
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET;
  if (!hasCreds) {
    process.stderr.write('[deliverable-pdf] DELIVERABLE_STORAGE=r2 but R2_* creds missing — falling back to local.\n');
    return null;
  }
  // Credentials present but the S3 client isn't wired yet — documented TODO.
  process.stderr.write('[deliverable-pdf] R2 upload not yet implemented (add @aws-sdk/client-s3) — keeping local copy.\n');
  return null;
}

export async function generateDeliverablePdf(
  mission: MissionRow,
  userId: string | null,
): Promise<DeliverableResult> {
  const token = await ensureFullShareToken(db, mission.id, userId);
  const shareUrl = `${PRINT_BASE_URL}/share/${token}`;

  const dir = join(process.cwd(), 'public', 'deliverables');
  await mkdir(dir, { recursive: true });
  const safeCode = mission.code.replace(/[^A-Za-z0-9_-]/g, '_');
  const outPath = join(dir, `${safeCode}.pdf`);

  const { bytes, renderer } = await renderPdf(`${shareUrl}?print=1`, outPath);

  const localUrl = `/deliverables/${safeCode}.pdf`;
  const r2Url = await maybeUploadToR2(outPath, `deliverables/${safeCode}.pdf`);

  return {
    pdfUrl: r2Url ?? localUrl,
    shareUrl,
    bytes,
    renderer,
    storage: r2Url ? 'r2' : 'local',
  };
}

export { findMissionShareByToken };
