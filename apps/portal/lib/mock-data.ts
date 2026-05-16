// Bilingual report mock data. Ported from ui_kits/portal/data.js (CS + EN
// halves of the `report` slice).
//
// Sprint 1 commit 6 uses this directly in ReportView. The real source —
// reports table in Postgres, edited via apps/studio — replaces this in
// Sprint 4. Until then the structure is deliberately preserved 1:1 with
// the prototype shape so the porting stays mechanical.
//
// Watchlist / alerts / srsc / xmap slices from the prototype's data.js
// land with their respective view ports in subsequent commits.

import type { Lang } from '@industrysignal/i18n';

export type KpiDir = 'up' | 'dn' | 'warn';

export interface ReportKpi {
  label: string;
  value: string;
  delta: string;
  dir: KpiDir;
}

export interface ReportSection {
  id: string;
  kind: string;
  title: string;
  summary: string;
  body: string[];
  kpis?: ReportKpi[];
}

export interface ReportRelatedAlert {
  ticker: string;
  delta: string;
  dir: 'up' | 'dn';
}

export interface Report {
  quarter: string;
  publishedAt: string;
  title: string;
  lead: string;
  keyRatios: ReportKpi[];
  sections: ReportSection[];
  relatedAlerts: ReportRelatedAlert[];
}

const cs: Report = {
  quarter: 'Q2 2026',
  publishedAt: '14. května 2026',
  title: 'Český průmysl v Q2 2026',
  lead: 'Druhý kvartál přinesl ochlazení v zakázkové výrobě napříč středoevropským regionem.',
  keyRatios: [
    { label: 'HDP Q/Q', value: '+0,4 %', delta: '−0,3 p.b.', dir: 'dn' },
    { label: 'PMI výroba', value: '47,8', delta: '−1,2', dir: 'dn' },
    { label: 'Inflace CPI', value: '2,8 %', delta: '−0,1 p.b.', dir: 'up' },
    { label: 'EUR/CZK', value: '24,82', delta: '+0,4 %', dir: 'warn' },
    { label: 'BRENT', value: '78,42', delta: '+1,2 %', dir: 'up' },
  ],
  sections: [
    {
      id: 'macro',
      kind: 'Makro',
      title: 'Makroekonomický kontext',
      summary:
        'Česká ekonomika v Q2 zpomalila tempo růstu na 0,4 % Q/Q. Inflace zůstává pod 3 %, ale energetické náklady pro průmysl meziročně vzrostly o 4,2 %.',
      kpis: [
        { label: 'HDP Q/Q', value: '+0,4 %', delta: '−0,3 p.b.', dir: 'dn' },
        { label: 'PMI výroba', value: '47,8', delta: '−1,2', dir: 'dn' },
        { label: 'Inflace', value: '2,8 %', delta: '−0,1 p.b.', dir: 'up' },
        { label: 'EUR/CZK', value: '24,82', delta: '+0,4 %', dir: 'warn' },
      ],
      body: [
        'Česká ekonomika v Q2 2026 zpomalila tempo růstu HDP na 0,4 % mezi-čtvrtletně. Vyšší úrokové sazby, slabší zahraniční poptávka a pokračující tlak na energetické vstupy začínají promítat se do reálných čísel.',
        'PMI ve výrobě zůstává pátý měsíc v řadě pod hranicí 50 bodů. Sledujeme zejména ochlazení v automotive řetězci, kde Škoda Auto a VW Group ohlásili snížení produkčních plánů pro H2.',
      ],
    },
    {
      id: 'segments',
      kind: 'Segmenty',
      title: 'Vývoj v klíčových segmentech',
      summary: 'Strojírenství a hutnictví pod tlakem. Energetika a logistika v plusu. Chemie stagnuje.',
      kpis: [
        { label: 'Strojírenství Δ', value: '−1,8 %', delta: 'Q/Q', dir: 'dn' },
        { label: 'Hutnictví Δ', value: '−5,8 %', delta: 'Q/Q', dir: 'dn' },
        { label: 'Energetika Δ', value: '+1,2 %', delta: 'Q/Q', dir: 'up' },
        { label: 'Logistika Δ', value: '+2,1 %', delta: 'Q/Q', dir: 'up' },
      ],
      body: [
        'Strojírenský segment pokračuje v ochlazování. Marže klesly v Q2 o 1,8 p.b. meziročně. Tlak vychází primárně z energetických nákladů ve východních regionech a ze zpoždění v automotive řetězci.',
        'Hutnictví zaznamenalo nejhorší kvartál od roku 2023. Cena válcovaného plechu propadla o 5,8 % WoW v polovině května. Vítkovice Steel a Třinecké železárny ohlásily revizi plánů pro H2.',
      ],
    },
    {
      id: 'risks',
      kind: 'Rizika',
      title: 'Riziková mapa',
      summary: 'Tři vysoká, čtyři střední, dvě nízká rizika sledovaná v tomto kvartálu.',
      kpis: [
        { label: 'Riziko vysoké', value: '3', delta: '+1 vs Q1', dir: 'dn' },
        { label: 'Riziko střední', value: '4', delta: '−1 vs Q1', dir: 'up' },
        { label: 'Riziko nízké', value: '2', delta: '+1 vs Q1', dir: 'up' },
      ],
      body: [
        'Energetická bezpečnost (vysoké) — tlak na ceny zemního plynu z titulu obnovené volatility v Asii.',
        'Automotive supply chain (vysoké) — VW Group Q3/Q4 plány -12 %.',
        'Regulace ESG reportingu (střední) — CSRD vstupuje do třetí vlny pro střední firmy v Q3.',
      ],
    },
    {
      id: 'companies',
      kind: 'Firmy',
      title: 'Pohyby ve sledovaných firmách',
      summary: 'Z 147 sledovaných entit zaznamenalo 23 významný pohyb v Q2.',
      body: [
        'Škoda Auto a.s. — produkce v Mladé Boleslavi pro H2 revidována o −12 %. Dopad na 4 firmy ve vašem Watch Listu.',
        'ČEZ a.s. — tržby Q2 nad konsensem o +1,2 p.b. Pozitivní indikace pro distribuci.',
        'Vítkovice Steel — Q2 EBITDA −5,8 % Q/Q. Riziko: vysoké.',
      ],
    },
    {
      id: 'outlook',
      kind: 'Výhled',
      title: 'Výhled na H2 2026',
      summary: 'Sledujeme tři klíčové signály: energetické ceny, automotive produkční plány, vývoj EUR/CZK.',
      body: [
        'V druhé polovině roku očekáváme stabilizaci v energetice a další tlak v automotive. EUR/CZK zůstává klíčovým makro signálem.',
        'Sledujeme: ECB sazbové rozhodnutí (12. 6.), Škoda Auto Q2 výsledky (28. 7.), revizi PMI za červen (1. 7.).',
      ],
    },
  ],
  relatedAlerts: [
    { ticker: 'CEZ EQ · pozit.', delta: '+1,2%', dir: 'up' },
    { ticker: 'VTK EQ · neg.', delta: '−5,8%', dir: 'dn' },
  ],
};

