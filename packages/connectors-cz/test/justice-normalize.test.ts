// Parser tests against synthetic fixtures. Verify selectors, role +
// filing classification, Czech-date parsing, and stable hashing.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assembleJusticeSnapshot,
  classifyFilingType,
  classifyOfficerRole,
  extractFilings,
  extractOfficers,
  extractSubjektIdFromSearch,
  parseCzechDate,
} from '../src/justice/normalize';

const FIX = join(__dirname, 'fixtures', 'justice');
const searchHtml = readFileSync(join(FIX, 'search.html'), 'utf-8');
const detailHtml = readFileSync(join(FIX, 'detail-platny.html'), 'utf-8');
const filingsHtml = readFileSync(join(FIX, 'filings.html'), 'utf-8');

describe('extractSubjektIdFromSearch', () => {
  it('returns the first subjektId on the page', () => {
    expect(extractSubjektIdFromSearch(searchHtml)).toBe('54321');
  });

  it('returns null when there are no matching links', () => {
    expect(extractSubjektIdFromSearch('<html><body>nic</body></html>')).toBeNull();
  });
});

describe('classifyOfficerRole', () => {
  it.each([
    ['Předseda představenstva', 'director'],
    ['Člen představenstva', 'director'],
    ['Jednatel', 'executive'],
    ['Statutární ředitel', 'executive'],
    ['Předseda dozorčí rady', 'supervisor'],
    ['Člen dozorčí rady', 'supervisor'],
    ['Prokurista', 'procurator'],
    ['Likvidátor', 'other'],
  ] as const)('%s → %s', (label, expected) => {
    expect(classifyOfficerRole(label)).toBe(expected);
  });
});

describe('classifyFilingType', () => {
  it.each([
    ['Účetní závěrka [2022]', 'financial_statement'],
    ['Rozvaha 2021', 'financial_statement'],
    ['Výroční zpráva 2022', 'annual_report'],
    ['Zpráva auditora za rok 2022', 'auditor_report'],
    ['Notářský zápis', 'other'],
  ] as const)('%s → %s', (label, expected) => {
    expect(classifyFilingType(label)).toBe(expected);
  });
});

describe('parseCzechDate', () => {
  it.each([
    ['15. 3. 2022', '2022-03-15'],
    ['1.7.2020', '2020-07-01'],
    ['', undefined],
    ['blah', undefined],
    ['32. 13. 2020', '2020-13-32'], // invalid month/day passes through —
    // calendar validation is the DB's job; we faithfully transcribe.
  ] as const)('"%s" → %s', (input, expected) => {
    expect(parseCzechDate(input)).toBe(expected);
  });
});

describe('extractOfficers', () => {
  it('reads 4 officers across statutory + supervisory + procurator sections', () => {
    const officers = extractOfficers(detailHtml);
    expect(officers).toHaveLength(4);

    const chair = officers.find((o) => o.name === 'Jan Novák');
    expect(chair).toMatchObject({
      role: 'director',
      roleLabel: 'Předseda představenstva',
      appointedAt: '2022-03-15',
    });
    expect(chair?.terminatedAt).toBeUndefined();

    const terminated = officers.find((o) => o.name === 'Petra Svobodová');
    expect(terminated?.terminatedAt).toBe('2024-12-31');

    const supervisor = officers.find((o) => o.name === 'Karel Dvořák');
    expect(supervisor?.role).toBe('supervisor');

    const procurator = officers.find((o) => o.name === 'Eva Procházková');
    expect(procurator?.role).toBe('procurator');
  });

  it('collapses inner whitespace in names', () => {
    // "Jan   Novák" (triple-space in fixture) must end up as "Jan Novák".
    const officers = extractOfficers(detailHtml);
    expect(officers.some((o) => o.name === 'Jan Novák')).toBe(true);
  });
});

