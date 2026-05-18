// Persistence helpers for the `company` + `company_snapshot` tables.
//
// `upsertCompanyFromAres` is the single write path for ARES data — both
// the on-demand "add to Watch List" flow in the portal and the nightly
// refresh worker call this. Two guarantees the caller relies on:
//
//   1. Idempotent. Replays of the same upstream payload must not write a
//      new snapshot row. We achieve that by hashing the *normalized*
//      snapshot (see connectors-cz/src/shared/hash.ts) and comparing
//      against the row's stored hash before inserting.
//
//   2. `last_seen_at` is updated on every successful fetch, even when
//      `content_hash` is unchanged. That distinguishes "ARES says nothing
//      moved" from "we haven't asked in a while" — the diff worker
//      (Week 3) and the staleness UI both depend on it.

import type { AresSnapshot } from '@industrysignal/connectors-cz';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { companies, companySnapshots } from '../schema';

export type CompanyRow = typeof companies.$inferSelect;

/**
 * Look up a company by its (country, registry id) natural key.
 *
 * Used by every downstream connector (Justice, future DE Handelsregister,
 * ...) to resolve the synthetic `company.id` from the IČO/HRB/KRS the
 * caller actually has. Returns null when the row is absent — the caller
 * decides whether that's an error or a "fetch the base record first"
 * signal.
 */
export async function findCompanyByRegistryId(
  db: Database,
  countryIso: string,
  registryId: string,
): Promise<CompanyRow | null> {
  const rows = await db
    .select()
    .from(companies)
    .where(and(eq(companies.countryIso, countryIso), eq(companies.registryId, registryId)))
    .limit(1);
  return rows[0] ?? null;
}

export interface UpsertResult {
  company: CompanyRow;
  /** True if the snapshot represented a material change (or first sight). */
  changed: boolean;
  /** True if this fetch created the company row. */
  created: boolean;
}

export async function upsertCompanyFromAres(
  db: Database,
  snapshot: AresSnapshot,
): Promise<UpsertResult> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(companies)
      .where(
        and(
          eq(companies.countryIso, snapshot.countryIso),
          eq(companies.registryId, snapshot.registryId),
        ),
      )
      .limit(1);

    const fetchedAt = new Date(snapshot.fetchedAt);
    const baseFields = snapshotToCompanyFields(snapshot, fetchedAt);

    if (existing.length === 0) {
      const [inserted] = await tx
        .insert(companies)
        .values({ ...baseFields, createdAt: fetchedAt })
        .returning();
      if (!inserted) {
        throw new Error('upsertCompanyFromAres: insert returned no row');
      }
      await tx.insert(companySnapshots).values({
        companyId: inserted.id,
        sourceKey: snapshot.sourceKey,
        fetchedAt,
        raw: snapshot.raw as object,
        contentHash: snapshot.contentHash,
      });
      return { company: inserted, changed: true, created: true };
    }

    const prior = existing[0]!;
    const changed = prior.contentHash !== snapshot.contentHash;

    if (!changed) {
      // No material change — just touch last_seen_at so callers can tell
      // a stale record from one that simply hasn't been re-fetched.
      const [updated] = await tx
        .update(companies)
        .set({ lastSeenAt: fetchedAt })
        .where(eq(companies.id, prior.id))
        .returning();
      return { company: updated ?? prior, changed: false, created: false };
    }

    const [updated] = await tx
      .update(companies)
      .set({ ...baseFields, updatedAt: fetchedAt })
      .where(eq(companies.id, prior.id))
      .returning();
    await tx.insert(companySnapshots).values({
      companyId: prior.id,
      sourceKey: snapshot.sourceKey,
      fetchedAt,
      raw: snapshot.raw as object,
      contentHash: snapshot.contentHash,
    });
    return { company: updated ?? prior, changed: true, created: false };
  });
}

function snapshotToCompanyFields(snapshot: AresSnapshot, fetchedAt: Date) {
  return {
    countryIso: snapshot.countryIso,
    registryId: snapshot.registryId,
    sourceKey: snapshot.sourceKey,
    legalName: snapshot.legalName,
    altNames: snapshot.altNames,
    legalFormCode: snapshot.legalFormCode ?? null,
    vatId: snapshot.vatId ?? null,
    addressLine: snapshot.addressLine ?? null,
    addressStructured: (snapshot.addressStructured ?? null) as object | null,
    regionCode: snapshot.regionCode ?? null,
    regionName: snapshot.regionName ?? null,
    districtCode: snapshot.districtCode ?? null,
    districtName: snapshot.districtName ?? null,
    postalCode: snapshot.postalCode ?? null,
    naceCodes: snapshot.naceCodes,
    primaryNace: snapshot.primaryNace ?? null,
    foundedAt: snapshot.foundedAt ?? null,
    upstreamUpdatedAt: snapshot.upstreamUpdatedAt ?? null,
    registryStatus: snapshot.registryStatus as unknown as object,
    primarySourceRegistry: snapshot.primarySourceRegistry ?? null,
    isActive: snapshot.isActive,
    raw: snapshot.raw as object,
    contentHash: snapshot.contentHash,
    fetchedAt,
    lastSeenAt: fetchedAt,
  };
}
