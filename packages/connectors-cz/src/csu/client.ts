// ČSÚ HTTP client — generic CSV fetcher driven by IndicatorSpec.
//
// One `IndicatorSpec` produces one HTTP GET; the response body is fed
// through the spec-aware parser in `normalize.ts`. The client itself
// knows nothing about specific datasets — adding a new indicator means
// editing `specs.ts`, not this file.

import { parseCsuCsv } from './normalize';
import { getCsuSpec } from './specs';
import type { CsuSnapshot, IndicatorSpec } from './types';

const DEFAULT_USER_AGENT =
  'IndustrySignal-Bot/1.0 (kontakt@industrysignal.cz; https://industrysignal.cz/bot)';
const DEFAULT_TIMEOUT_MS = 30_000;

export class CsuHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    super(`ČSÚ: HTTP ${status} for ${url} — ${body.slice(0, 200)}`);
    this.name = 'CsuHttpError';
  }
}

export interface CsuClientOptions {
  userAgent?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
}

/**
 * Fetch one ČSÚ indicator. Accepts either an inline `IndicatorSpec`
 * (test / one-off use) or an indicator key registered in `specs.ts`.
 *
 * Returns null when ČSÚ responds 404 (typically because a dataset URL
 * has drifted — surfaces as a clear no-op rather than a crash).
 */
export async function fetchCsuIndicator(
  specOrKey: IndicatorSpec | string,
  options: CsuClientOptions = {},
): Promise<CsuSnapshot | null> {
  const spec = typeof specOrKey === 'string' ? getCsuSpec(specOrKey) : specOrKey;
  const userAgent = options.userAgent ?? process.env.CSU_USER_AGENT ?? DEFAULT_USER_AGENT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetcher(spec.url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        // Accept CSV first, fall back to wildcards — ČSÚ servers
        // sometimes serve text/plain or application/octet-stream
        // for CSV downloads.
        Accept: 'text/csv,text/plain,application/octet-stream;q=0.9,*/*;q=0.5',
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
    throw new CsuHttpError(response.status, spec.url, body);
  }

  const text = await response.text();
  if (!text.trim()) return null;
  return parseCsuCsv(text, spec, now());
}
