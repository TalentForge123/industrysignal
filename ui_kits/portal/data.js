// IndustrySignal — bilingual mock data. Pick locale via window.IS_I18N.getLang().

(function () {
  const data = {
    cs: {
      user: { name: 'Jan Novák', org: 'ČEZ Distribuce', role: 'Ředitel strategie' },
      report: {
        quarter: 'Q2 2026',
        publishedAt: '14. května 2026',
        title: 'Český průmysl v Q2 2026',
        lead: 'Druhý kvartál přinesl ochlazení v zakázkové výrobě napříč středoevropským regionem.',
        sections: [
          { id: 'macro', kind: 'Makro', title: 'Makroekonomický kontext',
            summary: 'Česká ekonomika v Q2 zpomalila tempo růstu na 0,4 % Q/Q. Inflace zůstává pod 3 %, ale energetické náklady pro průmysl meziročně vzrostly o 4,2 %.',
            kpis: [
              { label: 'HDP Q/Q', value: '+0,4 %', delta: '−0,3 p.b.', dir: 'dn' },
              { label: 'PMI výroba', value: '47,8', delta: '−1,2', dir: 'dn' },
              { label: 'Inflace', value: '2,8 %', delta: '−0,1 p.b.', dir: 'up' },
              { label: 'EUR/CZK', value: '24,82', delta: '+0,4 %', dir: 'warn' }
            ],
            body: [
              'Česká ekonomika v Q2 2026 zpomalila tempo růstu HDP na 0,4 % mezi-čtvrtletně. Vyšší úrokové sazby, slabší zahraniční poptávka a pokračující tlak na energetické vstupy začínají promítat se do reálných čísel.',
              'PMI ve výrobě zůstává pátý měsíc v řadě pod hranicí 50 bodů. Sledujeme zejména ochlazení v automotive řetězci, kde Škoda Auto a VW Group ohlásili snížení produkčních plánů pro H2.'
            ]},
          { id: 'segments', kind: 'Segmenty', title: 'Vývoj v klíčových segmentech',
            summary: 'Strojírenství a hutnictví pod tlakem. Energetika a logistika v plusu. Chemie stagnuje.',
            kpis: [
              { label: 'Strojírenství Δ', value: '−1,8 %', delta: 'Q/Q', dir: 'dn' },
              { label: 'Hutnictví Δ', value: '−5,8 %', delta: 'Q/Q', dir: 'dn' },
              { label: 'Energetika Δ', value: '+1,2 %', delta: 'Q/Q', dir: 'up' },
              { label: 'Logistika Δ', value: '+2,1 %', delta: 'Q/Q', dir: 'up' }
            ],
            body: [
              'Strojírenský segment pokračuje v ochlazování. Marže klesly v Q2 o 1,8 p.b. meziročně. Tlak vychází primárně z energetických nákladů ve východních regionech a ze zpoždění v automotive řetězci.',
              'Hutnictví zaznamenalo nejhorší kvartál od roku 2023. Cena válcovaného plechu propadla o 5,8 % WoW v polovině května. Vítkovice Steel a Třinecké železárny ohlásily revizi plánů pro H2.'
            ]},
          { id: 'risks', kind: 'Rizika', title: 'Riziková mapa',
            summary: 'Tři vysoká, čtyři střední, dvě nízká rizika sledovaná v tomto kvartálu.',
            kpis: [
              { label: 'Riziko vysoké', value: '3', delta: '+1 vs Q1', dir: 'dn' },
              { label: 'Riziko střední', value: '4', delta: '−1 vs Q1', dir: 'up' },
              { label: 'Riziko nízké', value: '2', delta: '+1 vs Q1', dir: 'up' }
            ],
            body: [
              'Energetická bezpečnost (vysoké) — tlak na ceny zemního plynu z titulu obnovené volatility v Asii.',
              'Automotive supply chain (vysoké) — VW Group Q3/Q4 plány -12 %.',
              'Regulace ESG reportingu (střední) — CSRD vstupuje do třetí vlny pro střední firmy v Q3.'
            ]},
          { id: 'companies', kind: 'Firmy', title: 'Pohyby ve sledovaných firmách',
            summary: 'Z 147 sledovaných entit zaznamenalo 23 významný pohyb v Q2.',
            body: [
              'Škoda Auto a.s. — produkce v Mladé Boleslavi pro H2 revidována o −12 %. Dopad na 4 firmy ve vašem Watch Listu.',
              'ČEZ a.s. — tržby Q2 nad konsensem o +1,2 p.b. Pozitivní indikace pro distribuci.',
              'Vítkovice Steel — Q2 EBITDA −5,8 % Q/Q. Riziko: vysoké.'
            ]},
          { id: 'outlook', kind: 'Výhled', title: 'Výhled na H2 2026',
            summary: 'Sledujeme tři klíčové signály: energetické ceny, automotive produkční plány, vývoj EUR/CZK.',
            body: [
              'V druhé polovině roku očekáváme stabilizaci v energetice a další tlak v automotive. EUR/CZK zůstává klíčovým makro signálem.',
              'Sledujeme: ECB sazbové rozhodnutí (12. 6.), Škoda Auto Q2 výsledky (28. 7.), revizi PMI za červen (1. 7.).'
            ]}
        ]
      },
      watchlist: [
        { ticker: 'SKDA', name: 'Škoda Auto a.s.', sub: 'CZ · OEM', segment: 'Automotive', status: 'warn', delta: '−2,4 %', dir: 'dn', last: '14. 5.' },
        { ticker: 'CEZ',  name: 'ČEZ a.s.', sub: 'CZ · Energetika', segment: 'Energetika', status: 'up', delta: '+1,2 %', dir: 'up', last: '12. 5.' },
        { ticker: 'VITS', name: 'Vítkovice Steel', sub: 'CZ · Hutnictví', segment: 'Hutnictví', status: 'dn', delta: '−5,8 %', dir: 'dn', last: '14. 5.' },
        { ticker: 'TZIN', name: 'Třinecké železárny', sub: 'CZ · Hutnictví', segment: 'Hutnictví', status: 'warn', delta: '−3,1 %', dir: 'dn', last: '13. 5.' },
        { ticker: 'UNIP', name: 'Unipetrol RPA', sub: 'CZ · Chemie', segment: 'Chemie', status: 'up', delta: '+0,6 %', dir: 'up', last: '11. 5.' },
        { ticker: 'CDCG', name: 'ČD Cargo', sub: 'CZ · Logistika', segment: 'Logistika', status: 'up', delta: '+2,1 %', dir: 'up', last: '10. 5.' },
        { ticker: 'TATR', name: 'Tatra Trucks', sub: 'CZ · OEM', segment: 'Automotive', status: 'warn', delta: '−1,4 %', dir: 'dn', last: '14. 5.' }
      ],
      alerts: [
        { id: 'a1', tone: 'dn', kind: 'Alert', target: 'Vítkovice Steel', body: 'Cena válcovaného plechu propadla −5,8 % WoW. Indikace dopadu na 4 firmy ve vašem Watch Listu.', time: '14:32', fresh: true },
        { id: 'a2', tone: 'warn', kind: 'Watch', target: 'VW Group', body: 'VW Group ohlásil snížení produkce v Mladé Boleslavi o −12 % pro H2 2026.', time: '12:08', fresh: true },
        { id: 'a3', tone: 'up', kind: 'Pozitiv.', target: 'ČEZ a.s.', body: 'Tržby za Q2 nad konsensem o +1,2 p.b.', time: 'včera', fresh: false },
        { id: 'a4', tone: 'warn', kind: 'Sledujeme', target: 'CSRD H2', body: 'Třetí vlna CSRD reportingu vstupuje v platnost 1. 7. Dotčeno 12 firem ve Watch Listu.', time: '13. 5.', fresh: false },
        { id: 'a5', tone: 'dn', kind: 'Alert', target: 'Tatra Trucks', body: 'Q2 EBITDA −1,4 % Q/Q. Pod konsensem analytiků o 0,8 p.b.', time: '12. 5.', fresh: false }
      ],
      archive: [
        { q: 'Q1 2026', date: '14. února 2026', title: 'Pomalý start roku 2026' },
        { q: 'Q4 2025', date: '12. listopadu 2025', title: 'Konec roku ve znamení energetiky' },
        { q: 'Q3 2025', date: '14. srpna 2025', title: 'Letní stagnace v automotive' },
        { q: 'Q2 2025', date: '15. května 2025', title: 'První pololetí 2025' },
        { q: 'Q1 2025', date: '14. února 2025', title: 'Pozvolné oživení po recesi' },
        { q: 'Q4 2024', date: '12. listopadu 2024', title: 'Závěr náročného roku 2024' }
      ],

      // ============================================================
      // SRSC — Supplier Risk Score (CS)
      // ============================================================
      srsc: {
        client: 'ČEZ Distribuce a.s.',
        scanDate: '14. 5. 2026 06:48',
        nextScan: '15. 5. 2026 06:00',
        total: 47, high: 3, med: 6, low: 38,
        exposureTotal: '2 480', exposureRisk: '459',
        caseSupplier: 'EnergoMontáže Východ s.r.o.',
        caseFlaggedAt: '14. 11. 2025',
        caseActualAt: '11. 2. 2026',
        caseSavedK: '420',
        caseGap: '89 dní',
        network: { tracking: 12, exiting: 3, supplier: 'Cabletec Industrial a.s.' },
        signals: [
          { code: 'ARES', labelKey: 'sig_ares', weight: 18, active: 17 },
          { code: 'INSO', labelKey: 'sig_inso', weight: 30, active: 2  },
          { code: 'HIRE', labelKey: 'sig_hire', weight: 12, active: 11 },
          { code: 'LEAD', labelKey: 'sig_lead', weight: 15, active: 5  },
          { code: 'PAYM', labelKey: 'sig_paym', weight: 20, active: 9  },
          { code: 'INDB', labelKey: 'sig_indb', weight: 5,  active: 14 }
        ],
        suppliers: [
          { ticker: 'EMVY', ico: '256 18 374', name: 'EnergoMontáže Východ s.r.o.', segment: 'Elektromontáže', exposure: '247', score: 84, prev: 66, flags: ['INSO','PAYM','HIRE','LEAD'], trend: [38,42,45,50,56,60,63,66,71,75,80,84], collective: 8, exiting: 3 },
          { ticker: 'NKTC', ico: '267 71 458', name: 'NKT Cables CZ a.s.',          segment: 'Kabeláž',       exposure: '124', score: 76, prev: 64, flags: ['PAYM','ARES','LEAD'],         trend: [50,52,55,58,60,62,65,68,71,73,75,76], collective: 5, exiting: 1 },
          { ticker: 'CBLT', ico: '241 89 002', name: 'Cabletec Industrial a.s.',     segment: 'Kabeláž',       exposure: '88',  score: 72, prev: 63, flags: ['HIRE','PAYM','ARES'],         trend: [45,48,50,53,56,59,62,64,66,68,70,72], collective: 12, exiting: 3 },
          { ticker: 'OEZL', ico: '601 08 991', name: 'OEZ Letohrad s.r.o.',          segment: 'Komponenty',     exposure: '95',  score: 58, prev: 52, flags: ['ARES','HIRE'],                trend: [38,40,42,44,46,48,50,52,54,55,57,58], collective: 4, exiting: 0 },
          { ticker: 'EMTL', ico: '252 84 110', name: 'Energometal a.s.',             segment: 'Hutnictví',     exposure: '73',  score: 54, prev: 50, flags: ['PAYM','INDB'],                trend: [42,44,46,47,48,49,50,51,52,53,53,54], collective: 2, exiting: 0 },
          { ticker: 'EMBR', ico: '262 71 339', name: 'Elektromontáže Brno s.r.o.',  segment: 'Elektromontáže', exposure: '41',  score: 49, prev: 46, flags: ['HIRE','ARES'],                trend: [40,41,42,43,44,45,46,47,47,48,48,49], collective: 3, exiting: 0 },
          { ticker: 'ABBT', ico: '496 84 555', name: 'ABB Třebíč s.r.o.',           segment: 'Trafostanice',   exposure: '312', score: 42, prev: 40, flags: ['INDB'],                       trend: [35,36,37,38,38,39,40,40,41,41,42,42], collective: 6, exiting: 0 },
          { ticker: 'MJKV', ico: '460 03 822', name: 'MOTOR JIKOV Group a.s.',       segment: 'Strojaren.',     exposure: '56',  score: 38, prev: 39, flags: ['INDB'],                       trend: [40,40,39,39,39,38,38,38,38,38,38,38], collective: 1, exiting: 0 },
          { ticker: 'STXT', ico: '290 18 003', name: 'Strix Trafo CZ s.r.o.',        segment: 'Trafostanice',   exposure: '64',  score: 34, prev: 33, flags: ['ARES'],                       trend: [30,31,31,32,32,33,33,33,34,34,34,34], collective: 0, exiting: 0 },
          { ticker: 'BPWD', ico: '283 04 712', name: 'Bohemia Power Distribution',   segment: 'Distribuce',     exposure: '187', score: 28, prev: 28, flags: [],                            trend: [28,28,28,29,28,28,28,28,28,28,28,28], collective: 7, exiting: 0 },
          { ticker: 'KKBL', ico: '274 22 815', name: 'Konsolidační kabel a.s.',       segment: 'Kabeláž',       exposure: '142', score: 18, prev: 22, flags: [],                            trend: [22,22,21,21,20,20,19,19,19,18,18,18], collective: 1, exiting: 0 },
          { ticker: 'EGTS', ico: '256 67 449', name: 'Energotrans s.r.o.',           segment: 'Přeprava',      exposure: '99',  score: 12, prev: 15, flags: [],                            trend: [15,15,14,14,14,13,13,13,12,12,12,12], collective: 4, exiting: 0 }
        ]
      },

      // ============================================================
      // XMAP — Export Intelligence Map (CS) · M2C → Německo
      // ============================================================
      xmap: {
        client: 'M2C Solutions a.s.',
        country: 'Německo',
        countryCode: 'DE',
        segment: 'Industrial cleaning / facility services',
        lastUpdate: '14. 5. 2026',
        totals: { players: 142, regions: 16, gaps: 4, contacts: 38, links: 217 },
        pricing: { oneTime: '€ 8 500', sub: '€ 12 000 / rok' },
        regions: [
          { code: 'NW', name: 'Nordrhein-Westfalen', hub: 'Düsseldorf',  players: 28, top: 'Bilfinger HSG',   density: 1.00 },
          { code: 'HH', name: 'Hamburg',             hub: 'Hamburg',     players: 18, top: 'Wisag',           density: 0.64 },
          { code: 'BE', name: 'Berlin',              hub: 'Berlin',      players: 16, top: 'Dussmann',        density: 0.57 },
          { code: 'BW', name: 'Baden-Württemberg',   hub: 'Stuttgart',   players: 14, top: 'ISS Stuttgart',   density: 0.50 },
          { code: 'HE', name: 'Hessen',              hub: 'Frankfurt',   players: 12, top: 'Apleona',         density: 0.43 },
          { code: 'NI', name: 'Niedersachsen',       hub: 'Hannover',    players: 11, top: 'Piepenbrock',     density: 0.39 },
          { code: 'BY', name: 'Bayern',              hub: 'München',     players: 8,  top: 'Strabag PFS',     density: 0.29 },
          { code: 'SN', name: 'Sachsen',             hub: 'Dresden',     players: 7,  top: 'Klüh',            density: 0.25 },
          { code: 'RP', name: 'Rheinland-Pfalz',     hub: 'Mainz',       players: 6,  top: 'Spie',            density: 0.21 },
          { code: 'BB', name: 'Brandenburg',         hub: 'Potsdam',     players: 5,  top: 'Gegenbauer BB',   density: 0.18 },
          { code: 'SH', name: 'Schleswig-Holstein',  hub: 'Kiel',        players: 4,  top: 'GA-tec Nord',     density: 0.14 },
          { code: 'HB', name: 'Bremen',              hub: 'Bremen',      players: 3,  top: 'B+S',             density: 0.11 },
          { code: 'ST', name: 'Sachsen-Anhalt',      hub: 'Magdeburg',   players: 3,  top: 'Apleona Magd.',   density: 0.11, gap: true },
          { code: 'TH', name: 'Thüringen',           hub: 'Erfurt',      players: 3,  top: 'Caverion (restr.)', density: 0.11, gap: true },
          { code: 'MV', name: 'Mecklenburg-Vorp.',   hub: 'Rostock',     players: 2,  top: '—',               density: 0.07, gap: true },
          { code: 'SL', name: 'Saarland',            hub: 'Saarbrücken', players: 2,  top: 'RGM',             density: 0.07, gap: true }
        ],
        players: [
          { rank: 1,  name: 'Dussmann Service GmbH',     city: 'Berlin',        region: 'BE', emp: '63 500', rev: '2,4 mld €',  tier: 'A', rel: 'direct'   },
          { rank: 2,  name: 'Wisag Facility Service',    city: 'Hamburg',       region: 'HH', emp: '49 000', rev: '1,8 mld €',  tier: 'A', rel: 'direct'   },
          { rank: 3,  name: 'Piepenbrock Service',       city: 'Osnabrück',     region: 'NI', emp: '27 000', rev: '780 mil €',  tier: 'A', rel: 'direct'   },
          { rank: 4,  name: 'Bilfinger HSG GmbH',        city: 'Düsseldorf',    region: 'NW', emp: '22 000', rev: '1,1 mld €',  tier: 'A', rel: 'direct'   },
          { rank: 5,  name: 'Apleona HSG GmbH',          city: 'Neu-Isenburg',  region: 'HE', emp: '20 500', rev: '950 mil €',  tier: 'A', rel: 'direct'   },
          { rank: 6,  name: 'ISS Facility Services',     city: 'Düsseldorf',    region: 'NW', emp: '17 200', rev: '720 mil €',  tier: 'B', rel: 'direct'   },
          { rank: 7,  name: 'Sodexo Deutschland',        city: 'Rüsselsheim',   region: 'HE', emp: '15 800', rev: '680 mil €',  tier: 'B', rel: 'adjacent' },
          { rank: 8,  name: 'Gegenbauer Holding',        city: 'Berlin',        region: 'BE', emp: '14 500', rev: '590 mil €',  tier: 'B', rel: 'direct'   },
          { rank: 9,  name: 'Klüh Service Mgmt.',        city: 'Düsseldorf',    region: 'NW', emp: '8 900',  rev: '410 mil €',  tier: 'B', rel: 'direct'   },
          { rank: 10, name: 'Caverion Deutschland',      city: 'Essen',         region: 'NW', emp: '7 100',  rev: '380 mil €',  tier: 'B', rel: 'partner'  },
          { rank: 11, name: 'Strabag PFS GmbH',          city: 'München',       region: 'BY', emp: '4 300',  rev: '290 mil €',  tier: 'C', rel: 'partner'  },
          { rank: 12, name: 'B+S Facility Service',      city: 'Bremen',        region: 'HB', emp: '3 800',  rev: '180 mil €',  tier: 'C', rel: 'direct'   }
        ],
        gaps: [
          { region: 'MV', urgency: 'high', title: 'Rostock · Mecklenburg-Vorpommern', body: 'Žádný hráč nad 50 mil €. 3 lokální firmy s reorg signály. Vstupní okno 12–18 měs.' },
          { region: 'TH', urgency: 'high', title: 'Erfurt–Jena · Thüringen',         body: 'Caverion v restrukturalizaci. Možná akvizice nebo přebrání kontraktů Q3–Q4 2026.' },
          { region: 'ST', urgency: 'med',  title: 'Magdeburg · Sachsen-Anhalt',      body: 'Apleona drží 60 %. Fragmentované vakuum pod 30 mil € — ideální pro mid-tier vstup.' },
          { region: 'SL', urgency: 'low',  title: 'Saarbrücken · Saarland',         body: 'RGM lokální monopol. Spoléhat na partnership přístup, ne kompetici.' }
        ],
        contacts: [
          { name: 'Dr. Markus Hentschel', title: 'Head of Procurement · Facility Services', account: 'BMW Group Werk Leipzig',  region: 'SN', signal: 'mění dodavatele H2' },
          { name: 'Andrea Brückner',     title: 'Director Facility Management',           account: 'Continental AG Hannover',  region: 'NI', signal: 'tender Q3 2026' },
          { name: 'Stefan Walther',       title: 'Procurement Lead · Indirect',            account: 'Siemens Energy Erlangen', region: 'BY', signal: 'otevřený tender' },
          { name: 'Petra Niemann',        title: 'Head of Workplace Services',             account: 'Lufthansa Technik Hamburg', region: 'HH', signal: 'RFP plánován' },
          { name: 'Christian Voss',       title: 'Procurement Director',                   account: 'ThyssenKrupp Duisburg',    region: 'NW', signal: 'hodnotí nabídky' },
          { name: 'Janina Holtmann',      title: 'Head of Indirect Procurement',           account: 'DHL Group Leipzig',        region: 'SN', signal: 'RFP Q4 2026' }
        ]
      }
    },

    en: {
      user: { name: 'Jan Novák', org: 'ČEZ Distribuce', role: 'Head of strategy' },
      report: {
        quarter: 'Q2 2026',
        publishedAt: 'May 14, 2026',
        title: 'Czech industry in Q2 2026',
        lead: 'The second quarter brought a cooling in contract manufacturing across the Central European region.',
        sections: [
          { id: 'macro', kind: 'Macro', title: 'Macroeconomic context',
            summary: 'The Czech economy slowed Q/Q growth to 0.4% in Q2. Inflation stays below 3%, but industrial energy costs rose 4.2% YoY.',
            kpis: [
              { label: 'GDP Q/Q', value: '+0.4%', delta: '−0.3 pp', dir: 'dn' },
              { label: 'Mfg PMI', value: '47.8', delta: '−1.2', dir: 'dn' },
              { label: 'Inflation', value: '2.8%', delta: '−0.1 pp', dir: 'up' },
              { label: 'EUR/CZK', value: '24.82', delta: '+0.4%', dir: 'warn' }
            ],
            body: [
              'The Czech economy slowed Q/Q GDP growth to 0.4% in Q2 2026. Higher rates, weaker external demand and continued pressure on energy inputs are now showing up in the real numbers.',
              'Manufacturing PMI sits below 50 for the fifth month running. We are watching the automotive chain in particular, where Škoda Auto and VW Group have cut H2 production plans.'
            ]},
          { id: 'segments', kind: 'Segments', title: 'Key segment performance',
            summary: 'Engineering and metallurgy under pressure. Energy and logistics positive. Chemicals flat.',
            kpis: [
              { label: 'Engineering Δ', value: '−1.8%', delta: 'Q/Q', dir: 'dn' },
              { label: 'Metallurgy Δ', value: '−5.8%', delta: 'Q/Q', dir: 'dn' },
              { label: 'Energy Δ', value: '+1.2%', delta: 'Q/Q', dir: 'up' },
              { label: 'Logistics Δ', value: '+2.1%', delta: 'Q/Q', dir: 'up' }
            ],
            body: [
              'The engineering segment continues to cool. Margins fell 1.8 pp YoY in Q2. Pressure comes mainly from energy costs in eastern regions and delays in the automotive supply chain.',
              'Metallurgy posted its worst quarter since 2023. Hot-rolled steel prices dropped 5.8% WoW in mid-May. Vítkovice Steel and Třinecké železárny cut H2 plans.'
            ]},
          { id: 'risks', kind: 'Risks', title: 'Risk map',
            summary: 'Three high, four medium, two low risks tracked this quarter.',
            kpis: [
              { label: 'High risk', value: '3', delta: '+1 vs Q1', dir: 'dn' },
              { label: 'Medium risk', value: '4', delta: '−1 vs Q1', dir: 'up' },
              { label: 'Low risk', value: '2', delta: '+1 vs Q1', dir: 'up' }
            ],
            body: [
              'Energy security (high) — pressure on natural gas prices from renewed volatility in Asia.',
              'Automotive supply chain (high) — VW Group Q3/Q4 plans −12%.',
              'ESG reporting regulation (medium) — CSRD enters its third wave for mid-cap firms in Q3.'
            ]},
          { id: 'companies', kind: 'Companies', title: 'Movements in tracked companies',
            summary: 'Out of 147 tracked entities, 23 made a significant move in Q2.',
            body: [
              'Škoda Auto a.s. — Mladá Boleslav production for H2 revised by −12%. Impact on 4 companies in your Watch List.',
              'ČEZ a.s. — Q2 revenue beat consensus by +1.2 pp. Positive read-through for distribution.',
              'Vítkovice Steel — Q2 EBITDA −5.8% Q/Q. Risk: high.'
            ]},
          { id: 'outlook', kind: 'Outlook', title: 'Outlook for H2 2026',
            summary: 'Three signals to watch: energy prices, automotive production plans, EUR/CZK trajectory.',
            body: [
              'In the second half we expect stabilization in energy and continued pressure in automotive. EUR/CZK remains the key macro signal.',
              'On the calendar: ECB rate decision (Jun 12), Škoda Auto Q2 results (Jul 28), June PMI revision (Jul 1).'
            ]}
        ]
      },
      watchlist: [
        { ticker: 'SKDA', name: 'Škoda Auto a.s.', sub: 'CZ · OEM', segment: 'Automotive', status: 'warn', delta: '−2.4%', dir: 'dn', last: 'May 14' },
        { ticker: 'CEZ',  name: 'ČEZ a.s.', sub: 'CZ · Energy', segment: 'Energy', status: 'up', delta: '+1.2%', dir: 'up', last: 'May 12' },
        { ticker: 'VITS', name: 'Vítkovice Steel', sub: 'CZ · Metallurgy', segment: 'Metallurgy', status: 'dn', delta: '−5.8%', dir: 'dn', last: 'May 14' },
        { ticker: 'TZIN', name: 'Třinecké železárny', sub: 'CZ · Metallurgy', segment: 'Metallurgy', status: 'warn', delta: '−3.1%', dir: 'dn', last: 'May 13' },
        { ticker: 'UNIP', name: 'Unipetrol RPA', sub: 'CZ · Chemicals', segment: 'Chemicals', status: 'up', delta: '+0.6%', dir: 'up', last: 'May 11' },
        { ticker: 'CDCG', name: 'ČD Cargo', sub: 'CZ · Logistics', segment: 'Logistics', status: 'up', delta: '+2.1%', dir: 'up', last: 'May 10' },
        { ticker: 'TATR', name: 'Tatra Trucks', sub: 'CZ · OEM', segment: 'Automotive', status: 'warn', delta: '−1.4%', dir: 'dn', last: 'May 14' }
      ],
      alerts: [
        { id: 'a1', tone: 'dn', kind: 'Alert', target: 'Vítkovice Steel', body: 'Hot-rolled steel price dropped −5.8% WoW. Likely impact on 4 companies in your Watch List.', time: '14:32', fresh: true },
        { id: 'a2', tone: 'warn', kind: 'Watch', target: 'VW Group', body: 'VW Group cut Mladá Boleslav production by −12% for H2 2026.', time: '12:08', fresh: true },
        { id: 'a3', tone: 'up', kind: 'Positive', target: 'ČEZ a.s.', body: 'Q2 revenue beat consensus by +1.2 pp.', time: 'yesterday', fresh: false },
        { id: 'a4', tone: 'warn', kind: 'Watching', target: 'CSRD H2', body: 'Third wave of CSRD reporting takes effect Jul 1. Affects 12 Watch List firms.', time: 'May 13', fresh: false },
        { id: 'a5', tone: 'dn', kind: 'Alert', target: 'Tatra Trucks', body: 'Q2 EBITDA −1.4% Q/Q. Below analyst consensus by 0.8 pp.', time: 'May 12', fresh: false }
      ],
      archive: [
        { q: 'Q1 2026', date: 'February 14, 2026', title: 'A slow start to 2026' },
        { q: 'Q4 2025', date: 'November 12, 2025', title: 'Year-end shaped by energy' },
        { q: 'Q3 2025', date: 'August 14, 2025', title: 'Summer stagnation in automotive' },
        { q: 'Q2 2025', date: 'May 15, 2025', title: 'First half of 2025' },
        { q: 'Q1 2025', date: 'February 14, 2025', title: 'A gradual recovery from recession' },
        { q: 'Q4 2024', date: 'November 12, 2024', title: 'Closing a demanding 2024' }
      ],

      // SRSC — Supplier Risk Score (EN)
      srsc: {
        client: 'ČEZ Distribuce a.s.',
        scanDate: 'May 14, 2026 06:48',
        nextScan: 'May 15, 2026 06:00',
        total: 47, high: 3, med: 6, low: 38,
        exposureTotal: '2 480', exposureRisk: '459',
        caseSupplier: 'EnergoMontáže Východ s.r.o.',
        caseFlaggedAt: 'Nov 14, 2025',
        caseActualAt: 'Feb 11, 2026',
        caseSavedK: '420',
        caseGap: '89 days',
        network: { tracking: 12, exiting: 3, supplier: 'Cabletec Industrial a.s.' },
        signals: [
          { code: 'ARES', labelKey: 'sig_ares', weight: 18, active: 17 },
          { code: 'INSO', labelKey: 'sig_inso', weight: 30, active: 2  },
          { code: 'HIRE', labelKey: 'sig_hire', weight: 12, active: 11 },
          { code: 'LEAD', labelKey: 'sig_lead', weight: 15, active: 5  },
          { code: 'PAYM', labelKey: 'sig_paym', weight: 20, active: 9  },
          { code: 'INDB', labelKey: 'sig_indb', weight: 5,  active: 14 }
        ],
        suppliers: [
          { ticker: 'EMVY', ico: '256 18 374', name: 'EnergoMontáže Východ s.r.o.', segment: 'Electrical install.',  exposure: '247', score: 84, prev: 66, flags: ['INSO','PAYM','HIRE','LEAD'], trend: [38,42,45,50,56,60,63,66,71,75,80,84], collective: 8, exiting: 3 },
          { ticker: 'NKTC', ico: '267 71 458', name: 'NKT Cables CZ a.s.',          segment: 'Cabling',             exposure: '124', score: 76, prev: 64, flags: ['PAYM','ARES','LEAD'],         trend: [50,52,55,58,60,62,65,68,71,73,75,76], collective: 5, exiting: 1 },
          { ticker: 'CBLT', ico: '241 89 002', name: 'Cabletec Industrial a.s.',     segment: 'Cabling',             exposure: '88',  score: 72, prev: 63, flags: ['HIRE','PAYM','ARES'],         trend: [45,48,50,53,56,59,62,64,66,68,70,72], collective: 12, exiting: 3 },
          { ticker: 'OEZL', ico: '601 08 991', name: 'OEZ Letohrad s.r.o.',          segment: 'Components',          exposure: '95',  score: 58, prev: 52, flags: ['ARES','HIRE'],                trend: [38,40,42,44,46,48,50,52,54,55,57,58], collective: 4, exiting: 0 },
          { ticker: 'EMTL', ico: '252 84 110', name: 'Energometal a.s.',             segment: 'Metallurgy',          exposure: '73',  score: 54, prev: 50, flags: ['PAYM','INDB'],                trend: [42,44,46,47,48,49,50,51,52,53,53,54], collective: 2, exiting: 0 },
          { ticker: 'EMBR', ico: '262 71 339', name: 'Elektromontáže Brno s.r.o.',  segment: 'Electrical install.',  exposure: '41',  score: 49, prev: 46, flags: ['HIRE','ARES'],                trend: [40,41,42,43,44,45,46,47,47,48,48,49], collective: 3, exiting: 0 },
          { ticker: 'ABBT', ico: '496 84 555', name: 'ABB Třebíč s.r.o.',           segment: 'Substations',         exposure: '312', score: 42, prev: 40, flags: ['INDB'],                       trend: [35,36,37,38,38,39,40,40,41,41,42,42], collective: 6, exiting: 0 },
          { ticker: 'MJKV', ico: '460 03 822', name: 'MOTOR JIKOV Group a.s.',       segment: 'Engineering',         exposure: '56',  score: 38, prev: 39, flags: ['INDB'],                       trend: [40,40,39,39,39,38,38,38,38,38,38,38], collective: 1, exiting: 0 },
          { ticker: 'STXT', ico: '290 18 003', name: 'Strix Trafo CZ s.r.o.',        segment: 'Substations',         exposure: '64',  score: 34, prev: 33, flags: ['ARES'],                       trend: [30,31,31,32,32,33,33,33,34,34,34,34], collective: 0, exiting: 0 },
          { ticker: 'BPWD', ico: '283 04 712', name: 'Bohemia Power Distribution',   segment: 'Distribution',        exposure: '187', score: 28, prev: 28, flags: [],                            trend: [28,28,28,29,28,28,28,28,28,28,28,28], collective: 7, exiting: 0 },
          { ticker: 'KKBL', ico: '274 22 815', name: 'Konsolidační kabel a.s.',       segment: 'Cabling',             exposure: '142', score: 18, prev: 22, flags: [],                            trend: [22,22,21,21,20,20,19,19,19,18,18,18], collective: 1, exiting: 0 },
          { ticker: 'EGTS', ico: '256 67 449', name: 'Energotrans s.r.o.',           segment: 'Transport',           exposure: '99',  score: 12, prev: 15, flags: [],                            trend: [15,15,14,14,14,13,13,13,12,12,12,12], collective: 4, exiting: 0 }
        ]
      },

      // XMAP — Export Intelligence Map (EN) · M2C → Germany
      xmap: {
        client: 'M2C Solutions a.s.',
        country: 'Germany',
        countryCode: 'DE',
        segment: 'Industrial cleaning / facility services',
        lastUpdate: 'May 14, 2026',
        totals: { players: 142, regions: 16, gaps: 4, contacts: 38, links: 217 },
        pricing: { oneTime: '€ 8,500', sub: '€ 12,000 / yr' },
        regions: [
          { code: 'NW', name: 'Nordrhein-Westfalen', hub: 'Düsseldorf',  players: 28, top: 'Bilfinger HSG',   density: 1.00 },
          { code: 'HH', name: 'Hamburg',             hub: 'Hamburg',     players: 18, top: 'Wisag',           density: 0.64 },
          { code: 'BE', name: 'Berlin',              hub: 'Berlin',      players: 16, top: 'Dussmann',        density: 0.57 },
          { code: 'BW', name: 'Baden-Württemberg',   hub: 'Stuttgart',   players: 14, top: 'ISS Stuttgart',   density: 0.50 },
          { code: 'HE', name: 'Hessen',              hub: 'Frankfurt',   players: 12, top: 'Apleona',         density: 0.43 },
          { code: 'NI', name: 'Niedersachsen',       hub: 'Hannover',    players: 11, top: 'Piepenbrock',     density: 0.39 },
          { code: 'BY', name: 'Bayern',              hub: 'Munich',      players: 8,  top: 'Strabag PFS',     density: 0.29 },
          { code: 'SN', name: 'Sachsen',             hub: 'Dresden',     players: 7,  top: 'Klüh',            density: 0.25 },
          { code: 'RP', name: 'Rheinland-Pfalz',     hub: 'Mainz',       players: 6,  top: 'Spie',            density: 0.21 },
          { code: 'BB', name: 'Brandenburg',         hub: 'Potsdam',     players: 5,  top: 'Gegenbauer BB',   density: 0.18 },
          { code: 'SH', name: 'Schleswig-Holstein',  hub: 'Kiel',        players: 4,  top: 'GA-tec Nord',     density: 0.14 },
          { code: 'HB', name: 'Bremen',              hub: 'Bremen',      players: 3,  top: 'B+S',             density: 0.11 },
          { code: 'ST', name: 'Sachsen-Anhalt',      hub: 'Magdeburg',   players: 3,  top: 'Apleona Magd.',   density: 0.11, gap: true },
          { code: 'TH', name: 'Thüringen',           hub: 'Erfurt',      players: 3,  top: 'Caverion (restr.)', density: 0.11, gap: true },
          { code: 'MV', name: 'Mecklenburg-Vorp.',   hub: 'Rostock',     players: 2,  top: '—',               density: 0.07, gap: true },
          { code: 'SL', name: 'Saarland',            hub: 'Saarbrücken', players: 2,  top: 'RGM',             density: 0.07, gap: true }
        ],
        players: [
          { rank: 1,  name: 'Dussmann Service GmbH',     city: 'Berlin',        region: 'BE', emp: '63,500', rev: '€ 2.4 bn',  tier: 'A', rel: 'direct'   },
          { rank: 2,  name: 'Wisag Facility Service',    city: 'Hamburg',       region: 'HH', emp: '49,000', rev: '€ 1.8 bn',  tier: 'A', rel: 'direct'   },
          { rank: 3,  name: 'Piepenbrock Service',       city: 'Osnabrück',     region: 'NI', emp: '27,000', rev: '€ 780 M',   tier: 'A', rel: 'direct'   },
          { rank: 4,  name: 'Bilfinger HSG GmbH',        city: 'Düsseldorf',    region: 'NW', emp: '22,000', rev: '€ 1.1 bn',  tier: 'A', rel: 'direct'   },
          { rank: 5,  name: 'Apleona HSG GmbH',          city: 'Neu-Isenburg',  region: 'HE', emp: '20,500', rev: '€ 950 M',   tier: 'A', rel: 'direct'   },
          { rank: 6,  name: 'ISS Facility Services',     city: 'Düsseldorf',    region: 'NW', emp: '17,200', rev: '€ 720 M',   tier: 'B', rel: 'direct'   },
          { rank: 7,  name: 'Sodexo Deutschland',        city: 'Rüsselsheim',   region: 'HE', emp: '15,800', rev: '€ 680 M',   tier: 'B', rel: 'adjacent' },
          { rank: 8,  name: 'Gegenbauer Holding',        city: 'Berlin',        region: 'BE', emp: '14,500', rev: '€ 590 M',   tier: 'B', rel: 'direct'   },
          { rank: 9,  name: 'Klüh Service Mgmt.',        city: 'Düsseldorf',    region: 'NW', emp: '8,900',  rev: '€ 410 M',   tier: 'B', rel: 'direct'   },
          { rank: 10, name: 'Caverion Deutschland',      city: 'Essen',         region: 'NW', emp: '7,100',  rev: '€ 380 M',   tier: 'B', rel: 'partner'  },
          { rank: 11, name: 'Strabag PFS GmbH',          city: 'Munich',        region: 'BY', emp: '4,300',  rev: '€ 290 M',   tier: 'C', rel: 'partner'  },
          { rank: 12, name: 'B+S Facility Service',      city: 'Bremen',        region: 'HB', emp: '3,800',  rev: '€ 180 M',   tier: 'C', rel: 'direct'   }
        ],
        gaps: [
          { region: 'MV', urgency: 'high', title: 'Rostock · Mecklenburg-Vorpommern', body: 'No player above € 50M. 3 local firms with reorg signals. Entry window 12–18 mo.' },
          { region: 'TH', urgency: 'high', title: 'Erfurt–Jena · Thüringen',         body: 'Caverion in restructuring. Possible acquisition or contract takeover Q3–Q4 2026.' },
          { region: 'ST', urgency: 'med',  title: 'Magdeburg · Sachsen-Anhalt',      body: 'Apleona holds 60%. Fragmented vacuum below € 30M — ideal mid-tier entry.' },
          { region: 'SL', urgency: 'low',  title: 'Saarbrücken · Saarland',         body: 'RGM local monopoly. Partnership approach rather than head-on competition.' }
        ],
        contacts: [
          { name: 'Dr. Markus Hentschel', title: 'Head of Procurement · Facility Services', account: 'BMW Group Werk Leipzig',  region: 'SN', signal: 'changing supplier H2' },
          { name: 'Andrea Brückner',     title: 'Director Facility Management',           account: 'Continental AG Hannover',  region: 'NI', signal: 'tender Q3 2026' },
          { name: 'Stefan Walther',       title: 'Procurement Lead · Indirect',            account: 'Siemens Energy Erlangen', region: 'BY', signal: 'open tender' },
          { name: 'Petra Niemann',        title: 'Head of Workplace Services',             account: 'Lufthansa Technik Hamburg', region: 'HH', signal: 'RFP scheduled' },
          { name: 'Christian Voss',       title: 'Procurement Director',                   account: 'ThyssenKrupp Duisburg',    region: 'NW', signal: 'evaluating bids' },
          { name: 'Janina Holtmann',      title: 'Head of Indirect Procurement',           account: 'DHL Group Leipzig',        region: 'SN', signal: 'RFP Q4 2026' }
        ]
      }
    }
  };

  // Backward-compatible: ISData defaults to current language and updates on switch.
  function pick() {
    const lang = (window.IS_I18N && window.IS_I18N.getLang()) || 'cs';
    return data[lang] || data.cs;
  }

  Object.defineProperty(window, 'ISData', {
    configurable: true,
    get: pick,
  });

  window.ISDataAll = data;
})();
