// IndustrySignal — Postgres schema.
//
// Per HANDOFF §8 (Sprint 1, Week 1): users, organizations, watchlists,
// alerts, reports, sources. Plus the two tables Auth.js needs for
// magic-link auth (users + verificationTokens — sessions live in JWT
// cookies per HANDOFF §6, so no sessions table).
//
// The canonical entity graph from §15 (entities, entity_identities,
// entity_links, link_evidence) lands later, when the Mission engine
// pipeline is implemented. Until then watchlists carry denormalized
// (country_iso, target_type, target_ref, label) tuples — good enough
// for Sprint 1–3 and avoids prematurely coupling Watch List to a
// resolver that isn't built yet.

import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================
// AUTH — Auth.js v5 drizzle-adapter compatible shape.
// ============================================================

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verificationTokens = pgTable(
  'verification_token',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

// Account + Session tables are required by the @auth/drizzle-adapter type
// signature even when not used at runtime. We run JWT sessions (HANDOFF §6)
// and magic-link auth only — so `session` stays empty and `account` only
// fills up if we later add an OAuth provider. JS field names follow the
// Auth.js convention (mix of camelCase and snake_case) verbatim; DB columns
// stay snake_case via the explicit second arg.
export const accounts = pgTable(
  'account',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable('session', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
});

// ============================================================
// TENANCY — organization is the billing + access boundary.
// ============================================================

export const planEnum = ['starter', 'growth', 'enterprise'] as const;
export type Plan = (typeof planEnum)[number];

export const organizations = pgTable('organization', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  // Czech business registration number (IČO). Nullable for non-CZ tenants;
  // foreign equivalents (HRB, KRS, ...) live in the future entity_identities
  // table once the Mission engine arrives.
  ico: text('ico'),
  countryIso: text('country_iso').notNull().default('CZ'),
  plan: text('plan', { enum: planEnum }).notNull().default('starter'),
  seatsTotal: integer('seats_total').notNull().default(3),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const memberRoleEnum = ['admin', 'analyst', 'viewer'] as const;
export type MemberRole = (typeof memberRoleEnum)[number];

export const organizationMembers = pgTable(
  'organization_member',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: text('role', { enum: memberRoleEnum }).notNull().default('viewer'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.organizationId] }),
  }),
);

// ============================================================
// WATCH LIST — per-org collections of monitored entities.
// ============================================================

export const watchTargetTypeEnum = ['company', 'segment', 'region'] as const;
export type WatchTargetType = (typeof watchTargetTypeEnum)[number];

export const watchlists = pgTable('watchlist', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const watchlistEntries = pgTable('watchlist_entry', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  watchlistId: text('watchlist_id')
    .notNull()
    .references(() => watchlists.id, { onDelete: 'cascade' }),
  // Polymorphic ref. For 'company': national registry id (IČO, HRB, KRS, ...).
  // For 'segment': NACE code (local variant per country). For 'region':
  // okres code or NUTS code.
  targetType: text('target_type', { enum: watchTargetTypeEnum }).notNull(),
  targetRef: text('target_ref').notNull(),
  countryIso: text('country_iso').notNull().default('CZ'),
  label: text('label').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// ALERTS — generated signals (§7 + §16).
// ============================================================

export const alertPriorityEnum = ['critical', 'high', 'normal'] as const;
export type AlertPriority = (typeof alertPriorityEnum)[number];

export const alertStatusEnum = ['new', 'read', 'resolved', 'dismissed'] as const;
export type AlertStatus = (typeof alertStatusEnum)[number];

export const alertTargetTypeEnum = ['company', 'segment', 'region', 'macro'] as const;
export type AlertTargetType = (typeof alertTargetTypeEnum)[number];

export const alerts = pgTable(
  'alert',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    watchlistId: text('watchlist_id').references(() => watchlists.id, { onDelete: 'set null' }),
    priority: text('priority', { enum: alertPriorityEnum }).notNull().default('normal'),
    // Signal kind taxonomy lives in §16: insolvency_filed, executive_change,
    // production_cut, capacity_expansion, contract_win, concentration_risk,
    // negative_news_cluster, credit_downgrade, ma_announcement, sanctions_hit.
    kind: text('kind').notNull(),
    targetType: text('target_type', { enum: alertTargetTypeEnum }).notNull(),
    targetRef: text('target_ref'),
    countryIso: text('country_iso'),
    title: text('title').notNull(),
    message: text('message').notNull(),
    sourceUrl: text('source_url'),
    // Deduplication key — references the upstream row that produced this
    // alert. For insolvency_filed: insolvency_event.id. For
    // executive_change: company_officer.id. Combined with (org, kind)
    // this prevents the alert-diff cron from emitting duplicates when
    // its lookback window overlaps a previous run.
    sourceEventId: text('source_event_id'),
    status: text('status', { enum: alertStatusEnum }).notNull().default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Idempotency anchor for the diff cron: re-running on a row we've
    // already alerted on becomes a no-op via INSERT ... ON CONFLICT.
    dedupUnique: uniqueIndex('alert_dedup_unique').on(
      t.organizationId,
      t.kind,
      t.sourceEventId,
    ),
    // Fast path for "new alerts for this org" — what the feed view + the
    // /portal home counter both hit.
    orgStatusIdx: index('alert_org_status_idx').on(t.organizationId, t.status, t.createdAt),
  }),
);

