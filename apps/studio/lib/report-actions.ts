'use server';

// Studio server actions — thin wrappers over @industrysignal/db query
// helpers. Every action:
//   1. resolves the current editor identity (getCurrentEditor)
//   2. validates the form input (Zod-style hand-rolled — no zod dep yet)
//   3. delegates to the query helper (which writes both row + audit)
//   4. revalidates the studio routes that surface this report
//
// All errors bubble as plain Error so the server-component error boundary
// renders them; the form layer reads the action result for inline display.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  approveAndPublish,
  archiveReport,
  createReport,
  findReportById,
  parseReportBody,
  rejectFromReview,
  submitForReview,
  updateReportDraft,
} from '@industrysignal/db';
import { SEGMENT_ANALYZERS, type SegmentKey } from '@industrysignal/enrichment';
import { db } from './db';
import { getCurrentEditor } from './auth';
import { getLlmRunner } from './llm-runner';

export interface ActionResult {
  ok: boolean;
  error?: string;
  reportId?: string;
}

// ============================================================
// Create
// ============================================================

export async function createReportAction(formData: FormData): Promise<ActionResult> {
  const slug = String(formData.get('slug') ?? '').trim();
  const quarter = String(formData.get('quarter') ?? '').trim();
  const titleCs = String(formData.get('titleCs') ?? '').trim();
  const titleEn = String(formData.get('titleEn') ?? '').trim();

  if (!slug || !/^[a-z0-9-]{3,40}$/.test(slug)) {
    return { ok: false, error: 'Slug musí být kebab-case, 3–40 znaků (např. "2026-q2").' };
  }
  if (!quarter || !/^\d{4}-Q[1-4]$/.test(quarter)) {
    return { ok: false, error: 'Kvartál musí být ve formátu "YYYY-Q[1-4]" (např. "2026-Q2").' };
  }
  if (!titleCs || !titleEn) {
    return { ok: false, error: 'Titulky pro CS i EN jsou povinné.' };
  }

  const editor = await getCurrentEditor();
  const row = await createReport(db, {
    slug,
    quarter,
    titleCs,
    titleEn,
    createdBy: editor.id,
    bodyCs: { lead: '', key_ratios: [], sections: [], related_alerts: [] },
    bodyEn: { lead: '', key_ratios: [], sections: [], related_alerts: [] },
  });

  revalidatePath('/');
  redirect(`/reports/${row.id}`);
}

// ============================================================
// Update body — saves both language halves at once
// ============================================================

