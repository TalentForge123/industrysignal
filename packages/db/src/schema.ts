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

// Sprint 4 introduces the editorial CMS (HANDOFF §4 + §8 Week 4). A report
// is the periodic publication shipped to subscribers — quarterly, gated by
// human review. The `body_*` JSONB columns hold the canonical shape:
//
//   {
//     "lead": "string",
//     "key_ratios": [{ "label","value","delta","dir" }],
//     "sections": [{
//       "id","kind","title","summary","body":[...paragraphs],
//       "kpis":[{...}],
//       "sources":[{"n":1,"label","url"}]
//     }],
//     "related_alerts": [{ "ticker","delta","dir" }]
//   }
//
// The shape stays JSONB rather than relational sub-tables because (a) it
// is editorial copy that mutates as a whole during review, and (b) it
// must round-trip 1:1 with the prototype's data.js. A Zod parser lives
// in apps/portal/lib/reports.ts; schema enforcement is at the app layer.
//
// Workflow column semantics (HANDOFF §4 — "vždy ji prochází editor"):
//   draft     → analyst writes / LLM-drafts content
//   review    → submitForReview() — locked from analyst edits, reviewer assigned
//   published → approveAndPublish() — visible to portal subscribers, pdfs generated
//   archived  → superseded by a newer quarter, kept for /archive view
export const reports = pgTable('report', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(), // e.g. "2026-q2"
  quarter: text('quarter').notNull(), // e.g. "2026-Q2"
  status: text('status', { enum: reportStatusEnum }).notNull().default('draft'),
  titleCs: text('title_cs').notNull(),
  titleEn: text('title_en').notNull(),
  bodyCs: jsonb('body_cs'),
  bodyEn: jsonb('body_en'),

  // Workflow ownership — every transition is recorded both on the row
  // (denormalized for fast lookups) and in `report_audit` for the full
  // history. NULL on rows that haven't reached a given step yet.
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  submittedBy: text('submitted_by').references(() => users.id, { onDelete: 'set null' }),
  reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  reviewerNotes: text('reviewer_notes'),

  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedBy: text('published_by').references(() => users.id, { onDelete: 'set null' }),
  pdfUrlCs: text('pdf_url_cs'),
  pdfUrlEn: text('pdf_url_en'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (t) => ({
  // Fast path for /portal/report — "give me the latest published issue".
  statusPublishedIdx: index('report_status_published_idx').on(
    t.status,
    t.publishedAt,
  ),
}));

// Append-only history of report state transitions. The Studio "Activity"
// panel reads this to render a per-report audit trail; auto-recompute
// jobs (Sprint 5+) also write `from_status='auto'` entries here when an
// LLM enrichment run mutates section bodies.
export const reportAuditActionEnum = [
  'create',
  'edit',
  'submit_for_review',
  'reject',
  'publish',
  'archive',
  'llm_draft',
] as const;
export type ReportAuditAction = (typeof reportAuditActionEnum)[number];

export const reportAudit = pgTable(
  'report_audit',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reportId: text('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    action: text('action', { enum: reportAuditActionEnum }).notNull(),
    actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
    fromStatus: text('from_status', { enum: reportStatusEnum }),
    toStatus: text('to_status', { enum: reportStatusEnum }),
    note: text('note'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reportCreatedIdx: index('report_audit_report_created_idx').on(t.reportId, t.createdAt),
  }),
);

// ============================================================
// LLM CALLS — cache + audit of model invocations (§5).
// ============================================================
//
// Every Claude / OpenAI call passes through here. `cache_key` is the
// content hash of (model + prompt + temperature + input payload); a hit
// skips the network round-trip and surfaces the prior response. Editorial
// drafts cache per-quarter (they never regenerate after publish);
// classification/extraction calls cache by input content.
//
// `kind` distinguishes call shape: 'segment_draft' (Sonnet editorial
// synthesis per §4), 'vanity_extract' (Haiku structured extract per
// §15.8), 'alert_classify' (Haiku ranks news as critical/high/normal),
// 'pdf_summary' (Sonnet TL;DR for PDF cover). New kinds added as needed.

export const llmCallKindEnum = [
  'segment_draft',
  'vanity_extract',
  'alert_classify',
  'pdf_summary',
  'mission_research',
  'other',
] as const;
export type LlmCallKind = (typeof llmCallKindEnum)[number];

export const llmCallStatusEnum = ['ok', 'error', 'rate_limited'] as const;
export type LlmCallStatus = (typeof llmCallStatusEnum)[number];

export const llmCalls = pgTable(
  'llm_call',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: text('kind', { enum: llmCallKindEnum }).notNull(),
    // SHA-256 hex of model + system + user + temperature. Unique so a
    // re-run with identical inputs is a hard no-op via ON CONFLICT.
    cacheKey: text('cache_key').notNull(),
    model: text('model').notNull(), // 'claude-haiku-4-5' | 'claude-sonnet-4-5' | ...
    promptId: text('prompt_id'), // optional FK-by-key to the prompts catalog (Sprint 6+)
    promptVersion: text('prompt_version'),
    systemPrompt: text('system_prompt'),
    input: jsonb('input').notNull(), // structured payload (segment, quarter, source ids)
    output: jsonb('output'), // Claude's parsed JSON (or text in `output.text`)
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    costUsd: numeric('cost_usd'),
    latencyMs: integer('latency_ms'),
    status: text('status', { enum: llmCallStatusEnum }).notNull().default('ok'),
    errorMessage: text('error_message'),
    // Back-pointer for accountability — which report/alert/mission did
    // this call serve? Free-form text so we don't have to add a column
    // per consumer; convention is `<entity>:<id>` e.g. `report:rep-2026-q2`.
    consumerRef: text('consumer_ref'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    cacheKeyUnique: uniqueIndex('llm_call_cache_key_unique').on(t.cacheKey),
    consumerIdx: index('llm_call_consumer_idx').on(t.consumerRef),
  }),
);

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
// MISSIONS — one relationship map per client engagement (§3, §13).
// ============================================================
//
// A mission is the unit of paid work: "build M2C a relationship map for
// the German FM market". The canonical data shape is `MissionData.js`
// from the approved prototype — brief + relevance rubric + entities
// ("kdo s kým") + opportunities (gap analysis).
//
// Tables are deliberately namespaced `mission_*` rather than the bare
// `entities` / `entity_links` of BUILD-HANDOFF §3: the bare names are
// reserved by the schema header for the global §15 entity-resolution
// graph that lands with the Mission engine. These mission_-scoped tables
// are the per-mission, operator-curated graph — every row belongs to
// exactly one mission and carries a `source` + `verify` flag (USP:
// source-or-nothing, §6).