describe('extractFilings', () => {
  it('returns 4 filings (skips the row without a PDF link)', () => {
    const filings = extractFilings(filingsHtml, '54321');
    expect(filings).toHaveLength(4);
  });

  it('classifies filing type + fiscal year + filed date', () => {
    const filings = extractFilings(filingsHtml, '54321');
    const annual = filings.find((f) => f.documentType === 'annual_report');
    expect(annual).toMatchObject({
      documentTypeLabel: 'Výroční zpráva 2022',
      fiscalYear: 2022,
      filedAt: '2023-06-15',
    });
  });

  it('builds upstream-stable doc IDs as <subjektId>-<docId>', () => {
    const filings = extractFilings(filingsHtml, '54321');
    const ids = filings.map((f) => f.upstreamDocId).sort();
    expect(ids).toEqual(['54321-1001', '54321-1002', '54321-1003', '54321-1004']);
  });

  it('absolutizes relative URLs against or.justice.cz', () => {
    const filings = extractFilings(filingsHtml, '54321');
    for (const f of filings) {
      expect(f.documentUrl).toMatch(/^https:\/\/or\.justice\.cz/);
    }
  });
});

describe('assembleJusticeSnapshot', () => {
  const fetchedAt = new Date('2026-05-18T08:00:00.000Z');

  it('produces a stable snapshot with both officers and filings', () => {
    const snap = assembleJusticeSnapshot({
      subjektId: '54321',
      registryId: '12345678',
      detailHtml,
      filingsHtml,
      fetchedAt,
    });
    expect(snap.officers).toHaveLength(4);
    expect(snap.filings).toHaveLength(4);
    expect(snap.fetchedAt).toBe(fetchedAt.toISOString());
    expect(snap.sourceKey).toBe('justice');
    expect(snap.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash is invariant to DOM-order of officers and filings', () => {
    // Build two minimal detail snippets with the same officers but in
    // opposite DOM order; ditto for filings. Stable-sort inside the
    // assembler should make both hashes identical.
    const officersAB = `
      <div data-rubrika="statutarni-organ">
        <div class="aunp-udajPolozka">
          <span class="aunp-funkce">Jednatel</span>
          <span class="aunp-jmeno">Adam Adámek</span>
          <span class="aunp-datumOd">1. 1. 2020</span>
        </div>
        <div class="aunp-udajPolozka">
          <span class="aunp-funkce">Jednatel</span>
          <span class="aunp-jmeno">Bára Bartošová</span>
          <span class="aunp-datumOd">1. 1. 2021</span>
        </div>
      </div>`;
    const officersBA = `
      <div data-rubrika="statutarni-organ">
        <div class="aunp-udajPolozka">
          <span class="aunp-funkce">Jednatel</span>
          <span class="aunp-jmeno">Bára Bartošová</span>
          <span class="aunp-datumOd">1. 1. 2021</span>
        </div>
        <div class="aunp-udajPolozka">
          <span class="aunp-funkce">Jednatel</span>
          <span class="aunp-jmeno">Adam Adámek</span>
          <span class="aunp-datumOd">1. 1. 2020</span>
        </div>
      </div>`;
    const filingsAsc = `
      <table class="result-details">
        <tr><th></th><th></th><th></th></tr>
        <tr><td>Účetní závěrka [2021]</td><td>1. 6. 2022</td>
            <td><a href="/ias/content/download?id=1">PDF</a></td></tr>
        <tr><td>Účetní závěrka [2022]</td><td>1. 6. 2023</td>
            <td><a href="/ias/content/download?id=2">PDF</a></td></tr>
      </table>`;
    const filingsDesc = `
      <table class="result-details">
        <tr><th></th><th></th><th></th></tr>
        <tr><td>Účetní závěrka [2022]</td><td>1. 6. 2023</td>
            <td><a href="/ias/content/download?id=2">PDF</a></td></tr>
        <tr><td>Účetní závěrka [2021]</td><td>1. 6. 2022</td>
            <td><a href="/ias/content/download?id=1">PDF</a></td></tr>
      </table>`;

    const a = assembleJusticeSnapshot({
      subjektId: '54321',
      detailHtml: officersAB,
      filingsHtml: filingsAsc,
      fetchedAt,
    });
    const b = assembleJusticeSnapshot({
      subjektId: '54321',
      detailHtml: officersBA,
      filingsHtml: filingsDesc,
      fetchedAt,
    });
    expect(b.contentHash).toBe(a.contentHash);
  });
});
