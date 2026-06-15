// FR connector — type model.
//
// Implements the cross-country CountryConnector contract (HANDOFF §14) with
// France-concrete shapes. SIREN (9 digits) is the canonical company id —
// dedup within a mission keys off it. Every record carries a `Source` so
// the source-or-nothing guardrail (CLAUDE.md, BUILD-HANDOFF §3) can be
// enforced downstream: no source ⇒ the entity is flagged OVĚŘIT.
//
// Names of physical persons (dirigeants) are included ONLY because French
// statutory officers are legally public (recherche-entreprises / RNE). The
// connector never invents a name — `Dirigeant.name` is null when the source
// gives only a role.

export type ISO3166 = string; // 2-letter country code, e.g. 'FR', 'CZ'
export type CountryCompanyId = string; // SIREN (9 digits) for FR

/** Provenance for the source-or-nothing guardrail. */
export interface Source {
  /** Dereferenceable URL a human can open to confirm the fact. */
  url: string;
  /** Short human label, e.g. 'recherche-entreprises', 'BODACC'. */
  label: string;
  /** ISO timestamp the fact was retrieved. */
  retrievedAt: string;
}

/** A statutory officer / director — public for FR. */
export interface Dirigeant {
  /** Full name, ONLY from a public registry. null ⇒ role known, name not. */
  name: string | null;
  /** Function, e.g. 'Président', 'Directeur général', 'Gérant'. */
  role: string | null;
  bornYear?: string | null;
  kind: 'person' | 'company';
  source: Source;
}

/** Lightweight company hit from search / listBySector. */
export interface CompanyRef {
  siren: string;
  name: string;
  /** NAF/APE activity code (FR equivalent of NACE), e.g. '28.41Z'. */
  naf: string | null;
  /** INSEE enterprise size class: 'PME' | 'ETI' | 'GE' | null. */
  category: string | null;
  /** INSEE employee band label, e.g. '250 à 499 salariés'. */
  employeeBand: string | null;
  createdAt: string | null;
  /** 'A' active / 'C' ceased (etat_administratif). */
  status: string | null;
  city: string | null;
  postalCode: string | null;
  source: Source;
}

/** Full company profile — ref + dirigeants + registered seat. */
export interface CompanyProfile extends CompanyRef {
  legalForm: string | null; // nature_juridique code
  siret: string | null; // siege (head office) establishment
  establishmentsOpen: number | null;
  dirigeants: Dirigeant[];
  /** Untouched upstream body so re-extraction needs no refetch. */
  raw?: unknown;
}

export interface CompanySearchQuery {
  /** Free-text query (name / activity keywords). */
  q?: string;
  /** One or more NAF codes to constrain the activity. */
  naf?: string | string[];
  /** Department code(s) or postal prefix to geo-constrain, e.g. '69'. */
  location?: string;
  /** INSEE size classes to include. Default PME,ETI,GE (skip micro). */
  categories?: Array<'PME' | 'ETI' | 'GE'>;
  page?: number;
  perPage?: number;
}

export interface ListOpts {
  location?: string;
  categories?: Array<'PME' | 'ETI' | 'GE'>;
  page?: number;
  perPage?: number;
}

export interface Filing {
  year: number;
  kind: string; // 'bilan' | 'comptes annuels'
  source: Source;
}

export interface DistressEvent {
  siren: string;
  /** 'procedure_collective' | 'vente' | 'radiation' | 'depot_comptes' … */
  kind: string;
  date: string;
  detail: string | null;
  source: Source;
}

export interface TenderRef {
  id: string;
  title: string;
  buyer: string | null;
  /** Awardee on an award notice (FR: titulaire). null on call-for-tender. */
  awardee: string | null;
  published: string | null;
  deadline: string | null;
  cpv: string | null;
  amountEur: number | null;
  source: Source;
}

export interface OwnershipNode {
  name: string;
  siren?: string | null;
  share?: number | null;
}
export interface OwnershipGraph {
  siren: string;
  /** Bénéficiaires effectifs (UBOs). Empty when source needs a key. */
  ubos: OwnershipNode[];
  source: Source | null;
}

export interface TradeFlow {
  period: string; // 'YYYY' or 'YYYY-MM'
  partnerIso: ISO3166;
  hs: string;
  direction: 'export' | 'import';
  valueEur: number | null;
  weightKg: number | null;
  source: Source;
}

export interface PeriodRange {
  from: string; // 'YYYY' or 'YYYY-MM'
  to: string;
}

export interface ConnectorCapabilities {
  hasFinancials: boolean;
  hasUBO: boolean;
  hasTenders: boolean;
  hasInsolvency: boolean;
  hasOwnershipChain: boolean;
  hasNewsFeed: boolean;
  refreshLagDays: number;
  costTier: 'free' | 'low' | 'medium' | 'enterprise';
  rateLimit: { reqPerMin: number };
}

export interface CountryConnector {
  iso: ISO3166;
  capabilities: ConnectorCapabilities;
  searchCompanies(q: CompanySearchQuery): Promise<CompanyRef[]>;
  getCompany(id: CountryCompanyId): Promise<CompanyProfile | null>;
  listBySector(naceLocal: string, opts?: ListOpts): Promise<CompanyRef[]>;
  getFilings(id: CountryCompanyId, years: number[]): Promise<Filing[]>;
  getDistressEvents(id: CountryCompanyId): Promise<DistressEvent[]>;
  getTenders(id: CountryCompanyId): Promise<TenderRef[]>;
  getOwnership(id: CountryCompanyId): Promise<OwnershipGraph>;
  getTradeFlows(
    direction: 'export' | 'import',
    partnerIso: ISO3166,
    hs: string,
    period: PeriodRange,
  ): Promise<TradeFlow[]>;
}
