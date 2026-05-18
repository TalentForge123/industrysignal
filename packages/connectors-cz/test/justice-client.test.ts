// HTTP client tests — URL composition, header propagation, error
// classes, 404 → null handling. No real network calls (fetcher is
// stubbed; fixture HTML is read from disk).

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  JusticeHttpError,
  fetchJusticeByIco,
  fetchJusticeBySubjektId,
  lookupJusticeSubjektIdByIco,
} from '../src/justice/client';

const FIX = join(__dirname, 'fixtures', 'justice');
const searchHtml = readFileSync(join(FIX, 'search.html'), 'utf-8');
const detailHtml = readFileSync(join(FIX, 'detail-platny.html'), 'utf-8');
const filingsHtml = readFileSync(join(FIX, 'filings.html'), 'utf-8');

const FIXED_NOW = new Date('2026-05-18T08:00:00.000Z');

interface MockSpec {
  status: number;
  body: string;
}

function mockFetch(map: Record<string, MockSpec>): typeof fetch {
  const fn = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    for (const [pattern, spec] of Object.entries(map)) {
      if (url.includes(pattern)) {
        return {
          ok: spec.status >= 200 && spec.status < 300,
          status: spec.status,
          text: async () => spec.body,
        } as Response;
      }
    }
    throw new Error(`mockFetch: no mock for ${url}`);
  });
  return fn as unknown as typeof fetch;
}

describe('lookupJusticeSubjektIdByIco', () => {
  it('extracts subjektId from the search results page', async () => {
    const fetcher = mockFetch({
      'rejstrik-$firma?ico=': { status: 200, body: searchHtml },
    });
    const id = await lookupJusticeSubjektIdByIco('12345678', { fetcher });
    expect(id).toBe('54321');
  });

  it('returns null on 404', async () => {
    const fetcher = mockFetch({
      'rejstrik-$firma': { status: 404, body: '' },
    });
    const id = await lookupJusticeSubjektIdByIco('99999999', { fetcher });
    expect(id).toBeNull();
  });

  it('throws JusticeHttpError on 5xx', async () => {
    const fetcher = mockFetch({
      'rejstrik-$firma': { status: 503, body: 'unavailable' },
    });
    await expect(
      lookupJusticeSubjektIdByIco('12345678', { fetcher }),
    ).rejects.toBeInstanceOf(JusticeHttpError);
  });

  it('rejects non-numeric IČO without making a network call', async () => {
    const fetcher = vi.fn();
    await expect(
      lookupJusticeSubjektIdByIco('---', { fetcher: fetcher as unknown as typeof fetch }),
    ).rejects.toThrow(/invalid/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('passes Czech-friendly Accept-Language header', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => searchHtml,
    })) as unknown as typeof fetch;
    await lookupJusticeSubjektIdByIco('12345678', { fetcher });
    const init = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Accept-Language']).toMatch(/cs/);
  });
});

describe('fetchJusticeBySubjektId', () => {
  it('parallel-fetches detail + filings and assembles a snapshot', async () => {
    const fetcher = mockFetch({
      'rejstrik-firma.vysledky?subjektId=54321': { status: 200, body: detailHtml },
      'vypis-sl-firma?subjektId=54321': { status: 200, body: filingsHtml },
    });
    const snap = await fetchJusticeBySubjektId('54321', {
      fetcher,
      now: () => FIXED_NOW,
    });
    expect(snap).not.toBeNull();
    expect(snap!.subjektId).toBe('54321');
    expect(snap!.officers).toHaveLength(4);
    expect(snap!.filings).toHaveLength(4);
    expect(snap!.fetchedAt).toBe(FIXED_NOW.toISOString());
  });

  it('returns null when the detail page is 404 (subject deleted upstream)', async () => {
    const fetcher = mockFetch({
      'rejstrik-firma.vysledky': { status: 404, body: '' },
      'vypis-sl-firma': { status: 404, body: '' },
    });
    const snap = await fetchJusticeBySubjektId('99999', { fetcher });
    expect(snap).toBeNull();
  });

  it('rejects malformed subjektId without making a network call', async () => {
    const fetcher = vi.fn();
    await expect(
      fetchJusticeBySubjektId('abc', {
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/invalid subjektId/);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('fetchJusticeByIco', () => {
  it('chains lookup + fetch and stamps registryId on the snapshot', async () => {
    const fetcher = mockFetch({
      'rejstrik-$firma?ico=': { status: 200, body: searchHtml },
      'rejstrik-firma.vysledky?subjektId=54321': { status: 200, body: detailHtml },
      'vypis-sl-firma?subjektId=54321': { status: 200, body: filingsHtml },
    });
    const snap = await fetchJusticeByIco('12345678', {
      fetcher,
      now: () => FIXED_NOW,
    });
    expect(snap).not.toBeNull();
    expect(snap!.registryId).toBe('12345678');
    expect(snap!.subjektId).toBe('54321');
  });

  it('returns null when the IČO has no Justice subject', async () => {
    const fetcher = mockFetch({
      'rejstrik-$firma': { status: 200, body: '<html><body>no hits</body></html>' },
    });
    const snap = await fetchJusticeByIco('99999999', { fetcher });
    expect(snap).toBeNull();
  });
});
