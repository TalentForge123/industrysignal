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

import { fetchCnbDailyFx } from '@industrysignal/connectors-cz';
import { upsertCnbFxSnapshot } from '@industrysignal/db';
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

      // Future-proofing: when ČSÚ (CPI, industrial production, GDP) and
      // Eurostat (EU PMI, industrial production) connectors land, add
      // additional `step.run` blocks here. Each step is independently
      // retry-safe so a flaky upstream doesn't roll back the others.

      return { cnb: cnbResult };
    },
  );
}