// ============================================================
// REPORTS — quarterly editorial publications (§4, §17).
// ============================================================

export const reportStatusEnum = ['draft', 'review', 'published', 'archived'] as const;
export type ReportStatus = (typeof reportStatusEnum)[number];

export const reports = pgTable('report', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(), // e.g. "2026-q2"
  quarter: text('quarter').notNull(), // e.g. "2026-Q2"
  status: text('status', { enum: reportStatusEnum }).notNull().default('draft'),
  titleCs: text('title_cs').notNull(),
  titleEn: text('title_en').notNull(),
  // Structured editorial content: { sections: [{ id, title, content, sources, ... }] }.
  // Strict shape lands with the Studio app in Sprint 4.
  bodyCs: jsonb('body_cs'),
  bodyEn: jsonb('body_en'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  pdfUrlCs: text('pdf_url_cs'),
  pdfUrlEn: text('pdf_url_en'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ============================================================
// SOURCES — registry of data sources (§3).
// ============================================================

export const sourceKindEnum = ['api', 'scrape', 'feed', 'manual'] as const;
export type SourceKind = (typeof sourceKindEnum)[number];

export const sourceFetchStatusEnum = ['ok', 'error', 'stale', 'pending'] as const;
export type SourceFetchStatus = (typeof sourceFetchStatusEnum)[number];

export const sources = pgTable('source', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Stable key — used by connector code to look itself up.
  // e.g. "csu", "cnb-arad", "ares", "isir", "ote-cr", "gdelt".
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  kind: text('kind', { enum: sourceKindEnum }).notNull(),
  baseUrl: text('base_url'),
  countryIso: text('country_iso'), // null = pan-EU / global
  // Source quality tier from §15.5: 1=official registry/customs,
  // 2=mainstream press/tenders, 3=vanity/trade press, 4=corporate blog.
  tier: integer('tier').notNull().default(2),
  enabled: boolean('enabled').notNull().default(true),
  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
  lastFetchStatus: text('last_fetch_status', { enum: sourceFetchStatusEnum }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// COMPANIES — latest known snapshot per (country, registry id).
// ============================================================
//
// Pragmatic, Sprint-2 shape per HANDOFF §8 (Week 2). The canonical
// entities / entity_identities / entity_links graph from §15 lands with
// the Mission engine; this table is the single-country, single-source
// stepping stone Watch List and the diff worker (Week 3) build on.
//
// `country_iso` + `registry_id` is the natural key (IČO for CZ, HRB for
// DE, KRS for PL, ...). Synthetic UUID id keeps cross-table FKs stable
// when (very rarely) a registry reassigns an identifier.
//
// `raw` keeps the full upstream JSON for audit + future re-extraction
// without re-fetching. `source_key` is intentionally a plain text column,
// not an FK to `source.key` — `sources` is admin-managed metadata and
// shouldn't be on the hot path for an upsert from a worker.

export const companies = pgTable(
  'company',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    countryIso: text('country_iso').notNull().default('CZ'),
    // Stable national identifier: IČO (CZ), HRB-number (DE), KRS (PL), ...
    registryId: text('registry_id').notNull(),
    // Stable upstream source key — e.g. 'ares', 'handelsregister', 'krs'.
    // Matches `source.key` but kept unconstrained on purpose (see header).
    sourceKey: text('source_key').notNull(),

    legalName: text('legal_name').notNull(),
    // Alternate trade names from `dalsiUdaje` (ARES) or equivalents.
    // Stored as text[] so a GIN index can answer "any name contains" lookups
    // without unpacking JSONB.
    altNames: text('alt_names').array().notNull().default(sql`'{}'::text[]`),

    // Legal form, registry-local code. ARES: pravniForma ('121' = a.s.).
    // Human-readable label is derived in app code from a static lookup.
    legalFormCode: text('legal_form_code'),
    vatId: text('vat_id'), // DIČ for CZ, USt-IdNr for DE, ...

    // Address — structured + a human-readable line, both kept so callers
    // can render quickly and filter precisely.
    addressLine: text('address_line'),
    addressStructured: jsonb('address_structured'),
    regionCode: text('region_code'),
    regionName: text('region_name'),
    districtCode: text('district_code'),
    districtName: text('district_name'),
    postalCode: text('postal_code'),

    // CZ-NACE 2008 (and equivalents). Array so we can index with GIN and
    // answer `naceCodes @> ARRAY['29100']` segment queries in O(log n).
    naceCodes: text('nace_codes').array().notNull().default(sql`'{}'::text[]`),
    primaryNace: text('primary_nace'),

    foundedAt: date('founded_at'),
    // Upstream "last modified" timestamp (ARES: datumAktualizace). Distinct
    // from `last_fetched_at`, which is when *we* fetched it.
    upstreamUpdatedAt: date('upstream_updated_at'),

    // Per-registry status flags from upstream. ARES: seznamRegistraci.
    // JSONB keeps shape flexibility across country connectors.
    registryStatus: jsonb('registry_status'),
    primarySourceRegistry: text('primary_source_registry'), // ARES: primarniZdroj
    isActive: boolean('is_active').notNull().default(true),

    raw: jsonb('raw').notNull(),
    // SHA-256 of canonicalized snapshot — cheap equality check for the
    // diff worker (Week 3) so it can skip Postgres writes when nothing
    // material changed since the last fetch.
    contentHash: text('content_hash').notNull(),

    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    // Updated on every successful fetch even when contentHash is unchanged;
    // lets us distinguish "stale upstream" from "we haven't looked".
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    countryRegistryUnique: uniqueIndex('company_country_registry_unique').on(
      t.countryIso,
      t.registryId,
    ),
    naceGin: index('company_nace_gin').using('gin', t.naceCodes),
    regionIdx: index('company_region_idx').on(t.countryIso, t.regionCode),
  }),
);

// Append-only log of upstream snapshots — feeds the diff worker (Week 3,
// HANDOFF §7) which compares consecutive rows per company and emits
// alerts on material changes (statutory bodies, address, NACE, status).
// `content_hash` is duplicated on `company` so the worker can decide
// whether to insert here without re-reading the snapshot blob.
export const companySnapshots = pgTable(
  'company_snapshot',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    sourceKey: text('source_key').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    raw: jsonb('raw').notNull(),
    contentHash: text('content_hash').notNull(),
    // Set by the diff worker after comparison against the previous snapshot.
    // Shape: { changed: string[], previous_hash: string | null }. Null until
    // the worker has processed this row.
    diff: jsonb('diff'),
  },
  (t) => ({
    companyFetchedIdx: index('company_snapshot_company_fetched_idx').on(
      t.companyId,
      t.fetchedAt,
    ),
  }),
);

// ============================================================
// INSOLVENCY — events from the Czech Insolvency Register (ISIR).
// ============================================================
//
// One row per insolvency case as exposed by ISIR_CUZK_WS
// (HANDOFF §3.2). The natural key is the Czech "spisová značka":
// (court senate, kind, sequence number, year) — e.g. INS 628/2011 at
// senate 60. We also denormalize debtor IČO so the Watch List can
// answer "is X currently in insolvency?" without a JOIN.
//
// `case_status` carries the upstream `druhStavKonkursu` verbatim — the
// list of states (KONKURS / REORGANIZACE / ODDLUŽENÍ / NABYTÍ PM
// ZAHÁJENÍ ÚPADKU / ZASTAVENÍ / ...) is large and the values are
// already Czech short codes that map cleanly to UI labels.
//
// As with `company`, raw JSON is preserved for audit + re-extraction,
// content_hash drives idempotent re-syncs, and last_seen_at separates
// "ISIR says no change" from "we haven't asked in a while".

export const insolvencyEvents = pgTable(
  'insolvency_event',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    countryIso: text('country_iso').notNull().default('CZ'),
    sourceKey: text('source_key').notNull(), // 'isir' for now

    // Debtor identifiers — at least one of these is set (legal entity ⇒
    // ic, individual ⇒ rc/jméno+datumNarození). For Watch List use we
    // primarily index on ic.
    debtorIco: text('debtor_ico'),
    debtorRc: text('debtor_rc'), // birth number — only for natural persons
    debtorName: text('debtor_name'),
    debtorAddress: jsonb('debtor_address'),

    // Spisová značka components — composite natural key.
    caseCourt: text('case_court'), // nazevOrganizace
    caseSenate: integer('case_senate').notNull(), // cisloSenatu
    caseKind: text('case_kind').notNull(), // druhVec — 'INS','KSCB',...
    caseNumber: integer('case_number').notNull(), // bcVec
    caseYear: integer('case_year').notNull(), // rocnik

    caseStatus: text('case_status'), // druhStavKonkursu
    caseDetailUrl: text('case_detail_url'), // urlDetailRizeni
    otherDebtorsInCase: boolean('other_debtors_in_case').notNull().default(false),

    bankruptcyStartedAt: date('bankruptcy_started_at'), // datumPmZahajeniUpadku
    bankruptcyEndedAt: date('bankruptcy_ended_at'), // datumPmUkonceniUpadku

    raw: jsonb('raw').notNull(),
    contentHash: text('content_hash').notNull(),
    // Upstream clock from `casSynchronizace`. ISIR_CUZK_WS exposes a
    // read replica synced hourly — surfacing this lets the UI label
    // "data is up to ~1h fresh" honestly.
    upstreamSyncedAt: timestamp('upstream_synced_at', { withTimezone: true }),

    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    // The composite "spisová značka" — globally unique within CZ.
    caseUnique: uniqueIndex('insolvency_event_case_unique').on(
      t.countryIso,
      t.caseKind,
      t.caseSenate,
      t.caseNumber,
      t.caseYear,
    ),
    debtorIcoIdx: index('insolvency_event_debtor_ico_idx').on(t.countryIso, t.debtorIco),
    statusIdx: index('insolvency_event_status_idx').on(t.caseStatus),
  }),
);

