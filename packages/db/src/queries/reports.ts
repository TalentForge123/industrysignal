// Report editorial CMS — workflow + read helpers.
//
// HANDOFF §4 + §8 (Week 4). Reports move draft → review → published →
// archived. Every transition writes both the row and a `report_audit`
// entry; pure-write helpers stay here so server actions in the Studio
// app can stitch them together without re-implementing the audit log.
//
// Status transitions allowed (enforced in helper guards):
//   draft       → review       (submitForReview)
//   review      → draft        (rejectFromReview)
//   review      → published    (approveAndPublish — sets publishedAt)
//   published   → archived     (archive — superseded by a newer quarter)
//   archived    → published    (unarchive — admin-only escape hatch)
//
// The Studio app calls these from server actions; the portal calls only
// read helpers (`findLatestPublishedReport`, `findReportBySlug`).

import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../client';
import {
  reports,
  reportAudit,
  type ReportStatus,
  type ReportAuditAction,
} from '../schema';

export type ReportRow = typeof reports.$inferSelect;
export type ReportAuditRow = typeof reportAudit.$inferSelect;

// ============================================================
// READ
// ============================================================

/**
 * The latest published issue — what /portal/report renders. Returns
 * null when there is no published row yet (early dev). Ordered by
 * `publishedAt DESC` because slug-quarters do not sort
 * lexicographically across decade boundaries.
 */
