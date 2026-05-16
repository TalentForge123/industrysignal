# IndustrySignal — Handoff brief pro Claude Code

> **Cíl handoffu:** Vzít existující design system + UI prototyp v tomto repu a postavit z toho **plně funkční SaaS portál** s reálnými daty, autentikací, alerty a fakturací. Tento dokument popisuje co, odkud, jak a v jakém pořadí.

---

## 0. Co už máš v repu (výchozí stav)

```
.
├── README.md                  # design system manifest
├── CLAUDE.md                  # projektová pravidla (jazyk, tón, vizuál)
├── colors_and_type.css        # všechny CSS tokeny (graphite + editorial theme)
├── assets/                    # logo placeholders
├── preview/                   # design system review karty (~17 HTML souborů)
└── ui_kits/portal/            # hotový HiFi prototyp portálu (React + Babel inline)
    ├── index.html             # vstupní bod, přihlášení libovolným heslem
    ├── App.jsx, TopBar.jsx, Sidebar.jsx, LoginView.jsx
    ├── ReportView.jsx, ArchiveView.jsx, WatchListView.jsx, AlertsView.jsx
    ├── SupplierRiskView.jsx, ExportMapView.jsx
    ├── primitives.jsx         # Button, Pill, Tile, Icon, atd.
    ├── data.js                # **MOCK** bilingvální data
    └── i18n.js                # CS/EN slovník
```

Prototyp je **React přes CDN bez build kroku**. Pro produkci to přepiš na řádný stack (níže). Designové DNA (tokeny, komponenty, typografie, copy guidelines) **zachovej beze změny** — je to schválené.

---

## 1. Cílový produkt — definice "funkčního portálu"

**MVP scope (čeho musí umět dosáhnout v6 týdnech):**

| Modul | Co dělá | Datový vstup |
|---|---|---|
| **Auth** | Magic-link přihlášení, předplatitelské seats, role (analytik/manažer/admin) | vlastní DB |
| **Aktuální report** | Q-čtvrtletní editorial report, 5 sekcí (Makro, Segmenty, Rizika, Firmy, Outlook) | ČSÚ + ČNB + ERÚ + GDELT + tisk (RSS) + LLM synthesis |
| **Archiv** | Stažitelné PDF historických reportů | S3/R2 |
| **Watch List** | Klient si přidá firmy/segmenty/regiony; daily snapshot | ARES + Magnusweb + Justice.cz |
| **Alerty** | Push notifikace (email + in-app) na změny ve Watch Listu | diff engine + Postmark |
| **SRSC (Supplier Risk Score)** | Skórování dodavatelů 0–100 | ARES + insolvenční rejstřík + finanční výkazy + collective intelligence |
| **Export Map** | Export tepelná mapa CZ→EU dle HS kódů | Celní správa + Eurostat Comext |

**Non-functional požadavky:**
- Český jazyk primárně, EN sekundárně (i18n už implementován)
- WCAG AA kontrast (editorial téma už ho splňuje)
- Mobile responsive na úrovni read-only (psaní/editace jen desktop)
- GDPR compliance — data klientů v EU, právo zapomenutí
- 99.5% uptime stačí (B2B, ne kritická infra)
- Page load < 2s na P75

---

## 2. Doporučený tech stack

| Vrstva | Doporučení | Alternativa | Proč |
|---|---|---|---|
| **Frontend** | **Next.js 14 (App Router) + React** | Astro + React islands | SSR pro SEO + email reportů, server actions pro forms, edge runtime |
| **Styling** | **CSS Variables (už máš) + Tailwind utilities** | styled-components | Tokeny v `colors_and_type.css` musí zůstat zdrojem pravdy |
| **DB** | **Postgres (Neon nebo Supabase)** | PlanetScale | Strukturovaná data, foreign keys, fulltext pro vyhledávání firem |
| **ORM** | **Drizzle** | Prisma | Lehčí, čitelnější migrace |
| **Auth** | **Auth.js (NextAuth) + magic-link Email provider** | Clerk (€) | Vlastní emaily přes Postmark, plná kontrola, GDPR-friendly |
| **Email** | **Postmark** (transactional) + **Buttondown** (newsletter) | SendGrid | Postmark má skvělou doručitelnost pro CZ domény |
| **Background jobs** | **Inngest** nebo **Trigger.dev** | BullMQ + Redis | Cron + retries + observability bez vlastní infra |
| **Storage** | **Cloudflare R2** | AWS S3 | Bez egress fee, kompatibilní s S3 SDK |
| **PDF gen** | **Playwright** (server-side) | react-pdf | Stejný HTML → identický PDF, používá tvoje stylesheety |
| **LLM** | **Anthropic Claude** (Haiku 4.5 pro extrakce, Sonnet 4.5 pro syntézu) | OpenAI | Lepší česky, držíš se v rodině |
| **Search** | **Meilisearch** (self-hosted) nebo **Typesense Cloud** | Algolia | Levné, česká diakritika out-of-the-box |
| **Monitoring** | **Sentry** + **Vercel Analytics** | Datadog | Stačí pro MVP |
| **Hosting** | **Vercel** (frontend) + **Neon** (DB) + **Hetzner VPS** (scrapers + Playwright) | Cloudflare Pages | Hybrid: serverless tam kde dává smysl, VPS pro dlouhotrvající joby |

**Repo struktura, kterou Claude Code postaví:**
```
industrysignal/
├── apps/
│   ├── portal/              # Next.js — klientský portál (přebírá ui_kits/portal/)
│   ├── studio/              # Next.js — editorial CMS pro vás (psaní reportů)
│   └── workers/             # Node — scrapers, alert diff engine, PDF gen
├── packages/
│   ├── db/                  # Drizzle schema + migrace
│   ├── ui/                  # sdílené komponenty (Button, Pill, Tile…)
│   ├── tokens/              # CSS tokeny (současný colors_and_type.css)
│   ├── i18n/                # překlady
│   └── enrichment/          # LLM pipelines, per-market analyzery
├── data-sources/            # connector per zdroj (ČSÚ, ČNB, ARES…)
└── docs/                    # tento HANDOFF.md + decision log
```

Použít **pnpm workspaces** + **Turborepo**.

---

## 3. Data sources — odkud brát a jak

Tabulka per zdroj. Sloupce: **Cena**, **Forma přístupu**, **Frekvence aktualizace**, **Co z toho čerpat**.

### 3.1 Makroekonomika (volání pro úvod reportu, KPI strip nahoře)

| Zdroj | Cena | Přístup | Frekvence | Použít na |
|---|---|---|---|---|
| **ČSÚ — Otevřená data** (apl.czso.cz/iSMS) | zdarma | REST API + CSV | měsíčně | HDP Q/Q, PMI, inflace CPI, průmyslová produkce, mzdy |
| **ČNB ARAD** (arad.cnb.cz) | zdarma | REST API (JSON/XML) | denně | EUR/CZK, repo sazba, inflační očekávání |
| **Eurostat** (ec.europa.eu/eurostat/api) | zdarma | REST API (SDMX) | měsíčně | Srovnání CZ vs EU, PMI eurozóny, indust. produkce |
| **OECD** | zdarma | REST API | čtvrtletně | Composite Leading Indicators |

### 3.2 Firemní data (Watch List, SRSC)

| Zdroj | Cena | Přístup | Frekvence | Použít na |
|---|---|---|---|---|
| **ARES** (wwwinfo.mfcr.cz/ares) | zdarma | REST API (XML/JSON) | denně | IČO, sídlo, předmět činnosti, statutáři, NACE |
| **Veřejný rejstřík (justice.cz)** | zdarma | scrape (Playwright) | denně | Účetní závěrky (sbírka listin), změny ve statutárech, insolvence |
| **Insolvenční rejstřík (isir.justice.cz)** | zdarma | REST API + RSS | denně | **KRITICKÉ** pro SRSC — insolvenční návrhy, prohlášení úpadku |
| **Magnusweb / Bisnode** | €€€ (od ~50k Kč/rok) | REST API | denně | Skóre platební morálky, propojení vlastníků (UBO), credit limity |
| **CRIBIS** (Creditreform) | €€ | REST API | denně | Alternativa k Bisnode, levnější, slabší UBO |
| **Cribis / Hlídač státu** (hlidacstatu.cz) | zdarma | REST API | denně | Veřejné zakázky, dotace, kontroly NKÚ |
| **Registr smluv** (smlouvy.gov.cz) | zdarma | REST API | denně | B2G expozice firem ve Watch Listu |

**Pro MVP:** vystačíš s ARES + Justice.cz + Insolvenční rejstřík (vše zdarma). Magnusweb přidat až s prvními zaplacenými klienty.

### 3.3 Energie a komodity (Makro + Energy segment)

| Zdroj | Cena | Přístup | Frekvence | Použít na |
|---|---|---|---|---|
| **OTE-CR** (ote-cr.cz) | zdarma | REST API + CSV | hodinově | Spotové ceny elektřiny CZ |
| **ENTSO-E Transparency** | zdarma | REST API (potřebuje token) | hodinově | Toky elektřiny EU, výroba dle zdroje |
| **ERÚ** (eru.cz) | zdarma | CSV / scrape | čtvrtletně | Regulované ceny, distribuční tarify |
| **EEX, ICE Brent, TTF gas** | €€ (subscription) | REST API přes Refinitiv/CME | denně | Komoditní benchmarky pro hero strip |
| **EIA, IEA Open Data** | zdarma | REST API | týdně | Globální energetický kontext |

### 3.4 Zahraniční obchod (Export Map)

| Zdroj | Cena | Přístup | Frekvence | Použít na |
|---|---|---|---|---|
| **Celní správa — IS Statistika** (celnisprava.cz) | zdarma | CSV exports | měsíčně (zpoždění ~6 týdnů) | CZ export/import po HS kódech, zemích |
| **Eurostat Comext** | zdarma | REST API (SDMX) | měsíčně | EU-wide trade flows, zrcadlová data |
| **UN Comtrade** | zdarma (limit 100k/měs) | REST API | ročně | Globální fallback |
| **HS kódy číselník (CN8)** | zdarma | CSV | ročně | Klasifikace + mapování na produktové skupiny |

### 3.5 Automotive (samostatný segment kvůli důležitosti — Škoda, VW, atd.)

| Zdroj | Cena | Přístup | Frekvence | Použít na |
|---|---|---|---|---|
| **SDA — Svaz dovozců automobilů** (portal.sda-cia.cz) | zdarma (mezi-firemní data €) | scrape / CSV | měsíčně | Registrace nových vozidel CZ |
| **AutoSAP** (autosap.cz) | zdarma | scrape | měsíčně | Výroba vozidel CZ |
| **ACEA** (acea.auto) | zdarma | CSV | měsíčně | Evropské registrace |
| **VDA** (vda.de) | zdarma | scrape | měsíčně | Německý automotive — kritický spillover do CZ |

### 3.6 Doprava a logistika

| Zdroj | Cena | Přístup | Frekvence | Použít na |
|---|---|---|---|---|
| **SŽDC / Správa železnic** | zdarma | scrape / CSV | měsíčně | Železniční nákladní doprava |
| **ŘSD — sčítání dopravy** | zdarma | CSV (5leté cykly) | občas | Silniční intenzity |
| **Eurostat transport** | zdarma | REST API | čtvrtletně | EU srovnání |

### 3.7 News & sentiment

| Zdroj | Cena | Přístup | Frekvence | Použít na |
|---|---|---|---|---|
| **GDELT Project** (gdeltproject.org) | zdarma | REST API + BigQuery | každých 15 min | Globální news event database; CZ pokrytí solidní, multi-language |
| **Hospodářské noviny, E15, Lupa.cz, iHned** | zdarma | RSS + Playwright | hodinově | Hlavní byznys press; scrape RSS, full-text přes Playwright |
| **Industry trade press** (MM Průmyslové spektrum, TechMagazín, Energetika, Logistika.cz, StrojTech) | zdarma (vanity publishers) | scrape | týdně | Tier-3 — viz §15.5 níže pro pravidla použití |
| **EU Tenders Electronic Daily (TED)** | zdarma | REST API | denně | EU veřejné zakázky |
| **Hlídač státu — Twitter politiků** | zdarma | REST API | hodinově | Politický signál |

### 3.8 ESG (volitelně pro v2)

| Zdroj | Cena | Přístup | Frekvence | Použít na |
|---|---|---|---|---|
| **EU CSRD reports** | zdarma | scrape PDF | ročně | ESG metriky velkých firem |
| **CDP** (cdp.net) | zdarma omezeně | scrape | ročně | Emise CO2 |

---

## 4. Per-market enrichment — segmentové analytické pipeliny

Pro každý průmyslový segment běží **samostatný enrichment worker**, který spojuje data z víc zdrojů + LLM analýzu.

### Segmentace (vychází z NACE CZ + redakční volba)

1. **Energetika** (NACE D 35) → ČEZ, EPH, ENERGO-PRO + dodavatelé
2. **Automotive** (NACE C 29) → Škoda, Hyundai, TPCA + dodavatelská síť
3. **Strojírenství** (NACE C 28) → Vítkovice, Škoda Power, ZKL
4. **Hutnictví + metal** (NACE C 24, 25) → Liberty, Třinecké železárny, MORAVIA STEEL
5. **Chemie a petrochemie** (NACE C 19, 20) → ORLEN Unipetrol, Synthos, BorsodChem
6. **Doprava a logistika** (NACE H 49–53) → ČD Cargo, Metrans, DHL
7. **Stavebnictví + materiály** (NACE F + C 23) → Metrostav, Strabag, Cemex
8. **Potravinářství** (NACE C 10, 11) → Agrofert, Madeta
9. **Elektronika + IT outsourcing** (NACE C 26) → Foxconn, ABB

Každý segment má v `data-sources/` svůj **fetcher.ts** a v `packages/enrichment/` svůj **analyzer.ts**.

### Anatomie segment-analyzeru

```typescript
// packages/enrichment/automotive/analyzer.ts
async function analyzeAutomotive(quarter: Quarter): Promise<SegmentReport> {
  // 1. Sběr surových dat
  const macro      = await fetchCZSU('produkce-vozidel', quarter);
  const reg        = await fetchSDA('registrace', quarter);
  const acea       = await fetchACEA('eu-registrations', quarter);
  const vda        = await fetchVDA('production', quarter);
  const companies  = await fetchARES.bySector('29');
  const insolv     = await fetchISIR.bySector('29', quarter);
  const news       = await fetchCTK({ tags: ['automotive', 'skoda', 'vw'], quarter });

  // 2. Strukturovaná derivace metrik
  const metrics = {
    productionDelta:   delta(vda.cz, lastQuarter.cz),
    registrationsMix:  classifyByPowertrain(reg),
    insolvencyCount:   insolv.length,
    topMovers:         rankByExposure(companies, news),
  };

  // 3. LLM syntéza (Claude Sonnet) — výstup je editorial draft
  const draft = await claude.complete({
    system: AUTOMOTIVE_ANALYST_PROMPT, // viz níže
    messages: [
      { role: 'user', content: JSON.stringify({ metrics, news: news.slice(0,30) }) }
    ],
    maxTokens: 1500,
  });

  // 4. Lidský redakční review (přes Studio app) → publikace
  return { metrics, draft, sources: [...] };
}
```

### LLM prompty per segment

Pro každý segment definuj prompt v `packages/enrichment/<segment>/prompt.ts`. **Konvence:**

```
SYSTEM: Jsi senior průmyslový analytik IndustrySignal. Píšeš pro ředitele
strategie velkých českých průmyslových firem. Tón: analytický, věcný,
hedged kde to dává smysl. Vykání. Žádné marketingové fráze, žádný hype.
Jazyk: čeština. Max 250 slov v summary + 3 bullet pointy v key takeaways.
Každé tvrzení musí mít zdroj — uveď [Source #N] s odkazem na entry v `sources`.

USER: <strukturovaná data v JSON>
```

