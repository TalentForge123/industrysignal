// Parser tests against the daily-fx fixture — header, decimal-comma
// handling, amount=100 normalization, error classes, stable hashing.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CnbParseError, parseCnbDailyFx } from '../src/cnb/normalize';

const FIX = join(__dirname, 'fixtures', 'cnb');
const fxText = readFileSync(join(FIX, 'daily-fx-2026-05-15.txt'), 'utf-8');
const FETCHED_AT = new Date('2026-05-15T14:35:00.000Z');

describe('parseCnbDailyFx', () => {
  it('parses header (date + sequence)', () => {
    const snap = parseCnbDailyFx(fxText, FETCHED_AT);
    expect(snap.observedAt).toBe('2026-05-15');
    expect(snap.upstreamSeq).toBe(93);
    expect(snap.sourceKey).toBe('cnb-arad');
    expect(snap.fetchedAt).toBe(FETCHED_AT.toISOString());
  });

  it('extracts all currency rows', () => {
    const snap = parseCnbDailyFx(fxText, FETCHED_AT);
    expect(snap.observations).toHaveLength(16);
    const codes = snap.observations.map((o) => o.code).sort();
    expect(codes).toContain('EUR');
    expect(codes).toContain('USD');
    expect(codes).toContain('JPY');
    expect(codes).toContain('HUF');
  });

  it('converts decimal comma to dot in rates', () => {
    const snap = parseCnbDailyFx(fxText, FETCHED_AT);
    const eur = snap.observations.find((o) => o.code === 'EUR');
    expect(eur?.rate).toBeCloseTo(24.355, 3);
  });

  it('normalizes amount=100 rates to per-single-unit', () => {
    const snap = parseCnbDailyFx(fxText, FETCHED_AT);
    // HUF fixture: amount=100, rate=6,184 → 1 HUF ≈ 0.06184 CZK
    const huf = snap.observations.find((o) => o.code === 'HUF');
    expect(huf?.rate).toBeCloseTo(0.06184, 5);
    // JPY: amount=100, rate=15,672 → 1 JPY ≈ 0.15672 CZK
    const jpy = snap.observations.find((o) => o.code === 'JPY');
    expect(jpy?.rate).toBeCloseTo(0.15672, 5);
    // INR: amount=100, rate=29,127 → 1 INR ≈ 0.29127 CZK
    const inr = snap.observations.find((o) => o.code === 'INR');
    expect(inr?.rate).toBeCloseTo(0.29127, 5);
  });

  it('stamps every observation with the trading-day date', () => {
    const snap = parseCnbDailyFx(fxText, FETCHED_AT);
    for (const o of snap.observations) {
      expect(o.observedAt).toBe('2026-05-15');
    }
  });

  it('content hash is stable across observation order', () => {
    const snap1 = parseCnbDailyFx(fxText, FETCHED_AT);
    // Reverse the data rows in the input — keep header intact.
    const reversed = (() => {
      const lines = fxText.trim().split('\n');
      const head = lines.slice(0, 2);
      const data = lines.slice(2).reverse();
      return [...head, ...data].join('\n') + '\n';
    })();
    const snap2 = parseCnbDailyFx(reversed, FETCHED_AT);
    expect(snap2.contentHash).toBe(snap1.contentHash);
  });

  it('throws CnbParseError on a malformed header', () => {
    expect(() => parseCnbDailyFx('garbage\nzemě|...\nEMU|euro|1|EUR|24,355', FETCHED_AT))
      .toThrow(CnbParseError);
  });

  it('throws CnbParseError on a row with the wrong field count', () => {
    const bad = '15.05.2026 #93\nzemě|měna|množství|kód|kurz\nEMU|euro|1|EUR';
    expect(() => parseCnbDailyFx(bad, FETCHED_AT)).toThrow(CnbParseError);
  });

  it('throws CnbParseError on a non-ISO currency code', () => {
    const bad = '15.05.2026 #93\nzemě|měna|množství|kód|kurz\nEMU|euro|1|EURO|24,355';
    expect(() => parseCnbDailyFx(bad, FETCHED_AT)).toThrow(CnbParseError);
  });

  it('throws CnbParseError on too few lines', () => {
    expect(() => parseCnbDailyFx('15.05.2026 #93\n', FETCHED_AT)).toThrow(CnbParseError);
  });
});
