// Parser + normalizer tests against captured ISIR SOAP responses.
// Fixtures: see ./fixtures/isir/ — captured manually via the workers CLI
// (`pnpm --filter @industrysignal/workers isir:fetch <ico>`).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IsirSoapFaultError,
  buildSoapEnvelope,
  parseSoapResponse,
} from '../src/isir/client';
import { normalizeIsirResponse } from '../src/isir/normalize';

const FIXED_NOW = new Date('2026-05-17T22:00:00.000Z');

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'isir', name), 'utf-8');
}

describe('parseSoapResponse + normalizeIsirResponse', () => {
  describe('SALEZA / Sazka (IČO 47116307, in konkurs)', () => {
    const xml = loadFixture('isir-cuzk-47116307.xml');
    const parsed = parseSoapResponse(xml);
    const result = normalizeIsirResponse(parsed, { fetchedAt: FIXED_NOW });

    it('returns exactly one event', () => {
      expect(result.events).toHaveLength(1);
      expect(result.resultCount).toBe(1);
      expect(result.errorCode).toBeUndefined();
    });

    it('extracts the spisová značka', () => {
      const e = result.events[0]!;
      expect(e.caseKind).toBe('INS');
      expect(e.caseSenate).toBe(60);
      expect(e.caseNumber).toBe(628);
      expect(e.caseYear).toBe(2011);
      expect(e.caseCourt).toBe('Městský soud v Praze');
    });

    it('coerces debtorIco to an 8-digit string (ARES join compatibility)', () => {
      // Upstream emits the raw digits as XML text; fast-xml-parser would
      // otherwise hand us number 47116307.
      const e = result.events[0]!;
      expect(typeof e.debtorIco).toBe('string');
      expect(e.debtorIco).toBe('47116307');
    });

    it('captures debtor name + address as strings', () => {
      const e = result.events[0]!;
      expect(e.debtorName).toBe('SALEZA, a.s.');
      expect(e.debtorAddress).toMatchObject({
        kind: 'SÍDLO FY',
        city: 'Praha 9',
        houseNumber: '851', // not number 851
        postalCode: '190 93',
      });
    });

    it('surfaces the case status verbatim from upstream', () => {
      expect(result.events[0]!.caseStatus).toBe('KONKURS');
    });

    it('preserves the upstream sync time', () => {
      expect(result.upstreamSyncedAt).toBe('2026-05-17T21:43:10.000Z');
    });

    it('content hash is deterministic and excludes fetchedAt', () => {
      const again = normalizeIsirResponse(parsed, {
        fetchedAt: new Date('2030-01-01T00:00:00.000Z'),
      });
      expect(again.events[0]!.contentHash).toBe(result.events[0]!.contentHash);
      expect(result.events[0]!.contentHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('empty result (WS2 — no events on file for this IČO)', () => {
    const xml = loadFixture('isir-cuzk-00177041.xml');
    const parsed = parseSoapResponse(xml);
    const result = normalizeIsirResponse(parsed, { fetchedAt: FIXED_NOW });

    it('returns no events but is not an error', () => {
      expect(result.events).toEqual([]);
      expect(result.errorCode).toBe('WS2');
      // The error text from ISIR is just descriptive — callers should
      // treat WS2 as "no insolvency on file", not a fetch failure.
      expect(result.errorText).toContain('Prázdný');
    });
  });

  it('throws IsirSoapFaultError on a SOAP Fault response', () => {
    const xml = loadFixture('isir-cuzk-fault.xml');
    expect(() => parseSoapResponse(xml)).toThrow(IsirSoapFaultError);
  });
});

describe('buildSoapEnvelope', () => {
  it('wraps the request element in the types namespace but keeps inner elements unqualified', () => {
    // Verified empirically against the live endpoint: namespacing the
    // inner `<ic>` element triggers a SOAP Fault. The test pins the
    // exact shape so a refactor can't quietly reintroduce the bug.
    const xml = buildSoapEnvelope({ ic: '47116307', maxPocetVysledku: 50 });
    expect(xml).toContain('xmlns:ns0="http://isirws.cca.cz/types/"');
    expect(xml).toContain('<ns0:getIsirWsCuzkDataRequest');
    expect(xml).toContain('<ic>47116307</ic>');
    expect(xml).not.toContain('<ns0:ic>');
  });

  it('clamps maxPocetVysledku to the upstream 1..200 range', () => {
    const xml = buildSoapEnvelope({ ic: '1', maxPocetVysledku: 9999 });
    expect(xml).toContain('<maxPocetVysledku>200</maxPocetVysledku>');
    const xml2 = buildSoapEnvelope({ ic: '1', maxPocetVysledku: 0 });
    expect(xml2).toContain('<maxPocetVysledku>1</maxPocetVysledku>');
  });

  it('emits T/F for boolean flags', () => {
    const xml = buildSoapEnvelope({
      ic: '1',
      filtrAktualniRizeni: true,
      vyhledatBezDiakritiky: false,
    });
    expect(xml).toContain('<filtrAktualniRizeni>T</filtrAktualniRizeni>');
    expect(xml).toContain('<vyhledatBezDiakritiky>F</vyhledatBezDiakritiky>');
  });

  it('XML-escapes user-supplied strings', () => {
    const xml = buildSoapEnvelope({ nazevOsoby: 'A & B <inc>' });
    expect(xml).toContain('<nazevOsoby>A &amp; B &lt;inc&gt;</nazevOsoby>');
  });
});
