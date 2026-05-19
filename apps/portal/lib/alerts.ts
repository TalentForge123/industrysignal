// Server-side alerts read helpers. Used by the /portal/alerts page.
//
// The Sprint-3 alerts feed surfaces what the alert-diff scheduler has
// already classified and persisted into the `alert` table — primarily
// `insolvency_filed` (critical) and `executive_change` (high). Newer
// kinds (production_cut, contract_win, ...) per §16 will land without
// requiring view changes: the view renders by tone, not kind.

import {
  countFreshAlertsForOrg as countFreshAlertsForOrgDb,
  findAlertsForOrg,
  type AlertFeedRow,
} from '@industrysignal/db';
import { db } from './db';

export type AlertTone = 'up' | 'dn' | 'warn';

/** View-row shape for AlertsView. Locale-independent on this side —
 *  the view formats `createdAt` per the current language. */
export interface AlertView {
  id: string;
  /** ISO timestamp; the view formats per language. */
  createdAt: string;
  tone: AlertTone;
  /** Raw kind from the alert table (e.g. 'insolvency_filed'). The view
   *  resolves a localized label. */
  kind: string;
  /** Display name of the affected entity. Falls back to alert.title's
   *  trailing segment when no company row is joined. */
  target: string;
  /** Localized message body, taken verbatim from the alert row. */
  body: string;
  /** Empty when no joined company / no targetRef to slice from. */
  ticker: string | null;
  /** Source link to the upstream artifact (e.g. ISIR case detail). */
  sourceUrl: string | null;
  /** True for alerts the user hasn't acknowledged yet. */
  fresh: boolean;
}

/**
 * Fetch the alerts feed for an org. Returns up to `limit` rows newest
 * first, already mapped into the shape AlertsView wants. Doesn't perform
 * RBAC itself — the page-level loader resolves the user's default org
 * and passes its id straight in.
 */
export async function getAlertsForOrg(
  organizationId: string,
  limit = 100,
): Promise<AlertView[]> {
  const rows = await findAlertsForOrg(db, organizationId, limit);
  return rows.map(toAlertView);
}

/** Fresh-alerts count for the title-bar badge. Cheap covering-index hit. */
export async function countFreshAlertsForOrg(organizationId: string): Promise<number> {
  return countFreshAlertsForOrgDb(db, organizationId);
}

function toAlertView(row: AlertFeedRow): AlertView {
  const { alert, company } = row;
  const target = company?.legalName ?? extractTargetFromTitle(alert.title);
  return {
    id: alert.id,
    createdAt: alert.createdAt.toISOString(),
    tone: priorityToTone(alert.priority),
    kind: alert.kind,
    target,
    body: alert.message,
    ticker: deriveTicker(target, alert.targetRef),
    sourceUrl: alert.sourceUrl,
    fresh: alert.status === 'new',
  };
}

function priorityToTone(priority: 'critical' | 'high' | 'normal'): AlertTone {
  switch (priority) {
    case 'critical':
      return 'dn';
    case 'high':
      return 'warn';
    case 'normal':
      return 'up';
  }
}

// Alert titles emitted by the classifier follow the pattern
// "<headline> — <entity>". When no joined company row is available
// (foreign debtor in ISIR, segment-level alert), this slices the
// entity off so the view still has something readable to render.
function extractTargetFromTitle(title: string): string {
  const idx = title.lastIndexOf(' — ');
  if (idx < 0) return title;
  return title.slice(idx + 3).trim() || title;
}

function stripDiacritics(s: string): string {
  // U+0300–U+036F = "Combining Diacritical Marks" — what NFKD splits
  // accented Czech letters into (e.g. "í" → "i" + U+0301).
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

// 4-char terminal ticker. Prefers consonants from the entity name so
// "Vítkovice Steel" → "VTKV" rather than the less informative "VIIT".
// Falls back to the registry id when the name is too short.
function deriveTicker(name: string, registryId: string | null): string | null {
  const cleaned = stripDiacritics(name)
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  if (cleaned.length >= 4) {
    const consonants = cleaned.replace(/[AEIOU]/g, '');
    const seed = consonants.length >= 4 ? consonants : cleaned;
    return seed.slice(0, 4);
  }
  if (cleaned.length > 0) return cleaned.padEnd(4, 'X').slice(0, 4);
  if (registryId) return registryId.slice(0, 4);
  return null;
}
