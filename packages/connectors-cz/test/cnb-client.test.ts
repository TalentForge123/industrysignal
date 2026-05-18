// ČNB client tests — URL composition, optional ?date param, error
// handling. No real network calls.

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CnbHttpError, fetchCnbDailyFx } from '../src/cnb/client';

const FIX = join(__dirname, 'fixtures', 'cnb');
const fxText = readFileSync(join(FIX, 'daily-fx-2026-05-15.txt'), 'utf-8');
const FETCHED_AT = new Date('2026-05-15T14:35:00.000Z');

function mockFetch(spec: { status: number; body: string }): typeof fetch {
  return vi.fn(async () => {
    return {
      ok: spec.status >= 200 && spec.status < 300,
      status: spec.status,
      text: async () => spec.body,
    } as Response;
  }) as unknown as typeof fetch;
}

describe('fetchCnbDailyFx', () => {
  it('GETs the canonical denni_kurz URL without a date param by default', async () => {
    const fetcher = mockFetch({ status: 200, body: fxText });
    await fetchCnbDailyFx({ fetcher, now: () => FETCHED_AT });
    const call = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe(
      'https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt',
    );
  });

  it('appends ?date=DD.MM.YYYY when tradingDay is provided', async () => {
    const fetcher = mockFetch({ status: 200, body: fxText });
    await fetchCnbDailyFx({
      fetcher,
      now: () => FETCHED_AT,
      tradingDay: '2026-05-15',
    });
    const url = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toMatch(/\?date=15\.05\.2026$/);
  });

  it('rejects bad tradingDay format without making a network call', async () => {
    const fetcher = vi.fn();
    await expect(
      fetchCnbDailyFx({
        fetcher: fetcher as unknown as typeof fetch,
        tradingDay: 'yesterday',
      }),
    ).rejects.toThrow(/invalid tradingDay/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns a normalized snapshot on a 200 response', async () => {
    const fetcher = mockFetch({ status: 200, body: fxText });
    const snap = await fetchCnbDailyFx({ fetcher, now: () => FETCHED_AT });
    expect(snap).not.toBeNull();
    expect(snap!.observations).toHaveLength(16);
    expect(snap!.observedAt).toBe('2026-05-15');
  });

  it('returns null on 404 or empty body', async () => {
    expect(await fetchCnbDailyFx({ fetcher: mockFetch({ status: 404, body: '' }) })).toBeNull();
    expect(await fetchCnbDailyFx({ fetcher: mockFetch({ status: 200, body: '   \n  ' }) }))
      .toBeNull();
  });

  it('throws CnbHttpError on 5xx', async () => {
    const fetcher = mockFetch({ status: 503, body: 'busy' });
    await expect(fetchCnbDailyFx({ fetcher })).rejects.toBeInstanceOf(CnbHttpError);
  });
});