export const missionIntentEnum = [
  'replicate',
  'expand',
  'scout',
  'defend',
  'acquire',
] as const;
export type MissionIntent = (typeof missionIntentEnum)[number];

export const missionStatusEnum = ['draft', 'active', 'delivered', 'monitoring'] as const;
export type MissionStatus = (typeof missionStatusEnum)[number];

export const missions = pgTable(
  'mission',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Human-facing case code — 'MSN-2026-014'. Unique across all tenants.
    code: text('code').notNull().unique(),
    // The client this map is built for, and the operator who owns it.
    // Both nullable: a draft can exist before a client org is provisioned,
    // and owner is set-null on user deletion to preserve the mission.
    clientOrgId: text('client_org_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'set null' }),

    // Client identity snapshot from the brief (§13). Denormalized rather
    // than FK'd because the client may not be a registered org/company in
    // our DB yet — the brief is captured verbatim from the intake call.
    clientName: text('client_name'),
    clientLegal: text('client_legal'),
    clientSector: text('client_sector'),
    clientNace: text('client_nace'),
    // Service lines (MissionData brief.client.products) — fed into the AI
    // research prompt. text[] so the wizard can edit them as a list.
    clientProducts: text('client_products').array().notNull().default(sql`'{}'::text[]`),

    intent: text('intent', { enum: missionIntentEnum }).notNull(),
    sourceMarket: text('source_market'), // ISO-ish market code, 'CZ'
    targetMarket: text('target_market'), // 'DE'

    segmentNace: text('segment_nace'),
    segmentKeywords: text('segment_keywords').array().notNull().default(sql`'{}'::text[]`),

    // The client's ask in their own words — drives research + the
    // deliverable header. Kept as free text.
    ask: text('ask'),
    deadline: date('deadline'),

    status: text('status', { enum: missionStatusEnum }).notNull().default('active'),

    // Deliverable subtitle + trend-report cadence labels, captured verbatim
    // from the brief (TOS seed fields). Free text — display only.
    deliverableNote: text('deliverable_note'),
    trendQuarter: text('trend_quarter'),
    nextRefresh: text('next_refresh'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    ownerIdx: index('mission_owner_idx').on(t.ownerUserId, t.status),
    clientOrgIdx: index('mission_client_org_idx').on(t.clientOrgId),
  }),
);

// Relevance rubric — Lukáš's "brain" externalized as data, not code
// (BUILD-HANDOFF §3). These criteria go verbatim into the AI research
// prompt and are editable in the UI. One row per criterion; `sortOrder`
// drives the numbered "01, 02, ..." display in the prototype.
export const rubricWeightEnum = ['vysoká', 'střední', 'nízká'] as const;
export type RubricWeight = (typeof rubricWeightEnum)[number];

