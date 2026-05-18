// Daily macro-indicator refresh.
//
// HANDOFF §3.1: ČSÚ + ČNB + Eurostat power the Report KPI strip. This
// scheduler currently covers ČNB daily FX; ČSÚ + Eurostat plug in as
// additional `step.run` blocks as their connectors land.
//
// Schedule: 14:00 UTC. ČNB publishes its daily fixing at ~14:30 Prague
// time (12:30 / 13:30 UTC depending on DST) — running at 14:00 UTC
// catches the same-day fixing year-round. On weekends and Czech bank
// holidays ČNB returns the previous business day's fixing; the
// content-hash-gated upsert turns that into a cheap no-op.

import {
  CSU_INDICATORS,
  fetchCnbDailyFx,
  fetchCsuIndicator,
} from '@industrysignal/connectors-cz';
import {
  upsertCnbFxSnapshot,
  upsertMacroObservations,
} from '@industrysignal/db';
import { inngest } from '../client';
import type { JobContext } from '../factory';

export function macroRefreshScheduler({ db }: JobContext) {
  return inngest.createFunction(
    {
      id: 'macro-refresh-scheduler',
      name: 'Macro indicators refresh (ČNB FX, daily)',
      // Light job — one HTTP roundtrip + a small transaction. Single
      // run at a time is enough; retry on transient ČNB outages.
      concurrency: { limit: 1 },
      retries: 3,
    },
    { cron: 'TZ=UTC 0 14 * * *' },
    async ({ step }) => {
      const cnbResult = await step.run('fetch-and-persist-cnb-fx', async () => {
        const snapshot = await fetchCnbDailyFx();
        if (!snapshot) {
          return { skipped: 'no-fixing-available' as const };
        }
        const persisted = await upsertCnbFxSnapshot(db, snapshot);
        return {
          observedAt: snapshot.observedAt,
          upstreamSeq: snapshot.upstreamSeq,
          ...persisted,
        };
      });

      // ----- ČSÚ ---------------------------------------------------------
      // Iterate over every registered ČSÚ indicator. Each gets its own
      // step.run so a 5xx on one dataset doesn't roll back the others.
      // CSU_INDICATORS is a typed constant; the for-loop over it stays
      // out of the LLM/data-config rabbit hole and keeps the Inngest
      // function shape predictable in the dashboard.
      const csuResults: Record<string, unknown> = {};
      for (const spec of CSU_INDICATORS) {
        // Step IDs must be unique within a function run.
        const stepId = `csu:${spec.indicatorKey}`;
        csuResults[spec.indicatorKey] = await step.run(stepId, async () => {
          const snapshot = await fetchCsuIndicator(spec);
          if (!snapshot) {
            return { skipped: 'no-data' as const };
          }
          const persisted = await upsertMacroObservations(
            db,
            {
              indicatorKey: spec.indicatorKey,
              sourceKey: snapshot.sourceKey,
              nameCs: spec.nameCs,
              nameEn: spec.nameEn,
              unit: spec.unit,
              periodKind: spec.periodKind,
            },
            snapshot.observations,
            { fetchedAt: new Date(snapshot.fetchedAt) },
          );
          return {
            observationCount: snapshot.observations.length,
            ...persisted,
          };
        });
      }

      // Future-proofing: when Eurostat (EU PMI, industrial production,
      // Comext trade flows) connectors land, append another loop here.

      return { cnb: cnbResult, csu: csuResults };
    },
  );
}
