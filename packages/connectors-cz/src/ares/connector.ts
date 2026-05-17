// CountryConnector — CZ implementation (ARES-backed subset).
//
// HANDOFF §14 defines the cross-country contract. Sprint 2 only wires up
// `getCompany`, which is the single method Watch List "add company" and
// the Sprint-3 diff worker need. `searchCompanies`, `listBySector`,
// `getDistressEvents` etc. arrive as we plug in the rest of the CZ
// stack (Justice for filings, ISIR for distress, etc).
//
// The reason this lives behind a connector interface even at one method
// is so apps can already type against the contract: when Sprint 7 adds
// SK and PL, the call sites don't change.

import { fetchAresByIco, type AresClientOptions } from './client';
import type { AresSnapshot } from './types';

export interface CountryConnectorCapabilities {
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

export interface CzAresConnector {
  iso: 'CZ';
  capabilities: CountryConnectorCapabilities;
  /**
   * Look up a single subject by registry ID (IČO for CZ).
   * Returns null if the subject does not exist in ARES.
   */
  getCompany(registryId: string): Promise<AresSnapshot | null>;
}

// Capabilities of the *current* implementation. Update when we wire up
// Justice / ISIR / etc. on top so consumers can branch on capability,
// not on connector identity.
export const czAresCapabilities: CountryConnectorCapabilities = {
  hasFinancials: false, // arrives with Justice scraper
  hasUBO: false, // arrives with hlidacstatu.cz
  hasTenders: false, // arrives with smlouvy.gov.cz
  hasInsolvency: false, // arrives with ISIR connector
  hasOwnershipChain: false,
  hasNewsFeed: false,
  refreshLagDays: 1,
  costTier: 'free',
  // Public ARES endpoint has no documented per-IP limit but the ops
  // guidance is "be polite" — 60 req/min is conservative and matches
  // how Watch List + nightly refresh actually use it.
  rateLimit: { reqPerMin: 60 },
};

export function createCzAresConnector(options: AresClientOptions = {}): CzAresConnector {
  return {
    iso: 'CZ',
    capabilities: czAresCapabilities,
    getCompany: (registryId) => fetchAresByIco(registryId, options),
  };
}
