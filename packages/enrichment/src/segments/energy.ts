// Energetika analyzer — NACE D 35.
//
// Pulls: macro indicators related to energy prices (CNB FX, OTE-CR
// spot, ENTSO-E flows when wired), insolvency events in NACE 35*,
// recent ČEZ / EPH / ENERGO-PRO news mentions. Output: an editorial
// draft section, language-paired, ready for Studio review.
//
// The actual upstream fetches are stubs for now (the connectors land
// across Sprints 2–5); this analyzer wires the inputs that already
// exist (macro + insolvency) and leaves named hooks for the rest.

import { and, eq, gte, ilike, isNull, or, sql } from 'drizzle-orm';
import {
  type Database,
  schema,
} from '@industrysignal/db';
import { runSegmentAnalyzer, type RunSegmentAnalyzerArgs } from '../pipeline';
import type { LlmRunner } from '../runner';
import type { SegmentReportInput, SegmentRunResult } from '../types';

const SEGMENT_KEY = 'energy';
const NACE_PREFIXES = ['35']; // CZ-NACE D 35 — Výroba a rozvod elektřiny, plynu, ...
const MACRO_KEYS = ['cz.fx.eur_czk', 'cz.macro.cpi_yoy', 'cz.energy.spot_eur_mwh'];

export interface AnalyzeEnergyArgs {
  db: Database;
  quarter: string; // 'YYYY-Q[1-4]'
  runner: LlmRunner;
  consumerRef?: string;
}

export async function analyzeEnergy(args: AnalyzeEnergyArgs): Promise<SegmentRunResult> {
  const input = await gatherEnergyInput(args.db, args.quarter);

  const pipelineArgs: RunSegmentAnalyzerArgs = {
    db: args.db,
    input,
    segmentLabel: 'Energetika',
    runner: args.runner,
    consumerRef: args.consumerRef,
  };
  return runSegmentAnalyzer(pipelineArgs);
}

async function gatherEnergyInput(
  db: Database,
  quarter: string,
): Promise<SegmentReportInput> {
  // 1. Macro snapshot — latest known values for relevant indicators.
  //    The macro_indicator table denormalizes `latest_*` columns so we
  //    can hydrate the prompt without a per-series ORDER BY scan.
  const macro = await db
    .select({
      indicatorKey: schema.macroIndicators.indicatorKey,
      nameCs: schema.macroIndicators.nameCs,
      nameEn: schema.macroIndicators.nameEn,
      latestValue: schema.macroIndicators.latestValue,
      latestPeriod: schema.macroIndicators.latestPeriod,
      unit: schema.macroIndicators.unit,
    })
    .from(schema.macroIndicators)
    .where(
      or(...MACRO_KEYS.map((k) => eq(schema.macroIndicators.indicatorKey, k))) ?? sql`false`,
    );

  // 2. Insolvency count — active proceedings tied to NACE 35* debtors.
  //    Bridging "insolvency_event.debtor_ico ↔ company.nace_codes" needs
  //    an EXISTS subquery because `debtor_ico` is a free text column.
  const insolvCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(schema.insolvencyEvents)
    .where(
      and(
        isNull(schema.insolvencyEvents.bankruptcyEndedAt),
        sql`EXISTS (
          SELECT 1 FROM "company" c
          WHERE c.registry_id = ${schema.insolvencyEvents.debtorIco}
            AND c.country_iso = 'CZ'
            AND ${sql.raw(
              NACE_PREFIXES.map((p) => `c.primary_nace LIKE '${p}%'`).join(' OR '),
            )}
        )`,
      ),
    );
  const insolvencyCount = Number(insolvCount[0]?.c ?? 0);

  // 3. Company movements — most recent statutory body changes in the
  //    segment. Officer rows with `terminated_at` set in the quarter
  //    window are the cleanest source until news NER is wired.
  const movements = await db
    .select({
      ico: schema.companies.registryId,
      name: schema.companies.legalName,
      role: schema.companyOfficers.roleLabel,
      terminatedAt: schema.companyOfficers.terminatedAt,
      appointedAt: schema.companyOfficers.appointedAt,
    })
    .from(schema.companyOfficers)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.companyOfficers.companyId))
    .where(
      and(
        sql.raw(
          `(${NACE_PREFIXES.map((p) => `"company"."primary_nace" LIKE '${p}%'`).join(' OR ')})`,
        ),
        // Picked up either as new appointment in the last quarter or as
        // termination — either way it's an "executive change" for the report.
        or(
          gte(schema.companyOfficers.appointedAt, quarterStart(quarter)),
          gte(schema.companyOfficers.terminatedAt, quarterStart(quarter)),
        ),
      ),
    )
    .limit(20);

  return {
    segmentKey: SEGMENT_KEY,
    quarter,
    macro: macro.map((m) => ({
      indicatorKey: m.indicatorKey,
      nameCs: m.nameCs,
      nameEn: m.nameEn,
      latestValue: m.latestValue,
      latestPeriod: m.latestPeriod,
      unit: m.unit,
    })),
    insolvencyCount,
    companyMovements: movements.map((m) => ({
      ico: m.ico,
      name: m.name,
      changeKind: m.terminatedAt ? 'officer_change_terminated' : 'officer_change_appointed',
      detail: m.role,
      occurredAt: (m.terminatedAt ?? m.appointedAt) ?? undefined,
    })),
    // News feed lands when the GDELT + vanity scraper pipeline ships
    // (Sprint 6 per §15.6). For now: empty array — the prompt handles
    // "thin data" gracefully via rule R3.
    news: [],
  };
}

function quarterStart(quarter: string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(quarter);
  if (!m) throw new Error(`Invalid quarter: ${quarter}`);
  const year = Number(m[1]);
  const q = Number(m[2]);
  const month = (q - 1) * 3 + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
