// FR-grounded mission research (Block B).
//
// Unlike the generic research path (lib/mission-research.ts), where Claude
// proposes candidates from its own knowledge, this path GROUNDS candidates
// in live FR connector data. The pipeline:
//
//   1. Haiku normalizes the brief (CZ NACE + keywords) → FR NAF codes +
//      search terms.
//   2. The FR connector (@industrysignal/connectors-fr) pulls REAL companies
//      (recherche-entreprises: SIREN, NAF, public dirigeants) and REAL
//      tenders (BOAMP: buyer + awardee), each carrying a source URL.
//   3. Sonnet RANKS that real pool against the rubric — it selects, assigns
//      role / priority / worksWith edges and a one-line note, but may NOT
//      invent companies. It echoes back the source URL we gave it.
//   4. Guardrails: source-or-nothing holds because every candidate carries a
//      connector source URL (verify=false); a candidate without one is
//      flagged OVĚŘIT. Person names ARE allowed here — they come from the
//      public French registry (dirigeants), the documented FR exception to
//      the no-fabricated-names rule. We still never synthesize a name: the
//      decisionMaker is built only from connector dirigeant data.

import 'server-only';
import {
  createFrConnector,
  searchFrTenders,
  type CompanyProfile,
  type CompanyRef,
} from '@industrysignal/connectors-fr';
import { CLASSIFY_MODEL, RESEARCH_MODEL, runClaudeJson } from './claude-runner';
import { parseCandidates, type CandidateRole, type ResearchCandidate } from './mission-research';

export interface FrResearchInput {
  clientName: string;
  clientNace: string | null;
  clientSector: string | null;
  segmentKeywords: string[];
  intent: string;
  rubric: { text: string; weight: string }[];
  /** The research move task (e.g. researchMoves t1: "FR targets …"). */
  task: string;
  /** Names already on the map — excluded from the pool + the result. */
  existingNames: string[];
}

export interface FrCandidate extends ResearchCandidate {
  priority: 'high' | 'medium' | null;
  siren: string | null;
}

// ---------- 1. Haiku — brief → FR query ----------

export interface FrQuery {
  nafCodes: string[];
  searchTerms: string[];
}

