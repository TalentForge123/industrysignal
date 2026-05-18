// Public surface for @industrysignal/db.
//
// - `schema` — table definitions + relations, importable as a namespace
//   for Drizzle queries: `db.query.users.findFirst(...)`.
// - `createDb(url)` — client factory, see ./client.ts.
//
// Types for individual tables (`InferSelectModel<typeof users>` etc.) can
// be derived in app code as needed; we don't pre-export every row type
// to keep the surface small.

export * as schema from './schema';
export { createDb, type Database, type CreateDbOptions } from './client';
export {
  findCompanyByRegistryId,
  upsertCompanyFromAres,
  type CompanyRow,
  type UpsertResult,
} from './queries/companies';
export {
  upsertInsolvencyEvents,
  type InsolvencyEventRow,
  type UpsertEventResult,
  type UpsertInsolvencyResult,
} from './queries/insolvency';
export {
  upsertJusticeSnapshot,
  type CompanyOfficerRow,
  type CompanyFilingRow,
  type UpsertJusticeArgs,
  type UpsertJusticeResult,
} from './queries/justice';
export {
  upsertCnbFxSnapshot,
  type MacroIndicatorRow,
  type MacroObservationRow,
  type UpsertMacroResult,
} from './queries/macro';
