// Daily fan-out scheduler — picks companies that need a refresh and emits
// one `company/refresh.requested` event per IČO. The actual fetch + persist
// logic lives in `company-refresh.ts`, so this function stays small,
// auditable, and easy to swap (e.g. cron → on-demand admin trigger).
//
// Selection policy (Sprint 2):
//   Refresh every company that appears in at least one watchlist entry
//   (target_type = 'company') belonging to an organization. This keeps
//   ARES + ISIR load proportional to active customer interest rather
//   than table size — when Watch List CRUD lands in Sprint 3 the cron
//   automatically picks up new entries with no code change here.
//
// Cron: 03:00 UTC daily. ARES refreshes its public dataset overnight, so
// 03:00 catches the freshest data before European business hours. ISIR
// updates hourly upstream but daily is plenty for distress-event recall.

import { and, eq, inArray } from 'drizzle-orm';
import { schema } from '@industrysignal/db';
import { inngest } from '../client';
import type { JobContext } from '../factory';

export function companiesRefreshScheduler({ db }: JobContext) {
  return inngest.createFunction(
    {
      id: 'companies-refresh-scheduler',
      name: 'Companies refresh scheduler (daily fan-out)',
      // Inngest auto-retries each step on failure (default 4 attempts with
      // exponential backoff). The fan-out itself is idempotent: re-sending
      // the same event on retry just re-runs company-refresh, which is
      // content-hash gated.
    },
    { cron: 'TZ=UTC 0 3 * * *' },
    async ({ step }) => {
      const targets = await step.run('select-watchlisted-companies', async () => {
        const rows = await db
          .select({
            countryIso: schema.watchlistEntries.countryIso,
            registryId: schema.watchlistEntries.targetRef,
          })
          .from(schema.watchlistEntries)
          .where(eq(schema.watchlistEntries.targetType, 'company'));

        // De-duplicate: the same IČO can appear in many watchlists across
        // orgs but we only want to refresh it once per day.
        const seen = new Set<string>();
        const unique: Array<{ countryIso: string; registryId: string }> = [];
        for (const r of rows) {
          const key = `${r.countryIso}:${r.registryId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push({ countryIso: r.countryIso, registryId: r.registryId });
        }
        return unique;
      });

      if (targets.length === 0) {
        return { fannedOut: 0, reason: 'no watchlisted companies' };
      }

      // Fan-out as a single batched send — Inngest accepts up to 512 events
      // per `send` call. For >512 watchlisted companies we'd chunk, but
      // we're nowhere near that in MVP and a TODO is enough.
      await step.sendEvent(
        'fan-out-refresh-requests',
        targets.map((t) => ({
          name: 'company/refresh.requested' as const,
          data: {
            countryIso: t.countryIso,
            registryId: t.registryId,
            triggeredBy: 'scheduler' as const,
          },
        })),
      );

      return { fannedOut: targets.length };
    },
  );
}

// Silence the unused-import warning while keeping the surface stable —
// `and` / `inArray` will be used once we extend selection with country
// filters or with the canonical entity graph in §15.
void and;
void inArray;
