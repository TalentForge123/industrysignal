// Mission AI research — prompt builder + strict output parsing/guardrails.
//
// Ported from the prototype's MissionResearch.jsx `buildPrompt()` +
// `parseCandidates()`, split so the stable part (client brief + rubric +
// output rules) is a cacheable system prompt and the per-call task is the
// user turn. Pure functions — no React, no SDK — so the research route and
// future tests can share them.
//
// Guardrails (BUILD-HANDOFF §6, Sprint C):
//   - source-or-nothing: missing/estimated source ⇒ verify=true (OVĚŘIT)
//   - no fabricated person names: decisionMaker is a role/department; the
//     prompt enforces it and we strip anything that reads like a full name
//   - low confidence ⇒ verify=true
//   - dedup against entities already on the map

export interface ResearchBrief {
  clientName: string;
  clientLegal: string | null;
  clientSector: string | null;
  clientNace: string | null;
  clientProducts: string[];
  targetMarket: string | null;
  intent: string;
}

export interface ResearchRubricItem {
  text: string;
  weight: string;
}

export type CandidateRole = 'competitor' | 'target' | 'partner';

export interface ResearchCandidate {
  name: string;
  role: CandidateRole;
  city: string;
  note: string;
  decisionMaker: string;
  source: string;
  confidence: 'high' | 'med' | 'low';
  worksWithNames: string[];
  verify: boolean;
}

const INTENT_VERB: Record<string, string> = {
  replicate: 'REPLIKOVAT',
  expand: 'ROZŠÍŘIT',
  scout: 'PROZKOUMAT',
  defend: 'OBHÁJIT',
  acquire: 'AKVIROVAT',
};

export function buildSystemPrompt(brief: ResearchBrief, rubric: ResearchRubricItem[]): string {
  const crit = rubric.map((c) => `- ${c.text} (váha: ${c.weight})`).join('\n');
  const prod = brief.clientProducts.join(', ') || '—';
  const verb = INTENT_VERB[brief.intent] ?? 'REPLIKOVAT';
  const market = brief.targetMarket ?? 'cílovém';
  return `Jsi analytik exportní intelligence. Pracuješ pro českou firmu ${brief.clientName} (${brief.clientLegal ?? brief.clientName}), obor: ${brief.clientSector ?? '—'} (NACE ${brief.clientNace ?? '—'}, služby: ${prod}). Záměr: ${verb} jejich český go-to-market na ${market} trhu.

KRITÉRIA RELEVANCE (aplikuj přísně):
${crit || '- (žádná kritéria zadána — použij obecný úsudek o relevanci pro daný záměr)'}

PRAVIDLA VÝSTUPU (striktní):
1. Odpověz POUZE validním JSON polem. Žádný úvod, žádný komentář, žádné markdown fences.
2. Vše česky.
3. Každý objekt: {"name": "...", "role": "competitor|target|partner", "city": "...", "note": "1 věta proč je relevantní vůči kritériím", "decisionMaker": "ROLE/oddělení, NE smyšlené jméno osoby (např. 'Leiter Facility Management')", "source": "typ veřejného zdroje kde to lze ověřit (Handelsregister, web firmy, oborový svaz, tisk) — pokud jde o odhad z trhu bez tvrdého zdroje, napiš přesně OVĚŘIT", "confidence": "high|med|low", "worksWithNames": ["jméno konkurenta z mapy, pokud relevantní"]}
4. NIKDY si nevymýšlej konkrétní jména lidí ani čísla. Když nevíš, dej confidence "low" a source "OVĚŘIT".
5. Max 5 položek. Žádné duplikáty s tím, co už je v mapě.`;
}

export function buildUserPrompt(task: string, existingNames: string[]): string {
  const known = existingNames.length ? `\n\nJiž v mapě (nevracej duplikáty): ${existingNames.join(', ')}.` : '';
  return `ÚKOL: ${task}${known}`;
}

/** Tolerant JSON-array extraction — strips fences and slices to the array. */
export function parseCandidates(raw: string): unknown[] {
  let s = String(raw ?? '').trim();
  s = s
    .replace(/^```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    const arr: unknown = JSON.parse(s);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Heuristic: a decisionMaker that looks like a personal name (two
// Capitalized words, no role keyword) is dropped — the guardrail against
// fabricated people. Role/department strings (often containing a lowercase
// connective or a known role word) are kept.
const ROLE_KEYWORDS =
  /(leiter|leitung|head|manager|ředitel|vedoucí|oddělení|department|facility|einkauf|procurement|management|director|chief|board|vorstand|geschäftsführ)/i;

function sanitizeDecisionMaker(raw: unknown): string {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  if (ROLE_KEYWORDS.test(v)) return v;
  // Looks like "Firstname Lastname" (1–3 capitalized words, nothing else)? Drop it.
  if (/^(\p{Lu}\p{Ll}+)(\s+\p{Lu}\p{Ll}+){1,2}$/u.test(v)) return '';
  return v;
}

/**
 * Apply guardrails + dedup. Returns map-ready candidates: role normalized,
 * verify computed (low confidence or estimated source ⇒ true),
 * decisionMaker sanitized, duplicates of existing names removed.
 */
export function normalizeCandidates(
  raw: unknown[],
  existingNames: string[],
): ResearchCandidate[] {
  const existing = new Set(existingNames.map((n) => n.toLowerCase()));
  const out: ResearchCandidate[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const name = String(c.name ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (existing.has(key) || seen.has(key)) continue;
    seen.add(key);

    const roleRaw = String(c.role ?? '').trim();
    const role: CandidateRole = (['competitor', 'target', 'partner'] as const).includes(
      roleRaw as CandidateRole,
    )
      ? (roleRaw as CandidateRole)
      : 'target';

    const confRaw = String(c.confidence ?? '').toLowerCase();
    const confidence: ResearchCandidate['confidence'] =
      confRaw === 'high' ? 'high' : confRaw === 'med' ? 'med' : 'low';

    const source = String(c.source ?? '').trim() || 'OVĚŘIT';
    const verify = confidence !== 'high' || /ověřit/i.test(source);

    const worksWithNames = Array.isArray(c.worksWithNames)
      ? c.worksWithNames.map((n) => String(n ?? '').trim()).filter(Boolean)
      : [];

    out.push({
      name,
      role,
      city: String(c.city ?? '').trim() || '—',
      note: String(c.note ?? '').trim(),
      decisionMaker: sanitizeDecisionMaker(c.decisionMaker),
      source,
      confidence,
      worksWithNames,
      verify,
    });

    if (out.length >= 5) break; // hard cap mirrors the prompt rule
  }
  return out;
}
