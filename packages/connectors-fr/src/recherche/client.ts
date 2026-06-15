// recherche-entreprises.api.gouv.fr — keyless company search for France.
//
// This is the FR connector's backbone: it returns company identity (SIREN,
// NAF, size band, head-office commune) AND public dirigeants (statutory
// officers), which are the lead source for the mission. No API key.
//
// Thin fetch wrapper mirroring the CZ ARES client: injectable `fetcher`
// (tests stub without touching globalThis), AbortController timeout,
// distinct error classes, and an injectable Cache (disk TTL by default).

import { DAY_MS, DiskCache, type Cache } from '../cache';
import type { CompanySearchQuery } from '../types';

const BASE_URL = 'https://recherche-entreprises.api.gouv.fr';
const DEFAULT_USER_AGENT =
  'IndustrySignal-Bot/1.0 (kontakt@industrysignal.cz; https://industrysignal.cz/bot)';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_TTL_MS = 7 * DAY_MS; // company identity is stable week-to-week

export class RechercheHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    super(`recherche-entreprises: HTTP ${status} for ${url} — ${body.slice(0, 200)}`);
    this.name = 'RechercheHttpError';
  }
}

export interface RechercheDirigeant {
  nom?: string;
  prenoms?: string;
  denomination?: string; // when type_dirigeant === 'personne morale'
  annee_de_naissance?: string | null;
  qualite?: string;
  type_dirigeant?: string; // 'personne physique' | 'personne morale'
}

export interface RechercheSiege {
  siret?: string;
  code_postal?: string;
  libelle_commune?: string;
  activite_principale?: string;
}

export interface RechercheResult {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  activite_principale?: string;
  categorie_entreprise?: string | null;
  tranche_effectif_salarie?: string | null;
  date_creation?: string | null;
  etat_administratif?: string | null;
  nature_juridique?: string | null;
  nombre_etablissements_ouverts?: number | null;
  dirigeants?: RechercheDirigeant[];
  siege?: RechercheSiege;
}

export interface RechercheResponse {
  results: RechercheResult[];
  total_results: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface RechercheClientOptions {
  userAgent?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  cache?: Cache;
  ttlMs?: number;
}

/** Map a location string to the right recherche-entreprises geo filter. */
function geoParams(location: string): Record<string, string> {
  const clean = location.trim();
  if (/^\d{5}$/.test(clean)) return { code_postal: clean };
  if (/^\d{2,3}$/.test(clean)) return { departement: clean };
  return {}; // free-text locations fall back into `q` upstream
}

function buildSearchUrl(query: CompanySearchQuery): string {
  const p = new URLSearchParams();
  if (query.q) p.set('q', query.q);
  if (query.naf) {
    const naf = Array.isArray(query.naf) ? query.naf.join(',') : query.naf;
    if (naf) p.set('activite_principale', naf);
  }
  if (query.location) {
    for (const [k, v] of Object.entries(geoParams(query.location))) p.set(k, v);
  }
  const cats = query.categories ?? ['PME', 'ETI', 'GE'];
  if (cats.length) p.set('categorie_entreprise', cats.join(','));
  p.set('page', String(query.page ?? 1));
  p.set('per_page', String(query.perPage ?? 20));
  return `${BASE_URL}/search?${p.toString()}`;
}

async function getJson(url: string, opts: RechercheClientOptions): Promise<RechercheResponse> {
  const cache = opts.cache ?? new DiskCache();
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const cacheKey = `recherche:${url}`;

  const cached = await cache.get<RechercheResponse>(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const fetcher = opts.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'GET',
      headers: {
        'User-Agent': opts.userAgent ?? process.env.FR_USER_AGENT ?? DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new RechercheHttpError(response.status, url, body);
  }
  const json = (await response.json()) as RechercheResponse;
  await cache.set(cacheKey, json, ttlMs);
  return json;
}

/** Search companies. Returns the raw upstream results (normalize separately). */
export async function searchRaw(
  query: CompanySearchQuery,
  opts: RechercheClientOptions = {},
): Promise<RechercheResult[]> {
  const json = await getJson(buildSearchUrl(query), opts);
  return json.results ?? [];
}

/** Fetch one company by SIREN (exact match within the search results). */
export async function getBySirenRaw(
  siren: string,
  opts: RechercheClientOptions = {},
): Promise<RechercheResult | null> {
  const clean = siren.replace(/\D/g, '');
  if (clean.length !== 9) throw new Error(`getBySirenRaw: invalid SIREN "${siren}"`);
  const json = await getJson(`${BASE_URL}/search?q=${clean}&page=1&per_page=10`, opts);
  return (json.results ?? []).find((r) => r.siren === clean) ?? null;
}

/** Public human-facing source page for a SIREN — used for Source attribution. */
export function annuaireUrl(siren: string): string {
  return `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`;
}
