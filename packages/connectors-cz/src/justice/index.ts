// Justice.cz public surface.
//
// HANDOFF §3.2: financials / changes in statutory bodies / insolvency.
// Insolvency lives in `../isir` (dedicated SOAP feed); this module
// handles officers + the Sbírka listin filing list (financials).

export {
  JusticeHttpError,
  JusticeNotFoundError,
  fetchJusticeByIco,
  fetchJusticeBySubjektId,
  lookupJusticeSubjektIdByIco,
  type JusticeClientOptions,
} from './client';
export {
  assembleJusticeSnapshot,
  classifyFilingType,
  classifyOfficerRole,
  extractFilings,
  extractOfficers,
  extractSubjektIdFromSearch,
  parseCzechDate,
} from './normalize';
export type {
  JusticeFiling,
  JusticeFilingType,
  JusticeOfficer,
  JusticeOfficerRole,
  JusticeSnapshot,
} from './types';