const en: Report = {
  quarter: 'Q2 2026',
  publishedAt: 'May 14, 2026',
  title: 'Czech industry in Q2 2026',
  lead: 'The second quarter brought a cooling in contract manufacturing across the Central European region.',
  keyRatios: [
    { label: 'GDP Q/Q', value: '+0.4%', delta: '−0.3 pp', dir: 'dn' },
    { label: 'Mfg PMI', value: '47.8', delta: '−1.2', dir: 'dn' },
    { label: 'CPI', value: '2.8%', delta: '−0.1 pp', dir: 'up' },
    { label: 'EUR/CZK', value: '24.82', delta: '+0.4%', dir: 'warn' },
    { label: 'BRENT', value: '78.42', delta: '+1.2%', dir: 'up' },
  ],
  sections: [
    {
      id: 'macro',
      kind: 'Macro',
      title: 'Macroeconomic context',
      summary:
        'The Czech economy slowed Q/Q growth to 0.4% in Q2. Inflation stays below 3%, but industrial energy costs rose 4.2% YoY.',
      kpis: [
        { label: 'GDP Q/Q', value: '+0.4%', delta: '−0.3 pp', dir: 'dn' },
        { label: 'Mfg PMI', value: '47.8', delta: '−1.2', dir: 'dn' },
        { label: 'Inflation', value: '2.8%', delta: '−0.1 pp', dir: 'up' },
        { label: 'EUR/CZK', value: '24.82', delta: '+0.4%', dir: 'warn' },
      ],
      body: [
        'The Czech economy slowed Q/Q GDP growth to 0.4% in Q2 2026. Higher rates, weaker external demand and continued pressure on energy inputs are now showing up in the real numbers.',
        'Manufacturing PMI sits below 50 for the fifth month running. We are watching the automotive chain in particular, where Škoda Auto and VW Group have cut H2 production plans.',
      ],
    },
    {
      id: 'segments',
      kind: 'Segments',
      title: 'Key segment performance',
      summary: 'Engineering and metallurgy under pressure. Energy and logistics positive. Chemicals flat.',
      kpis: [
        { label: 'Engineering Δ', value: '−1.8%', delta: 'Q/Q', dir: 'dn' },
        { label: 'Metallurgy Δ', value: '−5.8%', delta: 'Q/Q', dir: 'dn' },
        { label: 'Energy Δ', value: '+1.2%', delta: 'Q/Q', dir: 'up' },
        { label: 'Logistics Δ', value: '+2.1%', delta: 'Q/Q', dir: 'up' },
      ],
      body: [
        'The engineering segment continues to cool. Margins fell 1.8 pp YoY in Q2. Pressure comes mainly from energy costs in eastern regions and delays in the automotive supply chain.',
        'Metallurgy posted its worst quarter since 2023. Hot-rolled steel prices dropped 5.8% WoW in mid-May. Vítkovice Steel and Třinecké železárny cut H2 plans.',
      ],
    },
    {
      id: 'risks',
      kind: 'Risks',
      title: 'Risk map',
      summary: 'Three high, four medium, two low risks tracked this quarter.',
      kpis: [
        { label: 'High risk', value: '3', delta: '+1 vs Q1', dir: 'dn' },
        { label: 'Medium risk', value: '4', delta: '−1 vs Q1', dir: 'up' },
        { label: 'Low risk', value: '2', delta: '+1 vs Q1', dir: 'up' },
      ],
      body: [
        'Energy security (high) — pressure on natural gas prices from renewed volatility in Asia.',
        'Automotive supply chain (high) — VW Group Q3/Q4 plans −12%.',
        'ESG reporting regulation (medium) — CSRD enters its third wave for mid-cap firms in Q3.',
      ],
    },
    {
      id: 'companies',
      kind: 'Companies',
      title: 'Movements in tracked companies',
      summary: 'Out of 147 tracked entities, 23 made a significant move in Q2.',
      body: [
        'Škoda Auto a.s. — Mladá Boleslav production for H2 revised by −12%. Impact on 4 companies in your Watch List.',
        'ČEZ a.s. — Q2 revenue beat consensus by +1.2 pp. Positive read-through for distribution.',
        'Vítkovice Steel — Q2 EBITDA −5.8% Q/Q. Risk: high.',
      ],
    },
    {
      id: 'outlook',
      kind: 'Outlook',
      title: 'Outlook for H2 2026',
      summary: 'Three signals to watch: energy prices, automotive production plans, EUR/CZK trajectory.',
      body: [
        'In the second half we expect stabilization in energy and continued pressure in automotive. EUR/CZK remains the key macro signal.',
        'On the calendar: ECB rate decision (Jun 12), Škoda Auto Q2 results (Jul 28), June PMI revision (Jul 1).',
      ],
    },
  ],
  relatedAlerts: [
    { ticker: 'CEZ EQ · pos.', delta: '+1.2%', dir: 'up' },
    { ticker: 'VTK EQ · neg.', delta: '−5.8%', dir: 'dn' },
  ],
};

