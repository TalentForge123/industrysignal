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
export { SEED_IDS } from './seed-ids';
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
  upsertMacroObservations,
  type IndicatorMeta,
  type MacroIndicatorRow,
  type MacroObservationInput,
  type MacroObservationRow,
  type UpsertMacroResult,
} from './queries/macro';
export {
  countFreshAlertsForOrg,
  findAlertById,
  findAlertRecipientsForOrg,
  findAlertsForOrg,
  findOrgsWatchingCompany,
  findRecentInsolvencyEvents,
  findRecentOfficerChanges,
  insertAlertIfNew,
  type AlertFeedRow,
  type AlertInsert,
  type AlertRecipient,
  type AlertRow,
  type AlertWithContext,
  type InsolvencyChange,
  type OfficerChange,
  type WatchingOrg,
} from './queries/alerts';
export {
  approveAndPublish,
  archiveReport,
  createReport,
  findLatestPublishedReport,
  findReportById,
  findReportBySlug,
  listPublishedReports,
  listReportAudit,
  listReportsForStudio,
  parseReportBody,
  rejectFromReview,
  setReportPdfUrls,
  submitForReview,
  updateReportDraft,
  type ReportAuditRow,
  type ReportRow,
} from './queries/reports';
export {
  cachedLlmCall,
  computeCacheKey,
  findLlmCallByCacheKey,
  type LlmCallInput,
  type LlmCallResult,
  type LlmCallRow,
} from './queries/llm-calls';
export {
  addMissionEntity,
  addMissionLink,
  createMission,
  createMissionShare,
  deleteMissionEntity,
  findMissionByCode,
  findMissionById,
  findMissionShareByToken,
  getMissionDetail,
  listMissionsForOwner,
  removeMissionLink,
  updateMissionEntity,
  type AddEntityArgs,
  type AddLinkArgs,
  type CreateMissionArgs,
  type CreateShareArgs,
  type MissionDetail,
  type MissionEntityLinkRow,
  type MissionEntityRow,
  type MissionOpportunityRow,
  type MissionRow,
  type MissionRubricRow,
  type MissionShareRow,
  type RubricCriterionInput,
  type UpdateEntityArgs,
} from './queries/missions';
