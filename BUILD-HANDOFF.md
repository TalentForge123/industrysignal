# IndustrySignal — BUILD HANDOFF (ship brief pro Claude Code)

> **Účel tohoto dokumentu:** Postavit z prototypu v `ui_kits/portal/` **funkční produkt, se kterým Lukáš dělá reporty a onboarduje klienty.** Cíl: prvních ~15 platících klientů, pak škálovat na junior-operated provoz.
>
> Tohle je **aktuální, zúžený** build brief. Velký `HANDOFF.md` (2 800+ řádků) je referenční hloubka — architektura, data sources, scrapery, Mission Engine vize. **Pro MVP stavbu se řiď tímto dokumentem**; do `HANDOFF.md` choď jen pro detail označený odkazem (např. „viz §22 SRSC", „viz §2.5 Data Cooperative").

---

## 0. Co produkt JE (vykrystalizovaná definice)

IndustrySignal prodává **vztahové mapy pro export**. Klient (průmyslová firma expandující do zahraničí) dostane datovou mapu cílového trhu: **kdo s kým obchoduje**, kdo hledá partnera, kde je stávající dodavatel slabý — pro decision-makery, ne jako seznam kontaktů.

**Tři věci, které drží celou hodnotu (a musí být v produktu cítit):**
1. **Složené, ne fragmenty** — spojujeme zdroje, co si klient dnes skládá ručně (D&B, Kompass, leady, logistika).
2. **Vztahy, ne firmy** — hrany „kdo s kým", ne řádky v tabulce.
3. **Celý rok, ne jednorázově** — mapa je živá, kvartálně aktualizovaná → recurring revenue.

**Provozní model (důležité pro architekturu):**
- **Operátor staví, klient čte.** MVP je interní nástroj pro Lukáše + juniory. Klient dostane **doručený report** (PDF / sdílený read-only link), ne přístup do kuchyně. ("Hold the reins" — viz `HANDOFF.md` §10, cally s Davidem.)
- **Brain-in-the-loop.** AI a importy jen *navrhují*; operátor accept/reject. Žádný automatický merge.
- **Source-or-nothing.** Každá entita/vazba má dohledatelný zdroj. Co je odhad → flag `OVĚŘIT`. Tohle je USP, vynucuj ho v DB i v UI.

---

## 1. Vizuální source of truth — UŽ EXISTUJE

**Neřeš design od nuly.** Funkční HiFi prototyp celého jádra je v repu a je schválený:

| Soubor | Co je |
|---|---|
| `ui_kits/portal/mission.html` | **Mission detail** — kompletní operátorská obrazovka. Toto je hlavní vzor. |
| `ui_kits/portal/MissionView.jsx` | Shell: brief bar, statistiky, layout, deliverable (klientský export + tisk/PDF) |
| `ui_kits/portal/MissionGraph.jsx` | Vztahová mapa „kdo s kým" (radiální SVG, hover/klik zvýrazní vazby) |
| `ui_kits/portal/MissionResearch.jsx` | **AI rešerše** — schema-driven Claude call, source-or-nothing, accept/reject |
| `ui_kits/portal/MissionIntake.jsx` | **Data klienta** — CSV upload → column mapping → candidate review → merge (Tier A) |
| `ui_kits/portal/MissionData.js` | Seed (M2C → DE): brief, rubrika relevance, hráči, příležitosti — kanonický tvar dat |
| `colors_and_type.css` | Všechny tokeny (editorial theme = cream/ink/amber). **Zdroj pravdy pro styl.** |
| `ui_kits/portal/primitives.jsx` | Button, Pill, Tile, Icon, MonoLabel, Card, Input — překlop do React komponent |
| `ui_kits/portal/index.html` + ostatní views | Report / Archiv / Watch List / Alerty — sekundární, pro v2 |

**Tvůj úkol:** převést tenhle CDN-React-bez-buildu prototyp na **persistovaný, multi-tenant Next.js app** se stejným vizuálem a flow. Komponenty a copy přebírej 1:1.

---

## 2. Tech stack (potvrzeno — detail v `HANDOFF.md` §2)

