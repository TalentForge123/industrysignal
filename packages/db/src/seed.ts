// Minimal deterministic fixture for E2E + local exploration.
//
// IDs are stable strings (not random UUIDs) so Playwright specs can
// assert against them without first reading them back. Re-running is
// idempotent — `INSERT ... ON CONFLICT DO NOTHING` keeps the script
// safe to invoke from CI before each test run.
//
// Shape (matches HANDOFF §6 + §22 vocabulary):
//   1 org "Test Org s.r.o." with admin + analyst seats
//   1 default watchlist with 3 entries (Škoda / ČEZ / Vítkovice)
//   3 company rows (ARES-style) + a few officer rows
//   1 active insolvency_event against Vítkovice (debtor IČO match)
//   5 alerts: 1 critical insolvency, 2 high officer changes, 2 normal
//
// Run via `pnpm db:seed` (workspace root) — loads .env.local for DATABASE_URL.

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { SEED_IDS } from './seed-ids';

config({ path: '../../.env' });
config({ path: '../../.env.local', override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[db:seed] DATABASE_URL is required. Set it in .env.local at the repo root.');
  process.exit(1);
}

async function main() {
  const client = postgres(url!, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log('[db:seed] seeding fixture data ...');

    // ----- Users + org + membership ---------------------------------------
    await db
      .insert(schema.users)
      .values([
        {
          id: SEED_IDS.users.admin,
          email: SEED_IDS.emails.admin,
          name: 'Test Admin',
          emailVerified: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: SEED_IDS.users.analyst,
          email: SEED_IDS.emails.analyst,
          name: 'Test Analyst',
          emailVerified: new Date('2026-01-01T00:00:00Z'),
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(schema.organizations)
      .values({
        id: SEED_IDS.org,
        name: 'Test Org s.r.o.',
        countryIso: 'CZ',
        plan: 'growth',
        seatsTotal: 5,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.organizationMembers)
      .values([
        {
          userId: SEED_IDS.users.admin,
          organizationId: SEED_IDS.org,
          role: 'admin',
        },
        {
          userId: SEED_IDS.users.analyst,
          organizationId: SEED_IDS.org,
          role: 'analyst',
        },
      ])
      .onConflictDoNothing();

    // ----- Watchlist + entries --------------------------------------------
    await db
      .insert(schema.watchlists)
      .values({
        id: SEED_IDS.watchlist,
        organizationId: SEED_IDS.org,
        name: 'Default',
        createdBy: SEED_IDS.users.admin,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.watchlistEntries)
      .values([
        {
          id: SEED_IDS.watchlistEntries.skoda,
          watchlistId: SEED_IDS.watchlist,
          targetType: 'company',
          targetRef: '00177041',
          countryIso: 'CZ',
          label: 'Škoda Auto a.s.',
        },
        {
          id: SEED_IDS.watchlistEntries.cez,
          watchlistId: SEED_IDS.watchlist,
          targetType: 'company',
          targetRef: '45274649',
          countryIso: 'CZ',
          label: 'ČEZ, a.s.',
        },
        {
          id: SEED_IDS.watchlistEntries.vitkovice,
          watchlistId: SEED_IDS.watchlist,
          targetType: 'company',
          targetRef: '47675594',
          countryIso: 'CZ',
          label: 'Vítkovice Steel a.s.',
        },
      ])
      .onConflictDoNothing();

    // ----- Companies ------------------------------------------------------
    await db
      .insert(schema.companies)
      .values([
        {
          id: SEED_IDS.companies.skoda,
          countryIso: 'CZ',
          registryId: '00177041',
          sourceKey: 'ares',
          legalName: 'Škoda Auto a.s.',
          legalFormCode: '121',
          addressLine: 'tř. Václava Klementa 869, Mladá Boleslav II, 293 01 Mladá Boleslav',
          primaryNace: '29100',
          naceCodes: ['29100'],
          isActive: true,
          raw: { seed: true },
          contentHash: 'seed-skoda',
        },
        {
          id: SEED_IDS.companies.cez,
          countryIso: 'CZ',
          registryId: '45274649',
          sourceKey: 'ares',
          legalName: 'ČEZ, a.s.',
          legalFormCode: '121',
          addressLine: 'Duhová 1444/2, Michle, 140 00 Praha 4',
          primaryNace: '35110',
          naceCodes: ['35110'],
          isActive: true,
          raw: { seed: true },
          contentHash: 'seed-cez',
        },
        {
          id: SEED_IDS.companies.vitkovice,
          countryIso: 'CZ',
          registryId: '47675594',
          sourceKey: 'ares',
          legalName: 'Vítkovice Steel a.s.',
          legalFormCode: '121',
          addressLine: 'Štramberská 2871/47, Hulváky, 703 00 Ostrava',
          primaryNace: '24100',
          naceCodes: ['24100'],
          isActive: true,
          raw: { seed: true },
          contentHash: 'seed-vitkovice',
        },
      ])
      .onConflictDoNothing();

    // ----- Officers -------------------------------------------------------
    await db
      .insert(schema.companyOfficers)
      .values([
        {
          id: SEED_IDS.officers.skodaCeo,
          companyId: SEED_IDS.companies.skoda,
          countryIso: 'CZ',
          sourceKey: 'justice',
          name: 'Klaus Zellmer',
          role: 'director',
          roleLabel: 'Předseda představenstva',
          appointedAt: '2022-07-01',
          contentHash: 'seed-skoda-ceo',
        },
        {
          id: SEED_IDS.officers.vitkoviceCeo,
          companyId: SEED_IDS.companies.vitkovice,
          countryIso: 'CZ',
          sourceKey: 'justice',
          name: 'Radek Strouhal',
          role: 'director',
          roleLabel: 'Předseda představenstva',
          appointedAt: '2023-03-15',
          contentHash: 'seed-vitkovice-ceo',
        },
      ])
      .onConflictDoNothing();

    // ----- Insolvency event (active on Vítkovice) -------------------------
    await db
      .insert(schema.insolvencyEvents)
      .values({
        id: SEED_IDS.insolvency,
        countryIso: 'CZ',
        sourceKey: 'isir',
        debtorIco: '47675594',
        debtorName: 'Vítkovice Steel a.s.',
        caseCourt: 'Krajský soud v Ostravě',
        caseSenate: 60,
        caseKind: 'INS',
        caseNumber: 628,
        caseYear: 2026,
        caseStatus: 'ZAHÁJENÍ ÚPADKU',
        caseDetailUrl: 'https://isir.justice.cz/isir/ueas/test-detail',
        raw: { seed: true },
        contentHash: 'seed-ins-vitkovice',
      })
      .onConflictDoNothing();

    // ----- Alerts ---------------------------------------------------------
    // Hand-crafted mix so the AlertsView spec asserts against each tone +
    // priority bucket. createdAt staggered backwards so ordering is
    // visually obvious in the UI without needing time injection.
    const now = new Date();
    const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000);
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60_000);

    await db
      .insert(schema.alerts)
      .values([
        {
          id: SEED_IDS.alerts.critical,
          organizationId: SEED_IDS.org,
          watchlistId: SEED_IDS.watchlist,
          priority: 'critical',
          kind: 'insolvency_filed',
          targetType: 'company',
          targetRef: '47675594',
          countryIso: 'CZ',
          title: 'Insolvenční návrh — Vítkovice Steel a.s.',
          message: 'Spisová značka INS 628/2026 (Senát 60). Stav: ZAHÁJENÍ ÚPADKU.',
          sourceUrl: 'https://isir.justice.cz/isir/ueas/test-detail',
          sourceEventId: SEED_IDS.insolvency,
          status: 'new',
          createdAt: minutesAgo(12),
        },
        {
          id: SEED_IDS.alerts.high1,
          organizationId: SEED_IDS.org,
          watchlistId: SEED_IDS.watchlist,
          priority: 'high',
          kind: 'executive_change',
          targetType: 'company',
          targetRef: '00177041',
          countryIso: 'CZ',
          title: 'Změna ve statutárním orgánu — Škoda Auto a.s.',
          message: 'Předseda představenstva: Klaus Zellmer jmenován (k 2022-07-01).',
          sourceEventId: SEED_IDS.officers.skodaCeo,
          status: 'new',
          createdAt: minutesAgo(95),
        },
        {
          id: SEED_IDS.alerts.high2,
          organizationId: SEED_IDS.org,
          watchlistId: SEED_IDS.watchlist,
          priority: 'high',
          kind: 'executive_change',
          targetType: 'company',
          targetRef: '47675594',
          countryIso: 'CZ',
          title: 'Změna ve statutárním orgánu — Vítkovice Steel a.s.',
          message: 'Předseda představenstva: Radek Strouhal jmenován (k 2023-03-15).',
          sourceEventId: SEED_IDS.officers.vitkoviceCeo,
          status: 'read',
          createdAt: daysAgo(1),
        },
        {
          id: SEED_IDS.alerts.normal1,
          organizationId: SEED_IDS.org,
          watchlistId: SEED_IDS.watchlist,
          priority: 'normal',
          kind: 'contract_win',
          targetType: 'company',
          targetRef: '45274649',
          countryIso: 'CZ',
          title: 'Vyhraná zakázka — ČEZ, a.s.',
          message: 'ČEZ získal kontrakt na dodávky elektřiny pro Pražské vodovody (4 roky).',
          status: 'new',
          createdAt: daysAgo(2),
        },
        {
          id: SEED_IDS.alerts.normal2,
          organizationId: SEED_IDS.org,
          watchlistId: SEED_IDS.watchlist,
          priority: 'normal',
          kind: 'capacity_expansion',
          targetType: 'company',
          targetRef: '00177041',
          countryIso: 'CZ',
          title: 'Rozšíření kapacity — Škoda Auto a.s.',
          message: 'Škoda Auto oznámila navýšení produkce v Mladé Boleslavi o 8 % pro H2 2026.',
          status: 'read',
          createdAt: daysAgo(3),
        },
      ])
      .onConflictDoNothing();

    console.log('[db:seed] done — fixtures available under SEED_IDS in packages/db/src/seed.ts');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[db:seed] failed:', err);
  process.exit(1);
});
