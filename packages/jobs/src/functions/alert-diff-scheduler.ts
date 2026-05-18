// Daily alert-diff scheduler — turns recent upstream changes into
// in-app alerts for the orgs that watch the affected companies.
//
// Runs at 04:00 UTC, one hour after the company-refresh fan-out kicks
// off at 03:00 UTC. The lookback window is 25h — covers the full fan-
// out + scheduler skew plus a buffer; deduplication on
// (organization_id, kind, source_event_id) makes the overlap safe.
//
// Detection layers (each gets its own step.run so failures stay
// isolated and Inngest can resume from where it left off):
//
//   1. Insolvency filings (priority: critical)
//   2. Officer changes — appointed + terminated (priority: high)
//
// Future layers (slot in as additional step.run blocks):
//   - Address / NACE changes from ARES snapshot diff
//   - Negative news cluster (GDELT rolling z-score, §16)
//   - Macro threshold crossings (CPI > 3%, EUR/CZK > 25, ...)

import {
  findOrgsWatchingCompany,
  findRecentInsolvencyEvents,
  findRecentOfficerChanges,
  insertAlertIfNew,
} from '@industrysignal/db';
import {
  classifyInsolvencyAlert,
  classifyOfficerAlert,
} from '../alert-classifier';
import { inngest } from '../client';
import type { JobContext } from '../factory';

const LOOKBACK_HOURS = 25;

export function alertDiffScheduler({ db }: JobContext) {
  return inngest.createFunction(
    {
      id: 'alert-diff-scheduler',
      name: 'Alert diff (daily)',
      concurrency: { limit: 1 },
      retries: 3,
    },
    { cron: 'TZ=UTC 0 4 * * *' },
    async ({ step }) => {
      const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

      const insolvency = await step.run('insolvency-alerts', async () => {
        const changes = await findRecentInsolvencyEvents(db, since);
        let emitted = 0;
        let deduplicated = 0;
        let unmatched = 0;
        for (const change of changes) {
          // Without a debtor IČO there's no company to map to a watchlist
          // entry — surface the count so we can spot data-quality issues
          // without making the scheduler crash.
          if (!change.event.debtorIco) {
            unmatched++;
            continue;
          }
          const pairs = await findOrgsWatchingCompany(
            db,
            change.event.countryIso,
            change.event.debtorIco,
          );
          if (pairs.length === 0) {
            unmatched++;
            continue;
          }
          for (const pair of pairs) {
            const alert = classifyInsolvencyAlert({
              event: change.event,
              company: change.company,
              pair,
            });
            const inserted = await insertAlertIfNew(db, alert);
            if (inserted) emitted++;
            else deduplicated++;
          }
        }
        return { processed: changes.length, emitted, deduplicated, unmatched };
      });

      const officers = await step.run('officer-alerts', async () => {
        const changes = await findRecentOfficerChanges(db, since);
        let emitted = 0;
        let deduplicated = 0;
        let unmatched = 0;
        for (const change of changes) {
          const pairs = await findOrgsWatchingCompany(
            db,
            change.company.countryIso,
            change.company.registryId,
          );
          if (pairs.length === 0) {
            unmatched++;
            continue;
          }
          for (const pair of pairs) {
            const alert = classifyOfficerAlert({
              officer: change.officer,
              company: change.company,
              changeType: change.changeType,
              pair,
            });
            const inserted = await insertAlertIfNew(db, alert);
            if (inserted) emitted++;
            else deduplicated++;
          }
        }
        return { processed: changes.length, emitted, deduplicated, unmatched };
      });

      return { insolvency, officers };
    },
  );
}
