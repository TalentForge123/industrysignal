// Studio app's Drizzle handle. Mirrors apps/portal/lib/db.ts —
// the same placeholder URL trick keeps `next build` cheap when
// DATABASE_URL is absent. Queries against the placeholder fail
// loudly at first request.

import { createDb } from '@industrysignal/db';

const url =
  process.env.DATABASE_URL ?? 'postgres://placeholder:placeholder@localhost:5432/placeholder';

export const db = createDb(url);
