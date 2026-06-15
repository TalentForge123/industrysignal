// CountryConnector — FR implementation.
//
// HANDOFF §14 contract for France on free official sources. SIREN is the
// canonical id; mission-level dedup keys off it. This first cut wires the
// recherche-entreprises backbone (company search + public dirigeants) —
// the mission's lead source. BODACC (insolvency), BOAMP/TED (tenders) and
// Eurostat Comext (trade flows) land next; capabilities below flip from
// false→true as each source is wired, the same way the CZ ARES connector
// grows (so consumers branch on capability, not connector identity).

import { DiskCache, type Cache } from './cache';
import {
  getBySirenRaw,
  searchRaw,
  type RechercheClientOptions,
} from './recherche/client';
import { normalizeProfile, normalizeRef } from './recherche/normalize';
import { fetchBodaccBySiren } from './bodacc/client';
import { normalizeDistress } from './bodacc/normalize';
import { searchBoampRaw, type BoampSearchOpts } from './boamp/client';
import { normalizeTenders } from './boamp/normalize';
import type {
  CompanyRef,
  CompanyProfile,
  CompanySearchQuery,
  ConnectorCapabilities,
  CountryCompanyId,
  CountryConnector,
  DistressEvent,
  Filing,
  ISO3166,
  ListOpts,
  OwnershipGraph,
  PeriodRange,
  TenderRef,
  TradeFlow,
} from './types';

export interface FrConnectorOptions {
  fetcher?: typeof fetch;
  cache?: Cache;
  userAgent?: string;
  /** Clock injection for deterministic Source.retrievedAt in tests. */
  now?: () => Date;
}

export const frCapabilities: ConnectorCapabilities = {
  hasFinancials: false, // INPI bilans — needs an RNE key, not wired
  hasUBO: false, // INPI RNE bénéficiaires effectifs — needs a key, not wired
  hasTenders: true, // BOAMP open data
  hasInsolvency: true, // BODACC open data
  hasOwnershipChain: false,
  hasNewsFeed: false, // handled by the shared GDELT layer, not here
  refreshLagDays: 7,
  costTier: 'free',
  // recherche-entreprises asks for polite use (~7 req/s). 60 req/min is
  // conservative and matches how research batches actually call it.
  rateLimit: { reqPerMin: 60 },
};

/**
 * Sector / keyword tender search — the mission's real tender tool ("who
 * wins relevant tenders in FR"). Beyond the per-id §14 contract method,
 * exported for the research pipeline (Block B) to map buyers → targets and
 * awardees → competitors/partners.
 */
export async function searchFrTenders(
  opts: BoampSearchOpts & { now?: () => Date },
): Promise<TenderRef[]> {
  const stamp = (opts.now ?? (() => new Date()))().toISOString();
  const rows = await searchBoampRaw(opts);
  return normalizeTenders(rows, stamp);
}

export function createFrConnector(options: FrConnectorOptions = {}): CountryConnector {
  const cache = options.cache ?? new DiskCache();
  const now = options.now ?? (() => new Date());
  const clientOpts: RechercheClientOptions = {
    fetcher: options.fetcher,
    cache,
    userAgent: options.userAgent,
  };

  return {
    iso: 'FR',
    capabilities: frCapabilities,

    async searchCompanies(q: CompanySearchQuery): Promise<CompanyRef[]> {
      const stamp = now().toISOString();
      const rows = await searchRaw(q, clientOpts);
      return rows.map((r) => normalizeRef(r, stamp));
    },

    async getCompany(id: CountryCompanyId): Promise<CompanyProfile | null> {
      const stamp = now().toISOString();
      const row = await getBySirenRaw(id, clientOpts);
      return row ? normalizeProfile(row, stamp) : null;
    },

    async listBySector(naceLocal: string, opts: ListOpts = {}): Promise<CompanyRef[]> {
      const stamp = now().toISOString();
      const rows = await searchRaw(
        {
          naf: naceLocal,
          location: opts.location,
          categories: opts.categories,
          page: opts.page,
          perPage: opts.perPage,
        },
        clientOpts,
      );
      return rows.map((r) => normalizeRef(r, stamp));
    },

    async getDistressEvents(id: CountryCompanyId): Promise<DistressEvent[]> {
      const stamp = now().toISOString();
      const records = await fetchBodaccBySiren(id, {
        fetcher: options.fetcher,
        cache,
        userAgent: options.userAgent,
      });
      return normalizeDistress(records, id, stamp);
    },

    async getTenders(id: CountryCompanyId): Promise<TenderRef[]> {
      // BOAMP isn't indexed by awardee SIREN, so per-id is a best-effort
      // free-text hit on the SIREN. The mission uses searchFrTenders()
      // (keyword/sector) — the actually useful tender tool.
      const stamp = now().toISOString();
      const rows = await searchBoampRaw({
        q: id.replace(/\D/g, ''),
        fetcher: options.fetcher,
        cache,
        userAgent: options.userAgent,
      });
      return normalizeTenders(rows, stamp);
    },

    // --- key-gated / unavailable on free APIs (capabilities reflect this) ---
    async getFilings(_id: CountryCompanyId, _years: number[]): Promise<Filing[]> {
      return []; // INPI bilans — needs an RNE key; hasFinancials=false
    },
    async getOwnership(id: CountryCompanyId): Promise<OwnershipGraph> {
      return { siren: id.replace(/\D/g, ''), ubos: [], source: null }; // INPI RNE — needs a key
    },
    async getTradeFlows(
      _direction: 'export' | 'import',
      _partnerIso: ISO3166,
      _hs: string,
      _period: PeriodRange,
    ): Promise<TradeFlow[]> {
      // Eurostat Comext detailed trade (DS-045409) is not served by the free
      // dissemination REST API (404 ERR_NOT_FOUND). Would need the bulk
      // Comext download — out of scope for the free-sources cut.
      return [];
    },
  };
}
