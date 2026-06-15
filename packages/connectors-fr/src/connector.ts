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
  hasFinancials: false, // arrives with INPI bilans (needs RNE key)
  hasUBO: false, // arrives with INPI RNE bénéficiaires effectifs (key)
  hasTenders: false, // arrives with BOAMP/TED client (next commit)
  hasInsolvency: false, // arrives with BODACC client (next commit)
  hasOwnershipChain: false,
  hasNewsFeed: false, // handled by the shared GDELT layer, not here
  refreshLagDays: 7,
  costTier: 'free',
  // recherche-entreprises asks for polite use (~7 req/s). 60 req/min is
  // conservative and matches how research batches actually call it.
  rateLimit: { reqPerMin: 60 },
};

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

    // --- below: wired in the next Block-A commit (BODACC / BOAMP / Comext / INPI) ---
    async getFilings(_id: CountryCompanyId, _years: number[]): Promise<Filing[]> {
      return []; // INPI bilans — needs RNE key; capability hasFinancials=false
    },
    async getDistressEvents(_id: CountryCompanyId): Promise<DistressEvent[]> {
      return []; // BODACC — wired next
    },
    async getTenders(_id: CountryCompanyId): Promise<TenderRef[]> {
      return []; // BOAMP/TED — wired next
    },
    async getOwnership(id: CountryCompanyId): Promise<OwnershipGraph> {
      return { siren: id.replace(/\D/g, ''), ubos: [], source: null }; // INPI RNE — needs key
    },
    async getTradeFlows(
      _direction: 'export' | 'import',
      _partnerIso: ISO3166,
      _hs: string,
      _period: PeriodRange,
    ): Promise<TradeFlow[]> {
      return []; // Eurostat Comext — wired next
    },
  };
}
