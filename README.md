# IndustrySignal Design System

A B2B intelligence platform for the Czech industrial sector. IndustrySignal delivers quarterly market intelligence reports, alerts, and watch lists to subscribed clients via a password-protected portal.

## Product Context

**IndustrySignal** is a subscription B2B intelligence service. Clients are decision-makers at industrial companies (manufacturing, energy, logistics, heavy industry) who need structured signal — not noise — about their markets, competitors, supply chains, and regulatory shifts.

The product surface in this design system is the **Client Portal** — a password-protected web dashboard that subscribers log into to read their reports.

### Core navigation
- **Aktuální report** — the current quarter's report (Q2 2026), structured in 5 sections
- **Archiv** — historical reports, browsable by quarter
- **Watch List** — entities (companies, segments, regions) the client is tracking
- **Alerty** — push notifications when something on the Watch List moves

### Audience
- Czech-speaking industrial decision-makers (CEOs, strategy directors, M&A teams, procurement leads)
- Used during the workday, often on a desktop, often alongside Excel and a coffee
- Demand: dense, scannable, professional, no fluff

### Sources used to build this system
> **Note:** No codebase, Figma file, or existing design assets were provided with the brief. The visual direction was synthesized from the written brief ("průmyslový, profesionální styl, tmavší tóny" — industrial, professional, darker tones) and the conventions of category-adjacent products (Bloomberg Terminal, Capital IQ, Sentieo, dark-mode analyst dashboards).
>
> When real brand assets become available — wordmark, custom typeface, real client examples, an existing app — the system should be reconciled against them.

---

## CONTENT FUNDAMENTALS

The voice of IndustrySignal is the voice of an **analyst writing for a peer**. Concise, specific, factual, never breathless.

### Language
- **Czech is primary.** All product chrome, navigation, and editorial copy is in Czech. English appears only for proper nouns, ticker symbols, and standard industrial acronyms (EBITDA, M&A, CAPEX, ESG, OEM).
- The portal addresses the user formally as **vy / vás / váš** (vykání). Never tykání. Industrial decision-makers are addressed with the respect of business correspondence.
- First person plural **"my"** is used when speaking as the IndustrySignal editorial team ("Sledujeme...", "V tomto kvartálu jsme zaznamenali...").

### Tone
- **Authoritative, not loud.** Statements are declarative and supported. Avoid hype words ("revoluční", "průlomový", "game-changer"). Prefer measurable claims with units.
- **Hedged when appropriate.** When something is signal-not-fact, label it: *Indikace*, *Riziko*, *Sledujeme*. Confidence is part of the message.
- **No marketing language inside the portal.** The portal is for paying subscribers; they have already been sold.

### Casing
- **Sentence case for navigation, headings, and buttons.** "Aktuální report", not "Aktuální Report".
- **ALL CAPS reserved for monospace category labels** rendered in IBM Plex Mono with letter-spacing — these label sections, statuses, and metric types ("VÝVOJ Q/Q", "RIZIKO: STŘEDNÍ", "SLEDOVANÉ").
- **Acronyms stay in caps.** ČEZ, EBITDA, M&A.

### Examples
**Good (in voice):**
> *"Marže ve zpracovatelském průmyslu klesly v Q2 o 1,8 p.b. meziročně. Tlak vychází primárně z energetických nákladů ve východních regionech."*

**Bad (off voice):**
> ~~*"Připravte se na revoluční změny v průmyslu! Nečekané trendy, které musíte znát!"*~~

**Good — alert copy (precise, specific, time-stamped):**
> *"VW Group ohlásil snížení produkce v Mladé Boleslavi o 12 % pro H2 2026. Přímý dopad na 4 firmy ve vašem Watch Listu."*

**Good — empty state (helpful, not chirpy):**
> *"Zatím sledujete 0 entit. Přidejte společnost, segment nebo region a my vás upozorníme, když se s nimi něco stane."*