export const missionRubricCriteria = pgTable(
  'mission_rubric_criterion',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    missionId: text('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    weight: text('weight', { enum: rubricWeightEnum }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => ({
    missionIdx: index('mission_rubric_criterion_mission_idx').on(t.missionId, t.sortOrder),
  }),
);

// Players on the map. role: client (center) | competitor | target | partner.
// `source` is mandatory (USP); when it's an estimate, `verify=true` flags
// the OVĚŘIT badge. `origin` records how the row arrived — manual entry,
// AI research, client CSV upload, or the seed fixture.
export const missionEntityRoleEnum = ['client', 'competitor', 'target', 'partner'] as const;
export type MissionEntityRole = (typeof missionEntityRoleEnum)[number];

export const missionEntityOriginEnum = ['manual', 'ai', 'client_upload', 'db_seed'] as const;
export type MissionEntityOrigin = (typeof missionEntityOriginEnum)[number];

// Operator triage priority for a player (mostly targets). null = unranked.
export const missionEntityPriorityEnum = ['high', 'medium', 'low'] as const;
export type MissionEntityPriority = (typeof missionEntityPriorityEnum)[number];

export const missionEntities = pgTable(
  'mission_entity',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    missionId: text('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    role: text('role', { enum: missionEntityRoleEnum }).notNull(),
    city: text('city'),
    note: text('note'),
    // Role / department, NEVER a fabricated person name (§6 guardrail).
    decisionMaker: text('decision_maker'),
    source: text('source'),
    verify: boolean('verify').notNull().default(false),
    origin: text('origin', { enum: missionEntityOriginEnum }).notNull().default('manual'),
    priority: text('priority', { enum: missionEntityPriorityEnum }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    missionIdx: index('mission_entity_mission_idx').on(t.missionId, t.role),
  }),
);

// Edges — "kdo s kým". `kind` styles the edge in the radial graph
// (replicate = client→competitor, serves = competitor↔target,
// channel = client→partner, supplier).
export const missionLinkKindEnum = ['serves', 'replicate', 'channel', 'supplier'] as const;
export type MissionLinkKind = (typeof missionLinkKindEnum)[number];

export const missionEntityLinks = pgTable(
  'mission_entity_link',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    missionId: text('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'cascade' }),
    fromEntity: text('from_entity')
      .notNull()
      .references(() => missionEntities.id, { onDelete: 'cascade' }),
    toEntity: text('to_entity')
      .notNull()
      .references(() => missionEntities.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: missionLinkKindEnum }).notNull().default('serves'),
  },
  (t) => ({
    // One edge per unordered (from, to) pair within a mission — the graph
    // dedupes anyway, this keeps the data clean and re-runs idempotent.
    pairUnique: uniqueIndex('mission_entity_link_pair_unique').on(
      t.missionId,
      t.fromEntity,
      t.toEntity,
    ),
    missionIdx: index('mission_entity_link_mission_idx').on(t.missionId),
  }),
);

// Opportunities / gap analysis — editorial blocks shown in the detail
// view and the client deliverable. `tone` maps to the Pill color.
export const missionOpportunityToneEnum = ['up', 'info', 'warn', 'down'] as const;
export type MissionOpportunityTone = (typeof missionOpportunityToneEnum)[number];

