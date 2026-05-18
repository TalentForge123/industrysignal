// Indicator registry for ČSÚ-sourced macro series.
//
// Each entry tells the generic fetcher (csu/client.ts) where to GET
// the CSV and how to read it. To add a new indicator you only edit
// this file (and drop a fixture under test/fixtures/csu/).
//
// IMPORTANT — URLS NEED LIVE VERIFICATION. ČSÚ does not maintain one
// canonical machine-readable index of dataset URLs; the addresses
// below are placeholders modelled on the Open Data Catalog (data.gov.cz
// + apl.czso.cz). Before the first production cron run, sanity-check
// each `url` against a live download (see test/fixtures/csu/README.md
// for the curl recipe) and update if the path has drifted.

import type { IndicatorSpec } from './types';

/**
 * Indexy spotřebitelských cen — meziroční změna (CPI YoY).
 * Code 7102 in ČSÚ's classification. Monthly publication, ~10th of
 * the following month. The "Předchozí rok = 100" column gives an
 * index where 102.4 means 2.4% inflation YoY.
 */
export const CPI_YOY_INDEX: IndicatorSpec = {
  indicatorKey: 'cz.macro.cpi_yoy_index',
  nameCs: 'Index spotřebitelských cen (předchozí rok = 100)',
  nameEn: 'Consumer price index (previous year = 100)',
  unit: 'index',
  periodKind: 'monthly',
  // TODO live verification — replace with the actual ČSÚ Open Data
  // CSV URL once confirmed. Likely shape:
  //   https://apl.czso.cz/pll/eutab/html.h?vyber=...
  // or via data.gov.cz dataset distribution URL.
  url: 'https://apl.czso.cz/pll/eutab/html.h?vyber=7102&format=csv',
  csv: {
    delimiter: ';',
    decimal: ',',
    hasHeader: true,
    skipRows: 0,
  },
  columns: {
    period: 'Období',
    value: 'Hodnota',
  },
  periodFormat: 'MM.YYYY',
};

/**
 * Registry — order matters for deterministic CLI output but not for
 * correctness. Future additions: gdp_qoq_real (table 5012), industrial
 * production_yoy (table 6004), unemployment_rate (table 2502),
 * average_wage (table 3001).
 */
export const CSU_INDICATORS: ReadonlyArray<IndicatorSpec> = [CPI_YOY_INDEX];

/** Lookup by `indicatorKey` — throws when not found (typo guard). */
export function getCsuSpec(indicatorKey: string): IndicatorSpec {
  const found = CSU_INDICATORS.find((s) => s.indicatorKey === indicatorKey);
  if (!found) {
    throw new Error(
      `getCsuSpec: unknown indicatorKey "${indicatorKey}" — known: ${CSU_INDICATORS.map((s) => s.indicatorKey).join(', ')}`,
    );
  }
  return found;
}