### What we don't do
- **No emoji.** Never. Not in copy, not in navigation, not in alerts. The product is for people in suits or boilersuits, not in startup hoodies.
- **No exclamation marks.** Even in alerts.
- **No "we're so excited to..."** copy. No "Welcome aboard!" copy.
- **No long-form storytelling intros.** Get to the data.

---

## VISUAL FOUNDATIONS

The visual system is **graphite + signal amber**. Dark, precise, hairlines instead of shadows, monospace for data and labels.

### Mood
A monitoring console after dark. A reading lamp on a steel desk. A trading floor at 7am. The aesthetic ancestors are **Bloomberg Terminal, IBM enterprise software, industrial control panels, and modern fintech analyst tools (Sentieo, Koyfin)**.

### Color
- **Backgrounds**: a 12-step graphite scale running from `#06080B` (page void) through `#11151C` (sidebar) and `#161B23` (cards) to `#525A68` (disabled). Cool / slightly blue-shifted; never warm grey.
- **Foreground / text**: 4 functional levels — primary `#F2F4F7`, secondary `#C2C7CF`, tertiary `#9AA1AD`, muted `#737B89`. We use color hierarchy, not weight hierarchy, for most text levels.
- **Accent — Signal Amber**: `#F2BB54`. Used for **the brand mark, primary actions, active states, links, and one-thing-per-screen attention**. Deliberately scarce — too much amber and it stops being a signal.
- **Semantic**: green `#4FB07A` (positive / online), red `#E25C5C` (alert / negative), amber `#E8A52B` (watch / pending), blue `#5C9FE2` (informational). Each has a paired dark "bg" variant for filled status pills.
- **Never**: bluish-purple gradients, neon, pastel palettes, full-color photography that fights with the UI chrome.

### Type
- **IBM Plex Sans** for UI and editorial body. Plex was designed for IBM's enterprise software and carries the right industrial DNA.
- **IBM Plex Mono** for category labels (ALL CAPS + tracking), tickers, ID strings, percentages, and any tabular numeric.
- **IBM Plex Serif** kept available for rare editorial moments (long-form pull quotes, executive summaries) — used sparingly.
- Display sizes use **light weight (300)** with tightened tracking — restrained, not bombastic.
- **Numbers are always tabular** (`font-variant-numeric: tabular-nums`). Columns of figures must align.

### Spacing & layout
- **4px base** scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96.
- **Density is intentional.** Body 14px, captions 12px, mono micro labels 11px. The audience reads dense data willingly; we don't waste vertical space.
- **Layout**: a **fixed left sidebar (240px)** + main content area. The main area uses a 12-column grid at desktop, ~24px gutters. Tables and charts take full width; editorial reading width caps at ~720px.

### Borders, dividers, hairlines
- **The system uses hairlines, not shadows, as its default separator.** Borders are 1px, near-transparent (`rgba(255,255,255,0.06)`) for the softest divisions, escalating to `--graphite-700` (`#2C3441`) for stronger card edges.
- Cards have a 1px border + flat fill. **No "elevated" floating cards** in the default state — that aesthetic is reserved for menus and overlays.

### Shadows
- Used **almost never** in the resting state.
- Reserved for: dropdown menus, modal overlays, tooltips, the focus glow of an active alert.
- The signature amber-glow elevation `--elev-glow-amber` is reserved for **one-at-a-time** moments: an alert that just fired, the active row of a watch list.

### Corner radii
- **Sharp by default.** `--r-sm: 4px` for inputs and buttons. `--r-md: 6px` for cards. `--r-lg: 8px` for modals. Pills (`999px`) for status badges.
- Never the soft, rounded "consumer app" 16-24px radii.

### Backgrounds & textures
- **No background images, no full-bleed photography, no illustrations.**
- A subtle **scanline / grid texture** is permitted on hero panels and login screens — `1px dotted graphite-700` at 24px or 32px spacing — to evoke an industrial CAD / control-panel surface. Used sparingly.
- Charts may use **horizontal hairline gridlines only** (no vertical, no full grid). Y-axis labels in mono 11px.