const REPORTS: Record<Lang, Report> = { cs, en };

export function getReport(lang: Lang): Report {
  return REPORTS[lang];
}

// ============================================================
// ARCHIVE / WATCH LIST / ALERTS — bilingual slices ported from
// ui_kits/portal/data.js. DB-backed versions land in Sprint 3+.
// ============================================================

export interface ArchiveRow {
  q: string;
  date: string;
  title: string;
}

export interface WatchlistRow {
  ticker: string;
  name: string;
  sub: string;
  segment: string;
  status: 'up' | 'dn' | 'warn';
  delta: string;
  dir: 'up' | 'dn';
  last: string;
}

export interface AlertRow {
  id: string;
  tone: 'up' | 'dn' | 'warn';
  kind: string;
  target: string;
  body: string;
  time: string;
  fresh: boolean;
  ticker?: string;
}

interface PortalSlice {
  archive: ArchiveRow[];
  watchlist: WatchlistRow[];
  alerts: AlertRow[];
}

const csSlice: PortalSlice = {
  archive: [
    { q: 'Q1 2026', date: '14. února 2026', title: 'Pomalý start roku 2026' },
    { q: 'Q4 2025', date: '12. listopadu 2025', title: 'Konec roku ve znamení energetiky' },
    { q: 'Q3 2025', date: '14. srpna 2025', title: 'Letní stagnace v automotive' },
    { q: 'Q2 2025', date: '15. května 2025', title: 'První pololetí 2025' },
    { q: 'Q1 2025', date: '14. února 2025', title: 'Pozvolné oživení po recesi' },
    { q: 'Q4 2024', date: '12. listopadu 2024', title: 'Závěr náročného roku 2024' },
  ],
  watchlist: [
    { ticker: 'SKDA', name: 'Škoda Auto a.s.', sub: 'CZ · OEM', segment: 'Automotive', status: 'warn', delta: '−2,4 %', dir: 'dn', last: '14. 5.' },
    { ticker: 'CEZ',  name: 'ČEZ a.s.', sub: 'CZ · Energetika', segment: 'Energetika', status: 'up', delta: '+1,2 %', dir: 'up', last: '12. 5.' },
    { ticker: 'VITS', name: 'Vítkovice Steel', sub: 'CZ · Hutnictví', segment: 'Hutnictví', status: 'dn', delta: '−5,8 %', dir: 'dn', last: '14. 5.' },
    { ticker: 'TZIN', name: 'Třinecké železárny', sub: 'CZ · Hutnictví', segment: 'Hutnictví', status: 'warn', delta: '−3,1 %', dir: 'dn', last: '13. 5.' },
    { ticker: 'UNIP', name: 'Unipetrol RPA', sub: 'CZ · Chemie', segment: 'Chemie', status: 'up', delta: '+0,6 %', dir: 'up', last: '11. 5.' },
    { ticker: 'CDCG', name: 'ČD Cargo', sub: 'CZ · Logistika', segment: 'Logistika', status: 'up', delta: '+2,1 %', dir: 'up', last: '10. 5.' },
    { ticker: 'TATR', name: 'Tatra Trucks', sub: 'CZ · OEM', segment: 'Automotive', status: 'warn', delta: '−1,4 %', dir: 'dn', last: '14. 5.' },
  ],
  alerts: [
    { id: 'a1', tone: 'dn', kind: 'Alert', target: 'Vítkovice Steel', body: 'Cena válcovaného plechu propadla −5,8 % WoW. Indikace dopadu na 4 firmy ve vašem Watch Listu.', time: '14:32', fresh: true },
    { id: 'a2', tone: 'warn', kind: 'Watch', target: 'VW Group', body: 'VW Group ohlásil snížení produkce v Mladé Boleslavi o −12 % pro H2 2026.', time: '12:08', fresh: true },
    { id: 'a3', tone: 'up', kind: 'Pozitiv.', target: 'ČEZ a.s.', body: 'Tržby za Q2 nad konsensem o +1,2 p.b.', time: 'včera', fresh: false },
    { id: 'a4', tone: 'warn', kind: 'Sledujeme', target: 'CSRD H2', body: 'Třetí vlna CSRD reportingu vstupuje v platnost 1. 7. Dotčeno 12 firem ve Watch Listu.', time: '13. 5.', fresh: false },
    { id: 'a5', tone: 'dn', kind: 'Alert', target: 'Tatra Trucks', body: 'Q2 EBITDA −1,4 % Q/Q. Pod konsensem analytiků o 0,8 p.b.', time: '12. 5.', fresh: false },
  ],
};