// ============================================================
// OFFICERS — statutory bodies + supervisory board + procurators.
// ============================================================
//
// Sourced from Justice.cz / or.justice.cz (HANDOFF §3.2). Each row is
// one (company × person × role) tuple. Past officers stay in the table
// with `terminated_at` set — that's what powers executive-change
// alerts (§7, §16) and the §15.9 entity-resolver officer-overlap
// feature for cross-country sister companies.
//
// `name` is intentionally a single text column, not split into first /
// last — Czech registry data uses many name formats (degrees, double
// surnames, transliterations), and downstream consumers want the raw
// form for fuzzy matching. We index it for the resolver's GIN trigram
// queries; the index itself is added in the migration, not declared in
// drizzle (which has no built-in pg_trgm helper).

export const companyOfficerRoleEnum = [
  'executive',
  'director',
  'supervisor',
  'procurator',
  'other',
] as const;
export type CompanyOfficerRole = (typeof companyOfficerRoleEnum)[number];

export const companyOfficers = pgTable(
  'company_officer',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    countryIso: text('country_iso').notNull().default('CZ'),
    sourceKey: text('source_key').notNull(), // 'justice'

    name: text('name').notNull(),
    // Coarse role bucket — branchable across countries. Verbatim Czech
    // label (e.g. "Předseda představenstva") stays in `roleLabel` for
    // UI display and re-classification.
    role: text('role', { enum: companyOfficerRoleEnum }).notNull(),
    roleLabel: text('role_label').notNull(),

    appointedAt: date('appointed_at'),
    // Null = currently active. The diff worker (Week 3) emits
    // `executive_change` alerts on either appointment or termination.
    terminatedAt: date('terminated_at'),

    raw: jsonb('raw'),
    contentHash: text('content_hash').notNull(),

    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    // Natural identity inside one company snapshot — (role, name,
    // appointedAt) catches the case where the same person served two
    // separate terms with different appointment dates.
    naturalUnique: uniqueIndex('company_officer_natural_unique').on(
      t.companyId,
      t.role,
      t.name,
      t.appointedAt,
    ),
    companyIdx: index('company_officer_company_idx').on(t.companyId),
    nameIdx: index('company_officer_name_idx').on(t.name),
  }),
);

