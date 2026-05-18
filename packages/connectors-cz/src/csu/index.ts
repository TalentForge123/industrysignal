// ČSÚ public surface — generic CSV-driven macro fetcher.
//
// HANDOFF §3.1: ČSÚ powers the Report KPI strip (CPI, GDP, industrial
// production, wages, unemployment). Each tracked series is an
// `IndicatorSpec` entry in `specs.ts`; the fetcher itself is dataset-
// agnostic so adding a new series requires no code changes outside the
// registry.

export {
  CsuHttpError,
  fetchCsuIndicator,
  type CsuClientOptions,
} from './client';
export {
  CsuParseError,
  canonicalizePeriod,
  parseCsuCsv,
  periodFirstDay,
} from './normalize';
export { CPI_YOY_INDEX, CSU_INDICATORS, getCsuSpec } from './specs';
export type {
  CsuColumnSelector,
  CsuCsvOptions,
  CsuObservation,
  CsuPeriodFormat,
  CsuSnapshot,
  IndicatorSpec,
} from './types';
