// ČSÚ client tests — spec resolution, URL composition, error classes,
// 404/empty body handling. No real network calls.

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CsuHttpError, fetchCsuIndicator } from '../src/csu/client';
import { CPI_YOY_INDEX } from '../src/csu/specs';

const FIX = join(__dirname, 'fixtures', 'csu');
const cpiCsv = readFileSync(join(FIX, 'cpi-yoy-index.csv'), 'utf-8');
const FETCHED_AT = new Date('2026-05-18T10:00:00.000Z');

function mockFetch(spec: { status: number; body: string }): typeof fetch {
  return vi.fn(async () => {
    return {
      ok: spec.status >= 200 && spec.status < 300,
      status: spec.status,
      text: async () => spec.body,
    } as Response;
  }) as unknown as typeof fetch;
}

describe('fetchCsuIndicator', () => {
  it('GETs the spec URL with cs-leaning Accept-Language', async () => {
    const fetcher = mockFetch({ status: 200, body: cpiCsv });
    await fetchCsuIndicator(CPI_YOY_INDEX, { fetcher, now: () => FETCHED_AT });
    const call = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe(CPI_YOY_INDEX.url);
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Accept-Language']).toMatch(/cs/);
  });

  it('resolves a string indicatorKey through the registry', async () => {
    const fetcher = mockFetch({ status: 200, body: cpiCsv });
    const snap = await fetchCsuIndicator('cz.macro.cpi_yoy_index', {
      fetcher,
      now: () => FETCHED_AT,
    });
    expect(snap?.indicatorKey).toBe('cz.macro.cpi_yoy_index');
  });

  it('throws when the indicatorKey is unknown', async () => {
    await expect(fetchCsuIndicator('cz.macro.unknown', { fetcher: vi.fn() as never }))
      .rejects.toThrow(/unknown indicatorKey/);
  });

  it('returns a normalized snapshot on 200', async () => {
    const fetcher = mockFetch({ status: 200, body: cpiCsv });
    const snap = await fetchCsuIndicator(CPI_YOY_INDEX, { fetcher, now: () => FETCHED_AT });
    expect(snap).not.toBeNull();
    expect(snap!.observations.length).toBeGreaterThan(0);
    expect(snap!.sourceKey).toBe('csu');
  });

  it('returns null on 404 or empty body', async () => {
    expect(
      await fetchCsuIndicator(CPI_YOY_INDEX, { fetcher: mockFetch({ status: 404, body: '' }) }),
    ).toBeNull();
    expect(
      await fetchCsuIndicator(CPI_YOY_INDEX, {
        fetcher: mockFetch({ status: 200, body: '   \n  ' }),
      }),
    ).toBeNull();
  });

  it('throws CsuHttpError on 5xx', async () => {
    const fetcher = mockFetch({ status: 503, body: 'busy' });
    await expect(fetchCsuIndicator(CPI_YOY_INDEX, { fetcher })).rejects.toBeInstanceOf(
      CsuHttpError,
    );
  });
});