**DŮLEŽITÉ:** LLM nikdy negeneruje finální copy přímo do produkce — vždy ji procházi editor přes Studio app (lidský souhlas povinný). Tohle drží editorial standard.

### Cross-segment enrichment (vrstva nad)

- **Network signal** — když 3+ klienti sledují stejnou firmu, která jde do červené → SRSC bod
- **Supplier graph** — pomocí ARES propojit dodavatelské vztahy (z veřejných zakázek + insolvencí)
- **Geographical clustering** — okresní data ČSÚ pro Risk Map v Sidebaru

---

## 5. LLM pipeline detail

### Volání

- **Klasifikace, extrakce, parsování** → Claude Haiku 4.5 (levné, rychlé)
- **Editoriální syntéza** → Claude Sonnet 4.5 (kvalita důležitější)
- **Embeddings pro semantic search firem** → OpenAI text-embedding-3-small (zatím nejlevnější + dobrá kvalita)

### Caching

- Všechny LLM výstupy uložit do `llm_calls` tabulky s `cache_key = hash(model + prompt + temperature)`
- Re-používat pro deterministické úlohy (klasifikace zpráv)
- Editorial drafty cachovat per-quarter (nikdy se nebudou regenerovat)

### Kontrolní mechanismy

- **Citace povinné** — každý odstavec drafty má `[Source #N]` referenci; missing = reject
- **Hallucination check** — druhý LLM pass (Haiku) ověřuje, že každé číslo v textu je v zdrojových datech
- **Forbidden phrases regex** — žádné "revoluční", "průlomový", "musíte znát", emoji, vykřičníky

---

## 6. Auth, accounty, billing

### Auth
- **Magic-link email** (Postmark) — žádná hesla
- Sezení = JWT v httpOnly cookie, 14denní expirace
- **2FA volitelná** (TOTP přes authenticator app)
- Audit log všech přihlášení do `auth_events` tabulky

### Org / seats model
```
organization (ČEZ a.s.)
  ├── seats: 10 zakoupených, 7 aktivních
  ├── users (každý s rolí: admin | analyst | viewer)
  └── billing_plan: enterprise | growth | starter
```

### Billing
- **Stripe** (eu_vat support povinný — vystavování faktur s DIČ)
- Roční fakturace (B2B norm pro tento segment, ne měsíční)
- Plány: **Starter** (3 seats, ~30k Kč/rok), **Growth** (10 seats, ~80k Kč/rok), **Enterprise** (custom, ~250k+ Kč/rok s API přístupem)
- Faktury v CZK + EUR, **ISDOC formát pro velké klienty** (ČEZ, ŠKODA mají v procurementu povinnost)

---

## 7. Alerts engine

```
                ┌─────────────────┐
   sources ────▶│   diff worker   │── changes ──▶ alert_rules ──▶ matched alerts
                │  (Inngest cron) │                                       │
                └─────────────────┘                                       ▼
                                                              ┌──────────────────┐
                                                              │  delivery worker │
                                                              └──────────────────┘
                                                                       │
                                                       ┌───────────────┼────────────────┐
                                                       ▼               ▼                ▼
                                                  in-app feed      email (Postmark)   SMS (Twilio)
                                                                                       (jen "critical")
```

**Alert rules** (uživatelem konfigurovatelné):
- Watch List entita: jakákoli změna v ARES, insolvenční návrh, change in financial filing
- Segment: PMI drop > 2 b., HDP revize, regulatorní změna
- Custom keyword: news mentioning "Škoda" + "redukce produkce"

**Priority:**
- `critical` (insolvenční návrh na sledované firmě) → email + SMS okamžitě
- `high` (změna ve statutárech, velký news) → email do 1h
- `normal` (čtvrtletní výsledky) → email v denní digest

---

## 8. Sprint plán (6 týdnů na MVP)

### Týden 1 — Skeleton + Auth
- pnpm + Turborepo + Next.js skeleton
- Postgres schema (users, organizations, watchlists, alerts, reports, sources)
- Auth.js + Postmark magic links
- Portovat `ui_kits/portal/*.jsx` na řádné React komponenty v `apps/portal`
- Tokeny do `packages/tokens`

### Týden 2 — Data sources (free first)
- ČSÚ + ČNB connectors → ukládá do `macro_indicators` tabulky
- ARES connector → `companies` tabulka
- Insolvenční rejstřík → `insolvency_events`
- Inngest cron joby

### Týden 3 — Watch List + Alerts MVP
- CRUD pro watch listy
- Diff worker (běží denně, porovnává snapshoty firem)
- In-app alert feed + email delivery

### Týden 4 — Report engine + Studio app
- Editorial CMS pro psaní reportů (`apps/studio`)
- 5 sekcí, draft → review → publish workflow
- LLM enrichment pipeline pro 2 segmenty (Energetika, Automotive)
- PDF export přes Playwright

### Týden 5 — SRSC + Export Map
- SRSC skórovací logika (finanční zdraví + insolvence + collective intel)
- Celní statistika import + Export Map vizualizace

### Týden 6 — Billing + production polish
- Stripe integrace, faktury
- Sentry, analytics, load testing
- Security audit (OWASP top 10 minimum)
- Deploy + první klient onboarding

---

## 9. Hosting, servery, ops

### Doporučená infra (€-friendly, scales to €1M ARR bez přestaveb)

```
┌──────────────────────────────────────────────────────┐
│                    Vercel                            │
│  apps/portal  (Next.js)  apps/studio  (Next.js)      │
└─────────────────────┬────────────────────────────────┘
                      │ HTTPS
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
   ┌────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐
   │  Neon  │   │ Inngest  │   │ Hetzner │   │   R2     │
   │ (PG)   │   │ (jobs)   │   │ VPS     │   │ (PDFs)   │
   │ €19/mo │   │ €20/mo   │   │ €8/mo   │   │ €5/mo    │
   └────────┘   └──────────┘   └─────────┘   └──────────┘
                                    │
                                    ▼
                            Scrapers + Playwright PDF
                            (joby co se nehodí na serverless)
```

**Vendor lock-in:** nízký — vše je standardní (Postgres, S3 API, OCI containers).

### Měsíční náklady (MVP, ~100 aktivních klientů)

| Položka | EUR/měs |
|---|---|
| Vercel Pro (apps) | 20 |
| Neon Postgres Scale | 19 |
| Inngest | 20 |
| Hetzner CX22 (4GB) | 8 |
| Cloudflare R2 (50 GB) | 5 |
| Postmark (10k emailů) | 15 |
| Sentry Team | 26 |
| Doména + SSL | 2 |
| **Anthropic API** (~5M tokens/měs) | ~80 |
| **Magnusweb** (až s prvním zakázkou — pro MVP neútrácet) | 0 |
| **Celkem** | **~€195/měs** |

### Když porostete:
- 1k klientů: ~€500/měs (Postgres větší, víc LLM volání, Magnusweb)
- 10k klientů: ~€3000/měs (přidat dedikovaný Redis, víc Hetzner nodes)

---

## 10. Workflow: Claude Code v terminálu vs. v projektu

### TL;DR doporučení
**Pro tuhle fázi (production build) — Claude Code v terminálu na lokálu, repo na GitHubu.** Tenhle Composer environment je skvělý na design exploraci a prototypy, ale pro reálný production codebase s migracemi, testy, CI a deployments potřebuješ plný IDE workflow.

### Konkrétní setup, krok za krokem

**1. Lokální dev prostředí**
```bash
# macOS / Linux
brew install node pnpm postgresql@16 git
brew install --cask playwright

# Claude Code (terminálový agent)
curl -fsSL https://claude.ai/code/install.sh | sh
# nebo přes npm: npm install -g @anthropic-ai/claude-code
```

**2. Založení repa**
```bash
mkdir industrysignal && cd industrysignal
git init
gh repo create industrysignal --private --source=. --remote=origin

# Stáhni si tento Composer projekt jako výchozí asset
# (přes "Download project" tlačítko v UI tohoto editoru)
# rozbal a zkopíruj ui_kits/portal/, colors_and_type.css, README.md do nového repa
```

**3. První session s Claude Code**
```bash
cd industrysignal
claude
# v promptu:
> Přečti si HANDOFF.md a začni implementovat Týden 1 ze sprint plánu.
> Použij pnpm + Turborepo + Next.js 14. Začni od Postgres schématu.
```

Claude Code v terminálu:
- vidí celý filesystem (na rozdíl od cloud Composeru)
- spouští reálně `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm db:migrate`
- commituje do gitu, otevírá PR
- pracuje s `.env` souborem (API klíče Postmark, Anthropic, Stripe, ARES)

**4. Hosting (production deploy)**
- **Vercel** — `vercel link` v repu, automatic deploy z `main` branch
- **Neon** — vytvoř projekt na console.neon.tech, dostaneš connection string, ulož do Vercel env
- **Inngest** — `npx inngest-cli init`, propojí se s GitHubem
- **Hetzner VPS** — objednej CX22 (~8€/měs), `ssh root@<ip>`, instaluj Docker, deploy scraperů přes GitHub Actions

**5. Doménu a SSL**
- Doménu `industrysignal.cz` koupit přes Forpsi nebo Wedos (~300 Kč/rok)
- DNS v Cloudflare (zdarma) → Vercel ji automaticky najde + vystaví SSL přes Let's Encrypt

**6. Sekrety (NIKDY do gitu)**
```bash
# .env.local
DATABASE_URL=postgres://...
ANTHROPIC_API_KEY=sk-ant-...
POSTMARK_TOKEN=...
STRIPE_SECRET_KEY=...
ARES_USER_AGENT=IndustrySignal/1.0 (kontakt@industrysignal.cz)  # ČSÚ chce identifikaci
```
V produkci přes Vercel env vars (web UI) + Doppler/Infisical pro orchestraci.

### Kdy zůstat v Composeru (tady)
- Když dělám rychlou designovou variaci konkrétní obrazovky
- Když chceš ukázat klientovi interaktivní mockup před commitnutím vývoje
- Když píšeš editoriální draft sekce a chceš vidět v reálném layoutu

### Kdy přejít do Claude Code v terminálu
- **Production codebase** (Týden 1 a dál)
- Cokoli, co potřebuje skutečně běžet (DB queries, scrapery, testy)
- Cokoli, co se musí versionovat (git history je v terminálu nativní)
- Cokoli, co potřebuje sekrety nebo přístup k externím API

### Tip pro hybridní workflow
1. **Designové iterace → tady** v Composeru. Když je obrazovka schválená, zkopíruj `.jsx` do produkčního repa.
2. **Editorial copy → tady** v Composeru. Když je draft schválený, paste do `apps/studio` jako seed data.
3. **Vše ostatní → terminál Claude Code.**

---

## 11. Co předat Claude Code spolu s tímto dokumentem

Zip celého tohoto Composer projektu (`ui_kits/portal/*`, `colors_and_type.css`, `README.md`, `CLAUDE.md`, `preview/*`) + tento `HANDOFF.md`.

**Úvodní prompt pro první sezení Claude Code:**
```
Jsi senior fullstack engineer stavící IndustrySignal — B2B intelligence portál
pro český průmysl. V tomto repu máš:

1. HANDOFF.md — kompletní brief produktu (přečti CELÝ jako první)
2. README.md — design system manifest (vizuální DNA, copy guidelines)
3. CLAUDE.md — projektová pravidla (jazyk, tón, vizuální zákazy)
4. ui_kits/portal/ — funkční HiFi prototyp v React+Babel; přeportovat na Next.js
5. colors_and_type.css — schválené design tokeny, NEPŘEPISOVAT, jen importovat

Začni Týden 1 ze sprint plánu v HANDOFF.md §8. Otázky pokládej česky.
Komunikuj věcně, bez emoji, bez marketingových frází. Vykání.
```

---

## 12. Otevřené body, na které se musíš rozhodnout

1. **Magnusweb / Bisnode subscription** — kdy ho koupit? Doporučení: až s 3. zaplaceným enterprise klientem.
2. **Vanity publishers — Tier-3 souhlas** — viz §15.5, default zapnuté s confidence ≤ 0.5 a povinným cross-referencem proti registru.
3. **Vlastní redakční tým** — kolik analytiků full-time potřebujete pro kvartální report? Odhad: 1.5 FTE na 5 segmentů, 2.5 FTE na 9 segmentů.
4. **GDPR DPO** — externí službou (Cybroad, Lexell) ~10k Kč/měs nebo interně. Doporučení: externí.
5. **Hosting v EU vs. globálně** — pro CZ klienty Vercel "Frankfurt" region postačí, ale velcí korporátní klienti (energo, automotive) mohou trvat na on-prem nebo CZ-only DC. Pak: Wedos Cloud, Master Internet, ZONER.

---

*Konec briefu — pokračování v §13–§19 níže.*

---

# Část II — Mission Engine (revize produktové definice)

> **Toto je zásadní revize §1.** Po doplnění od klienta: IndustrySignal **není primárně periodický editorial report**. Je to **on-demand intelligence engine pro expanzi a replikaci konkurenčních vztahů**. Klient přijde s úkolem ("chceme do Německa", "replikovat go-to-market konkurenta X v Turecku", "najít OEM zákazníky v PL pro náš plastový díl"), platforma to automaticky převede na **Mission** a vyrobí relevantní mapu trhu, vztahový graf, signální feed a akční playbook. Kvartální Report a Alerty jsou pak vedlejší produkty.

## §13. Mission engine — produktové jádro

### Mental model

```
   ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
   │  Mission Brief   │───▶│  Resolution     │───▶│  Living Mission  │
   │  (klient zadá)   │    │  Pipeline       │    │  (portal view)   │
   └──────────────────┘    └─────────────────┘    └──────────────────┘
                                                          │
                            ┌─────────────────────────────┴────────────┐
                            ▼                                          ▼
                  ┌───────────────────┐                      ┌───────────────────┐
                  │  Playbook PDF     │                      │  Daily signals    │
                  │  (single export)  │                      │  (push do alertů) │
                  └───────────────────┘                      └───────────────────┘
```

### Mission Brief — vstupní schéma

```typescript
type MissionBrief = {
  intent: 'expand' | 'replicate' | 'scout' | 'defend' | 'acquire';
  client: { ico: string; sector_nace: string; products: string[]; };
  source_market: ISO3166;                  // odkud klient je
  target_market: ISO3166 | ISO3166[];      // kam míří
  segment: { nace: string; hs_codes?: string[]; keywords?: string[]; };

  // volitelné, ale CRITICKÉ pro kvalitu výstupu:
  competitor_to_replicate?: string;        // IČO / VAT / canonical_id
  named_targets?: string[];                // jména firem které klient zná
  excluded_targets?: string[];             // koho neoslovovat (konflikty)
  budget_horizon?: { value: number; currency: 'CZK'|'EUR'; };
  timeline_quarters?: number;
};
```

**Příklady reálných briefů, které pipeline musí ustát bez ručního zásahu:**

1. *„M2C (CZ facility management) chce do Německa — replikovat jejich CZ go-to-market"*
   → `{ intent: 'replicate', client: {ico: 'XXX', sector_nace: '81.10'}, source_market: 'CZ', target_market: 'DE', segment: { nace: '81.10', keywords: ['facility management', 'integrated FM', 'cleaning', 'technical services'] } }`

2. *„Plastika (CZ plastikářská firma) chce export do Turecka pro automotive"*
   → `{ intent: 'expand', client: {ico: 'XXX', sector_nace: '22.29'}, source_market: 'CZ', target_market: 'TR', segment: { nace: '22.29', hs_codes: ['3923', '3926'], keywords: ['automotive', 'OEM tier-1'] } }`

### Resolution pipeline — co engine udělá automaticky

