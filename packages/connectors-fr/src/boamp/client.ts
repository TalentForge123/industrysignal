// BOAMP — Bulletin officiel des annonces des marchés publics.
// Free open data via opendatasoft Explore v2.1 (keyless). Public tenders:
// who is buying (nomacheteur) and, on award notices, who won (titulaire).
// Used two ways: per-SIREN (contract getTenders) and keyword/sector search
// (the mission's real tool — "who wins relevant tenders in FR").

import { DAY_MS, DiskCache, type Cache } from '../cache';

const BASE =
  'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records';
const DEFAULT_USER_AGENT =
  'IndustrySignal-Bot/1.0 (kontakt@industrysignal.cz; https://industrysignal.cz/bot)';
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_TTL_MS = 2 * DAY_MS;

export class BoampHttpError extends Error {
  constructor(public readonly status: number, public readonly url: string, body: string) {
    super(`BOAMP: HTTP ${status} for ${url} — ${body.slice(0, 200)}`);
    this.name = 'BoampHttpError';
  }
}

export interface BoampRecord {
  idweb?: string;
  id?: string;
  objet?: string;
  nomacheteur?: string;
  titulaire?: string | string[] | null;
  dateparution?: string;
  datelimitereponse?: string | null;
  code_departement?: string | string[] | null;
  nature_libelle?: string | null;
  famille_libelle?: string | null;
}

export interface BoampSearchOpts {
  /** Free-text query (activity / object keywords). */
  q?: string;
  /** Department code(s) to constrain, e.g. '69'. */
  departement?: string;
  limit?: number;
  fetcher?: typeof fetch;
  cache?: Cache;
  userAgent?: string;
  timeoutMs?: number;
  ttlMs?: number;
}

function buildUrl(opts: BoampSearchOpts): string {
  const clauses: string[] = [];
  if (opts.q) clauses.push(`"${opts.q.replace(/"/g, '')}"`);
  if (opts.departement) clauses.push(`code_departement like "${opts.departement}"`);
  const where = clauses.length ? `&where=${encodeURIComponent(clauses.join(' and '))}` : '';
  const limit = Math.min(opts.limit ?? 20, 100);
  return `${BASE}?limit=${limit}&order_by=${encodeURIComponent('dateparution desc')}${where}`;
}

export async function searchBoampRaw(opts: BoampSearchOpts): Promise<BoampRecord[]> {
  const url = buildUrl(opts);
  const cache = opts.cache ?? new DiskCache();
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const cacheKey = `boamp:${url}`;
  const cached = await cache.get<BoampRecord[]>(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const fetcher = opts.fetcher ?? fetch;
  let res: Response;
  try {
    res = await fetcher(url, {
      headers: {
        'User-Agent': opts.userAgent ?? process.env.FR_USER_AGENT ?? DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new BoampHttpError(res.status, url, await res.text().catch(() => ''));
  const json = (await res.json()) as { results?: BoampRecord[] };
  const rows = json.results ?? [];
  await cache.set(cacheKey, rows, ttlMs);
  return rows;
}

export function boampSourceUrl(idweb: string): string {
  return `https://boamp-datadila.opendatasoft.com/explore/dataset/boamp/table/?q=${encodeURIComponent(idweb)}`;
}
