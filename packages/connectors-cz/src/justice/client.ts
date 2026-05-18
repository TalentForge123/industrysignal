// Justice.cz HTTP client.
//
// Two-step fetch:
//   1) IČO → subjektId via the search endpoint (`rejstrik-$firma`).
//   2) subjektId → (detail HTML, filings HTML) in parallel.
//
// Why HTTP + cheerio instead of Playwright (HANDOFF §3.2 suggested
// Playwright): the public pages are server-rendered HTML and don't
// require JavaScript. Plain fetch is ~50× cheaper to run and deploys
// to Vercel serverless without the Hetzner sidecar. If justice.cz
// later adds a JS challenge / Cloudflare gate, we swap this client's
// `fetcher` for a Playwright-backed one without touching the parser.
//
// All knobs (baseUrl, userAgent, timeout) are env-injectable so the
// same code runs in tests (no network) and behind the production UA.

import {
  assembleJusticeSnapshot,
  extractSubjektIdFromSearch,
} from './normalize';
import type { JusticeSnapshot } from './types';

const DEFAULT_BASE_URL = 'https://or.justice.cz';
const DEFAULT_USER_AGENT =
  'IndustrySignal-Bot/1.0 (kontakt@industrysignal.cz; https://industrysignal.cz/bot)';
const DEFAULT_TIMEOUT_MS = 20_000;

export class JusticeNotFoundError extends Error {
  constructor(public readonly ico: string) {
    super(`Justice: no subjektId for IČO ${ico}`);
    this.name = 'JusticeNotFoundError';
  }
}

export class JusticeHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    super(`Justice: HTTP ${status} for ${url} — ${body.slice(0, 200)}`);
    this.name = 'JusticeHttpError';
  }
}

export interface JusticeClientOptions {
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
  /** WHATWG fetch-compatible function. Tests inject a stub here. */
  fetcher?: typeof fetch;
  /** Clock injection — defaults to `() => new Date()`. */
  now?: () => Date;
}

interface ResolvedOptions {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  fetcher: typeof fetch;
  now: () => Date;
}

function resolveOptions(options: JusticeClientOptions): ResolvedOptions {
  return {
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    userAgent:
      options.userAgent ?? process.env.JUSTICE_USER_AGENT ?? DEFAULT_USER_AGENT,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    fetcher: options.fetcher ?? fetch,
    now: options.now ?? (() => new Date()),
  };
}

async function getHtml(url: string, opts: ResolvedOptions): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
  let response: Response;
  try {
    response = await opts.fetcher(url, {
      method: 'GET',
      headers: {
        'User-Agent': opts.userAgent,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.5',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new JusticeHttpError(response.status, url, body);
  }
  return response.text();
}

/**
 * Resolve an IČO to justice.cz's internal subjektId.
 * Returns null if the IČO is unknown to the registry (foreign / dissolved).
 */
export async function lookupJusticeSubjektIdByIco(
  ico: string,
  options: JusticeClientOptions = {},
): Promise<string | null> {
  const opts = resolveOptions(options);
  const cleanIco = ico.replace(/\D/g, '');
  if (!cleanIco) throw new Error(`lookupJusticeSubjektIdByIco: invalid IČO "${ico}"`);

  const url = `${opts.baseUrl}/ias/ui/rejstrik-$firma?ico=${encodeURIComponent(cleanIco)}`;
  const html = await getHtml(url, opts);
  if (html === null) return null;
  return extractSubjektIdFromSearch(html);
}

/**
 * Fetch and normalize officers + filings for a known subjektId.
 *
 * Pages are fetched in parallel — both are independent GETs and the
 * latency saving is meaningful when this runs in the Inngest pipeline
 * downstream of an ARES call that already paid one RTT.
 */
export async function fetchJusticeBySubjektId(
  subjektId: string,
  options: JusticeClientOptions = {},
): Promise<JusticeSnapshot | null> {
  const opts = resolveOptions(options);
  if (!/^\d+$/.test(subjektId)) {
    throw new Error(`fetchJusticeBySubjektId: invalid subjektId "${subjektId}"`);
  }

  const detailUrl = `${opts.baseUrl}/ias/ui/rejstrik-firma.vysledky?subjektId=${subjektId}&typ=PLATNY`;
  const filingsUrl = `${opts.baseUrl}/ias/ui/vypis-sl-firma?subjektId=${subjektId}`;

  const [detailHtml, filingsHtml] = await Promise.all([
    getHtml(detailUrl, opts),
    getHtml(filingsUrl, opts),
  ]);
  if (detailHtml === null) return null;

  return assembleJusticeSnapshot({
    subjektId,
    detailHtml,
    // Empty filings page (some subjects have no Sbírka listin entries)
    // is a normal "no filings yet" case — pass through an empty string.
    filingsHtml: filingsHtml ?? '',
    fetchedAt: opts.now(),
  });
}

/**
 * Convenience: IČO → snapshot in one call. Returns null if either lookup
 * step misses, so callers can treat "not in Justice" as a normal outcome
 * without try/catching the not-found error.
 */
export async function fetchJusticeByIco(
  ico: string,
  options: JusticeClientOptions = {},
): Promise<JusticeSnapshot | null> {
  const subjektId = await lookupJusticeSubjektIdByIco(ico, options);
  if (!subjektId) return null;
  const snapshot = await fetchJusticeBySubjektId(subjektId, options);
  if (!snapshot) return null;
  return { ...snapshot, registryId: ico.replace(/\D/g, '').padStart(8, '0') };
}