const enSlice: PortalSlice = {
  archive: [
    { q: 'Q1 2026', date: 'February 14, 2026', title: 'A slow start to 2026' },
    { q: 'Q4 2025', date: 'November 12, 2025', title: 'Year-end shaped by energy' },
    { q: 'Q3 2025', date: 'August 14, 2025', title: 'Summer stagnation in automotive' },
    { q: 'Q2 2025', date: 'May 15, 2025', title: 'First half of 2025' },
    { q: 'Q1 2025', date: 'February 14, 2025', title: 'A gradual recovery from recession' },
    { q: 'Q4 2024', date: 'November 12, 2024', title: 'Closing a demanding 2024' },
  ],
  watchlist: [
    { ticker: 'SKDA', name: 'Škoda Auto a.s.', sub: 'CZ · OEM', segment: 'Automotive', status: 'warn', delta: '−2.4%', dir: 'dn', last: 'May 14' },
    { ticker: 'CEZ',  name: 'ČEZ a.s.', sub: 'CZ · Energy', segment: 'Energy', status: 'up', delta: '+1.2%', dir: 'up', last: 'May 12' },
    { ticker: 'VITS', name: 'Vítkovice Steel', sub: 'CZ · Metallurgy', segment: 'Metallurgy', status: 'dn', delta: '−5.8%', dir: 'dn', last: 'May 14' },
    { ticker: 'TZIN', name: 'Třinecké železárny', sub: 'CZ · Metallurgy', segment: 'Metallurgy', status: 'warn', delta: '−3.1%', dir: 'dn', last: 'May 13' },
    { ticker: 'UNIP', name: 'Unipetrol RPA', sub: 'CZ · Chemicals', segment: 'Chemicals', status: 'up', delta: '+0.6%', dir: 'up', last: 'May 11' },
    { ticker: 'CDCG', name: 'ČD Cargo', sub: 'CZ · Logistics', segment: 'Logistics', status: 'up', delta: '+2.1%', dir: 'up', last: 'May 10' },
    { ticker: 'TATR', name: 'Tatra Trucks', sub: 'CZ · OEM', segment: 'Automotive', status: 'warn', delta: '−1.4%', dir: 'dn', last: 'May 14' },
  ],
  alerts: [
    { id: 'a1', tone: 'dn', kind: 'Alert', target: 'Vítkovice Steel', body: 'Hot-rolled steel price dropped −5.8% WoW. Likely impact on 4 companies in your Watch List.', time: '14:32', fresh: true },
    { id: 'a2', tone: 'warn', kind: 'Watch', target: 'VW Group', body: 'VW Group cut Mladá Boleslav production by −12% for H2 2026.', time: '12:08', fresh: true },
    { id: 'a3', tone: 'up', kind: 'Positive', target: 'ČEZ a.s.', body: 'Q2 revenue beat consensus by +1.2 pp.', time: 'yesterday', fresh: false },
    { id: 'a4', tone: 'warn', kind: 'Watching', target: 'CSRD H2', body: 'Third wave of CSRD reporting takes effect Jul 1. Affects 12 Watch List firms.', time: 'May 13', fresh: false },
    { id: 'a5', tone: 'dn', kind: 'Alert', target: 'Tatra Trucks', body: 'Q2 EBITDA −1.4% Q/Q. Below analyst consensus by 0.8 pp.', time: 'May 12', fresh: false },
  ],
};

