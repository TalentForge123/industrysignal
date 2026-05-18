// Persistence helpers for macro indicators (HANDOFF §3.1).
//
// `upsertCnbFxSnapshot` is the single write path for ČNB daily FX
// fixings. It auto-creates indicator rows on first sight per currency
// code so the operator doesn't have to seed `macro_indicator` manually
// — the cron just runs and the registry fills in.
//
// Idempotency: an observation is written exactly once per (indicator,
// period). Re-running the same upstream payload on a retry rewrites
// only if the value changed (rare — ČNB doesn't revise published
// fixings, but the door stays open for future indicators that do).
//
// Atomicity: indicators + observations + latest-cache update share one
// transaction. Partial application would leave indicator.latest_* out
// of sync with the actual observations.

import type { CnbFxSnapshot } from '@industrysignal/connectors-cz';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { macroIndicators, macroObservations } from '../schema';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export type MacroIndicatorRow = typeof macroIndicators.$inferSelect;
export type MacroObservationRow = typeof macroObservations.$inferSelect;

export interface UpsertMacroResult {
  indicatorsCreated: number;
  observationsInserted: number;
  observationsUpdated: number;
  observationsUnchanged: number;
}

interface EnsureIndicatorArgs {
  indicatorKey: string;
  sourceKey: string;
  nameCs: string;
  nameEn: string;
  unit: string;
  periodKind: 'daily' | 'monthly' | 'quarterly' | 'yearly';
}

async function ensureIndicator(
  tx: Tx,
  args: EnsureIndicatorArgs,
): Promise<{ indicator: MacroIndicatorRow; created: boolean }> {
  const existing = await tx
    .select()
    .from(macroIndicators)
    .where(eq(macroIndicators.indicatorKey, args.indicatorKey))
    .limit(1);
  if (existing.length > 0) {
    return { indicator: existing[0]!, created: false };
  }
  const [inserted] = await tx
    .insert(macroIndicators)
    .values({
      indicatorKey: args.indicatorKey,
      sourceKey: args.sourceKey,
      nameCs: args.nameCs,
      nameEn: args.nameEn,
      unit: args.unit,
      periodKind: args.periodKind,
    })
    .returning();
  if (!inserted) throw new Error('ensureIndicator: insert returned no row');
  return { indicator: inserted, created: true };
}

export async function upsertCnbFxSnapshot(
  db: Database,
  snapshot: CnbFxSnapshot,
): Promise<UpsertMacroResult> {
  const fetchedAt = new Date(snapshot.fetchedAt);

  return db.transaction(async (tx) => {
    let indicatorsCreated = 0;
    let observationsInserted = 0;
    let observationsUpdated = 0;
    let observationsUnchanged = 0;

    for (const obs of snapshot.observations) {
      const code = obs.code.toUpperCase();
      const indicatorKey = `cz.fx.${code.toLowerCase()}_czk`;
      const { indicator, created } = await ensureIndicator(tx, {
        indicatorKey,
        sourceKey: snapshot.sourceKey,
        nameCs: `Kurz ${code}/CZK`,
        nameEn: `${code}/CZK exchange rate`,
        // Always per-single-foreign-unit (the connector already
        // normalized amount=100 currencies — see cnb/normalize.ts).
        unit: 'CZK',
        periodKind: 'daily',
      });
      if (created) indicatorsCreated++;

      const period = obs.observedAt; // ISO 'YYYY-MM-DD' — period-key for daily.
      // Postgres NUMERIC is exchanged as string in drizzle — preserves
      // the upstream decimal exactly with no float drift.
      const valueStr = obs.rate.toString();

      const existingObs = await tx
        .select()
        .from(macroObservations)
        .where(
          and(
            eq(macroObservations.indicatorId, indicator.id),
            eq(macroObservations.period, period),
          ),
        )
        .limit(1);

      if (existingObs.length === 0) {
        await tx.insert(macroObservations).values({
          indicatorId: indicator.id,
          period,
          observedAt: period,
          value: valueStr,
          raw: obs as unknown as object,
          fetchedAt,
        });
        observationsInserted++;
      } else {
        const prior = existingObs[0]!;
        // Numeric comparison via parsed floats — Postgres NUMERIC may
        // round-trip as "24.3550" vs our "24.355", so string-equality
        // would over-report changes.
        if (Number(prior.value) === Number(valueStr)) {
          observationsUnchanged++;
        } else {
          await tx
            .update(macroObservations)
            .set({
              value: valueStr,
              raw: obs as unknown as object,
              fetchedAt,
            })
            .where(eq(macroObservations.id, prior.id));
          observationsUpdated++;
        }
      }

      // Refresh denormalized latest-* cache when this observation is
      // newer than the indicator's last seen period. Lexicographic
      // compare on ISO dates is chronological.
      const priorLatest = indicator.latestObservedAt;
      if (!priorLatest || period > priorLatest) {
        await tx
          .update(macroIndicators)
          .set({
            latestValue: valueStr,
            latestPeriod: period,
            latestObservedAt: period,
            fetchedAt,
            updatedAt: fetchedAt,
          })
          .where(eq(macroIndicators.id, indicator.id));
      }
    }

    return {
      indicatorsCreated,
      observationsInserted,
      observationsUpdated,
      observationsUnchanged,
    };
  });
}
