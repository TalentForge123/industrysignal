// ISIR_CUZK_WS — type model.
//
// ISIR is the Czech Insolvency Register. The CUZK web service is the
// "per-debtor lookup" half of the public ISIR APIs — synced hourly from
// the master DB and addressable by IČO or RČ (see HANDOFF §3.2 +
// `/tmp/isir-wsdl/IsirWsCuzkTypes.xsd` for the upstream schema). The
// other half is the firehose `ISIR_PUBLIC_WS`, which we'll wire up for
// the alert diff worker in Sprint 3.

export interface IsirEventSnapshot {
  countryIso: 'CZ';
  sourceKey: 'isir';

  // Debtor identifiers. Legal entities always carry `debtorIco`;
  // natural persons carry `debtorRc` (rodné číslo). Watch List code
  // filters on `debtorIco` for organizations.
  debtorIco?: string;
  debtorRc?: string;
  debtorName?: string;
  debtorAddress?: IsirAddress;

  // Spisová značka — the case identifier. Court + senate + kind +
  // number + year together form the natural key. The full pretty
  // form is e.g. "KSPH 60 INS 628/2011".
  caseCourt?: string; // nazevOrganizace
  caseSenate: number; // cisloSenatu
  caseKind: string; // druhVec (INS, KSCB, ...)
  caseNumber: number; // bcVec
  caseYear: number; // rocnik

  // Current high-level state of the proceeding. Values come straight
  // from upstream (KONKURS / REORGANIZACE / ODDLUŽENÍ / NABYTÍ PM ...).
  caseStatus?: string;
  caseDetailUrl?: string;
  otherDebtorsInCase: boolean;

  bankruptcyStartedAt?: string; // ISO date — datumPmZahajeniUpadku
  bankruptcyEndedAt?: string; // ISO date — datumPmUkonceniUpadku

  raw: unknown;
  contentHash: string;
  // From upstream `casSynchronizace`. The CUZK replica is at most ~1h
  // behind the master ISIR DB — surfacing this lets the UI label the
  // freshness honestly instead of pretending data is real-time.
  upstreamSyncedAt?: string;
  fetchedAt: string; // ISO timestamp from our clock
}

export interface IsirAddress {
  kind?: string; // druhAdresy (e.g. 'SÍDLO FY', 'TRVALÝ POBYT')
  city?: string;
  street?: string;
  houseNumber?: string;
  district?: string;
  country?: string;
  postalCode?: string;
}

/**
 * Error codes returned by the upstream service in `kodChyby`.
 * Mapped to a discriminated union so callers can branch precisely.
 */
export type IsirErrorCode = 'WS1' | 'WS2' | 'WS3' | 'WS4' | 'SQL1' | 'SERVER1';

export interface IsirResult {
  events: IsirEventSnapshot[];
  resultCount: number;
  upstreamSyncedAt?: string;
  // WS1 = invalid combination of parameters
  // WS2 = empty result (treat as "no insolvency on file" — not an error)
  // WS3 = name string too short (not applicable to IČO lookups)
  // WS4 = data freshness exceeded (still serve what we got)
  // SQL1 / SERVER1 = upstream failure — caller should retry
  errorCode?: IsirErrorCode;
  errorText?: string;
}

// ----- raw upstream shapes (post-XML-parse, pre-normalization) -----

export interface IsirRawData {
  ic?: string;
  rc?: string;
  cisloSenatu: number;
  druhVec: string;
  bcVec: number;
  rocnik: number;
  nazevOrganizace?: string;
  datumNarozeni?: string;
  titulPred?: string;
  titulZa?: string;
  jmeno?: string;
  nazevOsoby?: string;
  druhAdresy?: string;
  mesto?: string;
  ulice?: string;
  cisloPopisne?: string;
  okres?: string;
  zeme?: string;
  psc?: string;
  druhStavKonkursu?: string;
  urlDetailRizeni?: string;
  dalsiDluznikVRizeni?: 'T' | 'F';
  datumPmZahajeniUpadku?: string;
  datumPmUkonceniUpadku?: string;
}

export interface IsirRawStatus {
  pocetVysledku?: number;
  relevanceVysledku?: number;
  casSynchronizace?: string;
  kodChyby?: IsirErrorCode;
  textChyby?: string;
  popisChyby?: string;
}

export interface IsirRawResponse {
  data: IsirRawData[];
  stav: IsirRawStatus;
}
