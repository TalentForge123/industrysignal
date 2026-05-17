// ISIR — normalizer (raw parsed XML → IsirEventSnapshot).
//
// Pure: no I/O, deterministic given (raw, fetchedAt). Tests pin the
// output shape against captured SOAP responses in test/fixtures/isir/.

import { contentHash } from '../shared/hash';
import type {
  IsirAddress,
  IsirEventSnapshot,
  IsirRawData,
  IsirRawResponse,
  IsirResult,
} from './types';

export interface NormalizeOptions {
  fetchedAt: Date;
}

export function normalizeIsirResponse(
  parsed: IsirRawResponse,
  options: NormalizeOptions,
): IsirResult {
  const upstreamSyncedAt = parsed.stav?.casSynchronizace;
  const events = (parsed.data ?? []).map((d) => normalizeEvent(d, upstreamSyncedAt, options));
  return {
    events,
    resultCount: parsed.stav?.pocetVysledku ?? events.length,
    upstreamSyncedAt,
    errorCode: parsed.stav?.kodChyby,
    errorText:
      parsed.stav?.textChyby ??
      parsed.stav?.popisChyby ??
      undefined,
  };
}

function normalizeEvent(
  d: IsirRawData,
  upstreamSyncedAt: string | undefined,
  options: NormalizeOptions,
): IsirEventSnapshot {
  const debtorAddress = normalizeAddress(d);
  const debtorName = buildDebtorName(d);

  const snapshot: IsirEventSnapshot = {
    countryIso: 'CZ',
    sourceKey: 'isir',
    // fast-xml-parser numeric-coerces strings of digits, which would
    // drop the leading zero off an IČO like "00177041". Normalize back
    // to the 8-digit string form here so downstream code (Watch List
    // join against `company.registry_id`) sees the canonical shape.
    debtorIco: padIcoIfPresent(d.ic),
    debtorRc: d.rc !== undefined && d.rc !== null ? String(d.rc) : undefined,
    debtorName,
    debtorAddress,
    caseCourt: d.nazevOrganizace,
    caseSenate: d.cisloSenatu,
    caseKind: d.druhVec,
    caseNumber: d.bcVec,
    caseYear: d.rocnik,
    caseStatus: d.druhStavKonkursu,
    caseDetailUrl: d.urlDetailRizeni,
    otherDebtorsInCase: d.dalsiDluznikVRizeni === 'T',
    bankruptcyStartedAt: d.datumPmZahajeniUpadku,
    bankruptcyEndedAt: d.datumPmUkonceniUpadku,
    raw: d,
    contentHash: '',
    upstreamSyncedAt,
    fetchedAt: options.fetchedAt.toISOString(),
  };

  const { contentHash: _omit1, fetchedAt: _omit2, ...hashable } = snapshot;
  snapshot.contentHash = contentHash(hashable);
  return snapshot;
}

// Legal entities ⇒ nazevOsoby alone. Natural persons ⇒ "Surname Firstname"
// composed from nazevOsoby + jmeno + titles (matches how ISIR's own web UI
// renders the debtor banner).
function buildDebtorName(d: IsirRawData): string | undefined {
  if (d.nazevOsoby && !d.jmeno && !d.titulPred) return d.nazevOsoby;
  const parts = [d.titulPred, d.nazevOsoby, d.jmeno, d.titulZa]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  if (parts.length === 0) return undefined;
  return parts.join(' ');
}

function padIcoIfPresent(ic: unknown): string | undefined {
  if (ic === undefined || ic === null || ic === '') return undefined;
  const digits = String(ic).replace(/\D/g, '');
  if (!digits) return undefined;
  return digits.padStart(8, '0');
}

function normalizeAddress(d: IsirRawData): IsirAddress | undefined {
  // Bail early if no address component is present — common for cases
  // that have just been filed (debtor address still being collected).
  if (
    !d.mesto &&
    !d.ulice &&
    !d.cisloPopisne &&
    !d.okres &&
    !d.psc &&
    !d.zeme &&
    !d.druhAdresy
  ) {
    return undefined;
  }
  return {
    kind: d.druhAdresy,
    city: d.mesto,
    street: d.ulice,
    // fast-xml-parser may coerce "851" to number 851. Force string so
    // downstream code can treat houseNumber as a free-form label
    // (some entries are "851/3", "č.p. 12", etc).
    houseNumber: d.cisloPopisne !== undefined && d.cisloPopisne !== null
      ? String(d.cisloPopisne)
      : undefined,
    district: d.okres,
    country: d.zeme,
    // ISIR returns PSČ with a thin space ("190 93") — keep as-is so the
    // string matches what users see on the ISIR website. Normalization
    // (strip spaces) happens at search time, not at storage time.
    postalCode: d.psc !== undefined && d.psc !== null ? String(d.psc) : undefined,
  };
}
