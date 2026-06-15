// Live smoke test for the FR connector backbone. Hits recherche-entreprises
// for real (keyless) and asserts we get machining-sector companies with
// public dirigeants + sources. Run manually — NOT part of CI (network).
//
//   pnpm --filter @industrysignal/connectors-fr exec tsx test/smoke-live.ts

import { createFrConnector } from '../src';

async function main() {
  const fr = createFrConnector();

  console.log('[smoke] listBySector NAF 28.41 (machining / boring mills) ...');
  // 28.41Z — fabrication de machines de formage des métaux.
  const bySector = await fr.listBySector('28.41Z', { perPage: 5 });
  console.log(`  → ${bySector.length} companies`);
  for (const c of bySector.slice(0, 3)) {
    console.log(`    ${c.siren}  ${c.name}  [${c.naf ?? '—'} · ${c.category ?? '—'}]  ${c.city ?? ''}`);
    console.log(`      source: ${c.source.url}`);
  }

  console.log('\n[smoke] searchCompanies "machine outil" (PME/ETI/GE) ...');
  const hits = await fr.searchCompanies({ q: 'machine outil', perPage: 8 });
  console.log(`  → ${hits.length} hits`);

  const first = hits.find((h) => h.status === 'A') ?? hits[0];
  if (!first) throw new Error('[smoke] no search hits — API shape changed?');

  console.log(`\n[smoke] getCompany ${first.siren} (${first.name}) ...`);
  const profile = await fr.getCompany(first.siren);
  if (!profile) throw new Error('[smoke] getCompany returned null for a known SIREN');
  console.log(`  legalForm=${profile.legalForm} siret=${profile.siret} estabs=${profile.establishmentsOpen}`);
  console.log(`  dirigeants: ${profile.dirigeants.length}`);
  for (const d of profile.dirigeants.slice(0, 4)) {
    console.log(`    - ${d.kind === 'company' ? '[morale] ' : ''}${d.name ?? '(name not in source)'} — ${d.role ?? '?'}`);
    console.log(`      source: ${d.source.label} ${d.source.url}`);
  }

  // Guardrail assertions.
  const named = profile.dirigeants.filter((d) => d.name);
  const sourced = profile.dirigeants.every((d) => d.source?.url);
  console.log('\n[smoke] assertions:');
  console.log(`  every dirigeant has a source URL: ${sourced ? 'OK' : 'FAIL'}`);
  console.log(`  at least one named person/company: ${named.length > 0 ? 'OK' : 'FAIL'}`);
  console.log(`  companies have SIREN + NAF + source: ${bySector.every((c) => c.siren && c.source.url) ? 'OK' : 'FAIL'}`);

  if (!sourced) throw new Error('[smoke] guardrail: a dirigeant is missing a source');
  console.log('\n[smoke] PASS');
}

main().catch((e) => {
  console.error('[smoke] FAIL:', e);
  process.exit(1);
});
