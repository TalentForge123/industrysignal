// Alert generation + read helpers.
//
// HANDOFF §7 + §16: alerts are derived from upstream change events
// (insolvency filings, officer appointments/terminations, news clusters,
// ...) and routed per watch-list membership to the orgs that care.
//
// The write path here is **idempotent** — the alert-diff scheduler runs
// on a 25-hour lookback and a unique index on
// (organization_id, kind, source_event_id) catches re-emissions during
// the overlap window.
//
// Wire of detection logic ↔ Inngest cron lives in
// `@industrysignal/jobs/functions/alert-diff-scheduler.ts`; this module
// stays I/O-only so the classifier can be unit-tested without DB.

import { and, desc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '../client';
import {
  alerts,
  companies,
  companyOfficers,
  insolvencyEvents,
  organizationMembers,
  organizations,
  users,
  watchlistEntries,
  watchlists,
} from '../schema';

export type AlertRow = typeof alerts.$inferSelect;

export interface AlertInsert {
  organizationId: string;
  watchlistId?: string | null;
  priority: 'critical' | 'high' | 'normal';
  kind: string;
  targetType: 'company' | 'segment' | 'region' | 'macro';
  targetRef?: string | null;
  countryIso?: string | null;
  title: string;
  message: string;
  sourceUrl?: string | null;
  /** Identifier of the upstream row that produced this alert. Drives dedup. */
  sourceEventId: string;
}

/**
 * Insert an alert row unless one with the same (org, kind, source_event_id)
 * already exists. Returns the inserted row, or null when deduplicated.
 *
 * Uses INSERT ... ON CONFLICT DO NOTHING against the
 * `alert_dedup_unique` index — no read-before-write race.
 */
export async function insertAlertIfNew(
  db: Database,
  input: AlertInsert,
): Promise<AlertRow | null> {
  const [inserted] = await db
    .insert(alerts)
    .values({
      organizationId: input.organizationId,
      watchlistId: input.watchlistId ?? null,
      priority: input.priority,
      kind: input.kind,
      targetType: input.targetType,
      targetRef: input.targetRef ?? null,
      countryIso: input.countryIso ?? null,
      title: input.title,
      message: input.message,
      sourceUrl: input.sourceUrl ?? null,
      sourceEventId: input.sourceEventId,
    })
    .onConflictDoNothing({
      target: [alerts.organizationId, alerts.kind, alerts.sourceEventId],
    })
    .returning();
  return inserted ?? null;
}

/** One (org, watchlist) pair currently monitoring a given company. */
export interface WatchingOrg {
  organizationId: string;
  watchlistId: string;
}

/**
 * Look up every (organization, watchlist) pair monitoring the given
 * company by registry id. Joins through `watchlist_entry` where
 * `target_type = 'company'` and `(country_iso, target_ref)` matches.
 */
export async function findOrgsWatchingCompany(
  db: Database,
  countryIso: string,
  registryId: string,
): Promise<WatchingOrg[]> {
  const rows = await db
    .selectDistinct({
      organizationId: watchlists.organizationId,
      watchlistId: watchlists.id,
    })
    .from(watchlistEntries)
    .innerJoin(watchlists, eq(watchlistEntries.watchlistId, watchlists.id))
    .where(
      and(
        eq(watchlistEntries.targetType, 'company'),
        eq(watchlistEntries.countryIso, countryIso),
        eq(watchlistEntries.targetRef, registryId),
      ),
    );
  return rows;
}

// ----- Recent-change finders (input for the diff cron) -------------------

export interface InsolvencyChange {
  event: typeof insolvencyEvents.$inferSelect;
  company: typeof companies.$inferSelect | null;
}

/**
 * Insolvency events created since `since`. We join on debtor_ico to pull
 * the associated company row when one exists — many insolvency cases are
 * filed against debtors who aren't in our `company` table (foreign
 * entities, individuals), and those need a different alert pathway.
 */
export async function findRecentInsolvencyEvents(
  db: Database,
  since: Date,
): Promise<InsolvencyChange[]> {
  const rows = await db
    .select({
      event: insolvencyEvents,
      company: companies,
    })
    .from(insolvencyEvents)
    .leftJoin(
      companies,
      and(
        eq(companies.countryIso, insolvencyEvents.countryIso),
        eq(companies.registryId, insolvencyEvents.debtorIco),
      ),
    )
    .where(gte(insolvencyEvents.createdAt, since))
    .orderBy(desc(insolvencyEvents.createdAt));
  return rows;
}

export interface OfficerChange {
  officer: typeof companyOfficers.$inferSelect;
  company: typeof companies.$inferSelect;
  /** 'appointed' for rows freshly inserted; 'terminated' for rows whose terminated_at just appeared. */
  changeType: 'appointed' | 'terminated';
}

/**
 * Officer rows that changed since `since`. We split into two classes:
 *   - `appointed` — created_at >= since AND terminated_at IS NULL
 *   - `terminated` — terminated_at IS NOT NULL AND updated_at >= since
 *
 * Rows that were inserted *and* immediately terminated within the same
 * window (extremely rare backfill case) surface twice; that's fine —
 * each gets its own dedup key downstream.
 */
export async function findRecentOfficerChanges(
  db: Database,
  since: Date,
): Promise<OfficerChange[]> {
  const appointedRows = await db
    .select({ officer: companyOfficers, company: companies })
    .from(companyOfficers)
    .innerJoin(companies, eq(companies.id, companyOfficers.companyId))
    .where(
      and(
        gte(companyOfficers.createdAt, since),
        sql`${companyOfficers.terminatedAt} IS NULL`,
      ),
    )
    .orderBy(desc(companyOfficers.createdAt));

  const terminatedRows = await db
    .select({ officer: companyOfficers, company: companies })
    .from(companyOfficers)
    .innerJoin(companies, eq(companies.id, companyOfficers.companyId))
    .where(
      and(
        isNotNull(companyOfficers.terminatedAt),
        gte(companyOfficers.updatedAt, since),
      ),
    )
    .orderBy(desc(companyOfficers.updatedAt));

  return [
    ...appointedRows.map((r) => ({ ...r, changeType: 'appointed' as const })),
    ...terminatedRows.map((r) => ({ ...r, changeType: 'terminated' as const })),
  ];
}

// ----- Read path (alerts feed) -----------------------------------------

/** Row shape returned by `findAlertsForOrg`. `company` is left-joined on
 *  (country_iso, target_ref) so we can derive a ticker from `legal_name`
 *  in app code without a second query per row. */
export interface AlertFeedRow {
  alert: AlertRow;
  company: typeof companies.$inferSelect | null;
}

/**
 * Most-recent alerts for one org, newest first. Used by the /portal/alerts
 * feed. Left-joins `company` on (country_iso, target_ref) for the rows
 * whose `target_type = 'company'` — segment/region/macro alerts return
 * with `company = null` and the view falls back to the embedded title.
 *
 * `limit` is the hard ceiling; the feed paginates client-side until the
 * Sprint 5 "load more" lands.
 */
export async function findAlertsForOrg(
  db: Database,
  organizationId: string,
  limit = 100,
): Promise<AlertFeedRow[]> {
  const rows = await db
    .select({ alert: alerts, company: companies })
    .from(alerts)
    .leftJoin(
      companies,
      and(
        eq(alerts.targetType, 'company'),
        eq(companies.countryIso, alerts.countryIso),
        eq(companies.registryId, alerts.targetRef),
      ),
    )
    .where(eq(alerts.organizationId, organizationId))
    .orderBy(desc(alerts.createdAt))
    .limit(limit);
  return rows;
}

/**
 * Count of unacknowledged alerts for one org — used by the title-bar /
 * sidebar badge. Hits the `alert_org_status_idx` covering index so the
 * lookup is O(log n) regardless of total alert volume.
 */
export async function countFreshAlertsForOrg(
  db: Database,
  organizationId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alerts)
    .where(and(eq(alerts.organizationId, organizationId), eq(alerts.status, 'new')));
  return row?.count ?? 0;
}