- **Next.js 14 (App Router) + React + TypeScript**
- **Postgres** (Neon / Supabase) + **Drizzle ORM**
- **Auth.js (NextAuth)** + magic-link Email provider přes **Postmark**
- **Cloudflare R2** (uploady, PDF)
- **PDF**: Playwright server-side (stejné stylesheety → identický výstup jako `Deliverable` v prototypu)
- **LLM**: Anthropic Claude — **Haiku** pro column-mapping + extrakce, **Sonnet** pro rešerši/syntézu
- **Hosting**: Vercel (app) + Neon (DB) + malý VPS pro Playwright/joby
- **pnpm workspaces + Turborepo**

---

## 3. Datový model (MVP — postav přesně tohle)

Kanonický tvar entity/edge vychází z `MissionData.js`. Minimální schéma pro shippable produkt:

```sql
-- tenanti + lidé
CREATE TABLE organization (
  id UUID PRIMARY KEY, name TEXT NOT NULL, kind TEXT DEFAULT 'operator', -- 'operator' | 'client'
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE users (
  id UUID PRIMARY KEY, org_id UUID REFERENCES organization(id),
  email TEXT UNIQUE NOT NULL, name TEXT,
  role TEXT NOT NULL DEFAULT 'analyst', -- 'admin' | 'analyst' | 'viewer'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- mise = jedna vztahová mapa pro klienta
CREATE TABLE missions (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,            -- 'MSN-2026-014'
  client_org_id UUID REFERENCES organization(id),
  owner_user_id UUID REFERENCES users(id),
  client_name TEXT, client_legal TEXT, client_sector TEXT, client_nace TEXT,
  intent TEXT NOT NULL,                 -- 'replicate'|'expand'|'scout'|'defend'|'acquire'
  source_market TEXT, target_market TEXT,
  segment_nace TEXT, segment_keywords TEXT[],
  ask TEXT,                             -- zadání klienta vlastními slovy
  deadline DATE,
  status TEXT DEFAULT 'active',         -- 'draft'|'active'|'delivered'|'monitoring'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- rubrika relevance (Lukášův "mozek" jako data, ne kód) — jde do AI promptu
CREATE TABLE mission_rubric (
  id UUID PRIMARY KEY, mission_id UUID REFERENCES missions(id),
  text TEXT NOT NULL, weight TEXT NOT NULL  -- 'vysoká'|'střední'|'nízká'
);

-- hráči na mapě
CREATE TABLE entities (
  id UUID PRIMARY KEY, mission_id UUID REFERENCES missions(id),
  name TEXT NOT NULL, role TEXT NOT NULL,   -- 'client'|'competitor'|'target'|'partner'
  city TEXT, note TEXT, decision_maker TEXT,
  source TEXT,                              -- původ; 'OVĚŘIT' = odhad
  verify BOOLEAN DEFAULT false,             -- čeká na potvrzení zdroje
  origin TEXT DEFAULT 'manual',             -- 'manual'|'ai'|'client_upload'|'db_seed'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- hrany "kdo s kým"
CREATE TABLE entity_links (
  id UUID PRIMARY KEY, mission_id UUID REFERENCES missions(id),
  from_entity UUID REFERENCES entities(id),
  to_entity UUID REFERENCES entities(id),
  kind TEXT DEFAULT 'serves'                -- 'serves'|'replicate'|'channel'|'supplier'
);

-- příležitosti / gap analysis
CREATE TABLE opportunities (
  id UUID PRIMARY KEY, mission_id UUID REFERENCES missions(id),
  tag TEXT, title TEXT, body TEXT, tone TEXT  -- 'up'|'info'|'warn'|'down'
);
```

Client Data Intake (`mission_data_uploads`, `column_mapping_templates`, `entity_candidates`) + Cooperative (Tier B) = **viz `HANDOFF.md` §23**. Pro MVP stačí intake do `entity_candidates` → po accept do `entities`.

---

## 4. Build sekvence (k shippable produktu)

### Sprint A — Skeleton + Auth + Mission CRUD
- Monorepo, Next.js, Drizzle, Postgres, deploy na Vercel + Neon.
- Auth.js magic-link přes Postmark. Operátor org + Lukáš jako admin. Seed účet pro juniora.
- **Mission wizard** (5 polí brief, §13 v `HANDOFF.md`) → vytvoří `missions` + `mission_rubric`.
- **Mission list** (dashboard): aktivní mise, stav, deadline.

### Sprint B — Mission detail (jádro, = prototyp)
- Překlop `MissionView/Graph/Research/Intake` na persistované React komponenty.
- CRUD nad `entities` / `entity_links` / `opportunities` (server actions).
- Vztahová mapa čte z DB, editace přes detail panel ukládá.
- **Statistiky + `OVĚŘIT` counter** jako v prototypu.

