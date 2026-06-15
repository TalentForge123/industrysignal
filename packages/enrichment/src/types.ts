// Shared input/output shapes for segment analyzers.
//
// Inputs are gathered from already-persisted DB rows (macro indicators,
// insolvency events, news, ...) — the analyzer doesn't talk to upstream
// data sources directly. That keeps the pipeline deterministic and
// re-runnable on the same DB snapshot.

export interface MacroSnapshot {
  /** Stable indicator key — 'cz.macro.gdp_qoq', 'cz.fx.eur_czk', ... */
  indicatorKey: string;
  /** Czech-language label for the LLM prompt + UI. */
  nameCs: string;
  nameEn: string;
  latestValue: string | null;
  latestPeriod: string | null;
  unit: string;
}

export interface NewsItem {
  title: string;
  url: string;
  publishedAt?: string;
  excerpt?: string;
}

export interface CompanyMovement {
  ico: string;
  name: string;
  /** Free-form short label — "insolvency_filed", "officer_change", "downgrade". */
  changeKind: string;
  detail?: string;
  occurredAt?: string;
}

export interface SegmentReportInput {
  segmentKey: string; // 'energy' | 'automotive' | ...
  /** Quarter the report covers — 'YYYY-Q[1-4]'. */
  quarter: string;
  macro: MacroSnapshot[];
  companyMovements: CompanyMovement[];
  insolvencyCount: number;
  news: NewsItem[];
}

export interface SegmentReportDraft {
  segmentKey: string;
  /** A `report.bodyCs.sections[]` row, ready to be merged into the report. */
  section: {
    id: string;
    kind: string;
    title: string;
    summary: string;
    body: string[];
    sources: Array<{ n: number; label: string; url?: string }>;
  };
}

export interface SegmentRunResult {
  draftCs: SegmentReportDraft;
  draftEn: SegmentReportDraft;
  /** Cache key returned by the LLM-call recorder, or null when no LLM ran. */
  llmCacheKeyCs: string | null;
  llmCacheKeyEn: string | null;
  /** Whether the LLM result came from cache. */
  cachedCs: boolean;
  cachedEn: boolean;
}
