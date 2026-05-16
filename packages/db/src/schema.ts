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
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
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

export const alerts = pgTable('alert', {
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
  status: text('status', { enum: alertStatusEnum }).notNull().default('new'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
