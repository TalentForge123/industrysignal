// ČNB daily FX text → normalized snapshot.
//
// The upstream file format (verified against cnb.cz/cs documentation):
//
//   Line 1: "DD.MM.YYYY #N"        (trading-day date + sequence number)
//   Line 2: "země|měna|množství|kód|kurz"   (header — Czech endpoint)
//           or
//           "Country|Currency|Amount|Code|Rate"  (English endpoint)
//   Line 3+: data rows
//
// Decimal separator is a comma in both endpoints — we replace before
// parsing. Blank lines and a trailing newline are tolerated.
//
// On any parse failure we throw rather than returning a partial snapshot:
// a corrupted fixing day is rare and surfacing it as an error lets the
// Inngest layer retry / alert rather than silently writing garbage.

import { contentHash } from '../shared/hash';
import type { CnbFxObservation, CnbFxRow, CnbFxSnapshot } from './types';

export class CnbParseError extends Error {
  constructor(message: string) {
    super(`CNB parse: ${message}`);
    this.name = 'CnbParseError';
  }
}

interface ParsedHeader {
  observedAt: string;
  upstreamSeq: number;
}

export function parseCnbDailyFx(text: string, fetchedAt: Date): CnbFxSnapshot {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 3) {
    throw new CnbParseError(`expected ≥ 3 lines, got ${lines.length}`);
  }

  const header = parseHeader(lines[0]!);
  // Line 1 is the column header (země|měna|...). Skip it; data starts
  // at line 2 of the trimmed body.
  const rows = lines.slice(2).map(parseRow);

  const observations: CnbFxObservation[] = rows.map((r) => ({
    code: r.code,
    // Normalize to "1 unit foreign → X CZK". For currencies quoted per
    // 100 units (HUF, JPY, ...) we divide before storing so the Report
    // engine doesn't have to remember which is which.
    rate: r.amount === 1 ? r.rate : r.rate / r.amount,
    observedAt: header.observedAt,
  }));

  const stableObservations = [...observations].sort((a, b) => a.code.localeCompare(b.code));
  const hash = contentHash({
    observedAt: header.observedAt,
    seq: header.upstreamSeq,
    observations: stableObservations,
  });

  return {
    sourceKey: 'cnb-arad',
    observedAt: header.observedAt,
    upstreamSeq: header.upstreamSeq,
    observations,
    raw: text,
    contentHash: hash,
    fetchedAt: fetchedAt.toISOString(),
  };
}

function parseHeader(line: string): ParsedHeader {
  // "17.05.2026 #94"  — exactly one space, then '#', then digits.
  const m = line.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+#(\d+)\s*$/);
  if (!m) throw new CnbParseError(`unrecognized header line: "${line}"`);
  const day = m[1]!.padStart(2, '0');
  const month = m[2]!.padStart(2, '0');
  const year = m[3]!;
  const seq = Number(m[4]!);
  if (!Number.isFinite(seq)) throw new CnbParseError(`bad sequence number in "${line}"`);
  return { observedAt: `${year}-${month}-${day}`, upstreamSeq: seq };
}

function parseRow(line: string): CnbFxRow {
  const parts = line.split('|');
  if (parts.length !== 5) {
    throw new CnbParseError(`row has ${parts.length} fields, expected 5 — "${line}"`);
  }
  const [country, currencyName, amountText, code, rateText] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];

  const amount = Number(amountText.trim());
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new CnbParseError(`bad amount "${amountText}" in row "${line}"`);
  }
  // Czech decimal comma → JS decimal point.
  const rate = Number(rateText.trim().replace(',', '.'));
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new CnbParseError(`bad rate "${rateText}" in row "${line}"`);
  }
  if (!/^[A-Z]{3}$/.test(code.trim())) {
    throw new CnbParseError(`bad ISO 4217 code "${code}" in row "${line}"`);
  }

  return {
    country: country.trim(),
    currencyName: currencyName.trim(),
    amount,
    code: code.trim(),
    rate,
  };
}
