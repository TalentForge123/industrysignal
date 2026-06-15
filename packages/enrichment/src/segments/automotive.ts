// Automotive analyzer — NACE C 29 (vehicles) + C 30 (other transport).
//
// Mirrors the Energetika analyzer but with automotive-specific NACE
// prefixes + macro indicators. Wired against the same DB-only inputs
// for Sprint 4; the SDA / ACEA / VDA fetchers from HANDOFF §3.5 add a
// `productionDelta` channel later without changing this file's shape.

import { and, eq, gte, isNull, or, sql } from 'drizzle-orm';
import { type Database, schema } from '@industrysignal/db';
import { runSegmentAnalyzer, type RunSegmentAnalyzerArgs } from '../pipeline';
import type { LlmRunner } from '../runner';
import type { SegmentReportInput, SegmentRunResult } from '../types';

const SEGMENT_KEY = 'automotive';
const NACE_PREFIXES = ['29', '30']; // Vehicles + other transport
const MACRO_KEYS = ['cz.fx.eur_czk', 'cz.macro.industrial_production_yoy', 'cz.macro.pmi_mfg'];

export interface AnalyzeAutomotiveArgs {
  db: Database;
  quarter: string;
  runner: LlmRunner;
  consumerRef?: string;
}

export async function analyzeAutomotive(
  args: AnalyzeAutomotiveArgs,
): Promise<SegmentRunResult> {
  const input = await gatherAutomotiveInput(args.db, args.quarter);
  const pipelineArgs: RunSegmentAnalyzerArgs = {
    db: args.db,
    input,
    segmentLabel: 'Automotive',
    runner: args.runner,
    consumerRef: args.consumerRef,
  };
  return runSegmentAnalyzer(pipelineArgs);
}

async function gatherAutomotiveInput(
  db: Database,
  quarter: string,
): Promise<SegmentReportInput> {
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
