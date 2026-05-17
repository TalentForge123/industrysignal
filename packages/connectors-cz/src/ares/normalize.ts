// ARES — normalizer (raw upstream JSON → AresSnapshot).
//
// Pure function, no I/O, no time dependencies except `fetchedAt` which
// the caller injects. That makes it trivially testable with captured
// fixtures (see ../../test/fixtures/).

import { contentHash } from '../shared/hash';
import type {
  AresRawAddress,
  AresRawSubject,
  AresSnapshot,
  AresStructuredAddress,
} from './types';

export interface NormalizeOptions {
  fetchedAt: Date;
}

export function normalizeAresSubject(
  raw: AresRawSubject,
  options: NormalizeOptions,
): AresSnapshot {
  const registryId = padIco(raw.ico);
  const altNames = collectAltNames(raw);
  const legalName = pickLegalName(raw, altNames);
  const naceCodes = dedupe([...(raw.czNace2008 ?? []), ...(raw.czNace ?? [])]);
  const address = normalizeAddress(raw.sidlo);
  const status = normalizeRegistryStatus(raw);

  const snapshot: AresSnapshot = {
    countryIso: 'CZ',
    registryId,
    sourceKey: 'ares',

    legalName,
    altNames: altNames.filter((n) => n !== legalName),
    legalFormCode: raw.pravniForma ?? raw.pravniFormaRos,
    vatId: raw.dic,

    addressLine: address.textLine,
    addressStructured: address,
    regionCode: address.region?.code,
    regionName: address.region?.name,
    districtCode: address.district?.code,
    districtName: address.district?.name,
    postalCode: address.postalCode,

    naceCodes,
    primaryNace: naceCodes[0],

    foundedAt: raw.datumVzniku,
    upstreamUpdatedAt: raw.datumAktualizace,

    registryStatus: status,
    primarySourceRegistry: raw.primarniZdroj,
    isActive: deriveActive(status),

    raw,
    contentHash: '', // set below — must hash everything except itself + fetchedAt
    fetchedAt: options.fetchedAt.toISOString(),
  };

  // Hash the normalized snapshot minus fields that vary per fetch.
  // We deliberately hash the *normalized* shape, not the raw blob: that
  // way an upstream key reorder inside `dalsiUdaje` doesn't flip the hash
  // (canonicalize() in shared/hash.ts already sorts keys, but normalizing
  // first also drops fields we never read).
  const { contentHash: _omit1, fetchedAt: _omit2, ...hashable } = snapshot;
  snapshot.contentHash = contentHash(hashable);
  return snapshot;
}

// ARES returns ICOs as either zero-padded "00177041" or unpadded "177041"
// depending on the entry path. Postgres unique index demands one canonical
// form — pick 8-digit left-padded, matching the official ČSÚ rule.
function padIco(ico: string): string {
  const digits = ico.replace(/\D/g, '');
  return digits.padStart(8, '0');
}

function collectAltNames(raw: AresRawSubject): string[] {
  const names = new Set<string>();
  if (raw.obchodniJmeno) names.add(raw.obchodniJmeno);
  for (const variant of raw.dalsiUdaje ?? []) {
    for (const entry of variant.obchodniJmeno ?? []) {
      if (entry.obchodniJmeno) names.add(entry.obchodniJmeno);
    }
  }
  return Array.from(names);
}

// ARES `obchodniJmeno` at the top level is the current registered name.
// Some entries differ only in casing ("Škoda Auto a.s." vs "ŠKODA AUTO
// a.s.") — prefer the top-level value when present, otherwise the first
// alt-name marked primarniZaznam, otherwise the first alt-name at all.
function pickLegalName(raw: AresRawSubject, altNames: string[]): string {
  if (raw.obchodniJmeno) return raw.obchodniJmeno;
  for (const variant of raw.dalsiUdaje ?? []) {
    for (const entry of variant.obchodniJmeno ?? []) {
      if (entry.primarniZaznam && entry.obchodniJmeno) return entry.obchodniJmeno;
    }
  }
  return altNames[0] ?? '';
}

function normalizeAddress(addr: AresRawAddress | undefined): AresStructuredAddress {
  if (!addr) return {};
  return {
    countryIso: addr.kodStatu,
    region:
      addr.kodKraje !== undefined || addr.nazevKraje
        ? { code: addr.kodKraje?.toString(), name: addr.nazevKraje }
        : undefined,
    district:
      addr.kodOkresu !== undefined || addr.nazevOkresu
        ? { code: addr.kodOkresu?.toString(), name: addr.nazevOkresu }
        : undefined,
    municipality:
      addr.kodObce !== undefined || addr.nazevObce
        ? { code: addr.kodObce?.toString(), name: addr.nazevObce }
        : undefined,
    street: addr.nazevUlice,
    houseNumber: addr.cisloDomovni,
    partOfMunicipality:
      addr.kodCastiObce !== undefined || addr.nazevCastiObce
        ? { code: addr.kodCastiObce?.toString(), name: addr.nazevCastiObce }
        : undefined,
    // ARES emits PSČ as numeric (29301) — pad to 5 digits and keep as text.
    postalCode: addr.psc !== undefined ? String(addr.psc).padStart(5, '0') : undefined,
    textLine: addr.textovaAdresa,
  };
}

function normalizeRegistryStatus(raw: AresRawSubject): AresSnapshot['registryStatus'] {
  const s = raw.seznamRegistraci ?? {};
  return {
    ros: s.stavZdrojeRos,
    vr: s.stavZdrojeVr,
    res: s.stavZdrojeRes,
    rzp: s.stavZdrojeRzp,
    nrpzs: s.stavZdrojeNrpzs,
    rpsh: s.stavZdrojeRpsh,
    rcns: s.stavZdrojeRcns,
    szr: s.stavZdrojeSzr,
    dph: s.stavZdrojeDph,
    skDph: s.stavZdrojeSkDph,
    sd: s.stavZdrojeSd,
    ir: s.stavZdrojeIr,
    ceu: s.stavZdrojeCeu,
    rs: s.stavZdrojeRs,
    red: s.stavZdrojeRed,
    monitor: s.stavZdrojeMonitor,
  };
}

// VR is the commercial register: authoritative for a.s. / s.r.o. /
// družstvo etc. ROS covers everyone (incl. OSVČ) so it's the fallback.
// A subject is "active" if any of its primary registries says AKTIVNI.
function deriveActive(status: AresSnapshot['registryStatus']): boolean {
  return status.vr === 'AKTIVNI' || status.ros === 'AKTIVNI' || status.rzp === 'AKTIVNI';
}

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
