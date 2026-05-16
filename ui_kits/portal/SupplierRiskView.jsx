// IndustrySignal — Supplier Risk Score (SRSC). Bloomberg-style risk monitor for uploaded supplier lists.

const srscStyles = {
  root: { fontFamily: 'var(--font-mono)' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--graphite-800)',
    background: 'var(--graphite-1000)',
  },
  headerTitle: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber-300)', fontWeight: 600 },
  headerMeta:  { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' },

  toolbar: {
    display: 'flex', alignItems: 'stretch',
    borderBottom: '1px solid var(--graphite-800)',
    background: 'var(--graphite-1000)',
  },
  filter: (active) => ({
    padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: active ? 'var(--amber-300)' : 'var(--fg-tertiary)',
    background: active ? 'var(--graphite-900)' : 'transparent',
    borderRight: '1px solid var(--graphite-800)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  }),
  filterCount: { color: 'var(--fg-muted)', fontSize: 9 },
  toolBtn: (primary) => ({
    padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: primary ? 'var(--fg-on-amber)' : 'var(--fg-secondary)',
    background: primary ? 'var(--amber-300)' : 'transparent',
    borderLeft: '1px solid var(--graphite-800)',
    cursor: 'pointer', fontWeight: primary ? 700 : 500,
    display: 'flex', alignItems: 'center', gap: 6,
  }),

  heroBand: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    borderBottom: '1px solid var(--graphite-800)',
    background: 'var(--graphite-950)',
  },
  heroCell: {
    padding: '14px 16px',
    borderRight: '1px solid var(--graphite-800)',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  heroLabel: { fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  heroValue: { fontSize: 22, fontWeight: 500, color: 'var(--fg-primary)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 },
  heroSub:   { fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' },

  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 360px',
    minHeight: 'calc(100vh - 32px - 28px - 22px - 42px - 42px - 84px)',
  },
  left: { borderRight: '1px solid var(--graphite-800)', minWidth: 0, overflowX: 'auto' },
  right: { display: 'flex', flexDirection: 'column', minWidth: 0 },

  panel: { borderBottom: '1px solid var(--graphite-800)' },
  panelHeader: {
    padding: '8px 14px',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--amber-300)', fontWeight: 600,
    background: 'var(--graphite-900)',
    borderBottom: '1px solid var(--graphite-800)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  panelBody: { padding: '12px 14px' },

  scoreCell: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 90 },
  scoreNum: (color) => ({
    fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
    fontSize: 13, fontWeight: 700, color,
    minWidth: 22, textAlign: 'right',
  }),
  scoreBar: { position: 'relative', width: 60, height: 6, background: 'var(--graphite-900)', border: '1px solid var(--graphite-800)' },
  scoreFill: (pct, color) => ({ position: 'absolute', top: 0, left: 0, bottom: 0, width: pct + '%', background: color }),

  flagsRow: { display: 'flex', gap: 3 },
  flag: (lit) => ({
    width: 16, height: 16,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
    letterSpacing: 0,
    color: lit ? 'var(--fg-on-amber)' : 'var(--graphite-600)',
    background: lit ? 'var(--signal-warn)' : 'transparent',
    border: '1px solid ' + (lit ? 'var(--signal-warn)' : 'var(--graphite-700)'),
  }),
  flagHigh: { background: 'var(--signal-down)', borderColor: 'var(--signal-down)', color: 'var(--fg-on-amber)' },

  signalRow: { display: 'grid', gridTemplateColumns: '38px 1fr 50px 32px', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 11 },
  signalCode: { color: 'var(--amber-300)', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em' },
  signalLabel: { color: 'var(--fg-secondary)', fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: 0 },
  signalBar: { position: 'relative', height: 4, background: 'var(--graphite-800)' },
  signalFill: (pct) => ({ position: 'absolute', top: 0, left: 0, bottom: 0, width: pct + '%', background: 'var(--amber-300)' }),
  signalActive: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: 'var(--fg-primary)', fontWeight: 600, fontSize: 11 },

  networkCard: {
    padding: 14,
    background: 'linear-gradient(180deg, rgba(242,187,84,0.05) 0%, transparent 100%)',
    borderBottom: '1px solid var(--graphite-800)',
  },
  networkBig: { fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 500, color: 'var(--amber-300)', lineHeight: 1, letterSpacing: '-0.02em' },
  networkLine: { display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  networkBars: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 },
  networkStat: { borderTop: '1px solid var(--graphite-800)', paddingTop: 8 },
  networkStatNum: { fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500 },
  networkStatLbl: { fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  networkBlurb: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-tertiary)', lineHeight: 1.5, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--graphite-800)', letterSpacing: 0 },

  caseQuote: { fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.4, color: 'var(--fg-primary)', letterSpacing: 0, fontStyle: 'italic' },
  caseBy:    { fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginTop: 8 },
  caseGrid:  { display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, marginTop: 14, alignItems: 'center' },
  caseDot:   (c) => ({ width: 8, height: 8, background: c, borderRadius: 1, flexShrink: 0 }),
  caseRowLbl:{ fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  caseRowVal:{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-primary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' },
  caseSaved: { marginTop: 14, padding: 12, background: 'var(--signal-up-bg)', border: '1px solid rgba(79,176,122,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  caseSavedNum: { fontFamily: 'var(--font-mono)', fontSize: 24, color: 'var(--signal-up)', fontWeight: 500 },
  caseSavedLbl: { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--signal-up)', opacity: 0.85 },

  uploadBox: {
    margin: 14, padding: '20px 18px',
    border: '1px dashed var(--graphite-600)',
    background: 'rgba(242,187,84,0.02)',
    textAlign: 'center',
  },
};

const FLAG_CODES = ['ARES', 'INSO', 'HIRE', 'LEAD', 'PAYM', 'INDB'];
const FLAG_LETTER = { ARES: 'A', INSO: 'I', HIRE: 'H', LEAD: 'L', PAYM: 'P', INDB: 'D' };

function scoreColor(s) {
  if (s >= 70) return 'var(--signal-down)';
  if (s >= 35) return 'var(--signal-warn)';
  return 'var(--signal-up)';
}
function riskBucket(s) {
  if (s >= 70) return 'high';
  if (s >= 35) return 'med';
  return 'low';
}

function SRSCSparkline({ data, width = 70, height = 18, color }) {
  const max = Math.max(...data), min = Math.min(...data);
  const span = Math.max(max - min, 1);
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 2) - 1]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={color || 'var(--graphite-400)'} strokeWidth="1.25" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2" fill={color || 'var(--amber-300)'} />
    </svg>
  );
}

function SupplierRiskView({ srsc }) {
  const [lang] = window.IS_I18N.useLang();
  const [filter, setFilter] = React.useState('ALL');

  const rows = srsc.suppliers
    .filter(s => {
      if (filter === 'ALL') return true;
      if (filter === 'COLLEC') return s.collective >= 5;
      return riskBucket(s.score) === filter.toLowerCase();
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div style={srscStyles.root}>
      {/* HEADER */}
      <div style={srscStyles.header}>
        <span style={srscStyles.headerTitle}>SRSC · {t('srsc_title')} · {srsc.client}</span>
        <span style={srscStyles.headerMeta}>{t('srsc_meta', srsc.total, srsc.scanDate)}</span>
      </div>

      {/* TOOLBAR */}
      <div style={srscStyles.toolbar}>
        <div style={srscStyles.filter(filter === 'ALL')}   onClick={() => setFilter('ALL')}>{t('srsc_filter_all')} <span style={srscStyles.filterCount}>{srsc.total}</span></div>
        <div style={srscStyles.filter(filter === 'HIGH')}  onClick={() => setFilter('HIGH')}>{t('srsc_filter_high')} <span style={srscStyles.filterCount}>{srsc.high}</span></div>
        <div style={srscStyles.filter(filter === 'MED')}   onClick={() => setFilter('MED')}>{t('srsc_filter_med')}  <span style={srscStyles.filterCount}>{srsc.med}</span></div>
        <div style={srscStyles.filter(filter === 'LOW')}   onClick={() => setFilter('LOW')}>{t('srsc_filter_low')}  <span style={srscStyles.filterCount}>{srsc.low}</span></div>
        <div style={srscStyles.filter(filter === 'COLLEC')} onClick={() => setFilter('COLLEC')}>{t('srsc_filter_collective')} <span style={srscStyles.filterCount}>{srsc.suppliers.filter(s => s.collective >= 5).length}</span></div>
        <div style={{ flex: 1 }} />
        <div style={srscStyles.toolBtn(false)}>↻ {t('srsc_rescan')}</div>
        <div style={srscStyles.toolBtn(false)}>↓ {t('srsc_export_btn')}</div>
        <div style={srscStyles.toolBtn(true)}>+ {t('add').toUpperCase()}</div>
      </div>

      {/* HERO BAND */}
      <div style={srscStyles.heroBand}>
        <div style={srscStyles.heroCell}>
          <span style={srscStyles.heroLabel}>{t('srsc_total')}</span>
          <span style={srscStyles.heroValue}>{srsc.total}</span>
          <span style={{ ...srscStyles.heroSub, color: 'var(--fg-tertiary)' }}>{srsc.client.toUpperCase()}</span>
        </div>
        <div style={srscStyles.heroCell}>
          <span style={srscStyles.heroLabel}>{t('srsc_high')}</span>
          <span style={{ ...srscStyles.heroValue, color: 'var(--signal-down)' }}>{srsc.high}</span>
          <span style={{ ...srscStyles.heroSub, color: 'var(--signal-down)' }}>▲ +1 vs Q1</span>
        </div>
        <div style={srscStyles.heroCell}>
          <span style={srscStyles.heroLabel}>{t('srsc_med')}</span>
          <span style={{ ...srscStyles.heroValue, color: 'var(--signal-warn)' }}>{srsc.med}</span>
          <span style={{ ...srscStyles.heroSub, color: 'var(--fg-tertiary)' }}>≈ 0 vs Q1</span>
        </div>
        <div style={srscStyles.heroCell}>
          <span style={srscStyles.heroLabel}>{t('srsc_exposure_total')} · {t('srsc_unit_mczk')}</span>
          <span style={srscStyles.heroValue}>{srsc.exposureTotal}</span>
          <span style={{ ...srscStyles.heroSub, color: 'var(--fg-tertiary)' }}>{t('srsc_exposure_risk')} · {srsc.exposureRisk}</span>
        </div>
        <div style={{ ...srscStyles.heroCell, borderRight: 'none', background: 'rgba(242,187,84,0.04)' }}>
          <span style={{ ...srscStyles.heroLabel, color: 'var(--amber-300)' }}>{t('srsc_network')}</span>
          <span style={{ ...srscStyles.heroValue, color: 'var(--amber-300)' }}>{srsc.network.tracking} / {srsc.network.exiting}↓</span>
          <span style={{ ...srscStyles.heroSub, color: 'var(--fg-tertiary)' }}>{srsc.network.supplier.toUpperCase()}</span>
        </div>
      </div>

      {/* BODY 2-col */}
      <div style={srscStyles.body}>
        {/* LEFT: supplier table */}
        <div style={srscStyles.left}>
          <table className="bbg-table" style={{ borderTop: 'none' }}>
            <thead>
              <tr>
                <th style={{ width: 50 }}>Tick</th>
                <th style={{ width: 110 }}>{t('col_srsc_score')}</th>
                <th>{t('col_srsc_supplier')}</th>
                <th style={{ width: 100 }}>{t('col_srsc_ico')}</th>
                <th style={{ width: 120 }}>{t('col_srsc_segment')}</th>
                <th className="num" style={{ width: 88 }}>{t('col_srsc_exposure')}</th>
                <th style={{ width: 120 }}>{t('col_srsc_signals')}</th>
                <th style={{ width: 90 }}>{t('col_srsc_trend')}</th>
                <th className="num" style={{ width: 64 }}>{t('col_srsc_change')}</th>
                <th className="num" style={{ width: 80 }}>{t('col_srsc_collective')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const c = scoreColor(r.score);
                const delta = r.score - r.prev;
                const deltaColor = delta > 0 ? 'var(--signal-down)' : delta < 0 ? 'var(--signal-up)' : 'var(--fg-tertiary)';
                const isNetworkRow = r.collective >= 10;
                return (
                  <tr key={r.ticker} style={isNetworkRow ? { background: 'rgba(242,187,84,0.05)' } : undefined}>
                    <td><span className="key">{r.ticker}</span></td>
                    <td>
                      <div style={srscStyles.scoreCell}>
                        <span style={srscStyles.scoreNum(c)}>{r.score}</span>
                        <div style={srscStyles.scoreBar}>
                          <div style={srscStyles.scoreFill(r.score, c)} />
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>
                      {r.name}
                      {isNetworkRow && <span style={{ marginLeft: 6, padding: '0 4px', fontSize: 8, letterSpacing: '0.10em', color: 'var(--fg-on-amber)', background: 'var(--amber-300)', verticalAlign: 'middle' }}>NET</span>}
                    </td>
                    <td style={{ color: 'var(--fg-tertiary)' }}>{r.ico}</td>
                    <td style={{ color: 'var(--fg-tertiary)' }}>{r.segment}</td>
                    <td className="num" style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{r.exposure}</td>
                    <td>
                      <div style={srscStyles.flagsRow}>
                        {FLAG_CODES.map(fc => {
                          const lit = r.flags.includes(fc);
                          const isCritical = lit && (fc === 'INSO' || fc === 'PAYM') && r.score >= 70;
                          return (
                            <span key={fc} title={t('sig_' + fc.toLowerCase())} style={{ ...srscStyles.flag(lit), ...(isCritical ? srscStyles.flagHigh : null) }}>{FLAG_LETTER[fc]}</span>
                          );
                        })}
                      </div>
                    </td>
                    <td><SRSCSparkline data={r.trend} color={c} /></td>
                    <td className="num" style={{ color: deltaColor, fontWeight: 600 }}>{delta > 0 ? '+' : ''}{delta}</td>
                    <td className="num" style={{ color: r.exiting > 0 ? 'var(--signal-down)' : 'var(--fg-tertiary)' }}>
                      {r.collective}{r.exiting > 0 ? ` / ${r.exiting}↓` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RIGHT: collective intelligence + signals + case + upload */}
        <div style={srscStyles.right}>
          {/* NETWORK */}
          <div style={srscStyles.networkCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber-300)', fontWeight: 600 }}>{t('srsc_network')}</span>
              <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--signal-down)', border: '1px solid var(--signal-down)', padding: '1px 6px' }}>● {t('srsc_network_signal')} · {t('srsc_network_strong')}</span>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={srscStyles.networkBig}>{srsc.network.tracking}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-tertiary)', letterSpacing: 0 }}>{t('srsc_network_sub')}</span>
            </div>
            <div style={srscStyles.networkBars}>
              <div style={srscStyles.networkStat}>
                <div style={srscStyles.networkStatLbl}>{t('srsc_network_tracking')}</div>
                <div style={{ ...srscStyles.networkStatNum, color: 'var(--fg-primary)' }}>{srsc.network.tracking}</div>
              </div>
              <div style={srscStyles.networkStat}>
                <div style={{ ...srscStyles.networkStatLbl, color: 'var(--signal-down)' }}>{t('srsc_network_exiting')}</div>
                <div style={{ ...srscStyles.networkStatNum, color: 'var(--signal-down)' }}>{srsc.network.exiting}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--graphite-900)', border: '1px solid var(--graphite-800)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>↳ {srsc.network.supplier}</span>
              <span className="key" style={{ fontSize: 10 }}>CBLT</span>
            </div>
            <div style={srscStyles.networkBlurb}>{t('srsc_network_explain')}</div>
          </div>

          {/* SIGNAL SOURCES */}
          <div style={srscStyles.panel}>
            <div style={srscStyles.panelHeader}>
              <span>{t('srsc_signals')}</span>
              <span style={{ color: 'var(--fg-muted)' }}>6 · 59 k entit</span>
            </div>
            <div style={{ padding: '4px 14px 10px' }}>
              {srsc.signals.map(s => (
                <div key={s.code} style={srscStyles.signalRow}>
                  <span style={srscStyles.signalCode}>{s.code}</span>
                  <span style={srscStyles.signalLabel}>{t(s.labelKey)}</span>
                  <div style={srscStyles.signalBar}><div style={srscStyles.signalFill(s.weight * 100 / 30)} /></div>
                  <span style={srscStyles.signalActive}>{s.active}</span>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr 50px 32px', gap: 8, fontSize: 9, color: 'var(--fg-muted)', letterSpacing: '0.10em', textTransform: 'uppercase', marginTop: 6, borderTop: '1px solid var(--graphite-800)', paddingTop: 6 }}>
                <span /><span /><span style={{ textAlign: 'right' }}>{t('srsc_signal_w')}</span><span style={{ textAlign: 'right' }}>{t('srsc_signal_n')}</span>
              </div>
            </div>
          </div>

          {/* CASE STUDY */}
          <div style={srscStyles.panel}>
            <div style={srscStyles.panelHeader}>
              <span style={{ color: 'var(--signal-up)' }}>● {t('srsc_case_label')}</span>
              <span style={{ color: 'var(--fg-muted)' }}>{srsc.caseGap}</span>
            </div>
            <div style={srscStyles.panelBody}>
              <div style={srscStyles.caseQuote}>{t('srsc_case_quote')}</div>
              <div style={srscStyles.caseBy}>— {t('srsc_case_by')}</div>

              <div style={srscStyles.caseGrid}>
                <span style={srscStyles.caseDot('var(--signal-warn)')} />
                <span style={srscStyles.caseRowLbl}>{t('srsc_case_flagged')}</span>
                <span style={srscStyles.caseRowVal}>{srsc.caseFlaggedAt}</span>

                <span style={srscStyles.caseDot('var(--signal-down)')} />
                <span style={srscStyles.caseRowLbl}>{t('srsc_case_actual')}</span>
                <span style={srscStyles.caseRowVal}>{srsc.caseActualAt}</span>
              </div>

              <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--graphite-900)', border: '1px solid var(--graphite-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, color: 'var(--fg-secondary)', fontFamily: 'var(--font-sans)' }}>{srsc.caseSupplier}</span>
                <span className="key" style={{ fontSize: 10 }}>EMVY</span>
              </div>

              <div style={srscStyles.caseSaved}>
                <span style={srscStyles.caseSavedLbl}>{t('srsc_case_saved')}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={srscStyles.caseSavedNum}>{srsc.caseSavedK}</span>
                  <span style={{ ...srscStyles.caseSavedLbl, fontSize: 9 }}>tis. €</span>
                </div>
              </div>
            </div>
          </div>

          {/* UPLOAD */}
          <div style={srscStyles.panel}>
            <div style={srscStyles.panelHeader}>
              <span>{t('srsc_upload_title')}</span>
              <span style={{ color: 'var(--signal-up)' }}>● FREE</span>
            </div>
            <div style={srscStyles.uploadBox}>
              <div style={{ fontSize: 24, color: 'var(--graphite-500)', marginBottom: 8 }}>⤓</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-tertiary)', lineHeight: 1.5, letterSpacing: 0, marginBottom: 14 }}>{t('srsc_upload_body')}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span style={{ ...srscStyles.toolBtn(true), borderLeft: 'none' }}>{t('srsc_upload_btn')}</span>
                <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{t('srsc_upload_or')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.SupplierRiskView = SupplierRiskView;