```
1. NORMALIZE BRIEF
   ├─ NACE crosswalk CZ ↔ target country (NACE je EU standard, ale TR/UA/RU vyžaduje vlastní mapping)
   ├─ HS code expansion (HS6 → HS8 → CN8 dle target marketu)
   └─ Keyword expansion via LLM (Haiku) — "automotive plastics" → ["bumpers","dashboard","interior trim","tier-1 supplier"]

2. PULL TARGET-MARKET ENTITIES
   ├─ Firemní registr cílového trhu (DE: Handelsregister, TR: KAP, PL: KRS — viz §14)
   ├─ Filtruj dle NACE a velikosti
   ├─ Customs flows: kdo z source_market už export do target_market dělá (Comext)
   ├─ Tendry: kdo v target_market vyhrává relevantní zakázky (TED, target-country tender feeds)
   └─ News mentions: pomocí GDELT + per-target-country tisk (viz §15.5)

3. BUILD RELATIONSHIP GRAPH (§15)
   ├─ Supplier → Customer hrany z: výroční zprávy, customs, tendry, news
   ├─ Parent → Subsidiary z: registry, Bisnode/Sayari (placené)
   ├─ Executive → Company z: registry + LinkedIn scrape (compliance!)
   └─ Co-investment hrany z: M&A databases (Mergermarket free tier nebo CrunchBase)

4. CLASSIFY OPPORTUNITIES (LLM + rules)
   ├─ Gap analysis: HS kód × target country s nízkým CZ exportem ale rostoucí poptávkou
   ├─ Weak players: target-market firmy s klesajícím skóre (insolvence, downgrade ratingu)
   ├─ Replication candidates: target-market firmy se stejnou hodnotovou propozicí jako klient
   └─ Channel partners: distributoři/agenti s portfoliem komplementárním ke klientovi

5. GENERATE PLAYBOOK
   ├─ LLM (Sonnet) — strukturovaný markdown podle šablony per intent (replicate/expand/...)
   ├─ Citace povinné (každé tvrzení → source_id)
   ├─ Human review v Studio app (povinný step)
   └─ Export: PDF (Playwright) + interactive portal view + JSON API

6. ACTIVATE MONITORING
   ├─ Mission spustí denní diff worker
   ├─ Signál layer (§16) hlídá změny ve všech entitách v grafu
   └─ Alerty do klientského portálu + email digest
```

**Key insight: pipeline nesmí mít hardcoded větve per země.** Místo `if (target === 'DE') { fetchHandelsregister() } else if ...` je všechno za **adaptérovou vrstvou**: existuje generický kontrakt `CountryConnector` a každá země má svou implementaci. Když přibude nová země, přidá se jen nový soubor v `data-sources/<country>/`, ne se přepisuje core.

---

## §14. Country Connector — adaptérová architektura

### Kontrakt (TypeScript)

```typescript
// packages/connectors/types.ts
export interface CountryConnector {
  iso: ISO3166;
  capabilities: ConnectorCapabilities;   // co umí, co neumí

  // 1. Search company by name/id
  searchCompanies(q: CompanySearchQuery): Promise<CompanyRef[]>;

  // 2. Fetch full company profile
  getCompany(id: CountryCompanyId): Promise<CompanyProfile>;

  // 3. List companies by sector (NACE-equivalent)
  listBySector(naceLocal: string, opts?: ListOpts): Promise<CompanyRef[]>;

  // 4. Financial filings
  getFilings(id: CountryCompanyId, years: number[]): Promise<Filing[]>;

  // 5. Insolvency / distress signals
  getDistressEvents(id: CountryCompanyId): Promise<DistressEvent[]>;

  // 6. Tenders / public contracts won
  getTenders(id: CountryCompanyId): Promise<TenderRef[]>;

  // 7. UBO / ownership
  getOwnership(id: CountryCompanyId): Promise<OwnershipGraph>;

  // 8. Customs / trade flows (země-level, ne per-firma)
  getTradeFlows(direction: 'export'|'import', partnerIso: ISO3166, hs: string, period: PeriodRange): Promise<TradeFlow[]>;
}

export interface ConnectorCapabilities {
  hasFinancials:    boolean;
  hasUBO:           boolean;
  hasTenders:       boolean;
  hasInsolvency:    boolean;
  hasOwnershipChain:boolean;
  hasNewsFeed:      boolean;
  refreshLagDays:   number;  // za jak dlouho jsou data čerstvá
  costTier:         'free' | 'low' | 'medium' | 'enterprise';
  rateLimit:        { reqPerMin: number };
}
```

### Implementační matice — co je hotové, co se přidává

| Země | Registr firem | Financials | UBO | Tendry | Insolvence | Capabilities | Status |
|---|---|---|---|---|---|---|---|
| **CZ** | ARES (free) | Justice (free) | hlidacstatu.cz | smlouvy.gov.cz | ISIR (free) | full | done v MVP |
| **SK** | ORSR (free) | RUZ.gov.sk | RPVS (free) | uvostat.sk | OR SR | full | Sprint 7 |
| **PL** | KRS (free) | KRS sprawozdania | CRBR | UZP/BZP | MSiG | full | Sprint 7 |
| **DE** | Handelsregister (€) | Bundesanzeiger (free) | Transparenzregister (€) | bund.de Vergabe | Insolvenzbekanntmachungen | full ale platí se | Sprint 8 |
| **AT** | Firmenbuch (€) | RIS (free) | wiEReG | bund.gv.at | Edikte | full ale platí se | Sprint 8 |
| **HU** | e-cégjegyzék | e-beszámoló | EVnyR | KEF | csod.hu | full | Sprint 9 |
| **RO** | ONRC | ONRC | částečně | SICAP | Buletinul Insolvenței | full | Sprint 9 |
| **NL** | KvK (€) | KvK | UBO register (€) | TenderNed | Centraal Insolventieregister (free) | full | Sprint 10 |
| **BE** | KBO/CBE (free) | NBB Bilanscentrale | UBO reg. (free) | e-Procurement | Moniteur Belge | full | Sprint 10 |
| **FR** | INPI / Pappers.fr (částečně free) | INPI bilans | RBE | BOAMP | BODACC (free) | full | Sprint 10 |
| **IT** | Camere di Commercio (€) | Registro Imprese | titolari effettivi | ANAC | Procedure concorsuali | full ale platí se | Sprint 11 |
| **ES** | Registradores (€) | INFORMA (€) | částečně | Plataforma de Contratación | BOE concursos | placené | Sprint 11 |
| **Nordic SE/DK/NO/FI** | Bolagsverket / Erhvervsstyrelsen / Brønnøysund / PRH | free or low cost | částečně | per country | per country | full + free-friendly | Sprint 11 |
| **TR** | KAP (Ticaret Sicili) | KAP filings | částečně | EKAP | İcra İflas | částečné | Sprint 12 |
| **UA** | YouControl (€€) | clarity-project | částečně | Prozorro | court records | full ale válka | Sprint 12 |
| **UK** | Companies House (free, GOLD) | CH free | PSC register (free) | Contracts Finder + Find a Tender | The Gazette | full + free-friendly | Sprint 13 |
| **IE** | CRO | CRO | UBO reg. | eTenders | Iris Oifigiúil | full | Sprint 13 |
| **US** | SEC EDGAR (public co. free) + per-state SoS (free–€) | EDGAR | OFAC + FinCEN (omezeně) | SAM.gov + USAspending | PACER (€ per query) | fragmentované | Sprint 14 |
| **CA** | SEDAR+ (public) + per-province registries | SEDAR+ | Corporations Canada | buyandsell.gc.ca | per province | částečné | Sprint 14 |
| **AU** | ASIC Connect (€ per lookup) | ASX (public) | částečně | AusTender | ASIC notices | placené | Sprint 15 |
| **NZ** | Companies Office (free) | NZX (public) | částečně | GETS | Insolvency Register | full | Sprint 15 |
| **AE** (UAE) | DED per emirate (€) | DFM/ADX (public) | omezeně | etimad.ae | — | omezené | Sprint 16 |
| **SA** (Saudi) | MoCI Wathiq (€) | Tadawul (public) | omezeně | etimad.sa | — | omezené | Sprint 16 |
| **IL** | Rasham HaHavarot (free) | TASE (public) | partial | Mimshal | — | full | Sprint 16 |
| **EG** | GAFI (free) | EGX (public) | omezeně | ETSO | — | omezené | Sprint 17 |
| **ZA** (South Africa) | CIPC (€) | JSE (public) | DPSA UBO | eTenders | court records | full | Sprint 17 |
| **NG** (Nigeria) | CAC (€) | NGX (public) | částečně | NOCOPO | court records | omezené | Sprint 17 |
| **MA** (Maroko) | OMPIC | Bourse de Casablanca | omezeně | marchespublics.gov.ma | — | omezené | Sprint 18 |
| **KE** (Keňa) | eCitizen BRS (€) | NSE (public) | částečně | tenders.go.ke | court records | omezené | Sprint 18 |
| **JP / SG / HK / KR** | per market | per market | — | per market | per market | placené přes Sayari | enterprise tier |
| **ostatní EU** | OpenCorporates fallback | — | — | TED | — | jen registr | fallback |
| **ostatní svět** | OpenCorporates + Sayari fallback | — | — | — | — | jen registr | fallback |

### Co je generického (sdíleno všemi connectory)

- **Entity resolver** — řeší "Foxconn CZ ↔ Foxconn DE" napříč registry pomocí (a) LEI kódů, (b) UBO graphu, (c) fuzzy name match + adresa
- **Customs layer** — Eurostat Comext + UN Comtrade pro non-EU (společné pro všechny target marketu)
- **News layer** — GDELT (free, globální) + RSS hlavní byznys press per země + vanity publishers tier-3 (§15.5)
- **LinkedIn enrichment** — opatrně, přes Phantombuster nebo Bright Data; GDPR pozor

### Placená data — kdy se vyplatí

| Provider | Co dodá | Cena | Kdy zapnout |
|---|---|---|---|
| **Sayari Graph** | Multi-country UBO + sanctions + ownership chains | $50k+/rok | 5. enterprise klient |
| **Datawalk** | Velmi hluboké relationship graphs, AML focus | enterprise | jen pro největší klienty |
| **Bisnode / Dun & Bradstreet** | Kreditní skóre EU-wide | ~150k Kč/rok | 3. klient z financial sectoru |
| **Bureau van Dijk (Orbis)** | 400M firem, EU-strong | €€€ enterprise | pokud uplatníte v consulting tieru |
| **OpenCorporates** | 200M firem, levný fallback | $0.05/firma + bulk discount | hned pro <country> bez vlastního connectoru |
| **Refinitiv WC** | M&A, finanční trhy | €€€ | jen pokud expanze do finančního segmentu |
| **CrunchBase Pro** | Startupy + fundraising | $50/měs | hned, levné |

**Doporučení:** Začít s 4 zeměmi (CZ, SK, PL, DE) na free zdrojích + OpenCorporates fallback pro všechno ostatní. Sayari až s prvním enterprise klientem.

---

## §15. Relationship Graph Engine

### Datová vrstva

**MVP: Postgres** s tabulkami `entities`, `entity_links`, `link_evidence`. Pro relationship traversal stačí rekurzivní CTE.

**Až přiteče >100k entit a >1M hran:** přejít na **Neo4j Aura** (managed graph DB, ~€65/měs starter) nebo **Memgraph**. Adaptérovou vrstvou nad oběma → migrace bez business code změn.

### Schema (Postgres)

```sql
-- Kanonická entita — agreguje napříč zeměmi a registry
CREATE TABLE entities (
  id              UUID PRIMARY KEY,
  canonical_name  TEXT NOT NULL,
  entity_type     TEXT NOT NULL, -- 'company', 'person', 'asset'
  lei             TEXT,
  ubo_root_id     UUID REFERENCES entities(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Záznam entity v konkrétním národním registru
CREATE TABLE entity_identities (
  id              UUID PRIMARY KEY,
  entity_id       UUID REFERENCES entities(id),
  country_iso     CHAR(2) NOT NULL,
  registry_name   TEXT NOT NULL,           -- 'ARES', 'Handelsregister', 'KRS'
  registry_id     TEXT NOT NULL,           -- IČO, HRB, KRS-number
  legal_name      TEXT NOT NULL,
  registered_address TEXT,
  nace_local      TEXT,
  source_url      TEXT,
  fetched_at      TIMESTAMPTZ,
  UNIQUE(country_iso, registry_name, registry_id)
);

-- Vztahy mezi entitami
CREATE TABLE entity_links (
  id              UUID PRIMARY KEY,
  from_entity_id  UUID REFERENCES entities(id),
  to_entity_id    UUID REFERENCES entities(id),
  link_type       TEXT NOT NULL,           -- 'supplies','owns','employs','partners_with',...
  weight          NUMERIC,                 -- 0..1 (síla / spolehlivost)
  valid_from      DATE,
  valid_to        DATE,
  metadata        JSONB                    -- typ kontraktu, objem, atd.
);

-- Evidence — proč ten link existuje (auditovatelnost!)
CREATE TABLE link_evidence (
  id              UUID PRIMARY KEY,
  link_id         UUID REFERENCES entity_links(id),
  source_type     TEXT,                    -- 'tender','news','filing','customs','llm_inferred'
  source_url      TEXT,
  excerpt         TEXT,
  extracted_by    TEXT,                    -- 'haiku-4.5' / 'rule-engine-v3' / 'human'
  confidence      NUMERIC,
  extracted_at    TIMESTAMPTZ
);
```

### Entity resolution — jak se rozhodne, že "Škoda Auto a.s. CZ" a "ŠKODA AUTO Deutschland GmbH" jsou propojené entity

```
1. DETERMINISTICKÝ MATCH (vysoká jistota)
   ├─ Stejný LEI → totožná entita
   ├─ Stejný GLEI ownership chain → parent-subsidiary
   └─ Stejné UBO (ze Sayari/Bisnode) → sister entity

2. PROBABILISTICKÝ MATCH (potřebuje human review threshold)
   ├─ Fuzzy name match (Jaro-Winkler > 0.85) + same NACE + same UBO country → 0.7 confidence
   ├─ Customs flow matching (CZ exporter X dodává do DE importer Y stabilně 3+ roky) → 0.5 confidence supplier_of
   └─ Joint tender wins → 0.6 confidence partners_with

3. LLM AUGMENTATION (jen jako návrh, ne autorita)
   ├─ Sonnet čte výroční zprávy → extrahuje "key suppliers" sekci
   ├─ Návrh hran se ukládá s extracted_by='sonnet-4.5', confidence ≤ 0.6
   └─ Návrh nad threshold spustí human review task v Studio app
```

**Anti-pattern:** Nikdy ne `link.confidence > 0.5 ⟹ vystavit klientovi`. Vždy human-reviewed pro publikované grafy. LLM návrhy zůstávají v `pending_links` tabulce.

### Cross-market mission query — příklad

```sql
-- Mission: Plastika.cz → najít automotive OEM zákazníky v PL, kteří kupují
-- od podobných CZ firem (proxy: kdo je dodavatelem konkurenta CZ-X v PL?)
WITH cz_competitor AS (
  SELECT id FROM entities WHERE canonical_name ILIKE '%konkurent CZ%' LIMIT 1
),
cz_supplier_chain AS (
  SELECT to_entity_id AS supplier_id
  FROM entity_links
  WHERE from_entity_id = (SELECT id FROM cz_competitor)
    AND link_type = 'supplies'
),
pl_oem_targets AS (
  SELECT e.*, COUNT(*) AS proof_strength
  FROM entities e
  JOIN entity_identities ei ON ei.entity_id = e.id
  JOIN entity_links l ON l.from_entity_id = ANY(SELECT supplier_id FROM cz_supplier_chain)
  WHERE ei.country_iso = 'PL'
    AND e.entity_type = 'company'
    AND ei.nace_local LIKE '29%'        -- automotive PL NACE
    AND l.link_type = 'supplies'
  GROUP BY e.id
  ORDER BY proof_strength DESC
)
SELECT * FROM pl_oem_targets LIMIT 50;
```