export const missionOpportunities = pgTable(
  'mission_opportunity',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    missionId: text('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'cascade' }),
    tag: text('tag'),
    title: text('title'),
    body: text('body'),
    tone: text('tone', { enum: missionOpportunityToneEnum }).notNull().default('info'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => ({
    missionIdx: index('mission_opportunity_mission_idx').on(t.missionId, t.sortOrder),
  }),
);

// Macro trends behind the mission thesis — territory / sector signals with
// a headline metric and a source. `validated` flags a confirmed figure vs.
// one still to verify. `tone` reuses the opportunity tone scale. Rendered
// in the detail trend report.
export const missionTrends = pgTable(
  'mission_trend',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    missionId: text('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'cascade' }),
    territory: text('territory'),
    sector: text('sector'),
    quarter: text('quarter'),
    title: text('title'),
    body: text('body'),
    metric: text('metric'),
    source: text('source'),
    validated: boolean('validated').notNull().default(false),
    tone: text('tone', { enum: missionOpportunityToneEnum }).notNull().default('info'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => ({
    missionIdx: index('mission_trend_mission_idx').on(t.missionId, t.sortOrder),
  }),
);

// Research moves — the t1..t4 tasks that drive connector runs (the
// prototype's brief.researchMoves). `ref` is the stable handle a connector
// keys off; `role` is the entity role the move hunts for. Not shown in the
// detail view — consumed by the research/connector pipeline.
export const missionResearchMoves = pgTable(
  'mission_research_move',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    missionId: text('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'cascade' }),
    ref: text('ref').notNull(),
    label: text('label'),
    role: text('role', { enum: missionEntityRoleEnum }),
    task: text('task'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => ({
    missionIdx: index('mission_research_move_mission_idx').on(t.missionId, t.sortOrder),
    refUnique: uniqueIndex('mission_research_move_ref_unique').on(t.missionId, t.ref),
  }),
);

// Read-only share links for a mission's deliverable. A token grants public
// (no-auth) access to the relationship map — `full` shows everything,
// `teaser` shows a blurred preview (counts + sectors + a couple of leads)
// for qualification before revealing the full map. `expiresAt` null = no
// expiry. Used for the M2C/TOS teaser flow (BUILD-HANDOFF §0).
export const missionShareModeEnum = ['full', 'teaser'] as const;
export type MissionShareMode = (typeof missionShareModeEnum)[number];

export const missionShares = pgTable(
  'mission_share',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    missionId: text('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    mode: text('mode', { enum: missionShareModeEnum }).notNull().default('full'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    missionIdx: index('mission_share_mission_idx').on(t.missionId),
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

export const reportsRelations = relations(reports, ({ one, many }) => ({
  creator: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
    relationName: 'report_creator',
  }),
  submitter: one(users, {
    fields: [reports.submittedBy],
    references: [users.id],
    relationName: 'report_submitter',
  }),
  reviewer: one(users, {
    fields: [reports.reviewerId],
    references: [users.id],
    relationName: 'report_reviewer',
  }),
  publisher: one(users, {
    fields: [reports.publishedBy],
    references: [users.id],
    relationName: 'report_publisher',
  }),
  audit: many(reportAudit),
}));

export const reportAuditRelations = relations(reportAudit, ({ one }) => ({
  report: one(reports, {
    fields: [reportAudit.reportId],
    references: [reports.id],
  }),
  actor: one(users, {
    fields: [reportAudit.actorId],
    references: [users.id],
  }),
}));

export const missionsRelations = relations(missions, ({ one, many }) => ({
  clientOrg: one(organizations, {
    fields: [missions.clientOrgId],
    references: [organizations.id],
  }),
  owner: one(users, {
    fields: [missions.ownerUserId],
    references: [users.id],
  }),
  rubric: many(missionRubricCriteria),
  entities: many(missionEntities),
  links: many(missionEntityLinks),
  opportunities: many(missionOpportunities),
  trends: many(missionTrends),
  researchMoves: many(missionResearchMoves),
  shares: many(missionShares),
}));

export const missionSharesRelations = relations(missionShares, ({ one }) => ({
  mission: one(missions, {
    fields: [missionShares.missionId],
    references: [missions.id],
  }),
}));

export const missionRubricCriteriaRelations = relations(missionRubricCriteria, ({ one }) => ({
  mission: one(missions, {
    fields: [missionRubricCriteria.missionId],
    references: [missions.id],
  }),
}));

export const missionEntitiesRelations = relations(missionEntities, ({ one, many }) => ({
  mission: one(missions, {
    fields: [missionEntities.missionId],
    references: [missions.id],
  }),
  // Edges where this entity is the source / destination. Two relations to
  // the same table need distinct relationNames so Drizzle can disambiguate.
  linksFrom: many(missionEntityLinks, { relationName: 'link_from' }),
  linksTo: many(missionEntityLinks, { relationName: 'link_to' }),
}));

export const missionEntityLinksRelations = relations(missionEntityLinks, ({ one }) => ({
  mission: one(missions, {
    fields: [missionEntityLinks.missionId],
    references: [missions.id],
  }),
  from: one(missionEntities, {
    fields: [missionEntityLinks.fromEntity],
    references: [missionEntities.id],
    relationName: 'link_from',
  }),
  to: one(missionEntities, {
    fields: [missionEntityLinks.toEntity],
    references: [missionEntities.id],
    relationName: 'link_to',
  }),
}));

export const missionOpportunitiesRelations = relations(missionOpportunities, ({ one }) => ({
  mission: one(missions, {
    fields: [missionOpportunities.missionId],
    references: [missions.id],
  }),
}));

export const missionTrendsRelations = relations(missionTrends, ({ one }) => ({
  mission: one(missions, {
    fields: [missionTrends.missionId],
    references: [missions.id],
  }),
}));

export const missionResearchMovesRelations = relations(missionResearchMoves, ({ one }) => ({
  mission: one(missions, {
    fields: [missionResearchMoves.missionId],
    references: [missions.id],
  }),
}));
