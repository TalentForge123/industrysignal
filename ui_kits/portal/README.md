# IndustrySignal Portal — UI kit

Interactive recreation of the IndustrySignal client portal. Open `index.html` in a browser, enter any (non-empty) password to "log in", and explore.

## Files
- `index.html` — entry; loads React + Babel + every JSX file in order
- `tokens.css` — imports `../../colors_and_type.css` and adds layout primitives
- `data.js` — mock content (Q2 2026 report, Watch List, alerts, archive)
- `primitives.jsx` — `Icon`, `Pill`, `Button`, `IconButton`, `MonoLabel`, `Card`, `Tile`, `Sparkline`, `Input`
- `Sidebar.jsx` — fixed 240px primary nav
- `TopBar.jsx` — 56px header with crumbs + search + alerts bell
- `ReportView.jsx` — Q2 2026 report, 5 sections, scroll-spy TOC
- `ArchiveView.jsx` — historical reports list
- `WatchListView.jsx` — sortable/filterable entity table
- `AlertsView.jsx` — alert feed with tabs
- `LoginView.jsx` — password gate
- `App.jsx` — shell + routing

## Conventions
- All copy is in Czech; voice rules in root `README.md`.
- Components use `Object.assign(window, {...})` to share scope across `<script type="text/babel">` files.
- Each component has a uniquely named `*Styles` object (no global `styles` collisions).