---

## §15.5 Vanity publishers — Tier-3 zdroj pro fact extraction (nikoliv pro sentiment)

> Krátká odpověď na otázku: **ano, scrapovat — ale jen pro extrakci strukturovaných faktů, ne pro trendovou analýzu nebo sentiment.** Hodnota je vysoká právě proto, že firmy se v takových publikacích chlubí konkrétními detaily (jména klientů, výše kontraktů, plánované expanze), které z registru nedostanete.

### Co jsou v CZ/EU kontextu "vanity publishers"

| Kategorie | Příklady | Co tam firmy říkají |
|---|---|---|
| **Trade press** (CZ) | MM Průmyslové spektrum, TechMagazín, Energetika, Logistika.cz, StrojTech, Stavebnictví 4.0, ICT manager | "Rozšířili jsme partnerství s X", "Náš klíčový dodavatel Y", "Otvíráme závod v…" |
| **Trade press** (DE) | Produktion.de, Industriemagazin, VDI nachrichten | totéž v němčině |
| **Industry awards** | CZECH TOP 100, Forbes Next, ČEKIA Stability Award, Hospodářské noviny TOP 100 | strukturovaná data: tržby, headcount, segmenty, klíčoví zákazníci |
| **Award compendiums** | Czech Excellence, Equa Bank Visionnaire, EY Podnikatel roku | profilace finalistů s detailními rozhovory |
| **B2B PR portály** | Mediafax, Business Insider CZ, Hospodářský deník | sponsored content / advertorials |
| **Corporate blogs & případové studie** | weby konzultantských firem (KPMG, Deloitte, McKinsey CZ insights), system integrátorů (Asseco, Soitron, AutoCont) | "Pro klienta X jsme implementovali…" → přímá supplier-customer hrana |
| **LinkedIn corporate posts** | corporate updates velkých firem | personální změny, nové partnerships |

### Proč to chcete

Skutečný příklad. Firma Plastika.cz (z briefu v §13) chce vědět, kdo v TR automotive nakupuje tier-1 plastové díly. **Z registrů to nevyčtete.** Ale když:

1. Scrapnete tři ročníky MM Průmyslové spektrum + Produktion.de
2. Najdete článek typu *"Společnost Tofas oznámila rozšíření výrobní kapacity v Bursa s tier-1 dodavateli A, B a C"*
3. LLM extrahuje entity `Tofas` (TR), `A`, `B`, `C` a vztah `supplies`
4. Cross-referencujete A/B/C proti registru → ověříte, že existují, a získáte IČO + adresu

→ máte 3 jména k oslovení s konkrétní vstupenkou ("víme, že jste tier-1 pro Tofas").

To samé v registru **nikdy** nenajdete. Tendry to ukáží jen u státních zakázek. Customs to ukáže agregovaně bez jmen partnerů.

### Pravidla zapojení (architectural guardrails)

1. **Confidence ceiling.** Každý link extrahovaný z vanity sourcu má v `link_evidence.confidence ≤ 0.5`. To znamená:
   - Neukazuje se klientovi v "high confidence" sekci playbooku
   - Vždy potřebuje human review nebo cross-reference před publikací
   - V relationship graphu se kreslí slabší linkou / čárkovaně

2. **Cross-reference požadovaný.** Před publikací linku musí jeden z následujících platit:
   - Stejný link existuje i z jiného zdroje (registr, customs, tendr)
   - Cílová entita je ověřená v registru target marketu (existuje IČO/HRB/KRS)
   - Mention je v ≥ 2 nezávislých vanity sourcech (same fact, different journalist)

3. **Pouze entity extraction a link extraction. Žádný sentiment, žádný trend.** Vanity press je systematicky pozitivně vychýlený — firmy o sobě dobrovolně nepíší špatně. Sentiment score z této vrstvy by zkreslil signální engine. Reálný stav firmy zjistíte z Justice + insolvenčního rejstříku + customs delta.

4. **Recency-aware degradation.** Článek z roku 2019 říká "rozšíříme výrobu" → 2026 ten závod nemusí existovat. Confidence se násobí faktorem `0.85^(years_old)`. Po 5 letech link de-facto vyprší.

5. **Source quality tier v evidenci.** Pole `link_evidence.source_quality_tier` s hodnotami `1` (registr / customs / oficiální), `2` (mainstream tisk / tendr), `3` (vanity / trade press), `4` (corporate blog / LinkedIn). Klient v UI vidí strom citací s barevným kódováním tier.

6. **Robots.txt + Terms.** Většina trade press má `robots.txt` přátelský pro fair-use scraping, ale **paywall** ne (Forbes CZ, HN). Pro paywall obsah si pořiďte podnikové předplatné (ne scrape přes login).

7. **Žádná osobní data nad rámec veřejných funkcí.** Z LinkedIn corporate postů extrahujte **jen company-level data a public job changes statutárů**. Soukromé profily neškrabat — GDPR i LinkedIn ToS.

### Implementační poznámky

- Scraper jako samostatný worker v `apps/workers/vanity-scraper/`, běží denně přes Inngest cron
- Per source list URL patterns + selectory v YAML config (`data-sources/vanity/<source>.yml`) — nová publikace se přidá bez nasazení
- LLM pipeline: Haiku 4.5 pro extrakci (cheap, scale), Sonnet 4.5 jen pro nejednoznačné případy (~5 % zápasů)
- Náklady: očekávejte ~€30/měs LLM volání na zpracování 500 článků denně napříč všemi sourcy
- Ukládání plného textu článku do R2 (GDPR-compliant retention 18 měsíců), strukturovaný extrakt do Postgres permanentně

### Risk register pro tuto vrstvu

| Riziko | Mitigace |
|---|---|
| Žaloba o copyright od vydavatele | Ukládat jen excerpty + odkaz, ne full-text public. Internal full-text retention pro audit, ne pro serving. |
| Hallucinated extractions (LLM si vymyslí firmy, které tam nebyly) | Validace proti registru cílového trhu — pokud LLM extrahuje entitu, která nesedí na žádný registr, zahodit. |
| Pay-to-publish content (zaplacený advertorial) | Flag-list publishers s vysokým podílem placených článků, automaticky downgrade confidence o další 0.1. |
| Velmi zastaralé articles z evergreen pages | Recency degradation (pravidlo 4 výše). Pokud zdroj nemá publikační datum v meta, default 24 měsíců → 0.5 confidence. |

---

## §15.6 Vanity publisher catalog — top sources per region

> Praktický roll-out list. **Tier 1** = scrapuj v Sprintu 6 spolu s MVP. **Tier 2** = Sprint 11–14. **Tier 3** = od Sprintu 15+ podle business potřeby. Forbes a HN explicitně přeskočit — paywall + nepřidají hodnotu, kterou nemáme z jinde.

### Tier 1 — Evropa (priorita pro MVP)

#### Německo & Rakousko (industrial powerhouse — must-have)
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **MM MaschinenMarkt** | maschinenmarkt.vogel.de | Strojírenství, výroba, manufacturing | free | ⭐⭐⭐ |
| **Produktion.de** | produktion.de | Industriální obecné | free | ⭐⭐⭐ |
| **VDI Nachrichten** | vdi-nachrichten.com | Engineering, inovace | částečně free | ⭐⭐⭐ |
| **Industriemagazin** (AT) | industriemagazin.at | AT industrial | free | ⭐⭐⭐ |
| **AutomotiveIT** | automotiveit.eu | Automotive supply chain | free | ⭐⭐⭐ |
| **ATZ / MTZ** | springerprofessional.de/atz | Automotive engineering | free abstrakty | ⭐⭐ |
| **Lebensmittel Zeitung** | lebensmittelzeitung.net | Potravinářství | free | ⭐⭐ |
| **K-Zeitung** | k-zeitung.de | Plasty | free | ⭐⭐ |
| **Energie & Management** | energie-und-management.de | Energetika | free | ⭐⭐⭐ |
| **Logistik Heute** | logistik-heute.de | Doprava, logistika | free | ⭐⭐ |
| **Trend.at** | trend.at | AT byznys (vyhněte se paywallu) | částečně paywall | ⭐⭐ |

#### Polsko (CZ neighbor + automotive cluster)
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **WNP.pl** | wnp.pl | Industriální portál — GOLD | free | ⭐⭐⭐ |
| **WysokieNapiecie.pl** | wysokienapiecie.pl | Energetika | free | ⭐⭐⭐ |
| **Automatyka.pl** | automatyka.pl | Automatizace, robotika | free | ⭐⭐ |
| **Logistyka.net.pl** | logistyka.net.pl | Logistika | free | ⭐⭐ |
| **Money.pl Biznes** | money.pl/firmy | Korporátní zprávy | free | ⭐⭐ |
| **Rynek Stali** | rynekstali.com | Hutnictví | free | ⭐⭐ |

#### Maďarsko, Rumunsko, Slovinsko
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **Portfolio.hu** (HU) | portfolio.hu | Byznys HU | free | ⭐⭐⭐ |
| **Vasiipari Magazin** (HU) | vasiipari.hu | Hutnictví HU | free | ⭐⭐ |
| **Profit.ro** (RO) | profit.ro | Byznys RO | free | ⭐⭐ |
| **Industria.ro** (RO) | industria.ro | Industriální RO | free | ⭐⭐ |
| **Finance.si** (SI) | finance.si | Byznys SI | free | ⭐⭐ |

#### Francie, Itálie, Španělsko, Benelux
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **L'Usine Nouvelle** (FR) | usinenouvelle.com | Industriální FR — GOLD | částečně paywall | ⭐⭐⭐ |
| **MecaSphere** (FR) | mecasphere.com | Strojírenství | free | ⭐⭐ |
| **Industria Italiana** (IT) | industriaitaliana.it | Italské průmysl | free | ⭐⭐⭐ |
| **Plastix-Technology** (IT) | plastix.it | Plasty IT | free | ⭐⭐ |
| **Interempresas** (ES) | interempresas.net | Multi-segment industrial — GOLD | free | ⭐⭐⭐ |
| **Industrie.nl** (NL) | industrie.nl | NL industrial | free | ⭐⭐ |
| **De Ingenieur** (NL) | deingenieur.nl | Engineering NL | free | ⭐⭐ |
| **Trends.knack.be** (BE) | trends.knack.be | BE byznys | částečně paywall | ⭐⭐ |
| **Industrie Belgium** (BE) | industrie-magazine.be | BE průmysl | free | ⭐⭐ |

#### Nordic + Baltic
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **Ny Teknik** (SE) | nyteknik.se | Engineering, manufacturing SE | částečně free | ⭐⭐ |
| **Teknisk Ukeblad** (NO) | tu.no | Engineering NO | částečně paywall | ⭐⭐ |
| **Teollisuusuutiset** (FI) | teollisuusuutiset.fi | Industriální FI | free | ⭐⭐ |
| **Verkstadsforum** (SE) | verkstadsforum.se | Engineering shops SE | free | ⭐⭐ |

#### Pan-evropské
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **Reuters Manufacturing** | reuters.com/business/manufacturing | EU manufacturing | free | ⭐⭐⭐ |
| **Politico Europe Industry** | politico.eu | Regulační kontext | free | ⭐⭐ |
| **EuroNews Business** | euronews.com/business | General EU | free | ⭐⭐ |
| **AutoNews Europe** | autonewseurope.com | Automotive EU | free | ⭐⭐⭐ |
| **EUROFER** | eurofer.eu | Hutnictví trade body | free | ⭐⭐⭐ |
| **CEFIC** | cefic.org | Chemie trade body | free | ⭐⭐⭐ |
| **CECIMO** | cecimo.eu | Strojírenství trade body | free | ⭐⭐⭐ |

### Tier 2 — UK & USA (Sprint 11–14)

#### UK
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **The Manufacturer** | themanufacturer.com | UK manufacturing — GOLD | free | ⭐⭐⭐ |
| **Make UK** | makeuk.org/insights | Trade body publications | free | ⭐⭐⭐ |
| **Industry Today UK** | industrytodayuk.com | General industry | free | ⭐⭐ |
| **Modern Manufacturing UK** | modern-manufacturing.com | Manufacturing news | free | ⭐⭐ |
| **Process Industry Forum** | processindustryforum.com | Process industries | free | ⭐⭐ |
| **Plant Engineering UK** | plantengineering.co.uk | Plant ops | free | ⭐⭐ |
| **AutoRetailNetwork** | autoretailnetwork.com | Auto retail UK | free | ⭐⭐ |
| **IET Engineering & Technology** | eandt.theiet.org | Engineering | free | ⭐⭐ |
| **Materials Handling World** | materialshandlingworld.com | Logistika | free | ⭐⭐ |

#### USA
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **IndustryWeek** | industryweek.com | US manufacturing — GOLD | free | ⭐⭐⭐ |
| **Manufacturing.net** | manufacturing.net | Multi-segment | free | ⭐⭐⭐ |
| **Plant Engineering** | plantengineering.com | Plant ops US | free | ⭐⭐ |
| **Modern Materials Handling** | mmh.com | Logistika US | free | ⭐⭐ |
| **Logistics Management** | logisticsmgmt.com | Supply chain | free | ⭐⭐⭐ |
| **Automotive News** | autonews.com | Auto US — GOLD | částečně paywall | ⭐⭐⭐ |
| **Plastics News** | plasticsnews.com | Plasty US | free | ⭐⭐⭐ |
| **Chemical Week** | chemweek.com | Chemie | částečně paywall | ⭐⭐⭐ |
| **Power Magazine** | powermag.com | Energetika | free | ⭐⭐⭐ |
| **Oil & Gas Journal** | ogj.com | Ropa & plyn | částečně paywall | ⭐⭐ |
| **American Machinist** | americanmachinist.com | Strojírenství | free | ⭐⭐ |
| **NAM Newsroom** | nam.org/newsroom | Trade body US | free | ⭐⭐⭐ |
| **Reshoring Initiative** | reshorenow.org | Re-shoring trendy | free | ⭐⭐⭐ |

### Tier 3 — Afrika, Střední východ, Austrálie (Sprint 15+)

#### Afrika
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **Engineering News** (ZA) | engineeringnews.co.za | SA mining + industrial — GOLD | free | ⭐⭐⭐ |
| **Mining Weekly** (ZA) | miningweekly.com | Mining SA + Africa | free | ⭐⭐⭐ |
| **Polity.org.za** (ZA) | polity.org.za | SA policy + business | free | ⭐⭐ |
| **African Business** | african.business | Pan-African business | free | ⭐⭐ |
| **Africa Outlook Magazine** | africaoutlookmag.com | Pan-African industrial | free | ⭐⭐ |
| **Construction Review Africa** | constructionreviewonline.com | Stavebnictví | free | ⭐⭐ |
| **Nairametrics** (NG) | nairametrics.com | Nigerian business | free | ⭐⭐ |
| **Daily News Egypt** | dailynewsegypt.com | EG business | free | ⭐⭐ |
| **Médias24** (MA) | medias24.com | MA business | free | ⭐⭐ |
| **Business Daily Africa** (KE) | businessdailyafrica.com | KE business | free | ⭐⭐ |
| **Ventures Africa** | venturesafrica.com | Startups + business | free | ⭐⭐ |