### Animation
- **Restrained and quick.** Default duration 200ms, ease-out. Hovers 120ms.
- **Fades and slides only.** No bouncing, no spring physics, no large translates.
- **Live data updates** flash the new value with a 320ms amber-bg pulse, then settle.
- Loading states are skeleton bars in `--graphite-800` with a subtle 1.5s left-to-right shimmer at 4% opacity. No spinners on individual data tiles.

### Hover states
- **Backgrounds shift one step lighter on the graphite scale** (e.g. `--bg-card` → `--bg-card-hover`). Never opacity changes for clickable surfaces.
- **Text links** add a 1px amber underline at 50% opacity on hover, full on focus.
- **Icon buttons** add a `--bg-card` background swatch at 4px radius on hover.

### Press / active states
- Buttons darken **one step on the graphite scale**, no scale transform. Industrial buttons don't shrink.
- The active item in the sidebar gets a **2px amber left border** + `--accent-soft` background. This is the system's primary "you are here" pattern.

### Focus
- **2px amber outline** at 2px offset, never the default browser ring. Always visible — accessibility is non-negotiable.

### Transparency, blur
- Modal overlays use `rgba(6,8,11,0.78)` over the page (no blur — clarity over fashion).
- A `backdrop-filter: blur(8px)` is allowed only on the alerts dropdown, where the page contents below should remain partially legible.

### Imagery
- **The portal uses essentially no decorative imagery.** It's a data product.
- When imagery is unavoidable (e.g. company logos in a watch list), it's rendered **monochrome, in `--fg-tertiary`**, at small sizes (16-24px), like a Bloomberg ticker. Color logos break the chrome.

### Card anatomy
A typical IndustrySignal card:
- Background: `--bg-card` (`#161B23`)
- Border: `1px solid --ln-divider` (`#1C222C`)
- Radius: `--r-md` (6px)
- Padding: `--sp-6` (24px)
- Header: mono ALL-CAPS label in `--fg-tertiary`
- Body: data, large numeric in `--fg-primary` mono
- Footer: optional Δ delta in semantic color

### Layout rules — fixed elements
- **Sidebar is always fixed-position**, full height, 240px wide.
- **Top bar is fixed at 56px**, hosting search + alerts bell + user menu.
- The **main content area scrolls independently**; sidebar and top bar do not scroll with content.

---

## ICONOGRAPHY

The IndustrySignal portal uses a **single, restrained line-icon set** rendered in `--fg-tertiary` at 16px or 20px stroke-width 1.5px. Icons are **functional, never decorative**.

