// Persistence helpers for Justice.cz officers + filings.
//
// Same conventions as companies.ts / insolvency.ts:
//   - Idempotent — re-applying the same JusticeSnapshot is a no-op write
//     (only `last_seen_at` advances) thanks to content-hash gating.
//   - Officers + filings share a per-snapshot transaction so a partial
//     parse failure leaves nothing half-applied.
//   - The caller passes a `companyId` we already looked up (typically
//     immediately after upsertCompanyFromAres returned). We deliberately
//     don't auto-create company rows here: when ARES has no record but
//     Justice does, that's a data-quality signal worth surfacing in the
//     caller rather than silently materializing a partial company.
//
// `terminatedAt: null` officers are "currently active". The Week-3 diff
// worker computes set differences across (current_active, prior_active)
// to emit `executive_change` alerts; this helper just maintains the
// current authoritative set.

import type { JusticeSnapshot } from '@industrysignal/connectors-cz';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { companyFilings, companyOfficers } from '../schema';

// Drizzle's transaction callback receives a narrower handle than the
// top-level Database (no `$client`, slightly different generics). We
// extract that callback-parameter type so sub-functions accept whatever
// shape Drizzle hands them — without leaking implementation types into
// the public API.
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export type CompanyOfficerRow = typeof companyOfficers.$inferSelect;
export type CompanyFilingRow = typeof companyFilings.$inferSelect;

export interface UpsertJusticeResult {
  officersInserted: number;
  officersUpdated: number;
  officersUnchanged: number;
  filingsInserted: number;
  filingsUpdated: number;
  filingsUnchanged: number;
}

export interface UpsertJusticeArgs {
  /** Already-resolved `company.id` (typically from upsertCompanyFromAres). */
  companyId: string;
  snapshot: JusticeSnapshot;
}

export async function upsertJusticeSnapshot(
  db: Database,
  args: UpsertJusticeArgs,
): Promise<UpsertJusticeResult> {
  const { companyId, snapshot } = args;
  const fetchedAt = new Date(snapshot.fetchedAt);

  return db.transaction(async (tx) => {
    const officers = await upsertOfficers(tx, companyId, snapshot, fetchedAt);
    const filings = await upsertFilings(tx, companyId, snapshot, fetchedAt);
    return { ...officers, ...filings };
  });
}

// ----- Officers ----------------------------------------------------------

async function upsertOfficers(
  tx: Tx,
  companyId: string,
  snapshot: JusticeSnapshot,
  fetchedAt: Date,
) {
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const officer of snapshot.officers) {
    // Natural identity matches the unique index in the schema:
    // (companyId, role, name, appointedAt). NULL appointedAt is treated
    // as a sentinel by Postgres unique constraints — we still attempt
    // the match.
    const conditions = [
      eq(companyOfficers.companyId, companyId),
      eq(companyOfficers.role, officer.role),
      eq(companyOfficers.name, officer.name),
    ];
    if (officer.appointedAt) {
      conditions.push(eq(companyOfficers.appointedAt, officer.appointedAt));
    }

    const existing = await tx
      .select()
      .from(companyOfficers)
      .where(and(...conditions))
      .limit(1);

    const fields = {
      companyId,
      countryIso: snapshot.countryIso,
      sourceKey: snapshot.sourceKey,
      name: officer.name,
      role: officer.role,
      roleLabel: officer.roleLabel,
      appointedAt: officer.appointedAt ?? null,
      terminatedAt: officer.terminatedAt ?? null,
      raw: officer as unknown as object,
      contentHash: hashOfficer(officer),
      fetchedAt,
      lastSeenAt: fetchedAt,
    };

    if (existing.length === 0) {
      await tx.insert(companyOfficers).values({ ...fields, createdAt: fetchedAt });
      inserted++;
      continue;
    }

    const prior = existing[0]!;
    if (prior.contentHash === fields.contentHash) {
      await tx
        .update(companyOfficers)
        .set({ lastSeenAt: fetchedAt })
        .where(eq(companyOfficers.id, prior.id));
      unchanged++;
      continue;
    }

    await tx
      .update(companyOfficers)
      .set({ ...fields, updatedAt: fetchedAt })
      .where(eq(companyOfficers.id, prior.id));
    updated++;
  }

  return {
    officersInserted: inserted,
    officersUpdated: updated,
    officersUnchanged: unchanged,
  };
}

// ----- Filings -----------------------------------------------------------

async function upsertFilings(
  tx: Tx,
  companyId: string,
  snapshot: JusticeSnapshot,
  fetchedAt: Date,
) {
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const filing of snapshot.filings) {
    const existing = await tx
      .select()
      .from(companyFilings)
      .where(
        and(
          eq(companyFilings.countryIso, snapshot.countryIso),
          eq(companyFilings.sourceKey, snapshot.sourceKey),
          eq(companyFilings.upstreamDocId, filing.upstreamDocId),
        ),
      )
      .limit(1);

    const fields = {
      companyId,
      countryIso: snapshot.countryIso,
      sourceKey: snapshot.sourceKey,
      upstreamDocId: filing.upstreamDocId,
      documentType: filing.documentType,
      documentTypeLabel: filing.documentTypeLabel,
      fiscalYear: filing.fiscalYear ?? null,
      filedAt: filing.filedAt ?? null,
      documentUrl: filing.documentUrl,
      raw: filing as unknown as object,
      contentHash: hashFiling(filing),
      fetchedAt,
      lastSeenAt: fetchedAt,
    };

    if (existing.length === 0) {
      await tx.insert(companyFilings).values({ ...fields, createdAt: fetchedAt });
      inserted++;
      continue;
    }

    const prior = existing[0]!;
    if (prior.contentHash === fields.contentHash) {
      await tx
        .update(companyFilings)
        .set({ lastSeenAt: fetchedAt })
        .where(eq(companyFilings.id, prior.id));
      unchanged++;
      continue;
    }

    await tx
      .update(companyFilings)
      .set({ ...fields, updatedAt: fetchedAt })
      .where(eq(companyFilings.id, prior.id));
    updated++;
  }

  return {
    filingsInserted: inserted,
    filingsUpdated: updated,
    filingsUnchanged: unchanged,
  };
}

// ----- Hashing -----------------------------------------------------------
//
// Per-row content hashes — they don't need cryptographic strength,
// just enough collision resistance to detect material change. We
// concatenate the fields that matter for the diff worker.
//
// (We don't reuse the snapshot-level hash from connectors-cz because
// that's a single hash for the whole snapshot — useless for telling
// which officer rows changed.)

function hashOfficer(o: {
  name: string;
  role: string;
  roleLabel: string;
  appointedAt?: string;
  terminatedAt?: string;
}): string {
  return djb2(
    [o.name, o.role, o.roleLabel, o.appointedAt ?? '', o.terminatedAt ?? ''].join(''),
  );
}

function hashFiling(f: {
  upstreamDocId: string;
  documentType: string;
  documentTypeLabel: string;
  fiscalYear?: number;
  filedAt?: string;
  documentUrl: string;
}): string {
  return djb2(
    [
      f.upstreamDocId,
      f.documentType,
      f.documentTypeLabel,
      String(f.fiscalYear ?? ''),
      f.filedAt ?? '',
      f.documentUrl,
    ].join(''),
  );
}

/** Cheap, deterministic, non-cryptographic. Good enough for change-detection. */
function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