#### Střední východ
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **Zawya** | zawya.com | MENA business — GOLD (Reuters) | free + paid | ⭐⭐⭐ |
| **Arabian Business** | arabianbusiness.com | Gulf business | free | ⭐⭐⭐ |
| **Gulf Industry Magazine** | gulfindustryonline.com | Gulf industrial | free | ⭐⭐⭐ |
| **Middle East Construction News** | meconstructionnews.com | Stavebnictví Gulf | free | ⭐⭐ |
| **Oil & Gas Middle East** | oilandgasmiddleeast.com | Ropa & plyn ME | free | ⭐⭐⭐ |
| **Power Engineering ME** | powerengineeringint.com/middle-east | Energetika ME | free | ⭐⭐ |
| **ITP Industry** (UAE) | itp.net | UAE industrial | free | ⭐⭐ |
| **Daily Sabah Business** (TR) | dailysabah.com/business | TR business EN | free | ⭐⭐⭐ |
| **Anadolu Agency Industry** (TR) | aa.com.tr | TR official news EN/AR | free | ⭐⭐⭐ |
| **Saudi Gazette Business** | saudigazette.com.sa | Saudi business | free | ⭐⭐ |
| **Globes** (IL) | en.globes.co.il | IL business — částečně paywall | částečně free | ⭐⭐ |

#### Austrálie & Nový Zéland
| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **Manufacturers' Monthly** (AU) | manmonthly.com.au | AU manufacturing — GOLD | free | ⭐⭐⭐ |
| **Australian Manufacturing** | australianmanufacturing.com.au | AU industrial | free | ⭐⭐ |
| **Mining Weekly Australia** | miningweekly.com/page/australasia | Mining AU | free | ⭐⭐⭐ |
| **Process Online** (AU) | processonline.com.au | Process industries | free | ⭐⭐ |
| **Logistics & Materials Handling** (AU) | logisticsmagazine.com.au | Logistika | free | ⭐⭐ |
| **Resources Industry News** | resourcesindustry.com.au | Těžba + materiály | free | ⭐⭐ |
| **Energy News Bulletin** (AU) | energynewsbulletin.net | Energetika AU | free | ⭐⭐ |
| **NZ Manufacturer** | nzmanufacturer.co.nz | NZ industrial | free | ⭐⭐ |

### Pan-globální + multi-region (od Sprintu 6)

| Source | URL | Focus | Access | Relevance |
|---|---|---|---|---|
| **GDELT Project** | gdeltproject.org | Globální event database, 100+ jazyků | free (REST + BigQuery) | ⭐⭐⭐ |
| **Reuters Industry** | reuters.com/business | Globální industrial | free | ⭐⭐⭐ |
| **Bloomberg Industries** | bloomberg.com/industries | Globální (čistě top headlines free) | částečně paywall | ⭐⭐ |
| **AP Industry Wire** | apnews.com/hub/business | Globální tisková agentura | free | ⭐⭐ |
| **Trade.gov Market Intelligence** | trade.gov | US gov market reports | free | ⭐⭐⭐ |
| **EUROFER, CEFIC, CECIMO, ACEA…** | per association | EU industry bodies (trade reports) | free | ⭐⭐⭐ |
| **OECD Industry & Services** | oecd.org/industry | Globální datasets + reports | free | ⭐⭐ |
| **IEA Reports** | iea.org/reports | Energetické trendy | free + paid | ⭐⭐⭐ |
| **CrunchBase News** | news.crunchbase.com | Startup + fundraising | free | ⭐⭐ |
| **PitchBook News** | pitchbook.com/news | M&A globálně | částečně paywall | ⭐⭐ |

### Doporučená scrape sekvence (build order)

**Sprint 6 — Foundation (MVP)**
- GDELT (globální event firehose)
- WNP.pl, MM MaschinenMarkt, Produktion.de, Interempresas, L'Usine Nouvelle
- Pan-EU trade bodies (EUROFER, CEFIC, CECIMO, ACEA)
- Reuters + AP industry wire
- **15 sources, ~300 článků/den po deduplikaci**

**Sprint 11 — UK + USA**
- The Manufacturer, Make UK, IndustryWeek, Manufacturing.net, Plastics News, Power Magazine
- NAM Newsroom + Reshoring Initiative pro trendy
- **10 dalších sources**

**Sprint 15 — ME + Afrika + AU**
- Zawya, Engineering News ZA, Arabian Business, Gulf Industry, Manufacturers' Monthly AU
- **8 dalších sources**

**Co je k tomu potřeba mít hotové (před Sprintem 6):**
- LLM extraction pipeline (Haiku 4.5 prompt template, viz §15.5)
- Entity resolver napojený na CZ ARES (validation target)
- `link_evidence` schema v Postgres
- YAML config per source (`url_patterns`, `article_selector`, `date_selector`, `lang`, `tier`, `quality_flag`)

### Náklady této vrstvy

| Položka | EUR/měs |
|---|---|
| Scraper compute (Hetzner CX22, 4GB, dostatečné) | již počítané v §9 |
| LLM extraction (Haiku, 500 článků/den × 30 dní × ~1500 tokens) | ~€45 |
| Postgres storage extracted facts (~50MB/měs growth) | již počítané |
| R2 storage full-text articles (~2GB/měs) | ~€2 |
| **Marginální dodatečný náklad této vrstvy** | **~€50/měs** |

Po Tier 2 + Tier 3 rollout: ~€120/měs total.

### Co tento katalog **nepokrývá** (jiná data, jiný kanál)

- **Akademický research** (ScienceDirect, Springer) — pro deep-tech intelligence; samostatná pipeline, mimo MVP
- **Patenty** (EPO, USPTO, WIPO) — pro tech intelligence; samostatná pipeline, Sprint 12+
- **Politické a regulační** (EU Commission, národní ministerstva) — pokryto v §3.7 (Hlídač státu) + per-country gov feeds
- **Social media beyond LinkedIn** (Twitter/X, Reddit) — bias příliš vysoký, riziko misinformation > value, nepoužívat
- **Telegram + Discord industry channels** — emerging signal source, ale GDPR/ToS minefield, mimo MVP

---

## §15.7 Scraper config — YAML schema a šablony per pattern

> Cíl: přidat nový vanity publisher do produkce **bez nasazení**, jen commitem YAML souboru a CI testem. Scraper worker config loaduje z `data-sources/vanity/*.yml` při startu a hot-reloaduje při změně v gitu.

### Adresářová struktura

```
data-sources/
├── vanity/
│   ├── _schema.json              # JSON Schema pro validaci YAML configů (CI gate)
│   ├── _global.yml               # sdílené defaults (rate limits, retry policy, LLM model)
│   ├── de/
│   │   ├── mm-maschinenmarkt.yml
│   │   ├── produktion-de.yml
│   │   ├── vdi-nachrichten.yml
│   │   └── ...
│   ├── pl/
│   │   ├── wnp-pl.yml
│   │   └── ...
│   ├── uk/
│   ├── us/
│   └── ...
├── registers/                    # CountryConnector implementations (§14)
└── customs/                      # Eurostat Comext + UN Comtrade
```

### Global defaults (`_global.yml`)

```yaml
# Aplikuje se jako fallback, když source-specific YAML neuvádí override.
defaults:
  user_agent: "IndustrySignal-Bot/1.0 (kontakt@industrysignal.cz; https://industrysignal.cz/bot)"
  request_timeout_sec: 30
  max_retries: 3
  backoff_strategy: exponential
  respect_robots_txt: true
  request_delay_ms: 1500              # between requests to same host

  extraction:
    llm_model: claude-haiku-4-5
    llm_fallback_model: claude-sonnet-4-5     # jen pro ambiguous (confidence < 0.6)
    max_tokens_per_article: 1200
    extraction_prompt_id: vanity-extractor-v3 # ID promptu z `prompts` tabulky (verzovaný)

  retention:
    full_text_blob_days: 540          # 18 měsíců v R2
    extracted_facts: forever

  cost_caps:
    daily_articles_max: 200           # safety net
    monthly_llm_eur_max: 50           # alert nad limit
```

### Schema společných polí (per source YAML)

```yaml
# Required pro každý zdroj
id: string                           # globally unique, [a-z0-9-], stable forever (component klíč pro DB)
name: string                         # human-readable display name
url: string                          # canonical homepage URL
country: ISO3166                     # 'DE', 'CZ', 'UK', 'US', 'ZA', ...
lang: ISO639                         # 'de', 'en', 'cs', ... (LLM lang hint)
tier: 1 | 2 | 3                      # build phase priority
relevance_score: 1..3                # ⭐⭐⭐ z katalogu §15.6
source_quality_tier: 3 | 4           # link_evidence quality (3 = vanity, 4 = corporate blog)

# Capability flags
capabilities:
  has_rss: bool                      # má RSS feed?
  has_sitemap: bool                  # /sitemap.xml dostupný?
  requires_js: bool                  # nutný Playwright?
  has_paywall: bool                  # částečný paywall (scrape jen veřejný teaser)?
  has_api: bool                      # oficiální API s tokenem?
  geofenced: bool                    # blokuje non-EU/non-local IP?

# Topical filters
focus_segments:
  - automotive
  - manufacturing
  - chemicals
  - energy
  - logistics
  # ... mapování na naše interní segment IDs (§3 + §4)

# Scheduling
schedule:
  cron: "0 6 * * *"                  # daily 06:00 UTC, override per source
  freshness_window_days: 14          # při crawlu se ignorují články starší než N dní (re-crawly jindy)
  initial_backfill_days: 365         # při prvním napojení historie X dní

# Discovery — JAK najít nové články
discovery:
  pattern: rss | sitemap | listing | api      # choose one
  # ...pattern-specific fields below

# Extraction — JAK z článku vytáhnout obsah
extraction:
  pattern: readability | selectors | api      # choose one
  # ...pattern-specific fields below

# Pre-LLM filters — co zahodit BEZ LLM volání (úspora nákladů)
filters:
  min_word_count: 150
  exclude_url_patterns:
    - "/tag/"
    - "/category/"
    - "/sponsored/"                  # advertorials filtrované DO LLM, ne v ní
  exclude_title_regex: "^Ad:|^Sponsored:"
  must_match_segment: true           # pokud false po klasifikaci, zahodit

# Post-LLM validation
validation:
  require_entity_match_in_register: true   # entita musí jít resolvovat na ARES/HR/KRS, jinak zahodit link
  min_confidence: 0.3                      # links pod tímto thresholdem neukládat ani jako pending
  cross_reference_required: false          # pokud true, čeká se na 2. nezávislé potvrzení

# Compliance flags
compliance:
  robots_allow: true                       # pokud robots.txt zakazuje, scraper FATAL refuses
  copyright_excerpt_max_chars: 280         # do DB ukládáme jen excerpt, full text v R2 jen pro audit
  pii_redaction: true                      # automatický redact emailů, phone numbers, individual names mimo public roles
```

---

### Pattern A — RSS-friendly (~60 % sources, vč. všech major trade press)

**Typická charakteristika:** WordPress / klasický CMS, /feed/ funguje, články static HTML, čistý DOM.

```yaml
# data-sources/vanity/de/mm-maschinenmarkt.yml
id: mm-maschinenmarkt-de
name: "MM MaschinenMarkt"
url: https://www.maschinenmarkt.vogel.de
country: DE
lang: de
tier: 1
relevance_score: 3
source_quality_tier: 3

capabilities:
  has_rss: true
  has_sitemap: true
  requires_js: false
  has_paywall: false
  has_api: false
  geofenced: false

focus_segments: [manufacturing, automotive, chemicals, automation]

schedule:
  cron: "0 6,18 * * *"             # 2× denně
  freshness_window_days: 7
  initial_backfill_days: 365

discovery:
  pattern: rss
  rss_feeds:
    - https://www.maschinenmarkt.vogel.de/rss/news/
    - https://www.maschinenmarkt.vogel.de/rss/management/
    - https://www.maschinenmarkt.vogel.de/rss/produktion/

extraction:
  pattern: readability             # používá Mozilla Readability lib
  fallback_selectors:              # když readability selže, použij CSS selektory
    article_root: "article.cn-article"
    title: "h1.cn-article__title"
    body: ".cn-article__content"
    published_at: "time.cn-article__date[datetime]"   # ISO timestamp z atributu
    author: ".cn-article__author"

filters:
  min_word_count: 200
  exclude_url_patterns:
    - "/whitepaper/"
    - "/webinar/"

validation:
  require_entity_match_in_register: true
  min_confidence: 0.3

compliance:
  robots_allow: true
  copyright_excerpt_max_chars: 280
```

### Pattern B — Playwright-required (~25 % sources, vč. paywall-soft)

**Typická charakteristika:** Heavy JS render, SPA, infinite scroll, paywall přes 2 články/měs, anti-bot.

```yaml
# data-sources/vanity/fr/usine-nouvelle.yml
id: usine-nouvelle-fr
name: "L'Usine Nouvelle"
url: https://www.usinenouvelle.com
country: FR
lang: fr
tier: 1
relevance_score: 3
source_quality_tier: 3

capabilities:
  has_rss: true                    # má, ale jen excerpty; pro full text musíme přes JS
  has_sitemap: true
  requires_js: true
  has_paywall: true                # soft paywall — limit views/měs
  has_api: false
  geofenced: false

focus_segments: [manufacturing, automotive, aerospace, energy, defense]

schedule:
  cron: "0 7 * * *"
  freshness_window_days: 5
  initial_backfill_days: 180       # menší backfill kvůli paywall budgetu

discovery:
  pattern: sitemap
  sitemap_urls:
    - https://www.usinenouvelle.com/sitemap-news.xml
  sitemap_lastmod_filter_days: 5

extraction:
  pattern: selectors
  browser:
    engine: playwright
    runtime: chromium
    stealth: true                  # playwright-extra-plugin-stealth
    viewport: { width: 1366, height: 768 }
    block_resources: [image, media, font]   # úspora bandwidth
    accept_cookies_selector: "button[id='didomi-notice-agree-button']"
    paywall_detect_selector: ".paywall-screen"   # když se objeví, články SKIP (neporušujeme TOS)
  selectors:
    article_root: "article.article-content"
    title: "h1.article-title"
    body: ".article-body p"
    published_at: "meta[property='article:published_time']@content"
    author: ".article-author-name"

filters:
  min_word_count: 250
  exclude_url_patterns:
    - "/podcast/"
    - "/video/"
    - "/dossier/"

  # Paywall budget control — denně max N článků skrz JS scraper
  daily_request_quota: 30

validation:
  require_entity_match_in_register: true
  min_confidence: 0.35

compliance:
  robots_allow: true
  respect_paywall: true            # pokud paywall_detect_selector matchne, neukládat nic + log
  copyright_excerpt_max_chars: 200 # přísnější excerpt protože je to placený obsah
```

### Pattern C — API-key-needed (GDELT, oficiální feedy)

**Typická charakteristika:** Strukturovaná data, autentikace tokenem, often free tier s kvótou.

```yaml
# data-sources/vanity/_global/gdelt.yml
id: gdelt-global
name: "GDELT Project — News Event Database"
url: https://gdeltproject.org
country: GLOBAL
lang: multi                        # GDELT pokrývá 100+ jazyků; per-event lang field
tier: 1
relevance_score: 3
source_quality_tier: 2             # tier 2 protože GDELT je strukturovaný + ze zpráv tier 1+2

capabilities:
  has_rss: false
  has_sitemap: false
  requires_js: false
  has_paywall: false
  has_api: true
  geofenced: false

focus_segments: [all]              # filtrujeme až po pull (segment classifier)

schedule:
  cron: "*/30 * * * *"             # každých 30 min — GDELT updatuje co 15 min
  freshness_window_days: 1
  initial_backfill_days: 30        # historie přes BigQuery (samostatný job)

discovery:
  pattern: api
  api:
    endpoint: https://api.gdeltproject.org/api/v2/doc/doc
    auth_type: none                # GDELT je free bez tokenu
    query_params:
      query: "(industry OR factory OR plant OR supplier OR acquisition) AND (sourcecountry:DE OR sourcecountry:PL OR sourcecountry:UK OR ...)"
      mode: artlist
      maxrecords: 250
      format: json
      timespan: "30min"
    rate_limit_per_min: 60         # GDELT toleruje, ale buď slušný

extraction:
  pattern: api
  # GDELT vrací už strukturovaný JSON — nepotřebuje DOM parsing
  field_map:
    url: "$.url"
    title: "$.title"
    published_at: "$.seendate"
    language: "$.language"
    source_country: "$.sourcecountry"
    tone: "$.tone"                 # GDELT sentiment, ALE neukládat jako tone — viz §15.5 rule 3
    themes: "$.themes"
  # Pro full text článku se musí jít na URL (volitelný 2-step pull)
  fetch_full_text_if_segment_match: true
  full_text_fetcher: readability   # použij Readability na cílovou URL

filters:
  min_word_count: 150
  exclude_url_patterns:
    - "*.pdf"
    - "linkedin.com/posts/"        # GDELT občas indexuje LinkedIn — viz §15.5 rule 7
  must_match_segment: true         # post-pull klasifikace

validation:
  require_entity_match_in_register: true
  min_confidence: 0.3

compliance:
  robots_allow: true               # GDELT samo neporušuje, ale fetcher full-textu respektuje cílový robots.txt
  copyright_excerpt_max_chars: 280
```

