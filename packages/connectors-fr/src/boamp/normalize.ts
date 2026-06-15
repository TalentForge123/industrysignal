// BOAMP record → TenderRef. `titulaire` (awardee) is normalized to a single
// display string; `nomacheteur` is the buyer. Each tender carries a BODACC-
// style source URL into the public dataset.

import { boampSourceUrl, type BoampRecord } from './client';
import type { Source, TenderRef } from '../types';

function awardeeOf(t: BoampRecord['titulaire']): string | null {
  if (!t) return null;
  if (Array.isArray(t)) {
    const names = t.map((x) => String(x).trim()).filter(Boolean);
    return names.length ? names.join(', ') : null;
  }
  const s = String(t).trim();
  return s || null;
}

export function normalizeTenders(records: BoampRecord[], retrievedAt: string): TenderRef[] {
  return records.map((r) => {
    const id = r.idweb ?? r.id ?? '';
    const source: Source = { url: boampSourceUrl(id), label: 'BOAMP', retrievedAt };
    return {
      id,
      title: (r.objet ?? '').trim() || '(sans objet)',
      buyer: r.nomacheteur ?? null,
      awardee: awardeeOf(r.titulaire),
      published: r.dateparution ?? null,
      deadline: r.datelimitereponse ?? null,
      cpv: null, // BOAMP record has no flat CPV column in this dataset
      amountEur: null,
      source,
    };
  });
}
