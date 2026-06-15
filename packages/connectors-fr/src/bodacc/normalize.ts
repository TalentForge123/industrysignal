// BODACC record → DistressEvent. We surface the collective-procedure and
// lifecycle familles that signal distress or a relationship opening
// (insolvency, radiation, sale/transfer). "Modifications diverses" and
// pure registrations are not distress and are filtered out.

import { bodaccSourceUrl, type BodaccRecord } from './client';
import type { DistressEvent, Source } from '../types';

const DISTRESS_FAMILLES = [
  'procédures collectives',
  'procédure collective',
  'rétablissement',
  'radiation',
  'ventes et cessions',
  'vente',
  'dépôt des comptes', // late/irregular filings are a soft distress signal
];

function isDistress(famille: string): boolean {
  const f = famille.toLowerCase();
  return DISTRESS_FAMILLES.some((k) => f.includes(k));
}

export function normalizeDistress(
  records: BodaccRecord[],
  siren: string,
  retrievedAt: string,
): DistressEvent[] {
  const source: Source = {
    url: bodaccSourceUrl(siren),
    label: 'BODACC',
    retrievedAt,
  };
  const clean = siren.replace(/\D/g, '');
  return records
    .filter((r) => isDistress(r.familleavis_lib ?? r.familleavis ?? ''))
    .map((r) => ({
      siren: clean,
      kind: r.familleavis_lib ?? r.familleavis ?? 'annonce',
      date: r.dateparution ?? '',
      detail: [r.typeavis_lib, r.tribunal, r.ville].filter(Boolean).join(' · ') || null,
      source,
    }));
}
