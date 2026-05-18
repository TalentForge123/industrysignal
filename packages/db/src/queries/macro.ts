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

export interface IndicatorMeta {
  indicatorKey: string;
  sourceKey: string;
  nameCs: string;
  nameEn: string;
  unit: string;
  periodKind: 'daily' | 'monthly' | 'quarterly' | 'yearly';
}

export interface MacroObservationInput {
  /** Canonical period label — 'YYYY-MM-DD' (daily), 'YYYY-MM' (monthly), 'YYYY-Qn' (quarterly), 'YYYY' (yearly). */
  period: string;
  /** First day of the period as ISO 'YYYY-MM-DD'. */
  observedAt: string;
  /** Decimal value — stored as Postgres NUMERIC, exchanged as string. */
  value: number;
  /** Raw upstream payload for audit. Optional. */
  raw?: unknown;
}

async function ensureIndicator(
  tx: Tx,
  args: IndicatorMeta,
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

/**
 * Generic upsert for a single (indicator, observations[]) batch — the
 * shared persistence path for every macro connector (ČNB FX, ČSÚ, future
 * Eurostat). The indicator row is auto-seeded on first sight; observation
 * rows are idempotent on (indicator_id, period); the indicator's
 * denormalized `latest_*` cache is refreshed when the batch contains a
 * period newer than what we'd previously seen.
 */
export async function upsertMacroObservations(
  db: Database,
  meta: IndicatorMeta,
  observations: MacroObservationInput[],
  options: { fetchedAt?: Date } = {},
): Promise<UpsertMacroResult> {
  const fetchedAt = options.fetchedAt ?? new Date();

  return db.transaction(async (tx) => {
    const { indicator, created } = await ensureIndicator(tx, meta);
    let observationsInserted = 0;
    let observationsUpdated = 0;
    let observationsUnchanged = 0;
    let latestObservedAt = indicator.latestObservedAt;
    let latestValue: string | null = indicator.latestValue;
    let latestPeriod: string | null = indicator.latestPeriod;

    for (const obs of observations) {
      // Postgres NUMERIC is exchanged as string in drizzle — preserves
      // the upstream decimal exactly with no float drift.
      const valueStr = obs.value.toString();

      const existingObs = await tx
        .select()
        .from(macroObservations)
        .where(
          and(
            eq(macroObservations.indicatorId, indicator.id),
            eq(macroObservations.period, obs.period),
          ),
        )
        .limit(1);

      if (existingObs.length === 0) {
        await tx.insert(macroObservations).values({
          indicatorId: indicator.id,
          period: obs.period,
          observedAt: obs.observedAt,
          value: valueStr,
          raw: (obs.raw ?? obs) as object,
          fetchedAt,
        });
        observationsInserted++;
      } else {
        const prior = existingObs[0]!;
        // Numeric compare via Number() — NUMERIC round-trips as e.g.
        // "24.3550" vs our "24.355", so string equality over-reports.
        if (Number(prior.value) === Number(valueStr)) {
          observationsUnchanged++;
        } else {
          await tx
            .update(macroObservations)
            .set({
              value: valueStr,
              raw: (obs.raw ?? obs) as object,
              fetchedAt,
            })
            .where(eq(macroObservations.id, prior.id));
          observationsUpdated++;
        }
      }

      // Track the newest period seen in *this batch*. We push to the
      // indicator row once at the end, not once per observation —
      // saves N-1 UPDATE roundtrips on a backfill batch.
      if (!latestObservedAt || obs.observedAt > latestObservedAt) {
        latestObservedAt = obs.observedAt;
        latestValue = valueStr;
        latestPeriod = obs.period;
      }
    }

    if (latestObservedAt !== indicator.latestObservedAt) {
      await tx
        .update(macroIndicators)
        .set({
          latestValue,
          latestPeriod,
          latestObservedAt,
          fetchedAt,
          updatedAt: fetchedAt,
        })
        .where(eq(macroIndicators.id, indicator.id));
    }

    return {
      indicatorsCreated: created ? 1 : 0,
      observationsInserted,
      observationsUpdated,
      observationsUnchanged,
    };
  });
}

/**
 * Thin wrapper that decomposes a ČNB FX snapshot into per-currency
 * (indicator, observations) batches and runs them through the generic
 * helper. Each FX rate becomes its own `cz.fx.<code>_czk` indicator.
 */
export async function upsertCnbFxSnapshot(
  db: Database,
  snapshot: CnbFxSnapshot,
): Promise<UpsertMacroResult> {
  const fetchedAt = new Date(snapshot.fetchedAt);
  const totals: UpsertMacroResult = {
    indicatorsCreated: 0,
    observationsInserted: 0,
    observationsUpdated: 0,
    observationsUnchanged: 0,
  };

  for (const obs of snapshot.observations) {
    const code = obs.code.toUpperCase();
    const partial = await upsertMacroObservations(
      db,
      {
        indicatorKey: `cz.fx.${code.toLowerCase()}_czk`,
        sourceKey: snapshot.sourceKey,
        nameCs: `Kurz ${code}/CZK`,
        nameEn: `${code}/CZK exchange rate`,
        // The connector already normalized amount=100 currencies to
        // per-single-foreign-unit, so the stored value means "CZK per
        // one foreign unit" uniformly.
        unit: 'CZK',
        periodKind: 'daily',
      },
      [
        {
          period: obs.observedAt,
          observedAt: obs.observedAt,
          value: obs.rate,
          raw: obs,
        },
      ],
      { fetchedAt },
    );
    totals.indicatorsCreated += partial.indicatorsCreated;
    totals.observationsInserted += partial.observationsInserted;
    totals.observationsUpdated += partial.observationsUpdated;
    totals.observationsUnchanged += partial.observationsUnchanged;
  }

  return totals;
}