const SLICES: Record<Lang, PortalSlice> = { cs: csSlice, en: enSlice };

export function getArchive(lang: Lang): ArchiveRow[] {
  return SLICES[lang].archive;
}
export function getWatchlist(lang: Lang): WatchlistRow[] {
  return SLICES[lang].watchlist;
}
export function getAlerts(lang: Lang): AlertRow[] {
  return SLICES[lang].alerts;
}

// Static risk-map widget data for the Sidebar (Sprint 1 placeholder).
// Real numbers will be derived from srsc_scores in Sprint 5+ per §22.
export interface RiskMapData {
  high: number;
  med: number;
  low: number;
}
export const RISK_MAP: RiskMapData = { high: 3, med: 4, low: 2 };

// Static count for the alerts badge in TitleBar + Sidebar until the alerts
// view + DB query land.
export const ALERTS_FRESH_COUNT = 2;

// Static title-bar tickers (per CLAUDE.md they are intentionally mock).
export interface TickerCell {
  key: string;
  value: string;
  delta: string;
  dir: 'up' | 'dn';
}
export const TICKERS: TickerCell[] = [
  { key: 'EUR/CZK', value: '24.82', delta: '+0.04', dir: 'up' },
  { key: 'PX', value: '1,742.18', delta: '-0.62', dir: 'dn' },
];
