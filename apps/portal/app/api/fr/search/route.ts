// POST /api/fr/search — operator tool: search the French company registry by
// segment (NAF / keyword / department / size) and get real companies with
// their PUBLIC statutory contacts (Président, Directeur Général…), each
// sourced to annuaire-entreprises. Auth-protected (any operator).
//
// Honest scope (registry limitation): recherche-entreprises / RNE expose only
// STATUTORY officers. Functional roles — Directeur des Achats (procurement),
// Directeur Commercial (sales) — are NOT public here. For those we return a
// `suggestedTargetRoles` hint (the FUNCTION to ask for, never a fabricated
// name) and flag that named functional contacts need a paid/LinkedIn
// enrichment layer (GDPR-aware) — the documented Tier-2 step.

import { NextResponse } from 'next/server';
import { searchFrCompanyProfiles } from '@industrysignal/connectors-fr';
import { auth } from '@/auth';

// Who you typically approach at an industrial buyer for a capital-equipment
// (machine tool) sale — a ROLE hint, since names aren't in the free registry.
const DEFAULT_TARGET_ROLES = [
  'Directeur Industriel',
  'Directeur des Achats',
  'Responsable Méthodes / Production',
  'Directeur Technique',
];

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: { q?: unknown; naf?: unknown; department?: unknown; sizes?: unknown; limit?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body ok */
  }

  const q = typeof body.q === 'string' ? body.q.trim() : undefined;
  const naf = typeof body.naf === 'string' ? body.naf.trim() : Array.isArray(body.naf) ? (body.naf as string[]) : undefined;
  const department = typeof body.department === 'string' ? body.department.trim() : undefined;
  const sizes = Array.isArray(body.sizes)
    ? (body.sizes.filter((s) => ['PME', 'ETI', 'GE'].includes(String(s))) as Array<'PME' | 'ETI' | 'GE'>)
    : undefined;
  const perPage = Math.min(Math.max(Number(body.limit) || 10, 1), 25);

  if (!q && !naf) {
    return NextResponse.json({ error: 'bad_request', message: 'q nebo naf je povinné' }, { status: 400 });
  }

  try {
    const profiles = await searchFrCompanyProfiles({
      q,
      naf,
      location: department,
      categories: sizes,
      perPage,
    });

    const companies = profiles.map((p) => ({
      siren: p.siren,
      name: p.name,
      naf: p.naf,
      category: p.category, // PME / ETI / GE
      employeeBand: p.employeeBand,
      city: p.city,
      status: p.status, // 'A' active
      source: p.source.url,
      // Public statutory contacts only — real names from the registry.
      contacts: p.dirigeants
        .filter((d) => d.name)
        .map((d) => ({ role: d.role, name: d.name, kind: d.kind })),
    }));

    return NextResponse.json({
      companies,
      count: companies.length,
      // Tier-2 hint: functional decision-makers aren't in the free registry.
      suggestedTargetRoles: DEFAULT_TARGET_ROLES,
      note:
        'Kontakty jsou veřejní statutáři z FR rejstříku (recherche-entreprises). ' +
        'Funkční role (Directeur des Achats / Commercial) nejsou ve free rejstříku — ' +
        'pro konkrétní jména je potřeba enrichment vrstva (LinkedIn / placené B2B, GDPR).',
    });
  } catch (err) {
    process.stderr.write(`[fr/search] ${err instanceof Error ? err.message : String(err)}\n`);
    return NextResponse.json({ error: 'search_failed' }, { status: 502 });
  }
}
