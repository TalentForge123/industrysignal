// auto-bundled variants A/B/C

// Variant A — Bloomberg terminal (current IndustrySignal aesthetic).

const vaStyles = {
  root: {
    width: '100%', height: '100%', background: '#06080B',
    fontFamily: "'IBM Plex Mono', monospace",
    color: '#E2E5EA', display: 'flex', flexDirection: 'column',
  },
  topBar: {
    height: 26, display: 'flex', alignItems: 'center',
    background: '#06080B', borderBottom: '1px solid #1C222C',
    fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase',
    color: '#737B89', padding: '0 12px', gap: 14,
  },
  mark: { width: 14, height: 14, background: '#F2BB54', color: '#06080B', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Serif', serif", fontStyle: 'italic', fontWeight: 700, fontSize: 11 },
  wm: { fontFamily: "'IBM Plex Serif', serif", fontStyle: 'italic', fontWeight: 700, fontSize: 12, color: '#fff' },
  wmAccent: { color: '#F2BB54' },
  cmd: { height: 22, background: '#0B0E13', borderBottom: '2px solid #F2BB54', display: 'flex', alignItems: 'center', fontSize: 10 },
  cmdPrompt: { padding: '0 8px', background: '#F2BB54', color: '#06080B', fontWeight: 700, letterSpacing: '0.12em', height: '100%', display: 'flex', alignItems: 'center' },
  cmdInput: { padding: '0 10px', color: '#737B89' },

  header: { padding: '8px 12px', borderBottom: '1px solid #1C222C', background: '#06080B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' },
  headerTitle: { color: '#F2BB54', fontWeight: 600 },
  headerMeta: { color: '#525A68' },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #1C222C', background: '#0B0E13' },
  kpi: { padding: '10px 12px', borderRight: '1px solid #1C222C', display: 'flex', flexDirection: 'column', gap: 2 },
  kpiLbl: { fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#525A68' },
  kpiVal: (c) => ({ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 500, color: c || '#E2E5EA', letterSpacing: '-0.01em', lineHeight: 1.05 }),

  table: { width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 },
  th: { padding: '4px 8px', background: '#11151C', color: '#737B89', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9, fontWeight: 500, borderBottom: '1px solid #1C222C', textAlign: 'left' },
  td: { padding: '5px 8px', borderBottom: '1px solid #11151C', color: '#C2C7CF' },

  intel: { marginTop: 'auto', padding: 12, background: 'rgba(242,187,84,0.04)', borderTop: '1px solid #1C222C', display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 12, alignItems: 'center' },
  intelNum: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, color: '#F2BB54', fontWeight: 500 },
  intelLbl: { fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F2BB54', fontWeight: 600 },
  intelTxt: { fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: '#9AA1AD', letterSpacing: 0, lineHeight: 1.4, marginTop: 2 },
  intelSig: { fontSize: 8, letterSpacing: '0.12em', color: '#E25C5C', border: '1px solid #E25C5C', padding: '2px 6px', textTransform: 'uppercase', fontWeight: 700 },

  status: { height: 18, fontSize: 8, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#525A68', borderTop: '1px solid #1C222C', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 14, background: '#06080B' },
  greenDot: { width: 5, height: 5, background: '#4FB07A', borderRadius: '50%' },
};

function scoreColorA(s) {
  if (s >= 70) return '#E25C5C';
  if (s >= 35) return '#E8A52B';
  return '#4FB07A';
}

function VariantTerminal({ rows }) {
  return (
    <div style={vaStyles.root}>
      <div style={vaStyles.topBar}>
        <span style={vaStyles.mark}>B</span>
        <span style={vaStyles.wm}><span style={vaStyles.wmAccent}>Industry</span>Signal</span>
        <span style={{ marginLeft: 16, color: '#F2BB54' }}>SRSC</span>
        <span>RPRT</span><span>WTCH</span><span>ALRT</span>
        <span style={{ marginLeft: 'auto', color: '#C2C7CF' }}>14:32 CET</span>
      </div>
      <div style={vaStyles.cmd}>
        <span style={vaStyles.cmdPrompt}>CMD &gt;</span>
        <span style={vaStyles.cmdInput}>SRSC · CEZ DISTRIBUCE · LAST SCAN 14.5. 06:48</span>
      </div>
      <div style={vaStyles.header}>
        <span style={vaStyles.headerTitle}>SRSC · SUPPLIER RISK SCORE</span>
        <span style={vaStyles.headerMeta}>47 DODAVATELŮ · Q2 2026</span>
      </div>

      <div style={vaStyles.kpis}>
        <div style={vaStyles.kpi}><span style={vaStyles.kpiLbl}>Celkem</span><span style={vaStyles.kpiVal()}>47</span></div>
        <div style={vaStyles.kpi}><span style={vaStyles.kpiLbl}>Vysoké riziko</span><span style={vaStyles.kpiVal('#E25C5C')}>3</span></div>
        <div style={vaStyles.kpi}><span style={vaStyles.kpiLbl}>V riziku · mCZK</span><span style={vaStyles.kpiVal()}>459</span></div>
        <div style={{ ...vaStyles.kpi, borderRight: 'none', background: 'rgba(242,187,84,0.04)' }}>
          <span style={{ ...vaStyles.kpiLbl, color: '#F2BB54' }}>Kolekt.</span>
          <span style={vaStyles.kpiVal('#F2BB54')}>12 / 3↓</span>
        </div>
      </div>

      <table style={vaStyles.table}>
        <thead>
          <tr>
            <th style={vaStyles.th}>TICK</th>
            <th style={vaStyles.th}>SKÓRE</th>
            <th style={vaStyles.th}>DODAVATEL</th>
            <th style={vaStyles.th}>SEGMENT</th>
            <th style={{ ...vaStyles.th, textAlign: 'right' }}>EXP.</th>
            <th style={{ ...vaStyles.th, textAlign: 'right' }}>Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.tk} style={r.network ? { background: 'rgba(242,187,84,0.05)' } : undefined}>
              <td style={{ ...vaStyles.td, color: '#F7CE7E' }}>{r.tk}</td>
              <td style={{ ...vaStyles.td }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: scoreColorA(r.score), fontWeight: 700, minWidth: 18 }}>{r.score}</span>
                  <div style={{ width: 44, height: 4, background: '#11151C' }}>
                    <div style={{ width: r.score + '%', height: '100%', background: scoreColorA(r.score) }} />
                  </div>
                </div>
              </td>
              <td style={{ ...vaStyles.td, color: '#E2E5EA', fontWeight: 600 }}>{r.name}</td>
              <td style={{ ...vaStyles.td, color: '#737B89' }}>{r.seg}</td>
              <td style={{ ...vaStyles.td, textAlign: 'right' }}>{r.exp}</td>
              <td style={{ ...vaStyles.td, textAlign: 'right', color: '#E25C5C' }}>+{Math.max(1, Math.round(r.score * 0.15))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={vaStyles.intel}>
        <span style={vaStyles.intelNum}>12</span>
        <div>
          <div style={vaStyles.intelLbl}>Kolektivní intelligence · Cabletec</div>
          <div style={vaStyles.intelTxt}>12 IS klientů sleduje stejného dodavatele · 3 začínají vyřazovat. Žádná jiná platforma nevidí.</div>
        </div>
        <span style={vaStyles.intelSig}>● Signál · silný</span>
      </div>

      <div style={vaStyles.status}>
        <span style={vaStyles.greenDot} />
        <span>Session aktivní</span>
        <span>Feed · Live</span>
        <span>Latence 42 ms</span>
        <span style={{ marginLeft: 'auto' }}>Praha · 14.5.</span>
      </div>
    </div>
  );
}

window.VariantTerminal = VariantTerminal;


// Variant B — Editorial. Economist / FT-like print aesthetic.

const vbStyles = {
  root: {
    width: '100%', height: '100%', background: '#F4EFE4',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    color: '#1B1B1B', display: 'flex', flexDirection: 'column',
  },

  topBar: {
    height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 28px', borderBottom: '1px solid #1B1B1B',
    background: '#F4EFE4',
  },
  brand: { fontFamily: "'IBM Plex Serif', Georgia, serif", fontStyle: 'italic', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' },
  brandAccent: { color: '#A8313B' },
  topNav: { display: 'flex', gap: 28, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#525252', fontWeight: 500 },
  topNavActive: { color: '#A8313B', borderBottom: '2px solid #A8313B', paddingBottom: 4 },
  topMeta: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#525252', letterSpacing: '0.06em', textTransform: 'uppercase' },

  kicker: { padding: '20px 28px 6px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#A8313B', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600 },
  hed: { padding: '0 28px 6px', fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: 28, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.015em', color: '#0F0F0F' },
  dek: { padding: '0 28px 18px', fontSize: 13, lineHeight: 1.5, color: '#3A3A3A', maxWidth: 560, fontFamily: "'IBM Plex Serif', Georgia, serif", fontStyle: 'italic' },

  rule: { borderTop: '1px solid #C7BFAA', margin: '0 28px' },
  rule2: { borderTop: '3px double #1B1B1B', margin: '0 28px' },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '14px 28px', gap: 0, borderBottom: '1px solid #C7BFAA' },
  kpi: { padding: '0 16px 0 0', borderRight: '1px solid #C7BFAA', display: 'flex', flexDirection: 'column', gap: 4 },
  kpiLast: { borderRight: 'none', paddingLeft: 16 },
  kpiLbl: { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#525252' },
  kpiVal: (c) => ({ fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: 32, fontWeight: 500, color: c || '#0F0F0F', letterSpacing: '-0.02em', lineHeight: 1 }),
  kpiSub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#525252', letterSpacing: '0.04em' },

  tableWrap: { padding: '8px 28px 0' },
  tableCaption: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#525252', padding: '12px 0 8px', display: 'flex', justifyContent: 'space-between' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '8px 0', borderBottom: '1px solid #1B1B1B', textAlign: 'left', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#525252', fontWeight: 500 },
  td: { padding: '9px 0', borderBottom: '1px solid #DCD3BC', color: '#1B1B1B' },
  num: { fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums' },

  intel: { marginTop: 'auto', margin: '0 28px 22px', borderTop: '3px double #1B1B1B', paddingTop: 16, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 18 },
  intelBig: { fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: 56, fontWeight: 500, color: '#A8313B', lineHeight: 1, letterSpacing: '-0.03em' },
  intelLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#A8313B', fontWeight: 600 },
  intelTxt: { fontFamily: "'IBM Plex Serif', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: '#1B1B1B', lineHeight: 1.45, marginTop: 6 },
  intelByline: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#525252', marginTop: 10 },
};

function scoreColorB(s) {
  if (s >= 70) return '#A8313B';
  if (s >= 35) return '#9C6B14';
  return '#3F6B47';
}

function VariantEditorial({ rows }) {
  return (
    <div style={vbStyles.root}>
      <div style={vbStyles.topBar}>
        <div style={vbStyles.brand}><span style={vbStyles.brandAccent}>Industry</span><i>Signal</i></div>
        <div style={vbStyles.topNav}>
          <span>Report</span>
          <span style={vbStyles.topNavActive}>Suppliers</span>
          <span>Export Map</span>
          <span>Watch</span>
          <span>Alerts</span>
        </div>
        <div style={vbStyles.topMeta}>14. 5. 2026 · CEZ</div>
      </div>

      <div style={vbStyles.kicker}>Supplier Risk · CEZ Distribuce · Q2 2026</div>
      <h1 style={vbStyles.hed}>Three suppliers are signalling distress.</h1>
      <div style={vbStyles.dek}>The portfolio of 47 vendors is mostly stable — but a tightly clustered group of cable and electrical-installation suppliers is now drifting into red territory faster than the cohort.</div>

      <div style={vbStyles.kpis}>
        <div style={vbStyles.kpi}><span style={vbStyles.kpiLbl}>Suppliers</span><span style={vbStyles.kpiVal()}>47</span><span style={vbStyles.kpiSub}>CEZ Distribuce</span></div>
        <div style={vbStyles.kpi}><span style={vbStyles.kpiLbl}>High risk</span><span style={vbStyles.kpiVal('#A8313B')}>3</span><span style={vbStyles.kpiSub}>+1 vs Q1</span></div>
        <div style={vbStyles.kpi}><span style={vbStyles.kpiLbl}>At risk · mCZK</span><span style={vbStyles.kpiVal()}>459</span><span style={vbStyles.kpiSub}>of 2 480 total</span></div>
        <div style={{ ...vbStyles.kpi, ...vbStyles.kpiLast }}><span style={{ ...vbStyles.kpiLbl, color: '#A8313B' }}>Network</span><span style={vbStyles.kpiVal('#A8313B')}>12 / 3↓</span><span style={vbStyles.kpiSub}>tracking / exiting</span></div>
      </div>

      <div style={vbStyles.tableWrap}>
        <div style={vbStyles.tableCaption}>
          <span>Top 6 by risk score · scan 14 May 06:48</span>
          <span>Score 0–100 · lower is safer</span>
        </div>
        <table style={vbStyles.table}>
          <thead>
            <tr>
              <th style={vbStyles.th}>Supplier</th>
              <th style={vbStyles.th}>Segment</th>
              <th style={{ ...vbStyles.th, textAlign: 'right' }}>Score</th>
              <th style={{ ...vbStyles.th, textAlign: 'right' }}>Exposure</th>
              <th style={{ ...vbStyles.th, textAlign: 'right' }}>Δ 90 d</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.tk}>
                <td style={vbStyles.td}>
                  <div style={{ fontWeight: 600, color: '#0F0F0F' }}>{r.name}</div>
                  {r.network && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#A8313B', letterSpacing: '0.10em', textTransform: 'uppercase', marginTop: 2 }}>● Network signal</div>}
                </td>
                <td style={{ ...vbStyles.td, color: '#525252' }}>{r.seg}</td>
                <td style={{ ...vbStyles.td, ...vbStyles.num, textAlign: 'right', color: scoreColorB(r.score), fontWeight: 700 }}>{r.score}</td>
                <td style={{ ...vbStyles.td, ...vbStyles.num, textAlign: 'right' }}>{r.exp}</td>
                <td style={{ ...vbStyles.td, ...vbStyles.num, textAlign: 'right', color: '#A8313B' }}>+{Math.max(1, Math.round(r.score * 0.15))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={vbStyles.intel}>
        <div style={vbStyles.intelBig}>12</div>
        <div>
          <div style={vbStyles.intelLbl}>Collective intelligence</div>
          <div style={vbStyles.intelTxt}>"Twelve other clients are tracking the same supplier. Three of them are now exiting. That is a signal no other platform can see."</div>
          <div style={vbStyles.intelByline}>— Cabletec Industrial a.s. · CBLT · cross-portfolio view</div>
        </div>
      </div>
    </div>
  );
}

window.VariantEditorial = VariantEditorial;


// Variant C — Modern SaaS. Linear / Vercel / Stripe-inspired dark UI.

const vcStyles = {
  root: {
    width: '100%', height: '100%',
    background: 'radial-gradient(ellipse at top, #15151A 0%, #0A0A0C 60%)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: '#E8E8EC', display: 'flex', flexDirection: 'column',
    padding: 18, gap: 14, boxSizing: 'border-box',
  },

  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 4px',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  mark: { width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #818CF8 0%, #5B5FCE 100%)', boxShadow: '0 0 0 1px rgba(129,140,248,0.35), inset 0 1px 0 rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0C', fontWeight: 700, fontSize: 12 },
  wm: { fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' },
  topNav: { display: 'flex', gap: 4, fontSize: 12, color: '#8B8B92', fontWeight: 500 },
  navItem: (active) => ({
    padding: '5px 10px', borderRadius: 6,
    background: active ? 'rgba(129,140,248,0.12)' : 'transparent',
    color: active ? '#A5B0FF' : '#8B8B92',
    border: active ? '1px solid rgba(129,140,248,0.25)' : '1px solid transparent',
  }),
  topMeta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#6E6E76' },
  topDot: { width: 6, height: 6, borderRadius: '50%', background: '#22C57F', boxShadow: '0 0 8px rgba(34,197,127,0.6)' },

  hed: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '6px 4px 0' },
  hedTitle: { fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#F2F2F4' },
  hedSub: { fontSize: 12, color: '#8B8B92', marginTop: 2 },
  hedBadge: { fontSize: 10, padding: '4px 8px', borderRadius: 999, background: 'rgba(129,140,248,0.12)', color: '#A5B0FF', border: '1px solid rgba(129,140,248,0.22)', fontWeight: 500, letterSpacing: '0.02em' },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
  card: { background: 'linear-gradient(180deg, rgba(255,255,255,0.018) 0%, transparent 100%)', border: '1px solid #1F1F26', borderRadius: 10, padding: 14, position: 'relative', overflow: 'hidden' },
  kpiLbl: { fontSize: 11, color: '#8B8B92', fontWeight: 500, letterSpacing: 0 },
  kpiVal: (c) => ({ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums', fontSize: 24, fontWeight: 600, color: c || '#F2F2F4', letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1.05 }),
  kpiDelta: (c) => ({ fontSize: 11, color: c || '#6E6E76', marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }),
  kpiAccent: { background: 'linear-gradient(180deg, rgba(129,140,248,0.10) 0%, rgba(129,140,248,0.02) 100%)', borderColor: 'rgba(129,140,248,0.25)' },

  tableCard: { flex: 1, minHeight: 0, background: 'rgba(255,255,255,0.012)', border: '1px solid #1F1F26', borderRadius: 10, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  tableHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1F1F26' },
  tableTitle: { fontSize: 13, fontWeight: 600, color: '#E8E8EC' },
  tableMeta: { fontSize: 11, color: '#6E6E76' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '8px 16px', background: 'transparent', color: '#6E6E76', textAlign: 'left', fontSize: 11, fontWeight: 500, borderBottom: '1px solid #1F1F26' },
  td: { padding: '10px 16px', borderBottom: '1px solid #15151B', color: '#D4D4D8' },

  scoreChip: (c, lvl) => ({ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '3px 8px 3px 4px', borderRadius: 999, background: c.bg, border: `1px solid ${c.border}`, color: c.fg, fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }),
  scoreDot: (c) => ({ width: 6, height: 6, borderRadius: '50%', background: c }),

  intel: { background: 'linear-gradient(135deg, rgba(129,140,248,0.10) 0%, rgba(129,140,248,0.02) 60%)', border: '1px solid rgba(129,140,248,0.28)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 18 },
  intelNum: { fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums', fontSize: 36, fontWeight: 600, color: '#A5B0FF', letterSpacing: '-0.03em', lineHeight: 1 },
  intelLbl: { fontSize: 11, color: '#A5B0FF', fontWeight: 600, letterSpacing: 0 },
  intelTxt: { fontSize: 13, color: '#C4C4CB', marginTop: 4, lineHeight: 1.45, letterSpacing: 0 },
  intelCta: { padding: '7px 14px', borderRadius: 8, background: '#818CF8', color: '#0A0A0C', fontSize: 12, fontWeight: 600, marginLeft: 'auto', cursor: 'pointer', boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 0 16px rgba(129,140,248,0.25)' },
};

function scoreColorC(s) {
  if (s >= 70) return { fg: '#FCA5A5', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', dot: '#EF4444' };
  if (s >= 35) return { fg: '#FCD34D', bg: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.25)', dot: '#EAB308' };
  return         { fg: '#86EFAC', bg: 'rgba(34,197,127,0.08)', border: 'rgba(34,197,127,0.22)', dot: '#22C57F' };
}

function VariantModern({ rows }) {
  return (
    <div style={vcStyles.root}>
      <div style={vcStyles.topBar}>
        <div style={vcStyles.brand}>
          <span style={vcStyles.mark}>IS</span>
          <span style={vcStyles.wm}>IndustrySignal</span>
          <span style={{ ...vcStyles.topMeta, marginLeft: 6 }}>/ Suppliers</span>
        </div>
        <div style={vcStyles.topNav}>
          <span style={vcStyles.navItem(false)}>Report</span>
          <span style={vcStyles.navItem(true)}>Suppliers</span>
          <span style={vcStyles.navItem(false)}>Export Map</span>
          <span style={vcStyles.navItem(false)}>Watch</span>
          <span style={vcStyles.navItem(false)}>Alerts</span>
        </div>
        <div style={vcStyles.topMeta}><span style={vcStyles.topDot} /> Live · 14:32</div>
      </div>

      <div style={vcStyles.hed}>
        <div>
          <div style={vcStyles.hedTitle}>Supplier risk · CEZ Distribuce</div>
          <div style={vcStyles.hedSub}>47 suppliers · scan 14 May 06:48 · next 15 May 06:00</div>
        </div>
        <div style={vcStyles.hedBadge}>3 high · 6 medium · 38 low</div>
      </div>

      <div style={vcStyles.kpis}>
        <div style={vcStyles.card}>
          <div style={vcStyles.kpiLbl}>Total suppliers</div>
          <div style={vcStyles.kpiVal()}>47</div>
          <div style={vcStyles.kpiDelta()}>CEZ Distribuce</div>
        </div>
        <div style={vcStyles.card}>
          <div style={vcStyles.kpiLbl}>High risk</div>
          <div style={vcStyles.kpiVal('#FCA5A5')}>3</div>
          <div style={vcStyles.kpiDelta('#FCA5A5')}>↑ +1 vs Q1</div>
        </div>
        <div style={vcStyles.card}>
          <div style={vcStyles.kpiLbl}>At risk</div>
          <div style={vcStyles.kpiVal()}>459<span style={{ fontSize: 13, color: '#6E6E76', marginLeft: 4, fontWeight: 500 }}>mCZK</span></div>
          <div style={vcStyles.kpiDelta()}>of 2 480 total</div>
        </div>
        <div style={{ ...vcStyles.card, ...vcStyles.kpiAccent }}>
          <div style={{ ...vcStyles.kpiLbl, color: '#A5B0FF' }}>Network</div>
          <div style={vcStyles.kpiVal('#A5B0FF')}>12<span style={{ fontSize: 14, color: '#A5B0FF', opacity: 0.7, marginLeft: 6 }}>/ 3↓</span></div>
          <div style={vcStyles.kpiDelta('#8B8B92')}>tracking / exiting</div>
        </div>
      </div>

      <div style={vcStyles.tableCard}>
        <div style={vcStyles.tableHead}>
          <div>
            <div style={vcStyles.tableTitle}>Top suppliers by risk</div>
            <div style={vcStyles.tableMeta}>Sorted by score · click to inspect</div>
          </div>
          <div style={vcStyles.tableMeta}>6 of 47</div>
        </div>
        <table style={vcStyles.table}>
          <thead>
            <tr>
              <th style={vcStyles.th}>Supplier</th>
              <th style={vcStyles.th}>Segment</th>
              <th style={{ ...vcStyles.th, textAlign: 'right' }}>Score</th>
              <th style={{ ...vcStyles.th, textAlign: 'right' }}>Exposure</th>
              <th style={{ ...vcStyles.th, textAlign: 'right' }}>Δ 90 d</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const c = scoreColorC(r.score);
              return (
                <tr key={r.tk}>
                  <td style={vcStyles.td}>
                    <div style={{ fontWeight: 600, color: '#F2F2F4' }}>{r.name}</div>
                    <div style={{ fontSize: 10.5, color: '#6E6E76', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{r.tk}{r.network && <span style={{ marginLeft: 8, color: '#A5B0FF' }}>● network</span>}</div>
                  </td>
                  <td style={{ ...vcStyles.td, color: '#8B8B92' }}>{r.seg}</td>
                  <td style={{ ...vcStyles.td, textAlign: 'right' }}>
                    <span style={vcStyles.scoreChip(c)}><span style={vcStyles.scoreDot(c.dot)} />{r.score}</span>
                  </td>
                  <td style={{ ...vcStyles.td, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#E8E8EC' }}>{r.exp}<span style={{ color: '#6E6E76', marginLeft: 3, fontSize: 10 }}>m</span></td>
                  <td style={{ ...vcStyles.td, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: c.dot }}>+{Math.max(1, Math.round(r.score * 0.15))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={vcStyles.intel}>
        <div style={vcStyles.intelNum}>12</div>
        <div style={{ flex: 1 }}>
          <div style={vcStyles.intelLbl}>Collective intelligence · Cabletec Industrial</div>
          <div style={vcStyles.intelTxt}>12 clients are tracking the same supplier. 3 are now exiting — a signal no public dataset can produce.</div>
        </div>
        <div style={vcStyles.intelCta}>Inspect →</div>
      </div>
    </div>
  );
}

window.VariantModern = VariantModern;

