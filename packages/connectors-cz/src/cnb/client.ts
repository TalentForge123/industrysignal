// ČNB HTTP client — single endpoint for the daily FX fixing feed.
//
// Endpoint:  https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/
//            kurzy-devizoveho-trhu/denni_kurz.txt[?date=DD.MM.YYYY]
//
// ČNB publishes the fixing once per business day around 14:30 Prague time.
// Requesting without `?date` returns the most recent fixing. With `?date`,
// you get that day's (or the closest preceding business day, depending
// on parameter — we use exact-day semantics).
//
// The text file is small (~1.5KB), tolerant of polite polling, and has
// no documented rate limit. We default to a 10s timeout — comfortable
// upper bound given typical response time of <300ms.

import { parseCnbDailyFx } from './normalize';
import type { CnbFxSnapshot } from './types';

const DEFAULT_BASE_URL = 'https://www.cnb.cz';
const DAILY_PATH =
  '/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt';
const DEFAULT_USER_AGENT =
  'IndustrySignal-Bot/1.0 (kontakt@industrysignal.cz; https://industrysignal.cz/bot)';
const DEFAULT_TIMEOUT_MS = 10_000;

export class CnbHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    super(`CNB: HTTP ${status} for ${url} — ${body.slice(0, 200)}`);
    this.name = 'CnbHttpError';
  }
}

export interface CnbClientOptions {
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
}

/**
 * Fetch the daily FX fixing — most recent business day by default,
 * or a specific date if `tradingDay` is provided (ISO 'YYYY-MM-DD').
 *
 * Returns null when ČNB serves no body for the requested date (very
 * rare — typically only for far-future or pre-1991 dates).
 */
export async function fetchCnbDailyFx(
  options: CnbClientOptions & { tradingDay?: string } = {},
): Promise<CnbFxSnapshot | null> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const userAgent = options.userAgent ?? process.env.CNB_USER_AGENT ?? DEFAULT_USER_AGENT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());

  let url = baseUrl + DAILY_PATH;
  if (options.tradingDay) {
    const m = options.tradingDay.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error(`fetchCnbDailyFx: invalid tradingDay "${options.tradingDay}"`);
    url += `?date=${m[3]}.${m[2]}.${m[1]}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/plain, */*',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new CnbHttpError(response.status, url, body);
  }

  const text = await response.text();
  if (!text.trim()) return null;
  return parseCnbDailyFx(text, now());
}
