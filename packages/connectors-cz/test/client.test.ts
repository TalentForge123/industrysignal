// HTTP client tests — verify URL shape, header propagation, error
// classes, and 404 → null handling. No real network calls.

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AresHttpError, fetchAresByIco } from '../src/ares/client';

function mockFetch(response: { status: number; body?: unknown }) {
  return vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    const body = response.body;
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body ?? '')),
      json: async () => body,
    } as unknown as Response;
  });
}

const FIXED_NOW = new Date('2026-05-17T12:00:00.000Z');
const skodaFixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'ares-00177041.json'), 'utf-8'),
);

describe('fetchAresByIco', () => {
  it('GETs the canonical ARES URL with UA + Accept headers', async () => {
    const fetcher = mockFetch({ status: 200, body: skodaFixture });
    await fetchAresByIco('177041', {
      fetcher,
      userAgent: 'TestBot/1.0',
      now: () => FIXED_NOW,
    });
    const call = fetcher.mock.calls[0]!;
    expect(call[0]).toBe(
      'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/177041',
    );
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('TestBot/1.0');
    expect(headers['Accept']).toBe('application/json');
  });

  it('returns null on 404 instead of throwing', async () => {
    const fetcher = mockFetch({ status: 404, body: '' });
    const result = await fetchAresByIco('99999999', { fetcher });
    expect(result).toBeNull();
  });

  it('throws AresHttpError on 5xx', async () => {
    const fetcher = mockFetch({ status: 503, body: 'service unavailable' });
    await expect(fetchAresByIco('00177041', { fetcher })).rejects.toBeInstanceOf(
      AresHttpError,
    );
  });

  it('rejects empty / non-numeric IČO without making a network call', async () => {
    const fetcher = mockFetch({ status: 200, body: {} });
    await expect(fetchAresByIco('---', { fetcher })).rejects.toThrow(/invalid/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns a normalized snapshot when the response is OK', async () => {
    const fetcher = mockFetch({ status: 200, body: skodaFixture });
    const snap = await fetchAresByIco('00177041', { fetcher, now: () => FIXED_NOW });
    expect(snap).not.toBeNull();
    expect(snap!.legalName).toBe('Škoda Auto a.s.');
    expect(snap!.fetchedAt).toBe(FIXED_NOW.toISOString());
  });
});
