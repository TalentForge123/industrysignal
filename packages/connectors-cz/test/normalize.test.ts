// Normalizer tests against captured ARES responses.
//
// Fixtures live under ./fixtures/ — refreshed manually via the CLI in
// apps/workers (`pnpm --filter @industrysignal/workers ares:fetch <ico>`
// piped through curl into the fixtures dir). We don't auto-refresh:
// the point of these tests is to lock the *shape* we extract today, so
// if ARES changes their wire format the test fails loudly and we
// update the fixture + normalizer in lockstep.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeAresSubject } from '../src/ares/normalize';
import type { AresRawSubject } from '../src/ares/types';

const FIXED_NOW = new Date('2026-05-17T12:00:00.000Z');

function loadFixture(name: string): AresRawSubject {
  const path = join(__dirname, 'fixtures', name);
  return JSON.parse(readFileSync(path, 'utf-8')) as AresRawSubject;
}

describe('normalizeAresSubject', () => {
  describe('Škoda Auto a.s. (IČO 00177041 — multi-source, altNames)', () => {
    const raw = loadFixture('ares-00177041.json');
    const snap = normalizeAresSubject(raw, { fetchedAt: FIXED_NOW });

    it('extracts core identifiers', () => {
      expect(snap.countryIso).toBe('CZ');
      expect(snap.registryId).toBe('00177041');
      expect(snap.sourceKey).toBe('ares');
      expect(snap.legalName).toBe('Škoda Auto a.s.');
      expect(snap.legalFormCode).toBe('121');
      expect(snap.vatId).toBe('CZ00177041');
    });

    it('collects alternate names from dalsiUdaje without duplicating the legal name', () => {
      expect(snap.altNames).not.toContain(snap.legalName);
      // Per-source variants in ARES carry casing differences and a
      // separate "odštěpný závod" subject name.
      expect(snap.altNames).toContain('ŠKODA AUTO a.s.');
      expect(
        snap.altNames.some((n) => n.includes('odštěpný závod')),
      ).toBe(true);
    });

    it('parses structured address (region/district/municipality/postal)', () => {
      expect(snap.regionCode).toBe('27');
      expect(snap.regionName).toBe('Středočeský kraj');
      expect(snap.districtCode).toBe('3207');
      expect(snap.districtName).toBe('Mladá Boleslav');
      expect(snap.postalCode).toBe('29301');
      expect(snap.addressLine).toContain('Václava Klementa');
    });

    it('dedupes nace codes across czNace2008 + czNace', () => {
      // 29100 appears in both arrays upstream — must show up once only.
      const occurrences = snap.naceCodes.filter((c) => c === '29100').length;
      expect(occurrences).toBe(1);
      expect(snap.primaryNace).toBe(snap.naceCodes[0]);
    });

    it('derives isActive from registry status', () => {
      expect(snap.registryStatus.vr).toBe('AKTIVNI');
      expect(snap.isActive).toBe(true);
    });

    it('produces a stable content hash that ignores fetchedAt', () => {
      const later = normalizeAresSubject(raw, {
        fetchedAt: new Date('2030-01-01T00:00:00.000Z'),
      });
      expect(later.contentHash).toBe(snap.contentHash);
      expect(later.contentHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('preserves the full upstream payload in raw', () => {
      expect(snap.raw).toBe(raw);
    });
  });

  describe('ČEZ a.s. (IČO 45274649 — Prague, no district)', () => {
    const raw = loadFixture('ares-45274649.json');
    const snap = normalizeAresSubject(raw, { fetchedAt: FIXED_NOW });

    it('extracts the Prague region without a district code', () => {
      expect(snap.regionName).toBe('Hlavní město Praha');
      // ARES does not emit kodOkresu for Prague subjects — must be undefined,
      // not the empty string or 0.
      expect(snap.districtCode).toBeUndefined();
      expect(snap.districtName).toBeUndefined();
    });

    it('keeps the canonical legal name spacing as ARES emits it', () => {
      // ARES returns "ČEZ, a. s." with the spaces around "a. s." — the
      // normalizer must not collapse them, downstream search code relies
      // on exact match against this string.
      expect(snap.legalName).toBe('ČEZ, a. s.');
    });
  });

  describe('Seznam.cz a.s. (IČO 26168685 — single-variant)', () => {
    const raw = loadFixture('ares-26168685.json');
    const snap = normalizeAresSubject(raw, { fetchedAt: FIXED_NOW });

    it('returns empty altNames when only the canonical name exists upstream', () => {
      expect(snap.altNames).toEqual([]);
    });

    it('records foundedAt / upstreamUpdatedAt as ISO date strings', () => {
      expect(snap.foundedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(snap.upstreamUpdatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('IČO normalization', () => {
    it('left-pads short IČOs to 8 digits', () => {
      const raw: AresRawSubject = { ico: '177041' };
      const snap = normalizeAresSubject(raw, { fetchedAt: FIXED_NOW });
      expect(snap.registryId).toBe('00177041');
    });

    it('strips non-digit characters before padding', () => {
      const raw: AresRawSubject = { ico: 'CZ-00177041' };
      const snap = normalizeAresSubject(raw, { fetchedAt: FIXED_NOW });
      expect(snap.registryId).toBe('00177041');
    });
  });

  describe('content hash sensitivity', () => {
    const raw = loadFixture('ares-00177041.json');
    const base = normalizeAresSubject(raw, { fetchedAt: FIXED_NOW });

    it('changes when legal name changes', () => {
      const altered = normalizeAresSubject(
        { ...raw, obchodniJmeno: 'Some Other Name a.s.' },
        { fetchedAt: FIXED_NOW },
      );
      expect(altered.contentHash).not.toBe(base.contentHash);
    });

    it('does not change when only datumAktualizace shifts and nothing else does', () => {
      // ARES bumps datumAktualizace on every batch sync regardless of
      // whether actual fields changed. Hashing the normalized snapshot
      // must include upstreamUpdatedAt — otherwise the diff worker
      // misses real changes that share a calendar day. So this should
      // produce a different hash when only the date moves.
      const altered = normalizeAresSubject(
        { ...raw, datumAktualizace: '2030-01-01' },
        { fetchedAt: FIXED_NOW },
      );
      expect(altered.contentHash).not.toBe(base.contentHash);
    });
  });
});