### Pattern D — Trade body / Association reports (kvartální PDF nebo HTML reports)

**Typická charakteristika:** Nepublikuje denní news; vydává Q-/měsíční reports v PDF. Klíčové pro segment trends.

```yaml
# data-sources/vanity/eu/eurofer.yml
id: eurofer-eu
name: "EUROFER — European Steel Association"
url: https://www.eurofer.eu
country: EU
lang: en
tier: 1
relevance_score: 3
source_quality_tier: 2             # association reports = tier 2 (autoritativní pro segment)

capabilities:
  has_rss: false
  has_sitemap: true
  requires_js: false
  has_paywall: false
  has_api: false
  geofenced: false

focus_segments: [steel, manufacturing, metals]

schedule:
  cron: "0 8 * * 1"                # weekly Monday 08:00 UTC
  freshness_window_days: 30        # association cycle = pomalejší
  initial_backfill_days: 730       # 2 roky historie

discovery:
  pattern: sitemap
  sitemap_urls:
    - https://www.eurofer.eu/sitemap.xml
  url_must_match_regex: "/(publications|news|economic-and-steel-market-outlook)/"

extraction:
  pattern: selectors
  # Některé reports jsou PDF — special handling
  if_pdf:
    extractor: pdfplumber          # nebo Apache Tika
    table_extractor: tabula        # pro tabulky v reportech
    max_pages: 100
  selectors:
    article_root: ".content-wrapper"
    title: "h1.entry-title"
    body: ".entry-content"
    published_at: "time.entry-date[datetime]"

filters:
  min_word_count: 500              # association reports jsou delší

validation:
  require_entity_match_in_register: false   # reporty jsou aggregate, ne per firma
  treat_as: segment_data           # ukládá se do `segment_observations`, ne do `link_evidence`

compliance:
  robots_allow: true
  copyright_excerpt_max_chars: 500
```

---

### CI gate — validace configů

V `.github/workflows/validate-sources.yml`:

```yaml
name: Validate vanity scraper configs
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm validate-vanity-configs     # běží JSON Schema + smoke tests
      - run: pnpm smoke-test-vanity-source -- --id mm-maschinenmarkt-de --dry-run
```

`pnpm validate-vanity-configs` udělá:
1. JSON Schema validace každého YAML
2. Kontrola, že `id` je unique napříč repem
3. Kontrola, že `country` matchuje s `data-sources/registers/<country>/` (musí existovat connector)
4. `robots.txt` check — fetch a parse, fail PR když `disallow` matchuje `discovery.*.url`
5. URL reachability ping (HEAD request, 200/3xx OK)

### Smoke test (volá se manuálně i v CI při PR)

`pnpm smoke-test-vanity-source --id <source-id>`:
- Stáhne 5 nejnovějších URL z discovery
- Pustí extraction → ověří že vrací non-empty title + body
- Pustí LLM extraction prompt → ověří že vrací validní JSON dle schema
- Vrátí cost estimate per article + projected daily cost
- Output: `pass/fail/warn` per check + diff vs předchozí baseline

### Lifecycle — jak přidat nový source

```
1. Vytvoř soubor data-sources/vanity/<country>/<source-id>.yml dle Pattern A/B/C/D
2. Pull request → CI spustí validaci + smoke test
3. CI komentuje na PR s cost estimate, sample extractions, robots.txt status
4. Merge → production scraper hot-reloadne config (Inngest event 'config.reload')
5. První produkční crawl proběhne při dalším cron tick
6. Monitoring dashboard ukáže źdroj v "Newly added — first 48h" panelu pro human review
7. Po 48h se source promovuje do "Active" pokud:
   - ≥ 80 % článků prošlo validation
   - LLM cost < projected × 1.5
   - žádný copyright/robots flag
   - alespoň 5 extracted entities resolved against register
8. Pokud kterýkoli z guardů selže, source se auto-disabluje a vytvoří se issue v repu
```

### Test fixtures (per source)

Každý source MUSÍ mít fixture v `data-sources/vanity/<country>/<source-id>.fixtures/`:

```
mm-maschinenmarkt-de.fixtures/
├── article-1.html              # raw HTML zachycený playwright/curl
├── article-1.expected.json     # očekávaný extraction output (entities, links)
├── article-2.html
├── article-2.expected.json
└── ...
```

Při změnách extraction kódu nebo LLM promptů CI spustí všechny fixtures → diff výstupu → blokuje PR pokud regrese > 10 %.

### Příklad CLI workflow pro Claude Code

```bash
# 1. Bootstrap nového source ze známé šablony
pnpm new-vanity-source \
  --id industriaitaliana-it \
  --name "Industria Italiana" \
  --url https://www.industriaitaliana.it \
  --country IT --lang it --pattern rss

# 2. Stáhne 3 vzorové články, vytvoří fixtures, navrhne extraction selectors
pnpm bootstrap-fixtures --id industriaitaliana-it

# 3. Spustí smoke test
pnpm smoke-test-vanity-source --id industriaitaliana-it --dry-run

# 4. Pokud PASS → commit + push
git add data-sources/vanity/it/industriaitaliana-it.yml \
        data-sources/vanity/it/industriaitaliana-it.fixtures/
git commit -m "feat(scraper): add Industria Italiana (IT)"
gh pr create
```

---

## §15.8 Vanity extractor LLM prompt — `vanity-extractor-v3`

> Tento prompt je **datový asset**, ne kód. Žije v tabulce `prompts` v Postgres, verzuje se (v1, v2, v3…), A/B-testuje, edituje v Studio app **bez deploye**. Při změně promptu se automaticky spustí re-run posledních 100 článků z každého aktivního source a porovná output diff vs. baseline. Pokud regrese > 5 %, prompt nejde live.

### Volba jazyka

Prompt je v **angličtině** přesto, že produkt je česky. Důvod: LLM (Claude) trénovaný dominantně na anglických instrukcích = vyšší spolehlivost dodržování formátu. Vstupní článek může být v kterémkoliv jazyce (DE, PL, EN, FR, IT, ES, RO, HU, TR, AR…) — Claude rozumí všem dostatečně dobře. Entity names ponechat v původním jazyce + script (Latin, Cyrillic, Arabic).

### System prompt

```
You are a structured information extractor for IndustrySignal, an industrial
intelligence platform. Your job is to read one article and extract:

  1. ENTITIES — companies, organizations, and named individuals (executives only).
  2. LINKS — directional business relationships between those entities.
  3. META — language detection, segment classification, publication recency,
            and trust flags.

CORE RULES

R1. Extract facts only. Do NOT extract sentiment, predictions, or opinions
    unless they are direct quotes attributed to a named person — in which
    case capture them as `quote_attributed` links (see schema), NOT as facts.

R2. Preserve original-language names exactly as written. Do NOT translate
    "Strojírny Brno a.s." to "Brno Engineering Works" or "Türk Hava Yolları"
    to "Turkish Airlines". Keep the original script (Latin, Cyrillic, etc.).

R3. Skip generic mentions ("the company", "the supplier", "European OEMs")
    unless tightly bound to a specific named entity (e.g. "Tofas's supplier",
    where Tofas is the antecedent).

R4. Tense matters.
      Past tense ("acquired", "signed", "delivered") → confidence ≥ 0.6
      Present tense ("supplies", "operates", "owns") → confidence ≥ 0.5
      Future tense ("will expand", "plans to", "intends to") → confidence ≤ 0.4
                                                              AND set flag.speculative = true
      Conditional ("could", "may", "is reportedly considering") → DO NOT EMIT a link.

R5. Sponsored / advertorial detection.
      If you see any of these signals, set meta.advertorial_likelihood ≥ 0.7
      and lower ALL link confidences by 0.2:
        - The phrase "sponsored content", "advertorial", "promoted",
          "in partnership with [publisher]"
        - Uncritical, uniformly positive tone about a single subject company
        - No external sources, no comparisons, no negative facts
        - Article reads like a press release (CEO quoted in 3+ paragraphs,
          no third-party quotes)

R6. PII redaction.
      Capture named individuals ONLY if they hold a public corporate role
      (CEO, CFO, Board member, Founder, Owner). Do NOT extract:
        - Customer names, end-user testimonials
        - Family relations of executives unless they are corporate officers
        - Anonymous sources, "a person familiar with the matter"

R7. Date extraction.
      If a link has an explicit date or quarter ("since Q2 2023", "announced
      May 2024"), populate `valid_from`. If the article gives no date,
      leave null — DO NOT guess from publication date.

R8. Cite the evidence.
      Every link MUST have an `evidence_excerpt` field containing the
      VERBATIM sentence (or two adjacent sentences) from the article that
      supports it. Max 280 characters. No paraphrasing.

R9. Output VALID JSON ONLY. No prose, no markdown fences, no apologies.
    Match the schema below exactly. Unknown values → null. Empty arrays
    are valid.

OUTPUT SCHEMA

{
  "language": "ISO 639-1 code, detected from article body, e.g. 'de'",
  "segment_classification": ["array of segment IDs from this allowed list:
       automotive | manufacturing | chemicals | energy | logistics |
       construction | steel_metals | food_beverage | electronics |
       pharma | mining | aerospace | defense | textile | other"],
  "publication_date": "ISO 8601 if extracted from article, else null",
  "publication_recency_days": "integer, days between publication_date and
                               today, or null",
  "advertorial_likelihood": 0.0..1.0,
  "speculative_content_ratio": 0.0..1.0,
  "overall_extraction_confidence": 0.0..1.0,
  "flags": {
    "speculative": bool,
    "press_release_pattern": bool,
    "third_party_sources_present": bool,
    "contains_financial_figures": bool,
    "contains_named_executives": bool
  },
  "entities": [
    {
      "id": "local index, e.g. 'e1', 'e2' — used by links below",
      "type": "company | person | trade_body | government | other",
      "name_original": "string, as written in article",
      "name_normalized_guess": "lowercase, no legal suffix, no diacritics
                                — your best guess for resolver matching",
      "country_iso_hint": "ISO 3166-1 alpha-2 if inferable from article, else null",
      "role_in_article": "subject | partner | supplier | customer | competitor |
                          parent | subsidiary | acquirer | acquired | mentioned",
      "supporting_facts": {
        "headquartered_in": "city or region name as written, or null",
        "nace_guess": "NACE 2-digit category if confidently inferable, else null",
        "executive_role": "for person type only: CEO|CFO|COO|Founder|Owner|
                           Chair|Board|VP|MD, else null",
        "company_size_signal": "small|mid|large|unknown — based on
                                revenue/headcount mentions or null"
      }
    }
  ],
  "links": [
    {
      "from_entity_id": "e1",
      "to_entity_id": "e2",
      "link_type": "supplies | supplied_by | owns | owned_by | partners_with |
                    acquired | acquired_by | competes_with | employs |
                    employed_by | invests_in | invested_by | exports_to |
                    operates_in | quote_attributed",
      "valid_from": "ISO date or quarter (Q2-2024) if stated, else null",
      "valid_to": "ISO date if stated, else null",
      "confidence": 0.0..1.0,
      "evidence_excerpt": "verbatim quote, ≤ 280 chars",
      "additional_metadata": {
        "monetary_value": "integer in EUR if stated, else null",
        "contract_duration_months": "integer if stated, else null",
        "geographic_scope": "ISO country codes if specific, else null"
      }
    }
  ]
}

FEW-SHOT EXAMPLES

[EXAMPLE 1 — German manufacturing press]

INPUT:
"Die ARBURG GmbH + Co KG hat im zweiten Quartal 2024 einen Großauftrag von
TOFAS Türk Otomobil Fabrikası über 18 Spritzgießmaschinen für das Werk
in Bursa erhalten. Das Auftragsvolumen wird auf rund 12 Millionen Euro
geschätzt. ARBURG-Geschäftsführer Gerhard Böhm sagte, die Lieferung
beginne im ersten Quartal 2025."

OUTPUT:
{
  "language": "de",
  "segment_classification": ["automotive", "manufacturing"],
  "publication_date": null,
  "publication_recency_days": null,
  "advertorial_likelihood": 0.2,
  "speculative_content_ratio": 0.1,
  "overall_extraction_confidence": 0.85,
  "flags": {
    "speculative": false,
    "press_release_pattern": false,
    "third_party_sources_present": false,
    "contains_financial_figures": true,
    "contains_named_executives": true
  },
  "entities": [
    {"id":"e1","type":"company","name_original":"ARBURG GmbH + Co KG",
     "name_normalized_guess":"arburg",
     "country_iso_hint":"DE","role_in_article":"subject",
     "supporting_facts":{"nace_guess":"28","executive_role":null,
                         "company_size_signal":"large","headquartered_in":null}},
    {"id":"e2","type":"company","name_original":"TOFAS Türk Otomobil Fabrikası",
     "name_normalized_guess":"tofas turk otomobil fabrikasi",
     "country_iso_hint":"TR","role_in_article":"customer",
     "supporting_facts":{"nace_guess":"29","headquartered_in":"Bursa",
                         "company_size_signal":"large","executive_role":null}},
    {"id":"e3","type":"person","name_original":"Gerhard Böhm",
     "name_normalized_guess":"gerhard bohm",
     "country_iso_hint":"DE","role_in_article":"subject",
     "supporting_facts":{"executive_role":"MD",
                         "headquartered_in":null,"nace_guess":null,
                         "company_size_signal":null}}
  ],
  "links": [
    {"from_entity_id":"e1","to_entity_id":"e2","link_type":"supplies",
     "valid_from":"2024-Q2","valid_to":null,"confidence":0.7,
     "evidence_excerpt":"Die ARBURG GmbH + Co KG hat im zweiten Quartal 2024
                        einen Großauftrag von TOFAS Türk Otomobil Fabrikası
                        über 18 Spritzgießmaschinen für das Werk in Bursa
                        erhalten.",
     "additional_metadata":{"monetary_value":12000000,
                            "contract_duration_months":null,
                            "geographic_scope":["TR"]}},
    {"from_entity_id":"e3","to_entity_id":"e1","link_type":"employed_by",
     "valid_from":null,"valid_to":null,"confidence":0.9,
     "evidence_excerpt":"ARBURG-Geschäftsführer Gerhard Böhm sagte, die
                        Lieferung beginne im ersten Quartal 2025.",
     "additional_metadata":{"monetary_value":null,
                            "contract_duration_months":null,
                            "geographic_scope":null}}
  ]
}

[EXAMPLE 2 — Speculative future-tense article → minimal output]

INPUT:
"V příštím čtvrtletí by se mohla česká firma XYZ Plast pustit do expanze
na turecký trh, naznačil výroční zprávou. Konkrétní partneři ani objemy
zatím nejsou zveřejněny."

OUTPUT:
{
  "language": "cs",
  "segment_classification": ["manufacturing"],
  "publication_date": null,
  "publication_recency_days": null,
  "advertorial_likelihood": 0.3,
  "speculative_content_ratio": 0.9,
  "overall_extraction_confidence": 0.4,
  "flags": {
    "speculative": true,
    "press_release_pattern": false,
    "third_party_sources_present": false,
    "contains_financial_figures": false,
    "contains_named_executives": false
  },
  "entities": [
    {"id":"e1","type":"company","name_original":"XYZ Plast",
     "name_normalized_guess":"xyz plast",
     "country_iso_hint":"CZ","role_in_article":"subject",
     "supporting_facts":{"nace_guess":"22","headquartered_in":null,
                         "executive_role":null,"company_size_signal":null}}
  ],
  "links": []
  // No links emitted: future tense + no named counterparty + no date = R4 rejection
}

[EXAMPLE 3 — Sponsored content → advertorial flag + lowered confidences]

INPUT:
"Sponzorovaný obsah | Společnost Alfa Tech, lídr českého trhu, dlouhodobě
spolupracuje s mezinárodní skupinou Beta GmbH. Jejich partnerství trvá
už 10 let a přináší inovativní řešení pro náročné zákazníky."

OUTPUT:
{
  "language": "cs",
  "segment_classification": ["other"],
  "publication_date": null,
  "publication_recency_days": null,
  "advertorial_likelihood": 0.95,
  "speculative_content_ratio": 0.1,
  "overall_extraction_confidence": 0.45,
  "flags": {
    "speculative": false,
    "press_release_pattern": true,
    "third_party_sources_present": false,
    "contains_financial_figures": false,
    "contains_named_executives": false
  },
  "entities": [
    {"id":"e1","type":"company","name_original":"Alfa Tech",
     "name_normalized_guess":"alfa tech","country_iso_hint":"CZ",
     "role_in_article":"subject",
     "supporting_facts":{"nace_guess":null,"headquartered_in":null,
                         "executive_role":null,"company_size_signal":null}},
    {"id":"e2","type":"company","name_original":"Beta GmbH",
     "name_normalized_guess":"beta","country_iso_hint":"DE",
     "role_in_article":"partner",
     "supporting_facts":{"nace_guess":null,"headquartered_in":null,
                         "executive_role":null,"company_size_signal":null}}
  ],
  "links": [
    {"from_entity_id":"e1","to_entity_id":"e2","link_type":"partners_with",
     "valid_from":null,"valid_to":null,"confidence":0.3,
     "evidence_excerpt":"Společnost Alfa Tech, lídr českého trhu, dlouhodobě
                        spolupracuje s mezinárodní skupinou Beta GmbH.",
     "additional_metadata":{"monetary_value":null,
                            "contract_duration_months":null,
                            "geographic_scope":null}}
  ]
  // Confidence lowered from 0.5 base to 0.3 due to advertorial pattern
}

END OF SYSTEM PROMPT. Now process the article that follows.
```