// ============================================================
// FILINGS — Sbírka listin index from Justice.cz.
// ============================================================
//
// One row per filing exposed by or.justice.cz (HANDOFF §3.2). We store
// the *reference* — type label, fiscal year, filed date, PDF URL —
// not the document body. PDF parsing for financial figures lands when
// SRSC `fin` dimension wires up (§22); this table is the catalog the
// PDF worker reads from.
//
// `upstream_doc_id` is the dedup key: justice.cz keeps doc IDs stable
// across re-fetches, and we compose them as `<subjektId>-<docId>` to
// stay unique across the rare cases where a docId is reused.

export const companyFilingTypeEnum = [
  'annual_report',
  'financial_statement',
  'auditor_report',
  'other',
] as const;
export type CompanyFilingType = (typeof companyFilingTypeEnum)[number];

export const companyFilings = pgTable(
  'company_filing',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    countryIso: text('country_iso').notNull().default('CZ'),
    sourceKey: text('source_key').notNull(), // 'justice'

    upstreamDocId: text('upstream_doc_id').notNull(),

    documentType: text('document_type', { enum: companyFilingTypeEnum })
      .notNull()
      .default('other'),
    documentTypeLabel: text('document_type_label').notNull(),

    fiscalYear: integer('fiscal_year'),
    filedAt: date('filed_at'),

    documentUrl: text('document_url').notNull(),

    raw: jsonb('raw'),
    contentHash: text('content_hash').notNull(),

    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    upstreamUnique: uniqueIndex('company_filing_upstream_unique').on(
      t.countryIso,
      t.sourceKey,
      t.upstreamDocId,
    ),
    companyFiscalIdx: index('company_filing_company_fiscal_idx').on(
      t.companyId,
      t.fiscalYear,
    ),
  }),
);

