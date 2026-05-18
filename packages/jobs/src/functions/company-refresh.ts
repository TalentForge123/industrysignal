// On-demand company refresh — fetches the latest snapshot from every
// connector available for the target country and persists via the
// existing upsert helpers in @industrysignal/db.
//
// Each external call is wrapped in `step.run`: Inngest persists the
// step's return value to durable storage, so on retry it skips already-
// completed steps. That means a transient ISIR failure won't re-charge
// the ARES roundtrip on retry — important once we add paid connectors.
//
// Country routing today is CZ-only (ARES + ISIR). When DE / SK / PL land
// (Sprint 7–8, §14), this function grows a `switch (countryIso)` block
// that delegates to the per-country CountryConnector implementation. The
// connector abstraction means the *event handler* doesn't need to know
// which registries exist for which country — it asks the connector.

import { fetchAresByIco, fetchIsirByIco } from '@industrysignal/connectors-cz';
import { upsertCompanyFromAres, upsertInsolvencyEvents } from '@industrysignal/db';
import { NonRetriableError } from 'inngest';
import { inngest } from '../client';
import type { JobContext } from '../factory';

export function companyRefresh({ db }: JobContext) {
  return inngest.createFunction(
    {
      id: 'company-refresh',
      name: 'Company refresh (ARES + ISIR, on demand)',
      // ARES has no published rate limit but staying polite keeps us
      // off any future block-list. 10 concurrent IČOs / second feels
      // safe given the underlying connectors deduplicate cache hits.
      concurrency: { limit: 10 },
      throttle: { limit: 10, period: '1s' },
      // The handler is fully idempotent (content_hash gated upserts),
      // so unlimited retries are fine — but cap at 3 to keep the
      // dashboard tidy when a single IČO is permanently malformed.
      retries: 3,
    },
    { event: 'company/refresh.requested' },
    async ({ event, step }) => {
      const { countryIso, registryId } = event.data;

      if (countryIso !== 'CZ') {
        // Sprint 2 ships CZ only. Throwing a NonRetriableError prevents
        // Inngest from retrying — the country connector simply isn't
        // wired up yet (§14, Sprint 7+).
        throw new NonRetriableError(
          `company-refresh: no connector for country ${countryIso} yet (HANDOFF §14)`,
        );
      }

      // ----- ARES ---------------------------------------------------------
      const aresResult = await step.run('fetch-and-persist-ares', async () => {
        const snapshot = await fetchAresByIco(registryId);
        if (!snapshot) {
          // Not an error — IČO might be foreign, deactivated, or simply
          // outside the public ARES dataset. Let the run continue to
          // ISIR (which may still have insolvency records on a debtor
          // that's no longer in ARES).
          return { found: false as const };
        }
        const persisted = await upsertCompanyFromAres(db, snapshot);
        return {
          found: true as const,
          changed: persisted.changed,
          created: persisted.created,
          legalName: snapshot.legalName,
        };
      });

      // ----- ISIR ---------------------------------------------------------
      const isirResult = await step.run('fetch-and-persist-isir', async () => {
        const result = await fetchIsirByIco(registryId);
        if (result.events.length === 0) {
          return { eventCount: 0, anyChanged: false };
        }
        const persisted = await upsertInsolvencyEvents(db, result);
        const anyChanged = persisted.events.some((e) => e.created || e.changed);
        return { eventCount: persisted.events.length, anyChanged };
      });

      // ----- Outcome event ------------------------------------------------
      // Downstream signal classifiers (Sprint 3+, §16) subscribe to this
      // instead of polling the DB. Emitting unconditionally — even when
      // nothing changed — gives subscribers a heartbeat they can use to
      // distinguish "we asked and nothing moved" from "we never asked".
      await step.sendEvent('emit-completed', {
        name: 'company/refresh.completed' as const,
        data: {
          countryIso,
          registryId,
          aresChanged: aresResult.found ? aresResult.changed : false,
          isirEventCount: isirResult.eventCount,
          isirChanged: isirResult.anyChanged,
        },
      });

      return {
        ares: aresResult,
        isir: isirResult,
      };
    },
  );
}
