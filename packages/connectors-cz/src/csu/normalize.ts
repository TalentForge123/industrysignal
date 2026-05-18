// ČSÚ CSV → normalized snapshot.
//
// Generic enough to handle the long tail of ČSÚ dataset shapes:
//   - delimiter ',' or ';' or '\t'
//   - decimal '.' or ',' (Czech locale)
//   - header row optional, with arbitrary leading skip-rows
//   - column selectors as name (header lookup) or 0-based index
//   - five period formats covering monthly / quarterly / yearly
//
// On any structural error (missing column, unparseable period or value
// in a data row) we throw with the offending row context. Empty cells
// are tolerated — the entire row is skipped, which matches how ČSÚ
// publishes preliminary / suppressed data points.

import { contentHash } from '../shared/hash';
import type {
  CsuObservation,
  CsuPeriodFormat,
  CsuSnapshot,
  IndicatorSpec,
} from './types';

export class CsuParseError extends Error {
  constructor(message: string) {
    super(`ČSÚ parse: ${message}`);
    this.name = 'CsuParseError';
  }
}

export function parseCsuCsv(
  text: string,
  spec: IndicatorSpec,
  fetchedAt: Date,
): CsuSnapshot {
  // Strip UTF-8 BOM (ČSÚ exports include it more often than not).
  const trimmed = text.replace(/^﻿/, '');
  const allLines = trimmed.split(/\r?\n/);
  const skip = spec.csv.skipRows ?? 0;
  const body = allLines.slice(skip).filter((l) => l.trim().length > 0);

  if (body.length === 0) {
    throw new CsuParseError(`empty CSV after skipping ${skip} row(s)`);
  }

  let headerRow: string[] | null = null;
  let dataStart = 0;
  if (spec.csv.hasHeader) {
    headerRow = splitCsvRow(body[0]!, spec.csv.delimiter);
    dataStart = 1;
  }

  const periodIdx = resolveColumnIndex(spec.columns.period, headerRow);
  const valueIdx = resolveColumnIndex(spec.columns.value, headerRow);

  const observations: CsuObservation[] = [];
  for (let i = dataStart; i < body.length; i++) {
    const row = splitCsvRow(body[i]!, spec.csv.delimiter);
    const periodRaw = row[periodIdx];
    const valueRaw = row[valueIdx];
    if (periodRaw === undefined || valueRaw === undefined) {
      throw new CsuParseError(
        `row ${i + skip + 1} missing column(s) — got ${row.length} fields, need indices ${periodIdx},${valueIdx}`,
      );
    }
    // ČSÚ suppresses individual cells (preliminary / confidential) with
    // a literal "." or empty string. Skip those rows silently.
    if (valueRaw.trim() === '' || valueRaw.trim() === '.') continue;

    const period = canonicalizePeriod(periodRaw.trim(), spec.periodFormat);
    const value = parseNumber(valueRaw, spec.csv.decimal);
    observations.push({
      period,
      observedAt: periodFirstDay(period, spec.periodKind),
      value,
    });
  }

  if (observations.length === 0) {
    throw new CsuParseError(
      `no data rows produced for indicator ${spec.indicatorKey} — check spec columns + fixture`,
    );
  }

  // Stable-sort by period so the content hash is order-invariant.
  const stable = [...observations].sort((a, b) => a.period.localeCompare(b.period));
  const hash = contentHash({ indicatorKey: spec.indicatorKey, observations: stable });

  return {
    sourceKey: 'csu',
    indicatorKey: spec.indicatorKey,
    observations,
    raw: text,
    contentHash: hash,
    fetchedAt: fetchedAt.toISOString(),
  };
}

// ----- CSV row splitter --------------------------------------------------
//
// Minimal RFC 4180-ish: handles quoted fields with embedded delimiters
// and "" → ". ČSÚ rarely emits quotes but the standard says we should
// honor them, and quoted Czech period strings ("01.2024") show up in
// some catalog exports.

function splitCsvRow(line: string, delimiter: ',' | ';' | '\t'): string[] {
  const out: string[] = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          buf += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        buf += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        out.push(buf);
        buf = '';
      } else {
        buf += c;
      }
    }
  }
  out.push(buf);
  return out;
}

function resolveColumnIndex(selector: string | number, header: string[] | null): number {
  if (typeof selector === 'number') return selector;
  if (!header) {
    throw new CsuParseError(
      `column selector "${selector}" is a name but spec.csv.hasHeader is false`,
    );
  }
  const idx = header.findIndex((h) => h.trim() === selector);
  if (idx === -1) {
    throw new CsuParseError(
      `column "${selector}" not found in header [${header.map((h) => h.trim()).join(', ')}]`,
    );
  }
  return idx;
}

// ----- Period canonicalization ------------------------------------------

export function canonicalizePeriod(input: string, format: CsuPeriodFormat): string {
  switch (format) {
    case 'YYYY-MM': {
      if (!/^\d{4}-\d{2}$/.test(input)) {
        throw new CsuParseError(`expected 'YYYY-MM', got "${input}"`);
      }
      return input;
    }
    case 'MM.YYYY': {
      const m = input.match(/^(\d{1,2})\.(\d{4})$/);
      if (!m) throw new CsuParseError(`expected 'MM.YYYY', got "${input}"`);
      return `${m[2]}-${m[1]!.padStart(2, '0')}`;
    }
    case 'YYYY-Qn': {
      if (!/^\d{4}-Q[1-4]$/.test(input)) {
        throw new CsuParseError(`expected 'YYYY-Qn', got "${input}"`);
      }
      return input;
    }
    case 'Qn-YYYY': {
      // Tolerant of '1.Q.2024', '1Q2024', 'Q1 2024' shapes.
      const m = input.match(/(\d)\s*\.?\s*Q\.?\s*(\d{4})|Q\s*(\d)\s+(\d{4})/i);
      if (!m) throw new CsuParseError(`expected 'Qn-YYYY' family, got "${input}"`);
      const q = m[1] ?? m[3]!;
      const y = m[2] ?? m[4]!;
      return `${y}-Q${q}`;
    }
    case 'YYYY': {
      if (!/^\d{4}$/.test(input)) {
        throw new CsuParseError(`expected 'YYYY', got "${input}"`);
      }
      return input;
    }
  }
}

export function periodFirstDay(
  period: string,
  kind: 'monthly' | 'quarterly' | 'yearly',
): string {
  switch (kind) {
    case 'monthly': {
      // 'YYYY-MM' → 'YYYY-MM-01'
      return `${period}-01`;
    }
    case 'quarterly': {
      // 'YYYY-Q1' → 'YYYY-01-01', Q2 → '-04-01', Q3 → '-07-01', Q4 → '-10-01'
      const m = period.match(/^(\d{4})-Q([1-4])$/);
      if (!m) throw new CsuParseError(`bad quarterly period "${period}"`);
      const year = m[1]!;
      const month = (Number(m[2]) - 1) * 3 + 1;
      return `${year}-${String(month).padStart(2, '0')}-01`;
    }
    case 'yearly': {
      return `${period}-01-01`;
    }
  }
}

// ----- Number parsing ----------------------------------------------------

function parseNumber(raw: string, decimal: '.' | ','): number {
  const cleaned = raw
    .trim()
    // ČSÚ also uses thousands separators (space or NBSP). Strip them
    // regardless of decimal mark to keep this robust.
    .replace(/[\s ]/g, '');
  const normalized = decimal === ',' ? cleaned.replace(',', '.') : cleaned;
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    throw new CsuParseError(`unparseable number "${raw}" (after cleaning: "${normalized}")`);
  }
  return n;
}