// ----- Delivery support (critical-alert email worker) -------------------

export interface AlertWithContext {
  alert: AlertRow;
  /** Org row — for tenant name + display only. */
  organization: typeof organizations.$inferSelect;
  /** Joined company; null for segment/region/macro alerts. */
  company: typeof companies.$inferSelect | null;
}

/**
 * Load one alert plus its org + (optional) joined company. Used by the
 * critical-alert email worker. Returns null when the alert doesn't
 * exist (caller logs + acks the event so Inngest doesn't retry).
 */
export async function findAlertById(
  db: Database,
  alertId: string,
): Promise<AlertWithContext | null> {
  const [row] = await db
    .select({ alert: alerts, organization: organizations, company: companies })
    .from(alerts)
    .innerJoin(organizations, eq(organizations.id, alerts.organizationId))
    .leftJoin(
      companies,
      and(
        eq(alerts.targetType, 'company'),
        eq(companies.countryIso, alerts.countryIso),
        eq(companies.registryId, alerts.targetRef),
      ),
    )
    .where(eq(alerts.id, alertId))
    .limit(1);
  if (!row) return null;
  return {
    alert: row.alert,
    organization: row.organization,
    company: row.company,
  };
}

export interface AlertRecipient {
  userId: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'analyst' | 'viewer';
}

/**
 * Resolve email recipients for a critical alert. Returns admin + analyst
 * members of the owning org — viewers are deliberately excluded from the
 * critical channel per HANDOFF §6 (viewer = read-only, no actionable
 * routing). The `role` is surfaced so the email body can address the
 * admin separately from the analyst (e.g. CC vs primary) once the
 * template grows there.
 */
export async function findAlertRecipientsForOrg(
  db: Database,
  organizationId: string,
): Promise<AlertRecipient[]> {
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.name,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        inArray(organizationMembers.role, ['admin', 'analyst']),
      ),
    );
  return rows;
}
