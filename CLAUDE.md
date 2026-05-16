# IndustrySignal Design System — projektové instrukce

Tento soubor se načítá automaticky na začátku každého nového chatu v tomto projektu. Drž se ho.

## Jazyk komunikace
- S uživatelem komunikuj **česky**, stručně a věcně.
- Souhrny na konci úkolu drž krátké (1–3 věty + případné caveats).

## Produkt a kontext
- **IndustrySignal** = B2B intelligence platforma pro český průmysl. Klientský portál chráněný heslem.
- Cílovka: ředitelé strategie / business intelligence ve velkých CZ průmyslových firmách (ČEZ, Škoda Auto, Vítkovice, atd.).
- Tón: formální „vy", bez hype, analytický, redakční. Nikdy ne marketingový.

## Vizuální systém — Bloomberg / Dun & Bradstreet terminál
- Aesthetic: **terminál / monitoring-room** meets editorial. Dense data, hairline borders, mono-everywhere.
- **Barvy**: graphite (černá/uhlová) base, **amber `#F2BB54`** akcent, semantic up/down/warn (zelená/červená/žlutá).
- **Typo**: serif italic wordmark (`Industry**Signal**`), mono pro data/labels (Courier-style), serif pro headlines.
- Borders: 1px hairline `var(--graphite-800)`, žádné soft shadows, žádné rounded corners > 2px.
- **Žádné** AI-slop tropy: žádné agresivní gradienty, žádné emoji, žádné generické ikony.

## Architektura UI kitu (`ui_kits/portal/`)
- `tokens.css` — importuje root foundations + portal-local tokeny.
- `i18n.js` — CS/EN dictionary, `window.t(key, ...args)`, `window.IS_I18N.useLang()` hook. Persistováno v `localStorage` pod klíčem `is.lang`. **Vždy přidej překlady do obou jazyků** při přidávání UI textů.
- `data.js` — bilingvální mock data, `window.ISData` getter vrací aktuální jazyk. **Nesmí se loadovat před i18n.js**.
- `primitives.jsx` — sdílené komponenty (Icon, Pill, Button, Tile, Input).
- `TitleBar` / `CommandBar` / `StatusBar` (TopBar.jsx), `Sidebar.jsx`, `LoginView.jsx`, `App.jsx`.
- 4 view: `ReportView`, `ArchiveView` (s funkčním PDF stahováním přes `<a download href="blob:…">`), `WatchListView`, `AlertsView`.

## Pravidla pro úpravy
- Nové UI texty **vždy** přes `t('key')` + záznam v obou `cs` a `en` slovnících v `i18n.js`.
- Nová mock data → bilingvální pár v `data.js` (cs/en větve).
- PDF stahování v archivu: drž jako reálný `<a download href={blobUrl}>`, ne `.click()` přes JS — sandbox iframe blokuje programatic download.
- Před `done` neudělávej vlastní screenshoty na verifikaci, pošli `fork_verifier_agent` na konci.

## Co dělat / nedělat
- ✅ Nové sekce reportu → přidat `id` + překlad v `data.js` obou jazycích, sidebar je už nascrolluje na `[data-section="<id>"]`.
- ✅ Nové sloupce tabulek → překlady `col_*` v i18n.
- ❌ Nepřidávat content jen pro vyplnění místa (žádný filler).
- ❌ Nepoužívat emoji ani SVG ilustrace lidí/výroby — radši placeholdery.
- ❌ Nepřidávat speaker notes do prototypů, pokud o ně uživatel výslovně neřekne.

## Známé caveats
- Wordmark `B` v ambrovém čtverci je placeholder; pokud uživatel poskytne real brand, vyměň.
- Tickery v title baru (EUR/CZK, PX, BRENT) jsou statické mock hodnoty.
