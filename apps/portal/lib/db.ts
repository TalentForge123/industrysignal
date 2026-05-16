// Drizzle client singleton for the portal app.
//
// The fallback URL keeps module-evaluation cheap even when DATABASE_URL is
// not yet provisioned (e.g. during the first `next build` before a Neon
// project exists). postgres-js stores the URL lazily and only opens a
// connection on the first query, so build/SSR for routes that don't touch
// the DB still succeed; queries against the placeholder fail loudly at
// runtime with a clear postgres-js error.

import { createDb } from '@industrysignal/db';

const url = process.env.DATABASE_URL ?? 'postgres://placeholder:placeholder@localhost:5432/placeholder';

export const db = createDb(url);
