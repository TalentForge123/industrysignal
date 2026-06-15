// BODACC — Bulletin officiel des annonces civiles et commerciales.
// Free open data via the opendatasoft Explore v2.1 API (keyless). Gives
// the distress / lifecycle signals for a SIREN: procédures collectives
// (insolvency), radiations, ventes & cessions.

import { DAY_MS, DiskCache, type Cache } from '../cache';

const BASE =
  'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';
const DEFAULT_USER_AGENT =
  'IndustrySignal-Bot/1.0 (kontakt@industrysignal.cz; https://industrysignal.cz/bot)';
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_TTL_MS = 3 * DAY_MS;

export class BodaccHttpError extends Error {
  constructor(public readonly status: number, public readonly url: string, body: string) {
    super(`BODACC: HTTP ${status} for ${url} — ${body.slice(0, 200)}`);
    this.name = 'BodaccHttpError';
  }
}

export interface BodaccRecord {
  id?: string;
  dateparution?: string;
  familleavis?: string;
  familleavis_lib?: string;
  typeavis_lib?: string;
  ville?: string;
  registre?: string[];
  tribunal?: string;
  jugement?: unknown;
}

export interface BodaccOptions {
  fetcher?: typeof fetch;
  cache?: Cache;
  userAgent?: string;
  timeoutMs?: number;
  ttlMs?: number;
}

/** Fetch all BODACC annonces whose `registre` mentions the SIREN. */
export async function fetchBodaccBySiren(
  siren: string,
  opts: BodaccOptions = {},
): Promise<BodaccRecord[]> {
  const clean = siren.replace(/\D/g, '');
  if (clean.length !== 9) throw new Error(`fetchBodaccBySiren: invalid SIREN "${siren}"`);

  // `registre` is an array holding spaced + unspaced SIREN forms — a LIKE
  // on the unspaced form matches both.
  const where = encodeURIComponent(`registre like "${clean}"`);
  const url = `${BASE}?where=${where}&limit=50&order_by=dateparution desc`;

  const cache = opts.cache ?? new DiskCache();
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const cacheKey = `bodacc:${url}`;
  const cached = await cache.get<BodaccRecord[]>(cacheKey);
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
  if (!res.ok) throw new BodaccHttpError(res.status, url, await res.text().catch(() => ''));
  const json = (await res.json()) as { results?: BodaccRecord[] };
  const rows = json.results ?? [];
  await cache.set(cacheKey, rows, ttlMs);
  return rows;
}

/** Public source page for BODACC annonces of a SIREN. */
export function bodaccSourceUrl(siren: string): string {
  return `https://bodacc-datadila.opendatasoft.com/explore/dataset/annonces-commerciales/table/?q=${siren}`;
}