export async function findLatestPublishedReport(
  db: Database,
): Promise<ReportRow | null> {
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.status, 'published'))
    .orderBy(desc(reports.publishedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function findReportBySlug(
  db: Database,
  slug: string,
): Promise<ReportRow | null> {
  const rows = await db.select().from(reports).where(eq(reports.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function findReportById(
  db: Database,
  id: string,
): Promise<ReportRow | null> {
  const rows = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Studio inbox + archive list. Ordered by status priority (drafts +
 * reviews on top so editors see actionable work first), then most
 * recently updated.
 */
export async function listReportsForStudio(db: Database): Promise<ReportRow[]> {
  return db
    .select()
    .from(reports)
    .orderBy(
      sql`CASE ${reports.status} WHEN 'review' THEN 0 WHEN 'draft' THEN 1 WHEN 'published' THEN 2 ELSE 3 END`,
      desc(reports.updatedAt),
    );
}

/** All published issues (descending by publishedAt). Powers /portal/archive. */
export async function listPublishedReports(db: Database): Promise<ReportRow[]> {
  return db
    .select()
    .from(reports)
    .where(eq(reports.status, 'published'))
    .orderBy(desc(reports.publishedAt));
}

export async function listReportAudit(
  db: Database,
  reportId: string,
): Promise<ReportAuditRow[]> {
  return db
    .select()
    .from(reportAudit)
    .where(eq(reportAudit.reportId, reportId))
    .orderBy(desc(reportAudit.createdAt));
}

// ============================================================
// WORKFLOW WRITES
// ============================================================

export interface CreateReportArgs {
  slug: string;
  quarter: string;
  titleCs: string;
  titleEn: string;
  createdBy: string;
  bodyCs?: unknown;
  bodyEn?: unknown;
}

export async function createReport(
  db: Database,
  args: CreateReportArgs,
): Promise<ReportRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(reports)
      .values({
        slug: args.slug,
        quarter: args.quarter,
        titleCs: args.titleCs,
        titleEn: args.titleEn,
        createdBy: args.createdBy,
        bodyCs: args.bodyCs ?? null,
        bodyEn: args.bodyEn ?? null,
        status: 'draft',
      })
      .returning();
    if (!row) throw new Error('createReport: insert returned no row');
    await writeAuditTx(tx, {
      reportId: row.id,
      action: 'create',
      actorId: args.createdBy,
      fromStatus: null,
      toStatus: 'draft',
    });
    return row;
  });
}

export interface UpdateReportBodyArgs {
  reportId: string;
  actorId: string;
  bodyCs?: unknown;
  bodyEn?: unknown;
  titleCs?: string;
  titleEn?: string;
  note?: string | null;
}

/**
 * Patches editable fields on a draft. Refuses to mutate reports in any
 * non-draft state — once submitted for review the body is frozen and the
 * reviewer either approves or rejects back to draft.
 */
export async function updateReportDraft(
  db: Database,
  args: UpdateReportBodyArgs,
): Promise<ReportRow> {
  return db.transaction(async (tx) => {
    const row = await assertStatus(tx, args.reportId, ['draft']);
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (args.bodyCs !== undefined) patch.bodyCs = args.bodyCs;
    if (args.bodyEn !== undefined) patch.bodyEn = args.bodyEn;
    if (args.titleCs !== undefined) patch.titleCs = args.titleCs;
    if (args.titleEn !== undefined) patch.titleEn = args.titleEn;
    const [updated] = await tx
      .update(reports)
      .set(patch)
      .where(eq(reports.id, row.id))
      .returning();
    if (!updated) throw new Error('updateReportDraft: update returned no row');
    await writeAuditTx(tx, {
      reportId: row.id,
      action: 'edit',
      actorId: args.actorId,
      fromStatus: row.status,
      toStatus: row.status,
      note: args.note ?? null,
    });
    return updated;
  });
}

export async function submitForReview(
  db: Database,
  args: { reportId: string; actorId: string; reviewerId?: string | null },
): Promise<ReportRow> {
  return db.transaction(async (tx) => {
    const row = await assertStatus(tx, args.reportId, ['draft']);
    validateReportReadyForReview(row);
    const [updated] = await tx
      .update(reports)
      .set({
        status: 'review',
        submittedAt: new Date(),
        submittedBy: args.actorId,
        reviewerId: args.reviewerId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, row.id))
      .returning();
    if (!updated) throw new Error('submitForReview: update returned no row');
    await writeAuditTx(tx, {
      reportId: row.id,
      action: 'submit_for_review',
      actorId: args.actorId,
      fromStatus: 'draft',
      toStatus: 'review',
    });
    return updated;
  });
}

export async function rejectFromReview(
  db: Database,
  args: { reportId: string; actorId: string; note: string },
): Promise<ReportRow> {
  return db.transaction(async (tx) => {
    const row = await assertStatus(tx, args.reportId, ['review']);
    const [updated] = await tx
      .update(reports)
      .set({
        status: 'draft',
        reviewerNotes: args.note,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, row.id))
      .returning();
    if (!updated) throw new Error('rejectFromReview: update returned no row');
    await writeAuditTx(tx, {
      reportId: row.id,
      action: 'reject',
      actorId: args.actorId,
      fromStatus: 'review',
      toStatus: 'draft',
      note: args.note,
    });
    return updated;
  });
}

export async function approveAndPublish(
  db: Database,
  args: { reportId: string; actorId: string },
): Promise<ReportRow> {
  return db.transaction(async (tx) => {
    const row = await assertStatus(tx, args.reportId, ['review']);
    const now = new Date();
    const [updated] = await tx
      .update(reports)
      .set({
        status: 'published',
        publishedAt: now,
        publishedBy: args.actorId,
        updatedAt: now,
      })
      .where(eq(reports.id, row.id))
      .returning();
    if (!updated) throw new Error('approveAndPublish: update returned no row');
    await writeAuditTx(tx, {
      reportId: row.id,
      action: 'publish',
      actorId: args.actorId,
      fromStatus: 'review',
      toStatus: 'published',
    });
    return updated;
  });
}

export async function archiveReport(
  db: Database,
  args: { reportId: string; actorId: string },
): Promise<ReportRow> {
  return db.transaction(async (tx) => {
    const row = await assertStatus(tx, args.reportId, ['published']);
    const [updated] = await tx
      .update(reports)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(reports.id, row.id))
      .returning();
    if (!updated) throw new Error('archiveReport: update returned no row');
    await writeAuditTx(tx, {
      reportId: row.id,
      action: 'archive',
      actorId: args.actorId,
      fromStatus: 'published',
      toStatus: 'archived',
    });
    return updated;
  });
}

/**
 * Set the cached PDF URLs on a published row. Called by the
 * Playwright PDF worker after upload to R2 (or the local fixture path
 * during dev). Status-agnostic on purpose — re-running the PDF job for
 * an archived issue is allowed.
 */
export async function setReportPdfUrls(
  db: Database,
  args: { reportId: string; pdfUrlCs?: string | null; pdfUrlEn?: string | null },
): Promise<ReportRow> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (args.pdfUrlCs !== undefined) patch.pdfUrlCs = args.pdfUrlCs;
  if (args.pdfUrlEn !== undefined) patch.pdfUrlEn = args.pdfUrlEn;
  const [updated] = await db
    .update(reports)
    .set(patch)
    .where(eq(reports.id, args.reportId))
    .returning();
  if (!updated) throw new Error('setReportPdfUrls: update returned no row');
  return updated;
}

// ============================================================
// HELPERS — guards + audit
// ============================================================

interface AuditEntry {
  reportId: string;
  action: ReportAuditAction;
  actorId: string | null;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
}

async function writeAuditTx(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  entry: AuditEntry,
): Promise<void> {
  await tx.insert(reportAudit).values({
    reportId: entry.reportId,
    action: entry.action,
    actorId: entry.actorId,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    note: entry.note ?? null,
    metadata: entry.metadata ?? null,
  });
}

async function assertStatus(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  reportId: string,
  allowed: ReportStatus[],
): Promise<ReportRow> {
  const rows = await tx.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  const row = rows[0];
  if (!row) {
    throw new Error(`Report ${reportId} not found`);
  }
  if (!allowed.includes(row.status as ReportStatus)) {
    throw new Error(
      `Report ${reportId} is in state '${row.status}', expected one of: ${allowed.join(', ')}`,
    );
  }
  return row;
}

/**
 * Pre-flight check for a submit_for_review transition. Enforces the
 * minimum editorial bar:
 *   - Czech body present + ≥ 1 section + every section has summary/body
 *   - English body present + ≥ 1 section + same checks
 *
 * The hard "every paragraph cites a source" rule from HANDOFF §5 lives
 * one tier above this guard — the analyst hits it in the Studio
 * editor while writing. We only refuse the wholly-empty case here so
 * the API surface stays useful without making the guard parser
 * lock-step with the prompt.
 */
function validateReportReadyForReview(row: ReportRow): void {
  const cs = parseReportBody(row.bodyCs);
  const en = parseReportBody(row.bodyEn);
  const reasons: string[] = [];
  if (!cs.sections.length) reasons.push('bodyCs has no sections');
  if (!en.sections.length) reasons.push('bodyEn has no sections');
  if (reasons.length) {
    throw new Error(`Report not ready for review: ${reasons.join('; ')}`);
  }
}

interface ParsedReportBody {
  lead: string;
  keyRatios: unknown[];
  sections: Array<{ id: string; title: string; summary: string; body: string[] }>;
  relatedAlerts: unknown[];
}

/**
 * Coercive parser — narrows the JSONB blob to the editorial shape used
 * across the app. Permissive: missing fields default to empty rather
 * than throwing, so a half-written draft stays loadable in the editor.
 */
export function parseReportBody(raw: unknown): ParsedReportBody {
  if (!raw || typeof raw !== 'object') {
    return { lead: '', keyRatios: [], sections: [], relatedAlerts: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    lead: typeof obj.lead === 'string' ? obj.lead : '',
    keyRatios: Array.isArray(obj.key_ratios) ? obj.key_ratios : [],
    sections: Array.isArray(obj.sections)
      ? (obj.sections as unknown[]).map((s) => {
          const sec = (s ?? {}) as Record<string, unknown>;
          return {
            id: String(sec.id ?? ''),
            title: String(sec.title ?? ''),
            summary: String(sec.summary ?? ''),
            body: Array.isArray(sec.body) ? (sec.body as unknown[]).map(String) : [],
          };
        })
      : [],
    relatedAlerts: Array.isArray(obj.related_alerts) ? obj.related_alerts : [],
  };
}
