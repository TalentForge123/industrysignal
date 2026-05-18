// Pure-function alert classifier.
//
// Takes one change event (insolvency filing / officer appointment /
// officer termination) plus the (org, watchlist) pair receiving it,
// and returns the `AlertInsert` that should hit the DB. Kept I/O-free
// so the priority + copy decisions can be unit-tested without a
// running database.
//
// HANDOFF §7 sets the priority rule of thumb:
//   critical → insolvency filing on a sledovaná firma
//   high     → changes in statutory bodies / large news
//   normal   → quarterly results, slow-moving signals

import type {
  AlertInsert,
  CompanyOfficerRow,
  CompanyRow,
  InsolvencyEventRow,
} from '@industrysignal/db';

export interface OrgWatchPair {
  organizationId: string;
  watchlistId: string;
}

// ----- Insolvency -------------------------------------------------------

export interface InsolvencyAlertInput {
  event: InsolvencyEventRow;
  /** May be null when the debtor isn't a tracked company (individual, foreign entity). */
  company: CompanyRow | null;
  pair: OrgWatchPair;
}

export function classifyInsolvencyAlert(input: InsolvencyAlertInput): AlertInsert {
  const { event, company, pair } = input;
  const debtorName =
    company?.legalName ??
    event.debtorName ??
    (event.debtorIco ? `IČO ${event.debtorIco}` : 'neznámý subjekt');
  // Spisová značka: "INS 628/2011 (Senát 60)" — match how Czech court
  // filings are typically cited.
  const caseRef = `${event.caseKind} ${event.caseNumber}/${event.caseYear} (Senát ${event.caseSenate})`;
  const status = event.caseStatus ?? 'zahájeno';

  return {
    organizationId: pair.organizationId,
    watchlistId: pair.watchlistId,
    priority: 'critical',
    kind: 'insolvency_filed',
    targetType: 'company',
    targetRef: event.debtorIco ?? null,
    countryIso: event.countryIso,
    title: `Insolvenční návrh — ${debtorName}`,
    message: `Spisová značka ${caseRef}. Stav: ${status}.`,
    sourceUrl: event.caseDetailUrl,
    sourceEventId: event.id,
  };
}

// ----- Officer changes --------------------------------------------------

export interface OfficerAlertInput {
  officer: CompanyOfficerRow;
  company: CompanyRow;
  changeType: 'appointed' | 'terminated';
  pair: OrgWatchPair;
}

export function classifyOfficerAlert(input: OfficerAlertInput): AlertInsert {
  const { officer, company, changeType, pair } = input;
  const verb = changeType === 'appointed' ? 'jmenován' : 'odvolán';
  const when = changeType === 'appointed' ? officer.appointedAt : officer.terminatedAt;
  const dateClause = when ? ` (k ${when})` : '';

  return {
    organizationId: pair.organizationId,
    watchlistId: pair.watchlistId,
    priority: 'high',
    kind: 'executive_change',
    targetType: 'company',
    targetRef: company.registryId,
    countryIso: company.countryIso,
    title: `Změna ve statutárním orgánu — ${company.legalName}`,
    message: `${officer.roleLabel}: ${officer.name} ${verb}${dateClause}.`,
    // Justice.cz has a stable subject URL we could link to; for Sprint 3
    // we leave this null until the connector returns it explicitly.
    sourceUrl: null,
    sourceEventId: officer.id,
  };
}