export async function saveReportBodyAction(
  reportId: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!reportId) return { ok: false, error: 'Missing reportId' };

  const editor = await getCurrentEditor();
  const titleCs = String(formData.get('titleCs') ?? '').trim();
  const titleEn = String(formData.get('titleEn') ?? '').trim();
  const bodyCsRaw = String(formData.get('bodyCs') ?? '');
  const bodyEnRaw = String(formData.get('bodyEn') ?? '');

  let bodyCs: unknown;
  let bodyEn: unknown;
  try {
    bodyCs = bodyCsRaw ? JSON.parse(bodyCsRaw) : null;
  } catch (err) {
    return { ok: false, error: `Neplatný JSON v CS těle: ${(err as Error).message}` };
  }
  try {
    bodyEn = bodyEnRaw ? JSON.parse(bodyEnRaw) : null;
  } catch (err) {
    return { ok: false, error: `Neplatný JSON v EN těle: ${(err as Error).message}` };
  }

  // Light shape check — parseReportBody is permissive but at least
  // guards against `bodyCs: "string"` slipping through.
  const cs = parseReportBody(bodyCs);
  const en = parseReportBody(bodyEn);
  if (!Array.isArray(cs.sections)) {
    return { ok: false, error: 'CS body.sections musí být pole.' };
  }
  if (!Array.isArray(en.sections)) {
    return { ok: false, error: 'EN body.sections musí být pole.' };
  }

  try {
    await updateReportDraft(db, {
      reportId,
      actorId: editor.id,
      titleCs: titleCs || undefined,
      titleEn: titleEn || undefined,
      bodyCs,
      bodyEn,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath(`/reports/${reportId}`);
  return { ok: true, reportId };
}

// ============================================================
// Workflow transitions
// ============================================================

export async function submitReportAction(reportId: string): Promise<ActionResult> {
  const editor = await getCurrentEditor();
  try {
    await submitForReview(db, { reportId, actorId: editor.id });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath('/');
  revalidatePath(`/reports/${reportId}`);
  return { ok: true, reportId };
}

export async function rejectReportAction(
  reportId: string,
  formData: FormData,
): Promise<ActionResult> {
  const note = String(formData.get('note') ?? '').trim();
  if (!note) return { ok: false, error: 'Důvod odmítnutí je povinný.' };
  const editor = await getCurrentEditor();
  try {
    await rejectFromReview(db, { reportId, actorId: editor.id, note });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath('/');
  revalidatePath(`/reports/${reportId}`);
  return { ok: true, reportId };
}

export async function publishReportAction(reportId: string): Promise<ActionResult> {
  const editor = await getCurrentEditor();
  try {
    await approveAndPublish(db, { reportId, actorId: editor.id });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath('/');
  revalidatePath(`/reports/${reportId}`);
  return { ok: true, reportId };
}

export async function archiveReportAction(reportId: string): Promise<ActionResult> {
  const editor = await getCurrentEditor();
  try {
    await archiveReport(db, { reportId, actorId: editor.id });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath('/');
  revalidatePath(`/reports/${reportId}`);
  return { ok: true, reportId };
}

// ============================================================
// LLM enrichment — merges a generated section into the draft body
// ============================================================

/**
 * Runs the segment analyzer and merges its draft section into the
 * report's body. Refuses to mutate a non-draft report — once a report
 * is in review or published the LLM regeneration is a fresh draft per
 * §5 (drafts cache per-quarter; re-runs require explicit re-quarter).
 */
export async function generateSegmentDraftAction(
  reportId: string,
  formData: FormData,
): Promise<ActionResult> {
  const segment = String(formData.get('segment') ?? '').trim();
  if (!segment || !(segment in SEGMENT_ANALYZERS)) {
    return {
      ok: false,
      error: `Neznámý segment "${segment}". Dostupné: ${Object.keys(SEGMENT_ANALYZERS).join(', ')}.`,
    };
  }

  const editor = await getCurrentEditor();
  const report = await findReportById(db, reportId);
  if (!report) return { ok: false, error: 'Report nenalezen.' };
  if (report.status !== 'draft') {
    return { ok: false, error: 'LLM draft lze generovat pouze pro draft.' };
  }

  const analyzer = SEGMENT_ANALYZERS[segment as SegmentKey];
  let result;
  try {
    result = await analyzer({
      db,
      quarter: report.quarter,
      runner: getLlmRunner(),
      consumerRef: `report:${report.id}`,
    });
  } catch (err) {
    return { ok: false, error: `Enrichment selhal: ${(err as Error).message}` };
  }

  // Merge — replace any existing section with the same id, else append.
  // The body JSONB shape is snake_case (lead, key_ratios, sections,
  // related_alerts); parseReportBody returns camelCase for ergonomics
  // so we go back to source-of-truth shape when writing.
  const mergeBody = (raw: unknown, incomingSection: typeof result.draftCs.section) => {
    const safeObj: Record<string, unknown> =
      raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {};
    const existingSections = Array.isArray(safeObj.sections)
      ? (safeObj.sections as Array<Record<string, unknown>>)
      : [];
    const idx = existingSections.findIndex(
      (s) => typeof s === 'object' && s !== null && s.id === incomingSection.id,
    );
    const nextSections =
      idx >= 0
        ? [
            ...existingSections.slice(0, idx),
            incomingSection,
            ...existingSections.slice(idx + 1),
          ]
        : [...existingSections, incomingSection];
    return {
      lead: typeof safeObj.lead === 'string' ? safeObj.lead : '',
      key_ratios: Array.isArray(safeObj.key_ratios) ? safeObj.key_ratios : [],
      sections: nextSections,
      related_alerts: Array.isArray(safeObj.related_alerts) ? safeObj.related_alerts : [],
    };
  };

  try {
    await updateReportDraft(db, {
      reportId,
      actorId: editor.id,
      bodyCs: mergeBody(report.bodyCs, result.draftCs.section),
      bodyEn: mergeBody(report.bodyEn, result.draftEn.section),
      note: `llm_draft:${segment}`,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath(`/reports/${reportId}`);
  return { ok: true, reportId };
}
