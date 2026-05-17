// Persistence helpers for the `insolvency_event` table.
//
// `upsertInsolvencyEvents` mirrors the company-side helper: idempotent
// (re-applying the same payload is a no-op write), `last_seen_at`
// always advances, and per-row body updates only fire when
// `content_hash` differs. The composite natural key is the Czech
// "spisová značka": (countryIso, caseKind, caseSenate, caseNumber,
// caseYear).
//
// Detecting cases that vanished from the upstream result (e.g. a typo
// in the previous fetch corrected itself) is intentionally out of
// scope here — that's diff-worker logic for Sprint 3.

import type { IsirEventSnapshot, IsirResult } from '@industrysignal/connectors-cz';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { insolvencyEvents } from '../schema';

export type InsolvencyEventRow = typeof insolvencyEvents.$inferSelect;

export interface UpsertEventResult {
  event: InsolvencyEventRow;
  changed: boolean;
  created: boolean;
}

export interface UpsertInsolvencyResult {
  // null when the query produced no matches (upstream WS2 = empty). The
  // caller distinguishes "no insolvency on file" (events=[]) from
  // "couldn't reach upstream" (which would surface as an error here).
  events: UpsertEventResult[];
  resultCount: number;
}

export async function upsertInsolvencyEvents(
  db: Database,
  result: IsirResult,
): Promise<UpsertInsolvencyResult> {
  const out: UpsertEventResult[] = [];
  for (const snapshot of result.events) {
    out.push(await upsertOneEvent(db, snapshot));
  }
  return { events: out, resultCount: result.resultCount };
}

async function upsertOneEvent(
  db: Database,
  snapshot: IsirEventSnapshot,
): Promise<UpsertEventResult> {
  return db.transaction(async (tx) => {
    const fetchedAt = new Date(snapshot.fetchedAt);
    const upstreamSyncedAt = snapshot.upstreamSyncedAt
      ? new Date(snapshot.upstreamSyncedAt)
      : null;

    const existing = await tx
      .select()
      .from(insolvencyEvents)
      .where(
        and(
          eq(insolvencyEvents.countryIso, snapshot.countryIso),
          eq(insolvencyEvents.caseKind, snapshot.caseKind),
          eq(insolvencyEvents.caseSenate, snapshot.caseSenate),
          eq(insolvencyEvents.caseNumber, snapshot.caseNumber),
          eq(insolvencyEvents.caseYear, snapshot.caseYear),
        ),
      )
      .limit(1);

    const base = snapshotToFields(snapshot, fetchedAt, upstreamSyncedAt);

    if (existing.length === 0) {
      const [inserted] = await tx
        .insert(insolvencyEvents)
        .values({ ...base, createdAt: fetchedAt })
        .returning();
      if (!inserted) throw new Error('upsertInsolvencyEvents: insert returned no row');
      return { event: inserted, changed: true, created: true };
    }

    const prior = existing[0]!;
    if (prior.contentHash === snapshot.contentHash) {
      const [updated] = await tx
        .update(insolvencyEvents)
        .set({ lastSeenAt: fetchedAt })
        .where(eq(insolvencyEvents.id, prior.id))
        .returning();
      return { event: updated ?? prior, changed: false, created: false };
    }

    const [updated] = await tx
      .update(insolvencyEvents)
      .set({ ...base, updatedAt: fetchedAt })
      .where(eq(insolvencyEvents.id, prior.id))
      .returning();
    return { event: updated ?? prior, changed: true, created: false };
  });
}

function snapshotToFields(
  snapshot: IsirEventSnapshot,
  fetchedAt: Date,
  upstreamSyncedAt: Date | null,
) {
  return {
    countryIso: snapshot.countryIso,
    sourceKey: snapshot.sourceKey,
    debtorIco: snapshot.debtorIco ?? null,
    debtorRc: snapshot.debtorRc ?? null,
    debtorName: snapshot.debtorName ?? null,
    debtorAddress: (snapshot.debtorAddress ?? null) as object | null,
    caseCourt: snapshot.caseCourt ?? null,
    caseSenate: snapshot.caseSenate,
    caseKind: snapshot.caseKind,
    caseNumber: snapshot.caseNumber,
    caseYear: snapshot.caseYear,
    caseStatus: snapshot.caseStatus ?? null,
    caseDetailUrl: snapshot.caseDetailUrl ?? null,
    otherDebtorsInCase: snapshot.otherDebtorsInCase,
    bankruptcyStartedAt: snapshot.bankruptcyStartedAt ?? null,
    bankruptcyEndedAt: snapshot.bankruptcyEndedAt ?? null,
    raw: snapshot.raw as object,
    contentHash: snapshot.contentHash,
    upstreamSyncedAt,
    fetchedAt,
    lastSeenAt: fetchedAt,
  };
}
