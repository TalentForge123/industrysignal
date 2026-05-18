// Shared Inngest client + typed event schema.
//
// The client is a thin singleton — `id` becomes the app identifier in the
// Inngest dashboard and the cache key for function registrations. In dev,
// the local Inngest dev server (`pnpm inngest:dev`) auto-discovers the
// portal's /api/inngest endpoint and runs everything locally without
// needing keys. In prod, INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY are
// expected as env vars (set in Vercel) — Inngest's SDK picks them up
// automatically when present.

import { EventSchemas, Inngest } from 'inngest';

// ----- Event taxonomy -----------------------------------------------------
//
// Naming convention: `<domain>/<verb>.<modality>`. Keep verbs in past tense
// for "something happened" events and infinitive for "do this" commands.
//
// `company/refresh.requested` — command. Emitted by the scheduler (or by
//                               admin tooling) to ask the pipeline to
//                               re-fetch a single company across all
//                               available connectors for its country.
//
// `company/refresh.completed` — outcome event. Emitted at the end of a
//                               successful refresh so downstream signal
//                               classifiers (Week 3+, §16) can react
//                               without polling.

type Events = {
  'company/refresh.requested': {
    data: {
      countryIso: string;
      registryId: string;
      /** Optional trigger context — useful for debugging which scheduler run fanned this out. */
      triggeredBy?: 'scheduler' | 'admin' | 'api' | 'cli';
    };
  };
  'company/refresh.completed': {
    data: {
      countryIso: string;
      registryId: string;
      aresChanged: boolean;
      isirEventCount: number;
      isirChanged: boolean;
    };
  };
};

export const inngest = new Inngest({
  id: 'industrysignal',
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type IndustrySignalEvents = Events;
