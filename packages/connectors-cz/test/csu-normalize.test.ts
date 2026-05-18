// CSV parser tests — semicolon delimiter, decimal comma, period
// canonicalization, suppressed-cell handling, stable hashing.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CsuParseError,
  canonicalizePeriod,
  parseCsuCsv,
  periodFirstDay,
} from '../src/csu/normalize';
import { CPI_YOY_INDEX } from '../src/csu/specs';
import type { IndicatorSpec } from '../src/csu/types';

const FIX = join(__dirname, 'fixtures', 'csu');
const cpiCsv = readFileSync(join(FIX, 'cpi-yoy-index.csv'), 'utf-8');
const FETCHED_AT = new Date('2026-05-18T10:00:00.000Z');

describe('canonicalizePeriod', () => {
  it.each([
    ['2024-01', 'YYYY-MM', '2024-01'],
    ['01.2024', 'MM.YYYY', '2024-01'],
    ['1.2024', 'MM.YYYY', '2024-01'],
    ['2024-Q1', 'YYYY-Qn', '2024-Q1'],
    ['1.Q.2024', 'Qn-YYYY', '2024-Q1'],
    ['1Q2024', 'Qn-YYYY', '2024-Q1'],
    ['Q1 2024', 'Qn-YYYY', '2024-Q1'],
    ['2024', 'YYYY', '2024'],
  ] as const)('"%s" + %s → %s', (input, format, expected) => {
    expect(canonicalizePeriod(input, format)).toBe(expected);
  });

  it('throws on unparseable input', () => {
    expect(() => canonicalizePeriod('blah', 'MM.YYYY')).toThrow(CsuParseError);
    expect(() => canonicalizePeriod('2024-01', 'YYYY-Qn')).toThrow(CsuParseError);
  });
});

describe('periodFirstDay', () => {
  it.each([
    ['2024-01', 'monthly' as const, '2024-01-01'],
    ['2024-12', 'monthly' as const, '2024-12-01'],
    ['2024-Q1', 'quarterly' as const, '2024-01-01'],
    ['2024-Q2', 'quarterly' as const, '2024-04-01'],
    ['2024-Q3', 'quarterly' as const, '2024-07-01'],
    ['2024-Q4', 'quarterly' as const, '2024-10-01'],
    ['2024', 'yearly' as const, '2024-01-01'],
  ])('%s + %s → %s', (period, kind, expected) => {
    expect(periodFirstDay(period, kind)).toBe(expected);
  });
});

describe('parseCsuCsv (CPI fixture)', () => {
  it('parses 12 observations (suppressed September row skipped)', () => {
    const snap = parseCsuCsv(cpiCsv, CPI_YOY_INDEX, FETCHED_AT);
    // Fixture has 13 rows; September is empty → 12 observations.
    expect(snap.observations).toHaveLength(12);
  });

  it('converts MM.YYYY period + decimal comma value', () => {
    const snap = parseCsuCsv(cpiCsv, CPI_YOY_INDEX, FETCHED_AT);
    const jan = snap.observations.find((o) => o.period === '2024-01');
    expect(jan).toMatchObject({
      observedAt: '2024-01-01',
      value: 102.4,
    });
  });

  it('skips suppressed cells (empty value)', () => {
    const snap = parseCsuCsv(cpiCsv, CPI_YOY_INDEX, FETCHED_AT);
    const sept = snap.observations.find((o) => o.period === '2024-09');
    expect(sept).toBeUndefined();
  });

  it('stamps snapshot with sourceKey + indicatorKey + hash', () => {
    const snap = parseCsuCsv(cpiCsv, CPI_YOY_INDEX, FETCHED_AT);
    expect(snap.sourceKey).toBe('csu');
    expect(snap.indicatorKey).toBe('cz.macro.cpi_yoy_index');
    expect(snap.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(snap.fetchedAt).toBe(FETCHED_AT.toISOString());
  });

  it('content hash is invariant to row order', () => {
    const lines = cpiCsv.trim().split('\n');
    const head = lines[0]!;
    const data = lines.slice(1).reverse();
    const reversed = [head, ...data].join('\n') + '\n';
    const snap1 = parseCsuCsv(cpiCsv, CPI_YOY_INDEX, FETCHED_AT);
    const snap2 = parseCsuCsv(reversed, CPI_YOY_INDEX, FETCHED_AT);
    expect(snap2.contentHash).toBe(snap1.contentHash);
  });
});

describe('parseCsuCsv — error paths', () => {
  const baseSpec: IndicatorSpec = { ...CPI_YOY_INDEX };

  it('throws on missing named column', () => {
    const spec: IndicatorSpec = {
      ...baseSpec,
      columns: { period: 'NonExistent', value: 'Hodnota' },
    };
    expect(() => parseCsuCsv(cpiCsv, spec, FETCHED_AT)).toThrow(/column "NonExistent" not found/);
  });

  it('throws when every data row is suppressed', () => {
    const emptyCsv =
      '"Období";"Hodnota"\n"01.2024";""\n"02.2024";""\n"03.2024";""\n';
    expect(() => parseCsuCsv(emptyCsv, baseSpec, FETCHED_AT)).toThrow(
      /no data rows produced/,
    );
  });

  it('throws on unparseable value', () => {
    const badCsv = '"Období";"Hodnota"\n"01.2024";"abc"\n';
    expect(() => parseCsuCsv(badCsv, baseSpec, FETCHED_AT)).toThrow(CsuParseError);
  });

  it('throws on completely empty input', () => {
    expect(() => parseCsuCsv('', baseSpec, FETCHED_AT)).toThrow(/empty CSV/);
  });

  it('honors integer column selectors when hasHeader is false', () => {
    const headerlessSpec: IndicatorSpec = {
      ...baseSpec,
      csv: { ...baseSpec.csv, hasHeader: false },
      columns: { period: 0, value: 1 },
    };
    const headerless = '"01.2024";"102,4"\n"02.2024";"102,7"\n';
    const snap = parseCsuCsv(headerless, headerlessSpec, FETCHED_AT);
    expect(snap.observations).toHaveLength(2);
    expect(snap.observations[0]!.value).toBe(102.4);
  });

  it('rejects named columns when hasHeader is false', () => {
    const headerlessSpec: IndicatorSpec = {
      ...baseSpec,
      csv: { ...baseSpec.csv, hasHeader: false },
    };
    const headerless = '"01.2024";"102,4"\n';
    expect(() => parseCsuCsv(headerless, headerlessSpec, FETCHED_AT)).toThrow(
      /is a name but spec.csv.hasHeader is false/,
    );
  });
});
