// IndustrySignal — Mission seed data.
// M2C → DE, intent: replicate. Real ground-truth brief (HANDOFF §13, §20).
// Operator tool: every record is editable; AI research appends to `entities`.
// USP: each entity carries a `source` and a `verify` flag — no source = flagged.

(function () {
  // ----- The brief the client gave (editable, re-runs research) -----
  const brief = {
    code: 'MSN-2026-014',
    client: {
      name: 'M2C',
      legal: 'Mark2 Corporation Czech a.s.',
      sector: 'Integrovaný facility management',
      nace: '81.10',
      products: ['Úklidové služby', 'Technická správa budov', 'Ostraha a security', 'Energetický management', 'Správa zeleně'],
    },
    intent: 'replicate',           // replikovat CZ go-to-market v DE
    source_market: 'CZ',
    target_market: 'DE',
    segment: {
      nace: '81.10',
      keywords: ['integrated facility management', 'Gebäudemanagement', 'technisches FM', 'infrastrukturelles FM', 'Reinigung', 'Sicherheitsdienst'],
    },
    // co klient řekl vlastními slovy — "palette mixture of companies doing
    // business with their competitors in target markets" (call s Davidem)
    ask: 'Najít firmy, které obchodují s našimi konkurenty na německém trhu — koho oslovit, kdo s kým spolupracuje, kde jsou stávající dodavatelé drazí a pomalí.',
    deadline: '11. 6. 2026',
    excluded: [],
  };

  // ----- Relevance rubric — Lukášův "mozek" externalizovaný do pravidel -----
  // Tahle kritéria jdou do AI promptu i do skórování. Editovatelné v UI.
  const rubric = {
    intent: 'replicate',
    criteria: [
      { id: 'c1', text: 'Je klientem / dodavatelem některého z německých FM konkurentů (replikovatelná vazba)', weight: 'vysoká' },
      { id: 'c2', text: 'Má velké portfolio nemovitostí nebo více provozoven v DE (objem poptávky po FM)', weight: 'vysoká' },
      { id: 'c3', text: 'Stávající FM dodavatel je drahý / pomalý / nadnárodní bez lokální flexibility', weight: 'střední' },
      { id: 'c4', text: 'Vazba na ČR (česky vlastněný provoz v DE, závod u hranic — Sasko, Bavorsko)', weight: 'střední' },
      { id: 'c5', text: 'Mittelstand segment — velcí hráči ho neobsluhují flexibilně (sweet spot M2C)', weight: 'střední' },
    ],
  };

  // ----- Entities — startovní hrstka REÁLNÝCH hráčů (seed z DB + znalost trhu) -----
  // role: 'client' (M2C, střed) | 'competitor' | 'target' | 'partner'
  // worksWith: pole id, na koho je entita navázaná (hrany grafu)
  const entities = [
    // --- střed: klient ---
    { id: 'm2c', role: 'client', name: 'M2C', city: 'Praha · CZ',
      note: 'Klient. Integrovaný FM, lídr v ČR. Cílí na replikaci CZ modelu v DE.',
      source: 'Klientský brief', verify: false },

    // --- konkurenti (němečtí FM hráči, vazby k replikaci) ---
    { id: 'apleona', role: 'competitor', name: 'Apleona GmbH', city: 'Neu-Isenburg',
      note: 'Lídr integrovaného FM v DE (ex-Bilfinger HSG). Enterprise fokus → Mittelstand mezera.',
      source: 'Handelsregister / veřejný profil', verify: false, worksWith: ['db', 'siemens'] },
    { id: 'dussmann', role: 'competitor', name: 'Dussmann Group', city: 'Berlin',
      note: 'FM + multiservice + catering. Silný v healthcare a public sector.',
      source: 'Veřejný profil', verify: false, worksWith: ['charite'] },
    { id: 'wisag', role: 'competitor', name: 'WISAG', city: 'Frankfurt a. M.',
      note: 'FM + aviation services. Dominantní na letištích.',
      source: 'Veřejný profil', verify: false, worksWith: ['fraport'] },
    { id: 'piepenbrock', role: 'competitor', name: 'Piepenbrock', city: 'Osnabrück',
      note: 'Úklid + infrastrukturní FM. Rodinný Mittelstand-friendly hráč — přímý vzor pro M2C.',
      source: 'Veřejný profil', verify: false, worksWith: [] },

    // --- targets (firmy obchodující s konkurenty = "palette mixture") ---
    { id: 'db', role: 'target', name: 'Deutsche Bank', city: 'Frankfurt a. M.',
      note: 'Velké kancelářské portfolio. FM kontrakt u Apleony — replikovatelný vztah.',
      source: 'OVĚŘIT — inferováno z trhu', verify: true, worksWith: [] },
    { id: 'siemens', role: 'target', name: 'Siemens Real Estate', city: 'München',
      note: 'Rozsáhlé výrobní + admin portfolio. Multi-supplier FM model.',
      source: 'OVĚŘIT — inferováno z trhu', verify: true, worksWith: [] },
    { id: 'fraport', role: 'target', name: 'Fraport (letiště FRA)', city: 'Frankfurt a. M.',
      note: 'Infrastruktura náročná na FM. Vazba na WISAG (aviation).',
      source: 'OVĚŘIT — inferováno z trhu', verify: true, worksWith: [] },
    { id: 'charite', role: 'target', name: 'Charité Berlin', city: 'Berlin',
      note: 'Největší univerzitní nemocnice v Evropě. Healthcare FM (Dussmann).',
      source: 'OVĚŘIT — inferováno z trhu', verify: true, worksWith: [] },

    // --- partneři / door-openers ---
    { id: 'ahk', role: 'partner', name: 'ČNOPK / AHK', city: 'Praha · Berlin',
      note: 'Česko-německá obchodní komora — door-opener pro CZ firmy vstupující do DE.',
      source: 'Veřejný subjekt', verify: false, worksWith: [] },
    { id: 'gefma', role: 'partner', name: 'GEFMA e.V.', city: 'Bonn',
      note: 'Německý FM svaz + standardy. Členství = kredibilita + leady.',
      source: 'Veřejný subjekt', verify: false, worksWith: [] },
  ];

  // ----- Opportunities — gap analysis (replicate intent) -----
  const opportunities = [
    { id: 'o1', tag: 'MEZERA', title: 'Mittelstand pod radarem velkých',
      text: 'Apleona, Dussmann i WISAG cílí na enterprise. Německý Mittelstand (50–500 provozoven) je obsluhovaný nepružně a draze — přesně sweet spot CZ modelu M2C.',
      tone: 'up' },
    { id: 'o2', tag: 'VAZBA CZ', title: 'Česky vlastněné provozy a příhraničí',
      text: 'Závody v Sasku a Bavorsku (do 150 km od hranic) lze obsluhovat z české základny bez nákladové nevýhody. Začít u česky vlastněných firem s provozem v DE.',
      tone: 'info' },
    { id: 'o3', tag: 'CENA/RYCHLOST', title: 'Drazí a pomalí inkumbenti',
      text: 'Stejný vzorec jako u strojírenství: dodávky z velkých DE hráčů jsou drahé a pomalé. M2C konkuruje flexibilitou a rychlostí mobilizace.',
      tone: 'warn' },
    { id: 'o4', tag: 'KANÁL', title: 'ČNOPK + GEFMA jako vstupní brána',
      text: 'Členství v GEFMA dodá kredibilitu na trhu citlivém na lokální reference; ČNOPK otevírá dveře k CZ-vázaným odběratelům.',
      tone: 'info' },
  ];

  window.MissionM2C = { brief, rubric, entities, opportunities };
})();
