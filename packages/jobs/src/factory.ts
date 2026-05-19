// Function factory — binds the Inngest function definitions to a runtime
// Database handle and returns the array that `serve()` registers.
//
// Why a factory and not module-level singletons:
//   - `apps/portal` runs on Vercel serverless and wants `max=1` connection
//     per invocation; `apps/workers` will run on a long-lived Hetzner VPS
//     and wants `max=10`. The DB client is constructed by the caller with
//     its preferred pool size.
//   - Tests can pass a stubbed db without touching the network.
//   - When we later split long-running scrapers off to the workers app,
//     it imports the same factory and registers a subset of functions.

import type { Database } from '@industrysignal/db';
import { alertDiffScheduler } from './functions/alert-diff-scheduler';
import { companiesRefreshScheduler } from './functions/companies-refresh-scheduler';
import { companyRefresh } from './functions/company-refresh';
import { criticalAlertEmail } from './functions/critical-alert-email';
import { macroRefreshScheduler } from './functions/macro-refresh-scheduler';

export interface JobContext {
  db: Database;
}

export function createFunctions(ctx: JobContext) {
  return [
    companiesRefreshScheduler(ctx),
    companyRefresh(ctx),
    macroRefreshScheduler(ctx),
    alertDiffScheduler(ctx),
    criticalAlertEmail(ctx),
  ] as const;
}
