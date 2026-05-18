// ČNB — type model.
//
// HANDOFF §3.1: ČNB ARAD is the daily FX + key-policy-rate feed for the
// Report KPI strip. The simplest endpoint is `denni_kurz.txt` — a
// pipe-delimited table of all listed currencies for one trading day,
// published every business day around 14:30 Prague time.
//
// Each line covers one currency:
//   země|měna|množství|kód|kurz
//   EMU|euro|1|EUR|24,355
//
// `množství` is the unit count the published rate is quoted *per* —
// 1 for major currencies, 100 for low-value ones (HUF, JPY). We
// always normalize the stored value to "1 unit foreign → X CZK" so
// downstream consumers can multiply without thinking about denomination.

export interface CnbFxRow {
  country: string; // 'EMU', 'USA', 'Velká Británie', ...
  currencyName: string; // 'euro', 'dolar', 'libra'
  amount: number; // 1 | 100 — number of foreign units the rate is quoted per
  code: string; // ISO 4217: 'EUR', 'USD', 'GBP'
  rate: number; // CZK per `amount` units of foreign currency
}

/** Normalized rate — always "1 unit foreign → X CZK" regardless of upstream `amount`. */
export interface CnbFxObservation {
  code: string;
  rate: number; // CZK per single foreign unit (rate / amount from raw)
  /** Trading day this fixing applies to, ISO 'YYYY-MM-DD'. */
  observedAt: string;
}

export interface CnbFxSnapshot {
  sourceKey: 'cnb-arad';
  /** Trading day from the upstream header line, ISO 'YYYY-MM-DD'. */
  observedAt: string;
  /** Upstream sequence number — number of FX fixings published this year (e.g. 94 = #94). */
  upstreamSeq: number;
  observations: CnbFxObservation[];
  raw: string; // raw upstream text, kept for audit
  contentHash: string;
  fetchedAt: string;
}
