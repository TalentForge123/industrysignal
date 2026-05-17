// ARES HTTP client. Thin wrapper around `fetch` with the conventions
// the upstream service expects:
//
//   - Identifying User-Agent (required by ČSÚ TOS; we pass it via env so
//     the same code can run in dev under a developer's contact and in
//     prod under the team mailbox)
//   - Accept: application/json
//   - AbortController-based timeout (default 15s — ARES is usually <300ms
//     but we've seen tail-latency spikes during their nightly batch)
//   - Distinct error classes so the caller can decide what's retryable
//
// The HTTP layer is intentionally tiny and side-effect-free apart from
// the network call: the `fetcher` arg lets tests inject a stub without
// monkey-patching globalThis.

import { normalizeAresSubject } from './normalize';
import type { AresRawSubject, AresSnapshot } from './types';

const DEFAULT_BASE_URL = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest';
const DEFAULT_USER_AGENT =
  'IndustrySignal-Bot/1.0 (kontakt@industrysignal.cz; https://industrysignal.cz/bot)';
const DEFAULT_TIMEOUT_MS = 15_000;

export class AresNotFoundError extends Error {
  constructor(public readonly ico: string) {
    super(`ARES: subject ${ico} not found`);
    this.name = 'AresNotFoundError';
  }
}

export class AresHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    super(`ARES: HTTP ${status} for ${url} — ${body.slice(0, 200)}`);
    this.name = 'AresHttpError';
  }
}

export interface AresClientOptions {
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
  /**
   * Injected for tests. In production leave undefined to use global fetch.
   * Must match the WHATWG fetch signature.
   */
  fetcher?: typeof fetch;
  /**
   * Clock injection — defaults to `() => new Date()`. Snapshots stamp
   * their `fetchedAt` from here so tests get deterministic output.
   */
  now?: () => Date;
}

/**
 * Fetch and normalize a single ARES economic subject by IČO.
 *
 * @returns the normalized snapshot, or `null` if ARES returns 404.
 * @throws  AresHttpError on any non-2xx, non-404 response.
 */
export async function fetchAresByIco(
  ico: string,
  options: AresClientOptions = {},
): Promise<AresSnapshot | null> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const userAgent = options.userAgent ?? process.env.ARES_USER_AGENT ?? DEFAULT_USER_AGENT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());

  const cleanIco = ico.replace(/\D/g, '');
  if (!cleanIco) throw new Error(`fetchAresByIco: invalid IČO "${ico}"`);
  const url = `${baseUrl}/ekonomicke-subjekty/${encodeURIComponent(cleanIco)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new AresHttpError(response.status, url, body);
  }

  const json = (await response.json()) as AresRawSubject;
  return normalizeAresSubject(json, { fetchedAt: now() });
}
