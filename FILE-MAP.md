# FILE-MAP — kde co je (orientace pro Claude Code)

> Po nahrání těchto souborů do repa čti `BUILD-HANDOFF.md` jako první. Tahle mapa je rychlý rejstřík.

## Dokumenty (číst v pořadí)
| Soubor | Co je | Akce |
|---|---|---|
| `BUILD-HANDOFF.md` | **Primární ship brief.** Co postavit teď, 5 sprintů, datový model §3, pravidla §6. | **Začni tady.** |
| `CLAUDE.md` | Závazná pravidla: čeština primárně, tón, vizuál, architektura kitu. | Drž se. |
| `HANDOFF.md` | Referenční hloubka (architektura, data sources, §22 SRSC, §23 intake). | Jen pro detail z odkazu. |

## Mission prototyp (vizuální source of truth — NEDERIVUJ ZNOVU)
| Soubor | Co je | Jak použít |
|---|---|---|
| `ui_kits/portal/mission.html` | Entry point Mission detailu. Načítá React+Babel + Mission soubory. | Otevři v prohlížeči = vidíš cílový stav. |
| `ui_kits/portal/MissionData.js` | **Kanonický tvar dat.** Seed M2C→DE: brief, rubrika relevance, entities (role/worksWith/source/verify), opportunities. | Zdroj tvaru pro DB schema (`entities`, `entity_links`, `opportunities`). |
| `ui_kits/portal/MissionView.jsx` | Shell: BriefBar, statistiky, layout, DetailPanel, PlayersTable, RubricCard, Opportunities, **Deliverable** (klientský export+tisk). | Mapuje na produkční Mission view. |
| `ui_kits/portal/MissionGraph.jsx` | Radiální SVG vztahová mapa „kdo s kým". Hover/klik zvýrazní vazby. Hrany: replicate/serves/channel. | Rekreuj graf (lze ponechat SVG nebo přejít na lib). |
| `ui_kits/portal/MissionResearch.jsx` | AI rešerše. `buildPrompt()` = rubrika+intent+úkol. Parsuje JSON, guardraily, accept→entity. | Logiku přesuň na **server-side Claude route** (API klíč). |
| `ui_kits/portal/MissionIntake.jsx` | Data klienta: CSV → `autoMap()` mapování sloupců → kandidáti → merge. Tier A/B toggle. | Vzor pro intake pipeline (`HANDOFF.md` §23). |

## Foundations
| Soubor | Co je |
|---|---|
| `colors_and_type.css` | **Design tokeny — zdroj pravdy.** Produkt = `data-theme="editorial"` (cream/ink/amber). |
| `ui_kits/portal/primitives.jsx` | Button, Pill, Tile, Icon, MonoLabel, Card, Input — překlop na produkční komponenty. |
| `ui_kits/portal/i18n.js` | CS/EN slovník, `t()` helper. Nové texty přidávej do obou jazyků. |
| `ui_kits/portal/tweaks-panel.jsx` | Tweaks shell (jen pro one-pager logo explorer). Pro app irelevantní. |

## Sekundární (NESTAV v MVP)
| Soubor | Co je |
|---|---|
| `ui_kits/portal/index.html` + Report/Archive/WatchList/Alerts/SRSC/ExportMap `.jsx` | Klientský portál — relevantní až pro self-service v2. |
| `IndustrySignal — One-pager.html` | Sales leave-behind + logo explorer. Brand reference, ne app. |
| `assets/logo-*.svg` | Placeholdery. Finální logo se teprve vybírá. |

## První tři kroky
1. Otevři `mission.html` v prohlížeči → to je cíl.
2. `BUILD-HANDOFF.md` §3 → postav DB schema (Drizzle) podle tvaru z `MissionData.js`.
3. `BUILD-HANDOFF.md` Sprint A→B → Auth + Mission CRUD + překlop `MissionView` na produkční Next.js view.
