// Pure-function tests for the alert classifier. No DB, no Inngest —
// just exercise the priority + copy decisions against representative
// fixtures.

import { describe, expect, it } from 'vitest';
import type {
  CompanyOfficerRow,
  CompanyRow,
  InsolvencyEventRow,
} from '@industrysignal/db';
import {
  classifyInsolvencyAlert,
  classifyOfficerAlert,
  type OrgWatchPair,
} from '../src/alert-classifier';

const PAIR: OrgWatchPair = {
  organizationId: 'org-acme',
  watchlistId: 'wl-default',
};

function makeCompany(overrides: Partial<CompanyRow> = {}): CompanyRow {
  return {
    id: 'co-1',
    countryIso: 'CZ',
    registryId: '00177041',
    sourceKey: 'ares',
    legalName: 'Škoda Auto a.s.',
    altNames: [],
    legalFormCode: '121',
    vatId: null,
    addressLine: 'tř. Václava Klementa 869, Mladá Boleslav',
    addressStructured: null,
    regionCode: null,
    regionName: null,
    districtCode: null,
    districtName: null,
    postalCode: null,
    naceCodes: [],
    primaryNace: null,
    foundedAt: null,
    upstreamUpdatedAt: null,
    registryStatus: null,
    primarySourceRegistry: null,
    isActive: true,
    raw: {},
    contentHash: 'hash',
    fetchedAt: new Date(),
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as CompanyRow;
}

function makeInsolvency(
  overrides: Partial<InsolvencyEventRow> = {},
): InsolvencyEventRow {
  return {
    id: 'ins-1',
    countryIso: 'CZ',
    sourceKey: 'isir',
    debtorIco: '47116307',
    debtorRc: null,
    debtorName: 'Vítkovice Steel a.s.',
    debtorAddress: null,
    caseCourt: 'Krajský soud v Ostravě',
    caseSenate: 60,
    caseKind: 'INS',
    caseNumber: 628,
    caseYear: 2024,
    caseStatus: 'ZAHÁJENÍ ÚPADKU',
    caseDetailUrl: 'https://isir.justice.cz/case/abc',
    otherDebtorsInCase: false,
    bankruptcyStartedAt: null,
    bankruptcyEndedAt: null,
    raw: {},
    contentHash: 'h',
    upstreamSyncedAt: new Date(),
    fetchedAt: new Date(),
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as InsolvencyEventRow;
}

function makeOfficer(overrides: Partial<CompanyOfficerRow> = {}): CompanyOfficerRow {
  return {
    id: 'off-1',
    companyId: 'co-1',
    countryIso: 'CZ',
    sourceKey: 'justice',
    name: 'Jan Novák',
    role: 'director',
    roleLabel: 'Předseda představenstva',
    appointedAt: '2024-03-15',
    terminatedAt: null,
    raw: {},
    contentHash: 'h',
    fetchedAt: new Date(),
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as CompanyOfficerRow;
}

describe('classifyInsolvencyAlert', () => {
  it('marks the alert as critical priority', () => {
    const alert = classifyInsolvencyAlert({
      event: makeInsolvency(),
      company: makeCompany({ legalName: 'Vítkovice Steel a.s.', registryId: '47116307' }),
      pair: PAIR,
    });
    expect(alert.priority).toBe('critical');
    expect(alert.kind).toBe('insolvency_filed');
    expect(alert.targetType).toBe('company');
  });

  it('uses the joined company legalName in the title when available', () => {
    const alert = classifyInsolvencyAlert({
      event: makeInsolvency({ debtorName: 'jiné jméno' }),
      company: makeCompany({ legalName: 'Vítkovice Steel a.s.' }),
      pair: PAIR,
    });
    expect(alert.title).toBe('Insolvenční návrh — Vítkovice Steel a.s.');
  });

  it('falls back to debtorName when the company row is missing', () => {
    const alert = classifyInsolvencyAlert({
      event: makeInsolvency({ debtorName: 'Foreign Co Ltd' }),
      company: null,
      pair: PAIR,
    });
    expect(alert.title).toBe('Insolvenční návrh — Foreign Co Ltd');
  });

  it('falls back to IČO when both company + debtorName are missing', () => {
    const alert = classifyInsolvencyAlert({
      event: makeInsolvency({ debtorName: null, debtorIco: '12345678' }),
      company: null,
      pair: PAIR,
    });
    expect(alert.title).toBe('Insolvenční návrh — IČO 12345678');
  });

  it('composes the case ref as KIND NUMBER/YEAR (Senát N)', () => {
    const alert = classifyInsolvencyAlert({
      event: makeInsolvency({
        caseKind: 'INS',
        caseNumber: 628,
        caseYear: 2024,
        caseSenate: 60,
      }),
      company: null,
      pair: PAIR,
    });
    expect(alert.message).toContain('INS 628/2024 (Senát 60)');
  });

  it('carries the dedup key (sourceEventId = event.id)', () => {
    const alert = classifyInsolvencyAlert({
      event: makeInsolvency({ id: 'ins-xyz' }),
      company: null,
      pair: PAIR,
    });
    expect(alert.sourceEventId).toBe('ins-xyz');
  });

  it('propagates the watchlist + org ids from the pair', () => {
    const alert = classifyInsolvencyAlert({
      event: makeInsolvency(),
      company: null,
      pair: { organizationId: 'org-abc', watchlistId: 'wl-xyz' },
    });
    expect(alert.organizationId).toBe('org-abc');
    expect(alert.watchlistId).toBe('wl-xyz');
  });
});

describe('classifyOfficerAlert', () => {
  it('appointed → high priority + "jmenován" verb', () => {
    const alert = classifyOfficerAlert({
      officer: makeOfficer({ appointedAt: '2024-03-15' }),
      company: makeCompany(),
      changeType: 'appointed',
      pair: PAIR,
    });
    expect(alert.priority).toBe('high');
    expect(alert.kind).toBe('executive_change');
    expect(alert.message).toContain('jmenován');
    expect(alert.message).toContain('2024-03-15');
  });

  it('terminated → high priority + "odvolán" verb', () => {
    const alert = classifyOfficerAlert({
      officer: makeOfficer({
        appointedAt: '2020-01-01',
        terminatedAt: '2024-12-31',
      }),
      company: makeCompany(),
      changeType: 'terminated',
      pair: PAIR,
    });
    expect(alert.priority).toBe('high');
    expect(alert.message).toContain('odvolán');
    expect(alert.message).toContain('2024-12-31');
  });

  it('omits the date clause when the relevant date is null', () => {
    const alert = classifyOfficerAlert({
      officer: makeOfficer({ appointedAt: null }),
      company: makeCompany(),
      changeType: 'appointed',
      pair: PAIR,
    });
    expect(alert.message).not.toMatch(/\(k /);
  });

  it('renders title with company legalName + role label', () => {
    const alert = classifyOfficerAlert({
      officer: makeOfficer({ roleLabel: 'Jednatel' }),
      company: makeCompany({ legalName: 'Strojírny Brno, a.s.' }),
      changeType: 'appointed',
      pair: PAIR,
    });
    expect(alert.title).toBe('Změna ve statutárním orgánu — Strojírny Brno, a.s.');
    expect(alert.message).toContain('Jednatel');
  });

  it('uses the officer.id as the dedup key', () => {
    const alert = classifyOfficerAlert({
      officer: makeOfficer({ id: 'off-xyz' }),
      company: makeCompany(),
      changeType: 'appointed',
      pair: PAIR,
    });
    expect(alert.sourceEventId).toBe('off-xyz');
  });
});
