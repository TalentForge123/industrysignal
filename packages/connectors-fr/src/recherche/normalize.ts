// recherche-entreprises → connector view models.
//
// The Source on every record points at the public annuaire page for the
// SIREN, so the source-or-nothing guardrail holds: a normalized company or
// dirigeant always carries a dereferenceable origin. Person names come
// straight from the registry payload — never synthesized.

import { annuaireUrl, type RechercheDirigeant, type RechercheResult } from './client';
import type { CompanyProfile, CompanyRef, Dirigeant, Source } from '../types';

function sourceFor(siren: string, retrievedAt: string): Source {
  return { url: annuaireUrl(siren), label: 'recherche-entreprises', retrievedAt };
}

function nameOf(r: RechercheResult): string {
  return (r.nom_complet || r.nom_raison_sociale || '').trim() || `SIREN ${r.siren}`;
}

export function normalizeRef(r: RechercheResult, retrievedAt: string): CompanyRef {
  return {
    siren: r.siren,
    name: nameOf(r),
    naf: r.activite_principale ?? r.siege?.activite_principale ?? null,
    category: r.categorie_entreprise ?? null,
    employeeBand: r.tranche_effectif_salarie ?? null,
    createdAt: r.date_creation ?? null,
    status: r.etat_administratif ?? null,
    city: r.siege?.libelle_commune ?? null,
    postalCode: r.siege?.code_postal ?? null,
    source: sourceFor(r.siren, retrievedAt),
  };
}

function normalizeDirigeant(
  d: RechercheDirigeant,
  source: Source,
): Dirigeant {
  const isMoral = (d.type_dirigeant ?? '').toLowerCase().includes('morale');
  if (isMoral) {
    return {
      name: (d.denomination ?? '').trim() || null,
      role: d.qualite ?? null,
      kind: 'company',
      source,
    };
  }
  // Physical person — name straight from the public registry, or null.
  const full = [d.prenoms, d.nom].map((s) => (s ?? '').trim()).filter(Boolean).join(' ');
  return {
    name: full || null,
    role: d.qualite ?? null,
    bornYear: d.annee_de_naissance ?? null,
    kind: 'person',
    source,
  };
}

export function normalizeProfile(r: RechercheResult, retrievedAt: string): CompanyProfile {
  const ref = normalizeRef(r, retrievedAt);
  const source = ref.source;
  return {
    ...ref,
    legalForm: r.nature_juridique ?? null,
    siret: r.siege?.siret ?? null,
    establishmentsOpen: r.nombre_etablissements_ouverts ?? null,
    dirigeants: (r.dirigeants ?? []).map((d) => normalizeDirigeant(d, source)),
    raw: r,
  };
}