### Icon source
**Lucide** (https://lucide.dev) is the chosen library. It's MIT-licensed, ~1500 icons, consistent 1.5px stroke, fits the industrial aesthetic perfectly. Loaded via CDN: `https://unpkg.com/lucide@latest/dist/lucide.min.js`.

> **Substitution flag:** No icon set was specified in the brief. Lucide is our default substitution because (a) it ships consistently sized stroke-1.5 line icons, (b) it has wide industrial-monitoring icon coverage (`activity`, `bell`, `bookmark`, `archive`, `radio-tower`, `siren`), and (c) it integrates well with both React and vanilla HTML. **If the client has a preferred icon system, this should be swapped at the foundations level.**

### Icons used in the portal nav
- `file-text` — Aktuální report
- `archive` — Archiv
- `bookmark` — Watch List
- `bell` — Alerty (with red badge dot when unread)
- `search` — top-bar search
- `user` — user menu
- `chevron-right`, `chevron-down` — tree expansion, sort
- `arrow-up`, `arrow-down` — Q/Q delta indicators
- `radio-tower` — live signal
- `external-link` — link to external source

### Logo / wordmark
A custom industrial wordmark **"INDUSTRYSIGNAL"** set in IBM Plex Mono SemiBold, all-caps, with a small amber square mark `▮` preceding it. The square represents a "signal lamp" lit. Provided in `assets/logo-mark.svg` and `assets/logo-wordmark.svg`.

> **Flag:** This is a placeholder wordmark synthesized to match the system's visual language. If the client has an existing logo, it should replace these two SVG files.

### Emoji
**Never used.** Not in alerts, not in copy, not in onboarding. See Content Fundamentals.

### Unicode glyphs
- The amber **▮** (filled rectangle) is used as the brand mark and as a "signal-on" indicator inline in copy.
- **▲ ▼** (triangles) for delta direction in compact contexts.
- **·** (middle dot) for breadcrumb / inline metadata separators.
- No other unicode used as iconography.

---

## INDEX — what's in this folder

```
.
├── README.md                      # this file
├── colors_and_type.css            # all CSS tokens (colors, type, spacing, radii)
├── SKILL.md                       # Agent Skill manifest
├── assets/
│   ├── logo-mark.svg              # square amber mark only
│   └── logo-wordmark.svg          # full wordmark
├── preview/                       # Design System tab cards (~700×N each)
│   ├── colors-graphite.html
│   ├── colors-amber.html
│   ├── colors-semantic.html
│   ├── type-display.html
│   ├── type-body.html
│   ├── type-mono-labels.html
│   ├── spacing-radii.html
│   ├── elevation-borders.html
│   ├── component-buttons.html
│   ├── component-inputs.html
│   ├── component-status-pills.html
│   ├── component-data-tile.html
│   ├── component-table-row.html
│   ├── component-sidebar.html
│   ├── component-alerts.html
│   └── brand-logo.html
└── ui_kits/
    └── portal/
        ├── README.md              # how to use the portal kit
        ├── index.html             # interactive client-portal prototype
        ├── tokens.css             # imports colors_and_type
        ├── App.jsx                # router / state / login gate
        ├── Sidebar.jsx
        ├── TopBar.jsx
        ├── ReportView.jsx         # the Q2 2026 report w/ 5 sections
        ├── ArchiveView.jsx
        ├── WatchListView.jsx
        ├── AlertsView.jsx
        ├── LoginView.jsx
        ├── primitives.jsx         # Button, Input, Pill, Card, Tile, etc.
        └── data.js                # mock report content
```

### Where to start
1. Open `colors_and_type.css` — every visual token lives there.
2. Read this README's **Content Fundamentals** and **Visual Foundations** sections to absorb voice + visual rules.
3. Open `ui_kits/portal/index.html` in a browser to see the system in motion. Log in (any password) to access the portal.
4. Inspect individual component files in `ui_kits/portal/` for copy-paste-ready building blocks.

### Asks for the user
- **Real wordmark / logo** if one exists — current files are placeholders.
- **Real font files** if a custom industrial typeface is preferred — IBM Plex (Google Fonts) is the current substitution.
- **Confirmation of icon library** — Lucide is the substitution; swap if the client has a preference.
- **Real Q2 2026 editorial copy** — the 5-section report uses synthesized placeholder copy in the right Czech voice; happy to reflow when the real copy lands.

---

## Local development

The portal app + jobs run against Postgres 16 in docker-compose. First-run:

```bash
pnpm install
pnpm test:e2e:install         # one-off: pull Playwright browsers
pnpm db:up                    # boot Postgres on localhost:5433
pnpm db:migrate               # apply Drizzle migrations
pnpm db:seed                  # load the E2E fixture (1 org, 5 alerts, 3 watch entries)
pnpm dev                      # next dev on :3000

# Run the end-to-end Playwright suite (orchestrates db:up → migrate → seed → tests):
pnpm test:e2e

# Wipe + reseed if the fixture drifted:
pnpm db:reset
```

Sign in at `/dev-login` with `admin@test.local` (seeded) or any new address — a personal org is auto-provisioned on first sign-in.
