// Justice.cz — type model.
//
// Justice.cz / or.justice.cz is the Czech business registry portal run by
// the Ministry of Justice. Unlike ARES (clean REST JSON), the public
// surface is server-rendered HTML over two endpoints:
//
//   1. `rejstrik-firma.vysledky?subjektId=...` — current ("PLATNY") or
//      historical ("UPLNY") view of a single subject. We read officers
//      (statutární orgán, dozorčí rada, prokuristé) from here.
//
//   2. `vypis-sl-firma?subjektId=...` — Sbírka listin (the document
//      collection): annual reports, financial statements, auditor
//      reports. We read the *list* of available filings here; the
//      actual PDF parsing for financial figures lands later when the
//      SRSC `fin` dimension wires up (HANDOFF §22).
//
// The IČO → subjektId mapping is also exposed by the search results
// page — `lookupJusticeSubjektIdByIco` (client.ts) handles that step.

// ----- Officers ----------------------------------------------------------

/**
 * Coarse role classification — we map upstream Czech labels onto this
 * enum so downstream code (executive-change alerts, SRSC, entity
 * resolver officer overlap §15.9) can branch on stable values.
 *
 *   executive  — člen statutárního orgánu / jednatel (LLC s.r.o.)
 *   director   — člen představenstva (joint-stock a.s.)
 *   supervisor — člen dozorčí rady
 *   procurator — prokurista
 *   other      — anything we don't recognize (mapped from raw label)
 */
export type JusticeOfficerRole =
  | 'executive'
  | 'director'
  | 'supervisor'
  | 'procurator'
  | 'other';

export interface JusticeOfficer {
  name: string;
  role: JusticeOfficerRole;
  /** Verbatim upstream label, e.g. "Předseda představenstva". Kept for UI display. */
  roleLabel: string;
  /** ISO date 'YYYY-MM-DD' if the registry records an appointment date. */
  appointedAt?: string;
  /** ISO date if the officer's term has ended. Null/undefined → currently active. */
  terminatedAt?: string;
}

// ----- Filings -----------------------------------------------------------

/**
 * Coarse filing-type classification, mapped from the verbatim Czech label
 * justice.cz exposes (`typ listiny`). The labels are inconsistent across
 * decades of filings — when in doubt we fall back to 'other' and keep
 * the raw label so a human can re-classify later.
 */
export type JusticeFilingType =
  | 'annual_report' // výroční zpráva
  | 'financial_statement' // účetní závěrka / rozvaha / výkaz zisku a ztráty
  | 'auditor_report' // zpráva auditora
  | 'other';

export interface JusticeFiling {
  /**
   * Stable upstream document identifier from the PDF download URL — we
   * dedupe re-fetches on this. Format: `<subjektId>-<docId>` to stay
   * unique across the (rare) cases where the same docId is reused.
   */
  upstreamDocId: string;
  documentType: JusticeFilingType;
  documentTypeLabel: string;
  /** Fiscal year the filing covers (e.g. 2023 for an annual report filed in 2024). */
  fiscalYear?: number;
  /** ISO date the document was filed with the court. */
  filedAt?: string;
  /** Absolute URL to the PDF on or.justice.cz. */
  documentUrl: string;
}

// ----- Snapshot ----------------------------------------------------------

export interface JusticeSnapshot {
  countryIso: 'CZ';
  /** justice.cz internal subjektId — required by every detail URL. */
  subjektId: string;
  /** IČO that produced this snapshot, when known (lookup step succeeded). */
  registryId?: string;
  sourceKey: 'justice';

  officers: JusticeOfficer[];
  filings: JusticeFiling[];

  /** SHA-256 of canonicalized snapshot — drives idempotent persistence. */
  contentHash: string;
  fetchedAt: string;
}
