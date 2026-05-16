// IndustrySignal — Report view, Bloomberg-style dense grid layout.

const reportStyles = {
  root: { background: 'var(--bg-app)', color: 'var(--fg-primary)', minHeight: '100%' },

  header: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    borderBottom: '1px solid var(--graphite-800)',
  },
  headLeft: { padding: '20px 24px 18px', borderRight: '1px solid var(--graphite-800)' },
  kicker: {
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em',
    textTransform: 'uppercase', color: 'var(--amber-300)',
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 10,
  },
  rule: { width: 18, height: 1, background: 'var(--amber-300)' },
  headline: {
    fontFamily: 'var(--font-serif)', fontWeight: 700,
    fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.01em',
    color: 'var(--fg-primary)', margin: '0 0 10px',
  },
  byline: {
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-muted)',
    display: 'flex', gap: 14,
  },

  headRight: { padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  miniTitle: { fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  ratioRow: { display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 11 },
  ratioLabel: { color: 'var(--fg-tertiary)', letterSpacing: '0.04em' },
  ratioValue: { color: 'var(--fg-primary)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 },

  // KPI strip — 4 cells per row, hairline grid
  kpiStrip: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    borderBottom: '1px solid var(--graphite-800)',
  },
  kpi: {
    padding: '12px 18px',
    borderRight: '1px solid var(--graphite-800)',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  kpiLabel: { fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  kpiVal: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--fg-primary)' },
  kpiDelta: (dir) => ({ fontFamily: 'var(--font-mono)', fontSize: 11,
    color: dir === 'up' ? 'var(--signal-up)' : dir === 'dn' ? 'var(--signal-down)' : 'var(--signal-warn)' }),

  // Section block — sidecar gutter on left with mono index, body on right
  sectionRow: {
    display: 'grid', gridTemplateColumns: '52px 1fr 320px',
    borderBottom: '1px solid var(--graphite-800)',
    minHeight: 220,
  },
  gutter: {
    borderRight: '1px solid var(--graphite-800)',
    padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    fontFamily: 'var(--font-mono)',
  },
  gutterIndex: { fontSize: 18, color: 'var(--amber-300)', fontWeight: 600 },
  gutterCode:  { fontSize: 9, letterSpacing: '0.14em', color: 'var(--fg-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginTop: 8, textTransform: 'uppercase' },

  body: { padding: '16px 24px 18px' },
  sectionKind: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber-300)' },
  sectionTitle: {
    fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em',
    color: 'var(--fg-primary)', margin: '6px 0 8px',
  },
  sectionSummary: { fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.55, color: 'var(--fg-secondary)', maxWidth: 680, margin: '0 0 12px' },
  bodyP: { fontFamily: 'var(--font-sans)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--fg-tertiary)', margin: '0 0 8px', maxWidth: 680 },

  sidecar: { borderLeft: '1px solid var(--graphite-800)', padding: '14px 16px', background: 'var(--graphite-1000)', display: 'flex', flexDirection: 'column', gap: 12 },
  sidecarTitle: { fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' },

  miniKpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--graphite-800)' },
  miniKpi: { padding: '8px 10px', background: 'var(--graphite-1000)', display: 'flex', flexDirection: 'column', gap: 2 },
  miniKpiLabel: { fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  miniKpiVal: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--fg-primary)', fontWeight: 600 },
  miniKpiDelta: (dir) => ({ fontFamily: 'var(--font-mono)', fontSize: 10,
    color: dir === 'up' ? 'var(--signal-up)' : dir === 'dn' ? 'var(--signal-down)' : 'var(--signal-warn)' }),
};

function ReportView({ report }) {
  return (
    <div style={reportStyles.root}>
      {/* Editorial header */}
      <div style={reportStyles.header}>
        <div style={reportStyles.headLeft}>
          <div style={reportStyles.kicker}>
            <span style={reportStyles.rule} />
            {report.quarter} · QUARTERLY REPORT · {report.publishedAt.toUpperCase()}
          </div>
          <h1 style={reportStyles.headline}>{report.title}</h1>
          <div style={reportStyles.byline}>
            <span>Redakce IndustrySignal</span>
            <span>·</span>
            <span>5 sekcí</span>
            <span>·</span>
            <span>32 stran</span>
            <span>·</span>
            <span>147 firem</span>
          </div>
        </div>
        <div style={reportStyles.headRight}>
          <div style={reportStyles.miniTitle}>Key ratios · Q2 vs Q1</div>
          {[
            ['HDP Q/Q', '+0,4 %', '−0,3 p.b.', 'dn'],
            ['PMI výroba', '47,8', '−1,2', 'dn'],
            ['Inflace CPI', '2,8 %', '−0,1 p.b.', 'up'],
            ['EUR/CZK', '24,82', '+0,4 %', 'warn'],
            ['BRENT', '78,42', '+1,2 %', 'up'],
          ].map(([l,v,d,dir]) => (
            <div key={l} style={reportStyles.ratioRow}>
              <span style={reportStyles.ratioLabel}>{l}</span>
              <span style={reportStyles.ratioValue}>{v}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: dir==='up'?'var(--signal-up)':dir==='dn'?'var(--signal-down)':'var(--signal-warn)' }}>{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      {report.sections.map((sec, i) => (
        <div key={sec.id} data-section={sec.id} style={reportStyles.sectionRow}>
          <div style={reportStyles.gutter}>
            <span style={reportStyles.gutterIndex}>{String(i+1).padStart(2,'0')}</span>
            <span style={reportStyles.gutterCode}>{sec.kind.toUpperCase()}</span>
          </div>
          <div style={reportStyles.body}>
            <div style={reportStyles.sectionKind}>{sec.kind}</div>
            <h2 style={reportStyles.sectionTitle}>{sec.title}</h2>
            <p style={reportStyles.sectionSummary}>{sec.summary}</p>
            {sec.body.map((p, j) => <p key={j} style={reportStyles.bodyP}>{p}</p>)}
          </div>
          <div style={reportStyles.sidecar}>
            <div style={reportStyles.sidecarTitle}>Klíčové metriky</div>
            {sec.kpis ? (
              <div style={reportStyles.miniKpiGrid}>
                {sec.kpis.map(k => (
                  <div key={k.label} style={reportStyles.miniKpi}>
                    <div style={reportStyles.miniKpiLabel}>{k.label}</div>
                    <div style={reportStyles.miniKpiVal}>{k.value}</div>
                    <div style={reportStyles.miniKpiDelta(k.dir)}>{k.delta}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                Žádná tabulková data v této sekci.
              </div>
            )}
            <div style={reportStyles.sidecarTitle}>Související alerty</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[1,2].map(n => (
                <div key={n} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-tertiary)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--graphite-800)', paddingBottom: 4 }}>
                  <span>{n === 1 ? 'CEZ EQ · pozit.' : 'VTK EQ · neg.'}</span>
                  <span style={{ color: n===1 ? 'var(--signal-up)' : 'var(--signal-down)' }}>{n===1 ? '+1,2%' : '−5,8%'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

window.ReportView = ReportView;