// ============================================================
// MACRO INDICATORS — registry + time-series observations.
// ============================================================
//
// Per HANDOFF §3.1 the Report engine renders a KPI strip across the
// top of each issue: GDP Q/Q, CPI, industrial production, EUR/CZK,
// repo rate, ... — pulled from ČSÚ + ČNB ARAD + Eurostat + OECD.
//
// `macro_indicator` is the *registry* of what we track. One row per
// (source, series). `macro_observation` is the time series — append-
// mostly, one row per published period (daily for FX, monthly for CPI,
// quarterly for GDP). Drizzle's `numeric` maps to Postgres NUMERIC,
// which preserves the exact decimal from upstream (no float drift).
//
// `latest_value` / `latest_period` are *denormalized read paths* so the
// portal sidebar doesn't have to do `ORDER BY observed_at DESC LIMIT 1`
// on every page load — they're refreshed by the persistence helper.

export const macroPeriodKindEnum = ['daily', 'monthly', 'quarterly', 'yearly'] as const;
export type MacroPeriodKind = (typeof macroPeriodKindEnum)[number];

export const macroIndicators = pgTable(
  'macro_indicator',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Stable lookup key — drives Report-engine references. Convention:
    // '<scope>.<category>.<series>' e.g. 'cz.fx.eur_czk',
    // 'cz.macro.cpi_yoy', 'eu.eurostat.industrial_production_yoy'.
    indicatorKey: text('indicator_key').notNull(),
    sourceKey: text('source_key').notNull(), // 'cnb-arad' | 'csu' | 'eurostat' | ...

    nameCs: text('name_cs').notNull(),
    nameEn: text('name_en').notNull(),
    unit: text('unit').notNull(), // '%' | 'CZK' | 'index' | 'CZK/EUR' | ...
    periodKind: text('period_kind', { enum: macroPeriodKindEnum }).notNull(),

    // Denormalized read cache — refreshed atomically when a new
    // observation lands. Null until first fetch.
    latestValue: numeric('latest_value'),
    latestPeriod: text('latest_period'),
    latestObservedAt: date('latest_observed_at'),

    fetchedAt: timestamp('fetched_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    keyUnique: uniqueIndex('macro_indicator_key_unique').on(t.indicatorKey),
  }),
);

