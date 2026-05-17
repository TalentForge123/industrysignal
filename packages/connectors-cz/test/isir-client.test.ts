// HTTP-layer tests for the ISIR SOAP client — covers request shape,
// response parsing wired to the live fetch path, and error classes.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { IsirHttpError, fetchIsirByIco } from '../src/isir/client';

const FIXED_NOW = new Date('2026-05-17T22:00:00.000Z');
const salezaXml = readFileSync(
  join(__dirname, 'fixtures', 'isir', 'isir-cuzk-47116307.xml'),
  'utf-8',
);
const emptyXml = readFileSync(
  join(__dirname, 'fixtures', 'isir', 'isir-cuzk-00177041.xml'),
  'utf-8',
);

function mockFetch(response: { status: number; body: string }) {
  return vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: async () => response.body,
    } as unknown as Response;
  });
}

describe('fetchIsirByIco', () => {
  it('POSTs SOAP to the canonical ISIR endpoint with correct headers', async () => {
    const fetcher = mockFetch({ status: 200, body: salezaXml });
    await fetchIsirByIco('47116307', { fetcher, now: () => FIXED_NOW });

    const call = fetcher.mock.calls[0]!;
    expect(call[0]).toBe(
      'https://isir.justice.cz:8443/isir_cuzk_ws/IsirWsCuzkService',
    );
    const init = call[1] as RequestInit;
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('text/xml; charset=utf-8');
    expect(headers['SOAPAction']).toBe('""');
    expect(String(init.body)).toContain('<ic>47116307</ic>');
  });

  it('returns normalized events for a positive match', async () => {
    const fetcher = mockFetch({ status: 200, body: salezaXml });
    const result = await fetchIsirByIco('47116307', { fetcher, now: () => FIXED_NOW });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.caseStatus).toBe('KONKURS');
  });

  it('returns an empty result with errorCode WS2 when nothing is on file', async () => {
    const fetcher = mockFetch({ status: 200, body: emptyXml });
    const result = await fetchIsirByIco('00177041', { fetcher });
    expect(result.events).toHaveLength(0);
    expect(result.errorCode).toBe('WS2');
  });

  it('throws IsirHttpError on non-2xx HTTP responses', async () => {
    const fetcher = mockFetch({ status: 503, body: 'service unavailable' });
    await expect(fetchIsirByIco('47116307', { fetcher })).rejects.toBeInstanceOf(
      IsirHttpError,
    );
  });

  it('strips non-digit characters and rejects empty IČO before any network call', async () => {
    const fetcher = mockFetch({ status: 200, body: emptyXml });
    await expect(fetchIsirByIco('--no-digits--', { fetcher })).rejects.toThrow(/invalid/);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