### User-message template

Před článkem se v user message předá kontext:

```
ARTICLE METADATA (from scraper):
- Source: {source.name} ({source.country})
- Source tier: {source.tier} (vanity = 3, mainstream = 2)
- Article URL: {url}
- Detected publication date: {published_at_iso}
- Days since publication: {days_ago}

ARTICLE BODY:
"""
{full_text}
"""

Return JSON only.
```

### Post-LLM validation v kódu

Po vrácení JSON z Claude:

```typescript
// packages/enrichment/vanity-extractor/validate.ts
function postProcess(raw: any): ExtractionResult | RejectedExtraction {
  // 1. Zod schema validation — fail closed
  const parsed = ExtractionSchema.safeParse(raw);
  if (!parsed.success) return { reject_reason: 'schema_invalid', errors: parsed.error };

  const r = parsed.data;

  // 2. Hard guard: advertorial threshold
  if (r.advertorial_likelihood > 0.85) {
    return { reject_reason: 'likely_advertorial', meta: r };
  }

  // 3. Hard guard: speculative ratio
  if (r.speculative_content_ratio > 0.85 && r.links.length === 0) {
    return { reject_reason: 'too_speculative', meta: r };
  }

  // 4. Confidence ceiling per §15.5
  for (const link of r.links) {
    link.confidence = Math.min(link.confidence, 0.5); // vanity tier cap
  }

  // 5. Recency degradation
  if (r.publication_recency_days != null) {
    const yearsOld = r.publication_recency_days / 365;
    const decay = Math.pow(0.85, yearsOld);
    for (const link of r.links) link.confidence *= decay;
  }

  // 6. Entity resolution (next step — see §15.9)
  return r;
}
```

### Cost & latency

- Per article: ~1500 tokens in + ~600 tokens out → Haiku 4.5 ~$0.0007/article
- 500 articles/day napříč všemi Tier 1 sources → ~$0.35/day → **~€11/month**
- Latency p50: ~2.5s per article (parallel batch of 10 = ~3s wall)
- Když pochybnost (overall_extraction_confidence < 0.55) → re-run přes Sonnet 4.5 (~5 % cases) → marginal +€8/month

---

## §15.9 Entity resolver — fuzzy matching extracted entit na registry

> Cíl: vzít "ARBURG GmbH + Co KG" extrahovaný z článku a deterministicky propojit s entitou v `entity_identities` (DE Handelsregister) jako tu samou firmu. Když match není jistý → uložit jako `pending_entity` a postavit do fronty na human review.

### Vrstvy resolveru — od nejdražší po nejlevnější (kdy přejít na další)

```
                          ┌─────────────────────────┐
   extracted entity ─────▶│  L1: LEI deterministic  │── HIT (conf 1.0) ──▶ DONE
                          └────────────┬────────────┘
                                       │ miss
                          ┌────────────▼────────────┐
                          │  L2: exact normalized   │── HIT (conf 0.95) ─▶ DONE
                          │      name + country     │
                          └────────────┬────────────┘
                                       │ miss
                          ┌────────────▼────────────┐
                          │  L3: fuzzy multi-feature│── HIT > 0.92 ──────▶ auto-link (conf 0.92)
                          │      score              │── HIT 0.75-0.92 ───▶ pending_link
                          └────────────┬────────────┘                       (human review)
                                       │ miss < 0.75
                          ┌────────────▼────────────┐
                          │  L4: create new pending │── always ──────────▶ pending_entity
                          │      entity record      │                       (human review)
                          └─────────────────────────┘
```

### L1 — LEI deterministic lookup

```typescript
async function resolveByLEI(extracted: ExtractedEntity): Promise<Resolution | null> {
  // GLEIF má free public API — gleif.org/api/v1/lei-records
  if (extracted.supporting_facts?.lei) {
    const lei = extracted.supporting_facts.lei;
    const entity = await db.entities.findFirst({ where: { lei } });
    if (entity) return { matched: entity, confidence: 1.0, layer: 'L1_LEI' };

    // LEI nezná naše DB — fetch z GLEIF, vytvoř nový entity záznam
    const gleifRecord = await gleif.lookup(lei);
    if (gleifRecord) {
      const created = await createEntityFromGLEIF(gleifRecord);
      return { matched: created, confidence: 1.0, layer: 'L1_LEI_NEW' };
    }
  }
  return null;
}
```

### L2 — Exact normalized name + country match

```typescript
async function resolveByExactName(extracted: ExtractedEntity): Promise<Resolution | null> {
  const country = extracted.country_iso_hint;
  if (!country) return null;

  const normalized = normalizeCompanyName(extracted.name_original, country);
  // normalizeCompanyName — viz níže

  const matches = await db.entity_identities.findMany({
    where: {
      country_iso: country,
      normalized_legal_name: normalized,
    },
  });

  if (matches.length === 1) {
    return { matched: matches[0].entity, confidence: 0.95, layer: 'L2_EXACT' };
  }

  // Ambiguous — multiple companies with same normalized name (běžné, např. 200× "Trans s.r.o.")
  if (matches.length > 1) {
    return await disambiguateAmbiguousMatches(extracted, matches);
  }

  return null;
}
```

### Normalizace názvu firmy (per country)

```typescript
const LEGAL_SUFFIXES: Record<string, string[]> = {
  CZ: ['a.s.', 'a. s.', 'akciová společnost', 's.r.o.', 's. r. o.',
       'spol. s r.o.', 'společnost s ručením omezeným', 'k.s.',
       'v.o.s.', 'družstvo', 'státní podnik', 's.p.'],
  SK: ['a.s.', 's.r.o.', 'spol. s r.o.', 'k.s.', 'v.o.s.'],
  PL: ['sp. z o.o.', 'sp. z o. o.', 'spółka z ograniczoną',
       'spółka akcyjna', 's.a.', 'sa', 'spółdzielnia'],
  DE: ['gmbh', 'gmbh & co. kg', 'gmbh + co kg', 'gmbh & co kg',
       'ag', 'kg', 'kgaa', 'ohg', 'mbh', 'se'],
  AT: ['gmbh', 'ag', 'kg', 'ohg', 'se'],
  FR: ['s.a.', 'sa', 'sas', 'sarl', 's.a.r.l.', 'sci', 'sci',
       'snc', 'eurl', 'sasu'],
  IT: ['s.p.a.', 'spa', 's.r.l.', 'srl', 'sas', 'snc'],
  ES: ['s.a.', 'sa', 's.l.', 'sl', 's.l.u.', 'sca', 'scoop'],
  NL: ['b.v.', 'bv', 'n.v.', 'nv', 'cv', 'vof'],
  BE: ['s.a.', 'sa', 'nv', 'bv', 'srl', 'bvba'],
  UK: ['ltd', 'ltd.', 'limited', 'plc', 'plc.', 'llp', 'lp', 'cic'],
  US: ['inc', 'inc.', 'incorporated', 'corp', 'corp.', 'corporation',
       'llc', 'l.l.c.', 'lp', 'l.p.', 'co.', 'company'],
  TR: ['a.ş.', 'a.s.', 'anonim şirketi', 'limited şirketi', 'ltd. şti.',
       'tic. ltd.'],
  HU: ['kft.', 'zrt.', 'nyrt.', 'bt.'],
  RO: ['s.r.l.', 'srl', 's.a.', 'sa'],
  // ... continue per market
};

function normalizeCompanyName(raw: string, country: ISO3166): string {
  let s = raw;

  // 1. Lowercase + Unicode normalization
  s = s.toLowerCase().normalize('NFKD');

  // 2. Strip diacritics (Š → s, ě → e, ü → u)
  s = s.replace(/[\u0300-\u036f]/g, '');

  // 3. Replace punctuation with spaces, then collapse
  s = s.replace(/[.,\-&+]/g, ' ').replace(/\s+/g, ' ').trim();

  // 4. Strip country-specific legal suffixes (longest first to avoid partial)
  const suffixes = LEGAL_SUFFIXES[country] || [];
  suffixes.sort((a, b) => b.length - a.length);
  for (const suf of suffixes) {
    const sufNorm = suf.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
                       .replace(/[.,\-&+]/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.endsWith(' ' + sufNorm)) {
      s = s.slice(0, -(sufNorm.length + 1)).trim();
      break;
    }
  }

  // 5. Strip generic words (group, company, holding...) — only at ends
  const GENERIC = ['group', 'holding', 'holdings', 'company', 'co',
                   'industries', 'international', 'global'];
  for (const g of GENERIC) {
    if (s.endsWith(' ' + g)) s = s.slice(0, -(g.length + 1)).trim();
  }

  return s;
}

// Examples:
//   normalizeCompanyName('ARBURG GmbH + Co KG', 'DE')
//     → 'arburg'
//   normalizeCompanyName('TOFAS Türk Otomobil Fabrikası A.Ş.', 'TR')
//     → 'tofas turk otomobil fabrikasi'
//   normalizeCompanyName('Strojírny Brno, a.s.', 'CZ')
//     → 'strojirny brno'
//   normalizeCompanyName('OAO "Severstal" Group', 'RU')
//     → 'severstal' (after Cyrillic transliteration in step 2)
```

### L3 — Fuzzy multi-feature scorer

```typescript
async function resolveByFuzzy(
  extracted: ExtractedEntity,
  country: ISO3166,
): Promise<Resolution | null> {

  const normalized = normalizeCompanyName(extracted.name_original, country);

  // 1. Candidate pool — top 50 closest by Jaro-Winkler via Postgres `pg_trgm` index
  //    (předpokládá GIN index na normalized_legal_name)
  const candidates = await db.$queryRaw`
    SELECT entity_id, normalized_legal_name, registered_address,
           nace_local, officer_set,
           similarity(normalized_legal_name, ${normalized}) AS sim
    FROM entity_identities
    WHERE country_iso = ${country}
      AND similarity(normalized_legal_name, ${normalized}) > 0.4
    ORDER BY sim DESC
    LIMIT 50;
  `;

  if (candidates.length === 0) return null;

  // 2. Multi-feature scoring per candidate
  let bestScore = 0;
  let bestCandidate = null;

  for (const c of candidates) {
    let score = 0;

    // (a) Name similarity — weight 0.50
    //     Jaro-Winkler je už jako pg_trgm sim, take it.
    score += c.sim * 0.50;

    // (b) NACE match — weight 0.15
    if (extracted.supporting_facts?.nace_guess &&
        c.nace_local?.startsWith(extracted.supporting_facts.nace_guess)) {
      score += 0.15;
    }

    // (c) Headquartered_in city match — weight 0.15
    if (extracted.supporting_facts?.headquartered_in && c.registered_address) {
      const cityInArticle = extracted.supporting_facts.headquartered_in.toLowerCase();
      if (c.registered_address.toLowerCase().includes(cityInArticle)) {
        score += 0.15;
      }
    }

    // (d) Officer overlap — weight 0.20
    //     Pokud článek zmínil exec ("Geschäftsführer Gerhard Böhm"),
    //     a kandidát má v officer_set "Gerhard Böhm" → +0.20.
    if (extracted.linked_persons && c.officer_set) {
      const overlap = extracted.linked_persons.filter(
        p => c.officer_set.some(o => normalizePersonName(o) === normalizePersonName(p.name_original))
      );
      if (overlap.length > 0) score += 0.20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = c;
    }
  }

  // 3. Threshold decision
  if (bestScore >= 0.92) {
    return {
      matched: bestCandidate.entity,
      confidence: bestScore,
      layer: 'L3_FUZZY_AUTO',
    };
  }
  if (bestScore >= 0.75) {
    return {
      matched: bestCandidate.entity,
      confidence: bestScore,
      layer: 'L3_FUZZY_REVIEW', // links go to pending_links table
    };
  }

  return null;
}
```

### Disambiguation pro 1:N ambiguous matches

Když L2 vrátí 50 firem se stejným normalizovaným názvem (typické pro generická jména):

```typescript
async function disambiguateAmbiguousMatches(
  extracted: ExtractedEntity,
  candidates: EntityIdentity[],
): Promise<Resolution | null> {

  // Strategie: použij L3 multi-feature scorer na candidate set
  // (přeskoč name similarity, ta už je 1.0 u všech).
  // Decisivní jsou NACE + city + officer overlap.

  let bestScore = 0;
  let bestCandidate = null;

  for (const c of candidates) {
    let score = 1.0 * 0.50; // name match perfect
    // ... (same scoring as L3 (b), (c), (d))
    if (score > bestScore) { bestScore = score; bestCandidate = c; }
  }

  // Vyšší práh pro ambiguous (víc kandidátů = víc riziko false match)
  if (bestScore >= 0.85 && /* margin nad #2 kandidátem ≥ 0.1 */ marginIsClear) {
    return { matched: bestCandidate.entity, confidence: bestScore, layer: 'L2_DISAMBIG' };
  }

  return null; // padá do L4 (vytvoří se pending_entity s candidate hints v metadata)
}
```

### L4 — Pending entity creation

