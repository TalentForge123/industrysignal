// ARES — type model.
//
// `AresRawSubject` mirrors the JSON the public REST endpoint actually
// returns (verified against ICOs 00177041 Škoda Auto + 45274649 ČEZ at
// build time). Only fields we read are typed; the connector preserves
// the full body in `raw` so re-extraction never needs another fetch.
//
// `AresSnapshot` is the normalized shape downstream code consumes — flat,
// stable, country-agnostic where possible. It is the input to the
// `upsertCompanyFromAres` persistence helper in @industrysignal/db.

export interface AresStructuredAddress {
  countryIso?: string;
  region?: { code?: string; name?: string };
  district?: { code?: string; name?: string };
  municipality?: { code?: string; name?: string };
  street?: string;
  houseNumber?: number | string;
  partOfMunicipality?: { code?: string; name?: string };
  postalCode?: string;
  textLine?: string;
}

export interface AresRegistryStatus {
  // Each flag mirrors ARES `seznamRegistraci.stavZdroje*`:
  // 'AKTIVNI' | 'ZANIKLY' | 'NEEXISTUJICI' | other future values.
  ros?: string;
  vr?: string;
  res?: string;
  rzp?: string;
  nrpzs?: string;
  rpsh?: string;
  rcns?: string;
  szr?: string;
  dph?: string;
  skDph?: string;
  sd?: string;
  ir?: string; // insolvenční rejstřík — feeds the §7 critical alerts
  ceu?: string;
  rs?: string;
  red?: string;
  monitor?: string;
}

export interface AresSnapshot {
  countryIso: 'CZ';
  registryId: string; // IČO, zero-padded to 8 digits
  sourceKey: 'ares';

  legalName: string;
  altNames: string[];
  legalFormCode?: string;
  vatId?: string;

  addressLine?: string;
  addressStructured?: AresStructuredAddress;
  regionCode?: string;
  regionName?: string;
  districtCode?: string;
  districtName?: string;
  postalCode?: string;

  naceCodes: string[];
  primaryNace?: string;

  foundedAt?: string; // ISO date 'YYYY-MM-DD'
  upstreamUpdatedAt?: string;

  registryStatus: AresRegistryStatus;
  primarySourceRegistry?: string; // ARES: primarniZdroj — 'ros'|'vr'|...
  isActive: boolean;

  raw: unknown;
  contentHash: string;
  fetchedAt: string; // ISO timestamp
}

// Partial — fields we explicitly read. ARES returns more (e.g. icoId,
// financniUrad, subRegistrSzr) but they don't drive any current logic.
// Anything we ignore today is still available via `raw`.
export interface AresRawSubject {
  ico: string;
  obchodniJmeno?: string;
  sidlo?: AresRawAddress;
  pravniForma?: string;
  pravniFormaRos?: string;
  dic?: string;
  datumVzniku?: string;
  datumAktualizace?: string;
  czNace2008?: string[];
  czNace?: string[];
  seznamRegistraci?: AresRawRegistryList;
  primarniZdroj?: string;
  dalsiUdaje?: AresRawSourceVariant[];
}

export interface AresRawAddress {
  kodStatu?: string;
  nazevStatu?: string;
  kodKraje?: number;
  nazevKraje?: string;
  kodOkresu?: number;
  nazevOkresu?: string;
  kodObce?: number;
  nazevObce?: string;
  kodUlice?: number;
  nazevUlice?: string;
  cisloDomovni?: number;
  kodCastiObce?: number;
  nazevCastiObce?: string;
  kodAdresnihoMista?: number;
  psc?: number | string;
  textovaAdresa?: string;
  standardizaceAdresy?: boolean;
  typCisloDomovni?: number;
}

interface AresRawRegistryList {
  stavZdrojeRos?: string;
  stavZdrojeVr?: string;
  stavZdrojeRes?: string;
  stavZdrojeRzp?: string;
  stavZdrojeNrpzs?: string;
  stavZdrojeRpsh?: string;
  stavZdrojeRcns?: string;
  stavZdrojeSzr?: string;
  stavZdrojeDph?: string;
  stavZdrojeSkDph?: string;
  stavZdrojeSd?: string;
  stavZdrojeIr?: string;
  stavZdrojeCeu?: string;
  stavZdrojeRs?: string;
  stavZdrojeRed?: string;
  stavZdrojeMonitor?: string;
}

interface AresRawSourceVariant {
  obchodniJmeno?: Array<{ obchodniJmeno?: string; primarniZaznam?: boolean }>;
  sidlo?: Array<{ sidlo?: AresRawAddress; primarniZaznam?: boolean }>;
  pravniForma?: string;
  pravniFormaRos?: string;
  spisovaZnacka?: string;
  datovyZdroj?: string;
}
