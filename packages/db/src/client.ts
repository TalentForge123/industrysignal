// Drizzle client factory.
//
// Apps should call `createDb(databaseUrl)` once at startup and pass the
// returned handle around (e.g. through a request context). For Next.js
// App Router, a module-level singleton tied to process.env.DATABASE_URL
// is acceptable in dev; in production prefer dependency injection so the
// edge runtime + workers can share the same code without picking up the
// wrong env.

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

export interface CreateDbOptions {
  /**
   * Max simultaneous Postgres connections held by this client.
   * Defaults to 10 — fine for Next dev and a single Hetzner VPS worker.
   * Override to 1 in serverless runtimes (Vercel functions) so each
   * invocation gets its own short-lived connection.
   */
  max?: number;
  /**
   * Connect-timeout in seconds. Defaults to 10.
   */
  connectTimeout?: number;
}

export function createDb(databaseUrl: string, options: CreateDbOptions = {}) {
  if (!databaseUrl) {
    throw new Error('createDb: DATABASE_URL is required');
  }
  const client = postgres(databaseUrl, {
    max: options.max ?? 10,
    connect_timeout: options.connectTimeout ?? 10,
    prepare: false,
  });
  return drizzle(client, { schema, casing: 'snake_case' });
}