### Sprint C — AI rešerše (server-side Claude)
- Přesun `window.claude.complete` logiky na **server route** s API klíčem (Sonnet).
- Prompt builder = `MissionResearch.jsx` `buildPrompt()` (rubrika + intent + úkol).
- **Striktní JSON parsing + guardraily** (žádná jména osob, source povinný, low-confidence → `verify=true`).
- Návrhy do `entity_candidates`; accept → `entities` + auto-link na konkurenta dle worksWith.
- **Prompty ulož do DB tabulky `prompts` (verzované), edituj bez deploye** — viz `HANDOFF.md` §18.

### Sprint D — Client Data Intake (Tier A) — viz §23
- CSV/XLSX upload → R2 (encrypted).
- **Column mapping**: heuristika (`MissionIntake.jsx` `autoMap()`) + LLM návrh (Haiku) → operátor potvrdí → ulož jako `column_mapping_templates` (reuse per klient = 0-touch další upload).
- Sloupec „stávající dodavatel" → auto-link na konkurenta v mapě (logika už v prototypu).
- Candidate review → merge. **Default Tier A (private).** Tier B opt-in až později (§2.5).

### Sprint E — Deliverable + monitoring
- **PDF export** (Playwright) z `Deliverable` komponenty → R2 → stáhnutelný link.
- **Klientský read-only share link** (token, expirovatelný) — klient vidí mapu, ne editaci.
- **Kvartální refresh job** (Inngest/cron): re-run rešerše na živé mise, diff → flag změn. (Plné alerty = `HANDOFF.md` §7.)

---

## 5. Co předat Claude Code spolu s tímto dokumentem

1. ✅ Zip celého projektu (`ui_kits/portal/*`, `colors_and_type.css`, `assets/*`, `README.md`, `CLAUDE.md`, `BUILD-HANDOFF.md`, `HANDOFF.md`)
2. ✅ **1–2 reálné sample CSV** od klienta (M2C / TOS export zákazníků) jako fixture pro column-mapping testy
3. ✅ Anthropic API klíč (env), Postmark token, Neon connection string, R2 credentials
4. ⬜ Rozhodnutí: PDF/free-text intake hned, nebo jen CSV/XLSX v MVP? **Doporučení: CSV/XLSX první.**
5. ⬜ Rozhodnutí: kdy zapnout self-service klientský upload + Tier B pool? **Doporučení: až po 3. spokojeném Tier A klientovi.**

---

## 6. Pravidla, která NESMÍ vypadnout (jinak ztratíme USP / brand)

- **Source-or-nothing** — `entities.source` povinný; bez tvrdého zdroje `verify=true` + UI flag `OVĚŘIT`. Nikdy nezobrazit nepodložené tvrzení jako fakt.
- **Žádná generovaná jména osob** — `decision_maker` = role/oddělení (např. „Leiter Facility Management"), ne smyšlené jméno. Guardrail v promptu i validaci.
- **Brain-in-the-loop** — AI/import jen navrhuje, operátor potvrzuje. Žádný auto-merge do `entities`.
- **Editorial DNA** — cream/ink/amber, serif headlines, mono labely, hairlines, žádné stíny/rounded>2px, **žádné emoji**. `colors_and_type.css` je zdroj pravdy. (Viz `CLAUDE.md`.)
- **Čeština primárně**, EN sekundárně. Nové texty přes i18n (vzor `ui_kits/portal/i18n.js`).
- **Klient nevidí kuchyni** — operátorské UI a klientský deliverable jsou oddělené povrchy.

---

## 7. Mimo MVP (až po prvních klientech — neřeš teď)

Referenčně v `HANDOFF.md`, ale **nestav v MVP**:
- Mission Engine plná automatizace, Country Connectors (§13–14)
- Relationship Graph Engine + vanity scrapery + entity resolver L1–L4 (§15–15.9)
- SRSC / Target Buyer Intelligence Matrix (§22) — silný v2 modul, ale ne ship blocker
- Data Cooperative Tier B pool + redaction pipeline (§2.5, §23 Sprint 8+)
- Billing/seats automatizace (§6) — prvních 15 klientů fakturuj ručně

**Princip:** revenue → konsensus → automatizace. Postav nejmenší věc, se kterou Lukáš dělá placené reporty, a iteruj podle reálných misí.