function safeJsonObject(raw: string): Record<string, unknown> {
  let s = String(raw ?? '').trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    const o: unknown = JSON.parse(s);
    return o && typeof o === 'object' ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function deriveFrQuery(input: FrResearchInput): Promise<FrQuery> {
  // The query must target the DEMAND side — the French companies that would
  // BUY / USE the client's machines (per the research task's sectors) — NOT
  // the client's own manufacturing sector (which only surfaces competitors).
  const system = `Jsi expert na francouzské průmyslové sektory. Klient PRODÁVÁ určitý druh strojů/produktů. Tvým úkolem je identifikovat ODBĚRATELSKÉ sektory — francouzské firmy, které takové stroje/produkty NAKUPUJÍ A POUŽÍVAJÍ ve své výrobě — podle zadaného úkolu, a vrátit jejich francouzské NAF (APE) kódy + vyhledávací termíny.

KRITICKÉ:
- Vracíš sektory ODBĚRATELŮ (poptávka), NE sektor klienta (nabídka). Pokud klient vyrábí obráběcí stroje, NEVRACÍŠ NAF výroby strojů (28.41Z) — vracíš sektory, které ty stroje kupují (letectví, obrana, jádro/energetika, kolejová vozidla, těžké strojírenství…).
- Řiď se sektory uvedenými v ÚKOLU.

PRAVIDLA VÝSTUPU (striktní):
1. Odpověz POUZE validním JSON objektem, bez úvodu a bez markdown.
2. Tvar: {"nafCodes": ["30.30Z", ...], "searchTerms": ["aéronautique", ...]}
3. nafCodes: max 5 platných francouzských NAF kódů (formát "NN.NNL") odběratelských sektorů (např. 30.30Z letectví, 25.40Z zbraně/obrana, 30.20Z kolejová vozidla, 24.xx/25.xx těžký kov, energetika/jádro).
4. searchTerms: max 5 francouzských termínů popisujících odběratele/aplikaci (např. "aéronautique", "défense", "nucléaire", "ferroviaire", "turbine").
5. Nevymýšlej si neplatné kódy; když si kódem nejsi jistý, spolehni se na termíny.`;
  const user = `Klient PRODÁVÁ: ${input.clientSector ?? '—'} (klíčová slova produktu: ${input.segmentKeywords.join(', ') || '—'}).
ÚKOL (koho ve Francii hledáme = odběratelé): ${input.task}`;

  try {
    const r = await runClaudeJson({ system, user, model: CLASSIFY_MODEL, maxTokens: 300, temperature: 0 });
    const o = safeJsonObject(r.text);
    const naf = Array.isArray(o.nafCodes) ? o.nafCodes.map((x) => String(x).trim()).filter(Boolean) : [];
    const terms = Array.isArray(o.searchTerms) ? o.searchTerms.map((x) => String(x).trim()).filter(Boolean) : [];
    return {
      nafCodes: naf.slice(0, 5),
      // Fall back to the application keywords (turbine casing, gun barrel…),
      // which describe demand-side use — never the client's machine-making NACE.
      searchTerms: (terms.length ? terms : input.segmentKeywords).slice(0, 5),
    };
  } catch {
    return { nafCodes: [], searchTerms: input.segmentKeywords.slice(0, 5) };
  }
}

// ---------- 2. Connector — real candidate pool ----------

interface PoolCompany {
  siren: string;
  name: string;
  naf: string | null;
  city: string | null;
  category: string | null;
  dirigeants: { role: string | null; name: string | null }[];
  source: string;
}
interface PoolTender {
  title: string;
  buyer: string | null;
  awardee: string | null;
  source: string;
}

export interface FrPool {
  companies: PoolCompany[];
  tenders: PoolTender[];
}

export async function gatherFrPool(query: FrQuery, fetcher?: typeof fetch): Promise<FrPool> {
  const fr = createFrConnector(fetcher ? { fetcher } : {});

  // Companies: by sector (NAF) + by keyword, merged and deduped on SIREN.
  const refLists = await Promise.all([
    ...query.nafCodes.slice(0, 2).map((naf) => fr.listBySector(naf, { perPage: 8 }).catch(() => [] as CompanyRef[])),
    ...query.searchTerms.slice(0, 2).map((q) => fr.searchCompanies({ q, perPage: 6 }).catch(() => [] as CompanyRef[])),
  ]);
  const bySiren = new Map<string, CompanyRef>();
  for (const list of refLists) for (const c of list) if (!bySiren.has(c.siren)) bySiren.set(c.siren, c);
  // Prefer active companies; cap the pool.
  const refs = [...bySiren.values()].filter((c) => c.status !== 'C').slice(0, 16);

  // Dirigeants for the top slice (bounded — getCompany is one call each).
  const profiles = await Promise.all(
    refs.slice(0, 8).map((c) => fr.getCompany(c.siren).catch(() => null as CompanyProfile | null)),
  );
  const profileBySiren = new Map<string, CompanyProfile>();
  for (const p of profiles) if (p) profileBySiren.set(p.siren, p);

  const companies: PoolCompany[] = refs.map((c) => {
    const p = profileBySiren.get(c.siren);
    return {
      siren: c.siren,
      name: c.name,
      naf: c.naf,
      city: c.city,
      category: c.category,
      dirigeants: (p?.dirigeants ?? [])
        .filter((d) => d.name)
        .slice(0, 3)
        .map((d) => ({ role: d.role, name: d.name })),
      source: c.source.url,
    };
  });

  // Tenders: one keyword sweep — buyers (potential targets) + awardees.
  const tenderRows = await searchFrTenders({
    q: query.searchTerms[0] ?? query.nafCodes[0] ?? 'usinage',
    limit: 6,
    ...(fetcher ? { fetcher } : {}),
  }).catch(() => []);
  const tenders: PoolTender[] = tenderRows.map((t) => ({
    title: t.title,
    buyer: t.buyer,
    awardee: t.awardee,
    source: t.source.url,
  }));

  return { companies, tenders };
}

// ---------- 3. Sonnet — rank the real pool ----------

const INTENT_VERB: Record<string, string> = {
  replicate: 'REPLIKOVAT',
  expand: 'ROZŠÍŘIT',
  scout: 'PROZKOUMAT',
  defend: 'OBHÁJIT',
  acquire: 'AKVIROVAT',
};

export function buildFrSystemPrompt(input: FrResearchInput): string {
  const crit = input.rubric.map((c) => `- ${c.text} (váha: ${c.weight})`).join('\n');
  const verb = INTENT_VERB[input.intent] ?? 'REPLIKOVAT';
  return `Jsi analytik exportní intelligence pro českou firmu ${input.clientName}. Záměr: ${verb} go-to-market ve Francii (FR). Dostaneš SEZNAM REÁLNÝCH francouzských firem a tendrů z veřejných rejstříků. Tvým úkolem je je ZAŘADIT proti kritériím — NE vymýšlet nové.

KRITÉRIA RELEVANCE (aplikuj přísně):
${crit || '- (použij obecný úsudek o relevanci pro daný záměr)'}

PRAVIDLA VÝSTUPU (striktní):
1. Odpověz POUZE validním JSON polem, bez úvodu a bez markdown.
2. Vybírej VÝHRADNĚ z dodaného seznamu. NEPŘIDÁVEJ firmy, které v seznamu nejsou.
3. Pole "source" a "name" vrať PŘESNĚ tak, jak jsou v seznamu (source je URL do rejstříku).
4. Každý objekt: {"name": "...", "source": "<URL ze seznamu>", "role": "target|competitor|partner", "priority": "high|medium", "note": "1 česká věta proč je relevantní vůči kritériím", "decisionMaker": "ROLE · Jméno z dirigeants v seznamu, nebo prázdné — jména NEVYMÝŠLEJ", "worksWithNames": ["konkurent z mapy, je-li vazba"]}
5. role: target = potenciální odběratel; competitor = konkurent; partner = kanál/svaz/tendr.
6. Vrať max 6 nejrelevantnějších. Vše česky. Žádné duplikáty.`;
}

export function buildFrUserPrompt(input: FrResearchInput, pool: FrPool): string {
  const companies = pool.companies
    .map(
      (c) =>
        `- ${c.name} [SIREN ${c.siren}; NAF ${c.naf ?? '—'}; ${c.category ?? '—'}; ${c.city ?? '—'}] dirigeants: ${
          c.dirigeants.map((d) => `${d.role ?? '?'}·${d.name}`).join(' | ') || '—'
        } | source: ${c.source}`,
    )
    .join('\n');
  const tenders = pool.tenders
    .map((t) => `- TENDR « ${t.title.slice(0, 80)} » acheteur: ${t.buyer ?? '—'} titulaire: ${t.awardee ?? '—'} | source: ${t.source}`)
    .join('\n');
  const known = input.existingNames.length ? `\n\nJiž v mapě (nevracej): ${input.existingNames.join(', ')}.` : '';
  return `ÚKOL (research move): ${input.task}

REÁLNÉ FIRMY:
${companies || '(žádné)'}

REÁLNÉ TENDRY:
${tenders || '(žádné)'}${known}`;
}

// ---------- 4. Guardrails (FR) ----------

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/**
 * FR normalize — keeps registry-sourced person names (the FR exception),
 * trusts a connector source URL as a hard source (verify=false), flags
 * anything without one as OVĚŘIT, and dedups against the existing map.
 */
export function normalizeFrCandidates(raw: unknown[], existingNames: string[]): FrCandidate[] {
  const existing = new Set(existingNames.map((n) => n.toLowerCase()));
  const seen = new Set<string>();
  const out: FrCandidate[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const name = String(c.name ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (existing.has(key) || seen.has(key)) continue;
    seen.add(key);

    const roleRaw = String(c.role ?? '').trim();
    const role: CandidateRole = (['competitor', 'target', 'partner'] as const).includes(roleRaw as CandidateRole)
      ? (roleRaw as CandidateRole)
      : 'target';

    const prioRaw = String(c.priority ?? '').toLowerCase();
    const priority: FrCandidate['priority'] = prioRaw === 'high' ? 'high' : prioRaw === 'medium' ? 'medium' : null;

    const source = String(c.source ?? '').trim();
    const sourced = isHttpUrl(source);
    const verify = !sourced; // real connector URL ⇒ confirmed; otherwise OVĚŘIT

    const worksWithNames = Array.isArray(c.worksWithNames)
      ? c.worksWithNames.map((n) => String(n ?? '').trim()).filter(Boolean)
      : [];

    out.push({
      name,
      role,
      city: String(c.city ?? '').trim() || '—',
      note: String(c.note ?? '').trim(),
      // Name is allowed only because it comes from the public FR registry
      // (the model is instructed to copy from `dirigeants`, never invent).
      decisionMaker: String(c.decisionMaker ?? '').trim(),
      source: sourced ? source : 'OVĚŘIT',
      confidence: sourced ? 'high' : 'low',
      worksWithNames,
      verify,
      priority,
      siren: null,
    });
    if (out.length >= 6) break;
  }
  return out;
}

// ---------- Orchestrator ----------

export interface FrResearchOutput {
  candidates: FrCandidate[];
  poolSize: { companies: number; tenders: number };
  query: FrQuery;
  system: string;
  user: string;
}

/**
 * Build the FR research request (query + pool + prompts) without calling
 * Sonnet — the route wraps the Sonnet call in cachedLlmCall for caching +
 * audit, then passes the raw text to `finishFrResearch`.
 */
export async function prepareFrResearch(
  input: FrResearchInput,
  fetcher?: typeof fetch,
): Promise<{ pool: FrPool; query: FrQuery; system: string; user: string }> {
  const query = await deriveFrQuery(input);
  const pool = await gatherFrPool(query, fetcher);
  const system = buildFrSystemPrompt(input);
  const user = buildFrUserPrompt(input, pool);
  return { pool, query, system, user };
}

export function finishFrResearch(rawText: string, existingNames: string[]): FrCandidate[] {
  return normalizeFrCandidates(parseCandidates(rawText), existingNames);
}

export { RESEARCH_MODEL };
