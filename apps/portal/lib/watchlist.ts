// Server-side watchlist read helpers. Used by server components (the
// /portal/watchlist page) and by alert generation paths.
//
// The Sprint-3 cut deliberately stays single-watchlist-per-user: every
// user has exactly one "Default" watchlist, auto-created on first sign-in
// via lib/orgs.ts. Multiple lists land when invitations / shared
// workspaces ship (Sprint 4+).

import { schema } from '@industrysignal/db';
import { and, desc, eq, isNull } from 'drizzle-orm';
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

// ----- Detail (expand-on-click panel) -----------------------------------

export interface WatchlistEntryDetail {
  entry: {
    id: string;
    targetRef: string;
    countryIso: string;
    label: string;
  };
  /** Joined company; null when the cron hasn't fetched this IČO yet. */
  company: {
    id: string;
    legalName: string;
    addressLine: string | null;
    primaryNace: string | null;
    legalFormCode: string | null;
    isActive: boolean;
    upstreamUpdatedAt: string | null;
  } | null;
  /** Active statutory body members (terminated_at IS NULL), most-recent appointment first. */
  officers: Array<{
    id: string;
    name: string;
    role: string;
    roleLabel: string;
    appointedAt: string | null;
  }>;
  /** Open insolvency cases against this IČO. Empty array = clean. */
  insolvency: Array<{
    id: string;
    caseRef: string;
    caseStatus: string | null;
    caseDetailUrl: string | null;
    bankruptcyStartedAt: string | null;
  }>;
  /** Most-recent published filings (top 5). */
  filings: Array<{
    id: string;
    documentType: string;
    documentTypeLabel: string;
    fiscalYear: number | null;
    filedAt: string | null;
    documentUrl: string;
  }>;
}

/**
 * Detail loader for one watchlist entry. Caller must have verified
 * org membership for the entry's owning org BEFORE invoking this —
 * the helper itself runs unscoped and trusts the caller.
 *
 * Returns null when the entry doesn't exist.
 */
export async function getWatchlistEntryDetail(
  entryId: string,
): Promise<WatchlistEntryDetail | null> {
  const entryRows = await db
    .select()
    .from(schema.watchlistEntries)
    .where(eq(schema.watchlistEntries.id, entryId))
    .limit(1);
  const entry = entryRows[0];
  if (!entry) return null;

  const companyRows = await db
    .select()
    .from(schema.companies)
    .where(
      and(
        eq(schema.companies.countryIso, entry.countryIso),
        eq(schema.companies.registryId, entry.targetRef),
      ),
    )
    .limit(1);
  const company = companyRows[0];

  let officers: WatchlistEntryDetail['officers'] = [];
  let filings: WatchlistEntryDetail['filings'] = [];
  if (company) {
    const officerRows = await db
      .select()
      .from(schema.companyOfficers)
      .where(
        and(
          eq(schema.companyOfficers.companyId, company.id),
          isNull(schema.companyOfficers.terminatedAt),
        ),
      )
      .orderBy(desc(schema.companyOfficers.appointedAt));
    officers = officerRows.map((o) => ({
      id: o.id,
      name: o.name,
      role: o.role,
      roleLabel: o.roleLabel,
      appointedAt: o.appointedAt,
    }));

    const filingRows = await db
      .select()
      .from(schema.companyFilings)
      .where(eq(schema.companyFilings.companyId, company.id))
      .orderBy(desc(schema.companyFilings.filedAt))
      .limit(5);
    filings = filingRows.map((f) => ({
      id: f.id,
      documentType: f.documentType,
      documentTypeLabel: f.documentTypeLabel,
      fiscalYear: f.fiscalYear,
      filedAt: f.filedAt,
      documentUrl: f.documentUrl,
    }));
  }

  // Insolvency joins on debtor_ico — works even when `company` is missing
  // (foreign-owned subsidiaries occasionally surface here without
  // an ARES record).
  const insolvencyRows = await db
    .select()
    .from(schema.insolvencyEvents)
    .where(
      and(
        eq(schema.insolvencyEvents.countryIso, entry.countryIso),
        eq(schema.insolvencyEvents.debtorIco, entry.targetRef),
      ),
    )
    .orderBy(desc(schema.insolvencyEvents.createdAt))
    .limit(5);
  const insolvency: WatchlistEntryDetail['insolvency'] = insolvencyRows.map((i) => ({
    id: i.id,
    caseRef: `${i.caseKind} ${i.caseNumber}/${i.caseYear} (Senát ${i.caseSenate})`,
    caseStatus: i.caseStatus,
    caseDetailUrl: i.caseDetailUrl,
    bankruptcyStartedAt: i.bankruptcyStartedAt,
  }));

  return {
    entry: {
      id: entry.id,
      targetRef: entry.targetRef,
      countryIso: entry.countryIso,
      label: entry.label,
    },
    company: company
      ? {
          id: company.id,
          legalName: company.legalName,
          addressLine: company.addressLine,
          primaryNace: company.primaryNace,
          legalFormCode: company.legalFormCode,
          isActive: company.isActive,
          upstreamUpdatedAt: company.upstreamUpdatedAt,
        }
      : null,
    officers,
    insolvency,
    filings,
  };
}