export const macroObservations = pgTable(
  'macro_observation',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    indicatorId: text('indicator_id')
      .notNull()
      .references(() => macroIndicators.id, { onDelete: 'cascade' }),
    // Canonical period label — '2026-05-17' for daily, '2026-05' for
    // monthly, '2026-Q1' for quarterly, '2026' for yearly. Lexicographic
    // sort matches chronological order within a single periodKind.
    period: text('period').notNull(),
    // First day of the period — lets us range-query without parsing
    // the `period` string in SQL.
    observedAt: date('observed_at').notNull(),
    value: numeric('value').notNull(),
    raw: jsonb('raw'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    indicatorPeriodUnique: uniqueIndex('macro_observation_indicator_period_unique').on(
      t.indicatorId,
      t.period,
    ),
    indicatorObservedIdx: index('macro_observation_indicator_observed_idx').on(
      t.indicatorId,
      t.observedAt,
    ),
  }),
);

// ============================================================
// RELATIONS — Drizzle query-builder JOIN support.
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  createdWatchlists: many(watchlists),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  watchlists: many(watchlists),
  alerts: many(alerts),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
}));

export const watchlistsRelations = relations(watchlists, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [watchlists.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [watchlists.createdBy],
    references: [users.id],
  }),
  entries: many(watchlistEntries),
  alerts: many(alerts),
}));

export const watchlistEntriesRelations = relations(watchlistEntries, ({ one }) => ({
  watchlist: one(watchlists, {
    fields: [watchlistEntries.watchlistId],
    references: [watchlists.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  organization: one(organizations, {
    fields: [alerts.organizationId],
    references: [organizations.id],
  }),
  watchlist: one(watchlists, {
    fields: [alerts.watchlistId],
    references: [watchlists.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  snapshots: many(companySnapshots),
  officers: many(companyOfficers),
  filings: many(companyFilings),
}));

export const companySnapshotsRelations = relations(companySnapshots, ({ one }) => ({
  company: one(companies, {
    fields: [companySnapshots.companyId],
    references: [companies.id],
  }),
}));

export const companyOfficersRelations = relations(companyOfficers, ({ one }) => ({
  company: one(companies, {
    fields: [companyOfficers.companyId],
    references: [companies.id],
  }),
}));

export const companyFilingsRelations = relations(companyFilings, ({ one }) => ({
  company: one(companies, {
    fields: [companyFilings.companyId],
    references: [companies.id],
  }),
}));

export const macroIndicatorsRelations = relations(macroIndicators, ({ many }) => ({
  observations: many(macroObservations),
}));

export const macroObservationsRelations = relations(macroObservations, ({ one }) => ({
  indicator: one(macroIndicators, {
    fields: [macroObservations.indicatorId],
    references: [macroIndicators.id],
  }),
}));
