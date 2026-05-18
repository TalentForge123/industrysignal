// ČNB public surface.
//
// HANDOFF §3.1 — daily FX + key-policy-rate feed for the Report KPI
// strip. This module covers the FX feed; the SDAT/ARAD policy-rate
// pull lands when the Report engine needs it (Sprint 4).

export {
  CnbHttpError,
  fetchCnbDailyFx,
  type CnbClientOptions,
} from './client';
export { CnbParseError, parseCnbDailyFx } from './normalize';
export type { CnbFxObservation, CnbFxRow, CnbFxSnapshot } from './types';
