// ČSÚ — type model.
//
// HANDOFF §3.1: ČSÚ feeds the macro KPI strip on the Report (GDP Q/Q,
// CPI, industrial production, wages, ...). Unlike ČNB (single canonical
// endpoint), ČSÚ exposes dozens of datasets at different URLs in
// different formats. We model each tracked series as an `IndicatorSpec`
// — a small TypeScript object that captures everything the generic
// fetcher needs: URL, CSV layout, column mapping, period format.
//
// Adding a new series therefore means:
//   1. Drop a new spec into `specs.ts`.
//   2. Drop a fixture CSV under `test/fixtures/csu/<key>.csv`.
//   3. Optionally extend the period-format enum if upstream uses a
//      shape we haven't seen yet.
//
// No code changes in the fetcher / persistence layer.

export type CsuPeriodFormat =
  /** Already canonical monthly — '2024-01'. */
  | 'YYYY-MM'
  /** Czech monthly dotted — '01.2024'. */
  | 'MM.YYYY'
  /** Already canonical quarterly — '2024-Q1'. */
  | 'YYYY-Qn'
  /** Czech-style quarterly — '1.Q.2024' or '1Q2024'. */
  | 'Qn-YYYY'
  /** Yearly — '2024'. */
  | 'YYYY';

export interface CsuCsvOptions {
  /** Field separator. ČSÚ historically uses ';' (Excel-Czech), some newer datasets ','. */
  delimiter: ';' | ',' | '\t';
  /** Decimal mark used in numeric cells. ČSÚ defaults to ',' (Czech locale). */
  decimal: ',' | '.';
  hasHeader: boolean;
  /** Pre-header metadata rows to skip (e.g. dataset title in row 1). 0 if none. */
  skipRows?: number;
  // NOTE: encoding handling intentionally deferred — the WHATWG fetch
  // path defaults to UTF-8 decoding and that covers ČSÚ Open Data CSVs
  // published after ~2018. Win-1250-only legacy downloads will need a
  // dedicated decoder; flagged as TODO when the first such series lands.
}

export interface CsuColumnSelector {
  /** Either a column name (requires hasHeader=true) or a 0-based column index. */
  period: string | number;
  value: string | number;
}

export interface IndicatorSpec {
  /**
   * Stable internal key — what the Report engine references. Convention:
   * 'cz.macro.<series>' for ČSÚ-sourced series, e.g.
   * 'cz.macro.cpi_yoy_index', 'cz.macro.gdp_qoq_real',
   * 'cz.macro.industrial_production_yoy'.
   */
  indicatorKey: string;

  nameCs: string;
  nameEn: string;
  /**
   * Unit string — kept loose because the semantics vary. Examples:
   *   '%'                — already a percent figure (CPI YoY)
   *   'index'            — index with a documented base (e.g. prev year = 100)
   *   'CZK million'      — absolute monetary amount
   *   'persons'          — counts (employment)
   * The Report-engine renderer maps unit + value → display label.
   */
  unit: string;
  periodKind: 'monthly' | 'quarterly' | 'yearly';

  /** Stable URL where the CSV can be fetched. */
  url: string;
  csv: CsuCsvOptions;
  columns: CsuColumnSelector;
  periodFormat: CsuPeriodFormat;
}

export interface CsuObservation {
  /** Canonical period — 'YYYY-MM' / 'YYYY-Qn' / 'YYYY'. */
  period: string;
  /** First day of the period as ISO 'YYYY-MM-DD'. */
  observedAt: string;
  value: number;
}

export interface CsuSnapshot {
  sourceKey: 'csu';
  indicatorKey: string;
  observations: CsuObservation[];
  /** Raw CSV body kept for audit. */
  raw: string;
  contentHash: string;
  fetchedAt: string;
}
