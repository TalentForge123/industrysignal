// Server-side watchlist read helpers. Used by server components (the
// /portal/watchlist page) and by alert generation paths.
//
// The Sprint-3 cut deliberately stays single-watchlist-per-user: every
// user has exactly one "Default" watchlist, auto-created on first sign-in
// via lib/orgs.ts. Multiple lists land when invitations / shared
// workspaces ship (Sprint 4+).

import { schema } from '@industrysignal/db';
import { and, desc, eq } from 'drizzle-orm';
import { db } from './db';

export interface WatchlistEntryView {
  id: string;
  /** IČO / HRB / KRS — what we look up upstream. */
  targetRef: string;
  countryIso: string;
  /** User-facing label. */
  label: string;
  /** First seen in the watchlist. */
  addedAt: Date;
  /** Joined from `company` table when the row has already been fetched. */
  company: {
    id: string;
    legalName: string;
    primaryNace: string | null;
  } | null;
}

/**
 * Watchlist entries for a given org's default watchlist, with the
 * companion `company` row (if any) joined in for display.
 *
 * `LEFT JOIN companies` means we surface entries even when the IČO has
 * never been fetched — they render with `company === null` and a
 * "Loading…" badge in the UI until the cron picks them up.
 */
export async function getWatchlistEntriesForOrg(
  organizationId: string,
): Promise<WatchlistEntryView[]> {
  const rows = await db
    .select({
      entry: schema.watchlistEntries,
      company: schema.companies,
    })
    .from(schema.watchlistEntries)
    .innerJoin(
      schema.watchlists,
      eq(schema.watchlists.id, schema.watchlistEntries.watchlistId),
    )
    .leftJoin(
      schema.companies,
      and(
        eq(schema.companies.countryIso, schema.watchlistEntries.countryIso),
        eq(schema.companies.registryId, schema.watchlistEntries.targetRef),
      ),
    )
    .where(
      and(
        eq(schema.watchlists.organizationId, organizationId),
        eq(schema.watchlistEntries.targetType, 'company'),
      ),
    )
    .orderBy(desc(schema.watchlistEntries.addedAt));

  return rows.map((r) => ({
    id: r.entry.id,
    targetRef: r.entry.targetRef,
    countryIso: r.entry.countryIso,
    label: r.entry.label,
    addedAt: r.entry.addedAt,
    company: r.company
      ? {
          id: r.company.id,
          legalName: r.company.legalName,
          primaryNace: r.company.primaryNace,
        }
      : null,
  }));
}
