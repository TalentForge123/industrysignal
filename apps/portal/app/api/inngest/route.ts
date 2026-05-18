// Inngest webhook handler — Inngest Cloud (or the local dev server) POSTs
// to this route to invoke registered functions. The route also responds
// to GET probes used by Inngest for function discovery and health checks.
//
// We register the functions defined in @industrysignal/jobs and inject
// the portal's existing DB singleton (lib/db.ts). When apps/workers
// later serves its own /inngest endpoint for long-running scrapers, it
// will register a different subset using the same factory.

import { serve } from 'inngest/next';
import { createFunctions, inngest } from '@industrysignal/jobs';
import { db } from '../../../lib/db';

const handler = serve({
  client: inngest,
  functions: [...createFunctions({ db })],
});

export const { GET, POST, PUT } = handler;