```typescript
async function createPendingEntity(extracted: ExtractedEntity, country: ISO3166)
  : Promise<Resolution> {

  const pending = await db.pending_entities.create({
    data: {
      country_iso: country,
      name_as_extracted: extracted.name_original,
      normalized_name: normalizeCompanyName(extracted.name_original, country),
      hints: extracted.supporting_facts,
      candidate_matches_from_l3: /* top 3 z L3 s confidence */,
      first_seen_in_article: extracted.evidence_url,
      first_seen_at: new Date(),
      review_status: 'awaiting_human',
    },
  });

  return {
    matched: null,
    pending_entity_id: pending.id,
    confidence: 0,
    layer: 'L4_NEW_PENDING',
  };
}
```

### Human review queue

Pending entities se zobrazují v Studio app v editoriální frontě:

```
Pending entities queue (47)
─────────────────────────────────────────────────────────
DE · "ARBURG GmbH + Co KG"
  First seen: 5 days ago in maschinenmarkt.vogel.de
  Candidates from fuzzy:
    1. ARBURG GmbH + Co. KG · Loßburg DE · sim 0.96  [LINK]
    2. Arburg Holding GmbH · Loßburg DE · sim 0.78    [LINK]
    3. Create new entity                              [CREATE]
  Articles waiting on this resolution: 12
  Mission impact: 2 missions affected once resolved

[Resolve →]
─────────────────────────────────────────────────────────
TR · "Tofas Türk Otomobil Fabrikası"
  First seen: 5 days ago in maschinenmarkt.vogel.de
  Candidates from fuzzy:
    1. TOFAŞ TÜRK OTOMOBİL FABRİKASI A.Ş. · Bursa TR · sim 0.99  [LINK]
  Articles waiting: 8
  ...
```

Editor jedním klikem rozhodne — pokud vybere kandidáta, **všech 12 čekajících article extracts se backfillne** v jednom transaction.

### Performance & scaling

- L1 (LEI lookup): O(1), DB index hit, ~5ms
- L2 (exact match): O(1), GIN trigram index, ~10ms
- L3 (fuzzy + features): top 50 trigram candidates + scoring, ~50-200ms per entity
- L4: write only, ~20ms

Při 500 článcích/den s průměrně 4 entitami/článek → 2000 resolutions/day → < 7 min CPU/day. **Neproblém.**

Při škálování > 5M entit v DB:
- Migrate trigram index z pg_trgm na **pg_vector + entity embeddings** (Sentence-Transformers multilingual model) — semantic similarity i napříč jazyky a transliteracemi
- Případně dedikovaná entity resolution služba jako **Splink** (open-source, scale-out)

### Recall vs precision metrics — co měřit

V `entity_resolution_runs` tabulce:

```sql
CREATE TABLE entity_resolution_runs (
  id              UUID PRIMARY KEY,
  extracted_at    TIMESTAMPTZ,
  layer_hit       TEXT,                          -- L1/L2/L3_AUTO/L3_REVIEW/L4
  confidence      NUMERIC,
  human_corrected BOOLEAN DEFAULT FALSE,         -- editor přepsal výsledek
  human_decision  TEXT,                          -- correct | wrong | added_new
  source_article_id UUID,
  resolved_entity_id UUID
);
```

KPIs:
- **L1+L2 hit rate**: cíl > 60 % (high-quality direct matches)
- **L3 auto-link false positive rate**: cíl < 2 % (kontrolováno human spot check)
- **L4 → human review backlog**: cíl < 7 dní p95
- **Per-country L1+L2 hit rate**: kdyby DE byl < 40 %, znamená to že connector neuploaduje normalized names — fix v connectoru, ne v resolveru.

---

## §16. Signal engine — co se hlídá za každou živou Mission

### Signal types (rozšiřitelné)

| Signal | Zdroj | Trigger | Tone |
|---|---|---|---|
| **Insolvency filed** | ISIR (CZ), Insolvenzbekanntmachungen (DE), MSiG (PL), İcra İflas (TR) | nový záznam | critical (red) |
| **Executive change** | registry diff (statutáři) | změna v `entity_identities` | high (amber) |
| **Production cut announced** | news NER + LLM classify | regex/LLM hit + confidence | high (amber) |
| **Capacity expansion** | building permit feeds (CZ ÚZSI, DE Genehmigungen) + news | hit + confidence | info (blue) |
| **Major contract win** | tender feeds (TED, EKAP, BZP, ...) | award notice | up (green) |
| **Customer concentration risk** | customs flow shift | top-1 partner > 40% share Q/Q | warn (yellow) |
| **Negative news cluster** | GDELT sentiment score over 7 days | rolling z-score > 2 | warn (yellow) |
| **Credit downgrade** | Bisnode subscription (až bude) | rating drop ≥ 2 notches | high (amber) |
| **M&A announcement** | Mergermarket + tender feeds | mentions | info (blue) |
| **Sanctions hit** | EU sanctions list, OFAC | match | critical (red) |

### Architektura

```
                          ┌──────────────────────────┐
   country connectors ───▶│   raw_observations  (DB) │
                          └──────────────┬───────────┘
                                         ▼
                          ┌──────────────────────────┐
                          │  classifier  (Haiku+rules)│
                          └──────────────┬───────────┘
                                         ▼
                          ┌──────────────────────────┐
                          │   signals  (DB)          │
                          └──────────────┬───────────┘
                                         ▼
                          ┌──────────────────────────┐
                          │   mission_subscriptions  │
                          │   (which mission cares?) │
                          └──────────────┬───────────┘
                                         ▼
                          ┌──────────────────────────┐
                          │  notification dispatcher │
                          └────┬─────────────────────┘
                               │
                       ┌───────┼────────────┬──────────┐
                       ▼       ▼            ▼          ▼
                  in-app    email digest  SMS      partner API
                  feed      (daily)       (crit)   (webhook)
```

`mission_subscriptions` = předem materializovaná tabulka `(mission_id, entity_id, signal_types[])` — když přijde signál, lookup je O(log n) místo full-scan všech missionů. Refresh této tabulky se děje při každé změně graph (Mission přidala entity, removed entity, atd.).

---

## §17. Mission output — jak to klient vidí

### V portálu (interactive view)

Nová root-level navigace **Missions** (přidat do sidebaru jako RPRT/ARCH atd.), s těmito sekcemi per mission:

1. **Brief** — co klient zadal (editovatelné — re-runs pipeline)
2. **Market Map** — geografická vizualizace + segmentová heatmapa target marketu
3. **Players** — tabulka top 50–200 hráčů (s filtry, sortable), per row drill-down do profilu
4. **Relationship Graph** — interaktivní force-directed graph (Cytoscape.js / Sigma.js), klientova firma uprostřed
5. **Opportunities** — bullet list strategických mezer (gap analysis, weak players, channel partners)
6. **Playbook** — strukturovaný markdown s editorial copy, citacemi, akčními kroky, PDF download
7. **Signals** — live feed pro tuto mission
8. **Settings** — refresh schedule (denně/týdně/měsíčně), notification preferences, sharing s kolegy

### Jako PDF / deck

Playbook se vyrendruje do **PDF (Playwright)** + **PPTX** (oba mají stejnou šablonu, render přes packages/exporters).

Playbook struktura per intent:

| Intent | Sekce playbooku |
|---|---|
| `expand` | Target market overview → Top 50 buyers → Channel partners → Pricing benchmarks → Regulatory hurdles → Go-to-market sequencing → Risk register |
| `replicate` | Competitor profile → Their channel mix → Their pricing → Their partnerships → Gaps in their coverage → Suggested counter-strategy |
| `scout` | Sector heatmap → Emerging winners → Insolvent / weak players → M&A candidates → Talent pool indicators |
| `defend` | Competitor moves in source market → Your weak supplier flanks → Customer concentration risk → Replacement supplier shortlist |
| `acquire` | Sector multiples → Target shortlist (financials + strategic fit) → UBO chains → Synergy hypotheses → Due-diligence checklist |

Šablony jsou v `packages/playbook-templates/` jako Markdown s mustache placeholdery + LLM prompt template per sekce.

---

## §18. Jak nové zakázky neznamenají manuální práci

> Toto je klíčové. Cílem je, že když přijde Plastika.cz → TR, nebo ČEZ → PL acquisition, nebo cokoli, vývojářský zásah do kódu **musí být ≤ 0 řádků** pro 80 % případů.

### Pravidla architektury, která tohle zajišťují

1. **Žádné `if (country === ...)` v business kódu.** Vše za `CountryConnector` rozhraním (§14). Nová země = nový soubor v `data-sources/<iso>/`.

2. **NACE/HS crosswalk jako data, ne kód.** Tabulka `code_crosswalk` v DB:
   ```
   from_system  | from_code | to_system | to_code | confidence
   NACE2_CZ     | 22.29     | NACE2     | 22.29   | 1.0
   NACE2        | 22.29     | TR_ISIC4  | 2229    | 0.95
   ```

3. **Intent → playbook section mapping je data.** `playbook_templates` tabulka, ne switch statement.

4. **LLM prompty jsou data.** `prompts` tabulka verzovaná, A/B-testovatelná, editovatelná v Studio app bez deployů.

5. **Connector capabilities introspection.** Když Mission potřebuje "ownership chain" a target market connector `hasOwnershipChain: false`, pipeline elegantně degradne: vyplní sekci s warning "*Ownership data unavailable for this market — see methodology*" místo crashe.

6. **Schema-driven data extraction.** Pro každý zdroj definovat **Zod/JSON schema** výstupu. Když registr změní formát, validace failne s konkrétní chybou → fix je v 1 souboru.

7. **Mission má `version` a `pipeline_run_id`.** Re-run pipeline s vylepšeným kódem regeneruje, ale stará verze zůstává auditovatelná pro klienta.

8. **Cost ceiling per mission.** `mission.budget_usd` — když pipeline překročí (kvůli LLM volání, placeným API), pauzne se a notifikuje admina. Žádná zakázka nepřekvapí účet.

### Mission přijde — co se stane krok za krokem (bez vývojářského zásahu)

```
Day 0   Klient v portálu klikne "New Mission" → wizard → submit
        ────────────────────────────────────────────────────────
Min  0  Validation: NACE existuje, target market má connector, capabilities pokryjí intent?
        Pokud ne → "Cannot run — missing capability X. ETA: Q3 2026 (sprint 12)."

Min  1  Pipeline scheduled. Inngest spustí `mission.resolve.v1` workflow.

Min  5  Step 1: NACE/HS expansion (Haiku, ~200 tokens).

Min  15 Step 2: Target market entity pull (paralelně přes connector).
        Per země rate-limited, retries, idempotent.

Hr   1  Step 3: Customs flows (Comext API).
        Step 4: Tenders (TED API).

Hr   2  Step 5: Graph build & entity resolution.

Hr   4  Step 6: Opportunity classifier (rules + Haiku).
        Step 7: Signal subscriptions vytvořeny.

Hr   6  Step 8: Playbook generation (Sonnet, ~3000 tokens, paralelně po sekcích).

Hr   7  Step 9: Human review queue → editorialní tým dostane notifikaci.

Hr  24  Editor schvaluje / upravuje → Publish.

Day 1+  Klient vidí v portálu, dostane email, signál layer běží denně.
```

**Žádný krok výše není manuální kód.** Editorial review je jediný human-in-the-loop step a ten je intentional (kvalitativní guardrail).

### Co stále vyžaduje ruční práci (a je OK)

- **Přidání nové země** — 1–3 dny vývoje na nový `CountryConnector` adapter
- **Editorial review playbooku** — 30–90 min na mission od analytika
- **Nový intent type** (`'partnership' | 'divestiture' | ...`) — nový playbook template + LLM prompt
- **Reklamace klienta** na výstup — analytik mission re-runne s upraveným briefem

---

## §19. Komerční model — adaptace na on-demand engine

### Změna od §6

Původní §6 počítal s ročními seat-based plány (Starter / Growth / Enterprise). To je **stále potřeba** pro periodický access (kvartální report, watch list, alerty) — ale **Missions samy o sobě mají per-mission pricing**.

### Doporučený pricing

| Tier | Co obsahuje | Cena |
|---|---|---|
| **Subscription Base** (Starter) | Portal access, kvartální report, watch list 5 entit, 1 mission/quarter | 60k Kč/rok |
| **Subscription Growth** | + 25 watchlist, 4 missions/quarter, prioritní support | 180k Kč/rok |
| **Subscription Enterprise** | + unlimited missions, API access, dedikovaný analyst, SLA | 600k+ Kč/rok |
| **Mission Add-on** (one-off) | Single mission bez subscription | 80k–250k Kč podle scope (počet target marketů × hloubka) |
| **Express Mission** | Dodání do 5 prac. dní, capacity-limited | 1.5× regular |
| **Custom data deal** | Klient poskytne vlastní data k enrichmentu → snížená cena | -20–30 % |

**Důležité:** Cena per mission **není čistě markup nákladů** — je to value-based pricing. Mission, která ušetří klientovi 6 měsíců strategy consulting (cca 2–4M Kč), může stát 250k Kč i kdyby vyrobení stálo 5k Kč v API nákladech.

### Anti-abuse / sustainability

- Subscription **nezahrnuje** unlimited missions ani u Enterprise tieru bez SLA — kreditní systém s "fair use" softlimitem (např. 4/quarter Enterprise) → over-quota mission má fast-track pricing.
- Missions **expirují** po 12 měsících z aktivního monitoringu (přesouvají se do "Archive" stavu, signální layer se vypne). Re-aktivace = re-run pipeline (50 % ceny nové).
- **Data delivery není transferable.** Klient nesmí přeprodávat výstupy. Lockdown přes mission watermarking v PDF + audit log API přístupů.

---

## §20. Co Claude Code dostane k Mission Engine — checklist

Když budete předávat:

1. ✅ Tento `HANDOFF.md` (kompletní, vč. §13–19)
2. ✅ Celý současný repo (design system, UI prototyp, tokeny)
3. ✅ Příkladové Mission Briefs ze dvou reálných situací (M2C→DE, Plastika→TR) — **napiš je jako klient by je napsal, ne strukturované**, AI to zparsuje. Bez nich pipeline nemá ground-truth pro tuning.
4. ✅ Seznam **prvních 3 target marketů**, na které se zaměřit (doporučení: CZ jako home + SK + DE — pokrývá 70 % zákazníků průmyslové ČR)
5. ✅ Sample data: per první 3 target markety stáhnout 1–2 reálné výroční zprávy + tender feedu + insolvenční záznam, jako fixture pro pipeline testy
6. ✅ Decision: Sayari subscription teď nebo až s 5. klientem? (doporučení: až s 5. klientem; do té doby OpenCorporates fallback)
7. ✅ Decision: Vlastní entity resolver (open-source Zingg.ai nebo Splink) vs. dependency na Bisnode? (doporučení: vlastní + Splink, levnější dlouhodobě)

---

## §21. Co tato revize znamená pro existující UI

Současný `ui_kits/portal/` byl postavený pro **periodický report-centric** produkt. Pro mission-engine produkt potřebuje:

1. **Navigaci přeskupit** — `Missions` jako primární top-level entity, ne `Aktuální report`. Nav order: `Missions / Report / Watch List / Alerts / Archiv / SRSC / Export Map`.
2. **Nová obrazovka: Mission detail** (8 sekcí dle §17).
3. **Nová obrazovka: Mission wizard** (5-krokový nastavovák briefu).
4. **Sidebar dashboard widget** — "Active missions: 3 · 2 fresh signals" místo "Risk map".
5. **Report a Watch List dál existují** — Report zůstává jako **trade publication** (marketing surface), Watch List jako primitivní mission ("monitor these entities").

Tahle redesign vrstva je **další work item pro Composer** (zde tento environment), ne pro Claude Code. Když budete připraveni — řekněte a navrhnu Mission wizard + detail view v editorial DNA. Doporučení pořadí:
1. Nejprve schválit `HANDOFF.md` jako celek
2. Pak v Composeru vyrobit Mission wizard + Mission detail mockup
3. Pak handoff do Claude Code s kompletním vizuálem

*Konec části II.*
