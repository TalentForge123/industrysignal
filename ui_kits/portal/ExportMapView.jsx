// IndustrySignal — Export Intelligence Map (XMAP). Market-entry map for a target country / segment.

const xmapStyles = {
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
  pickerGroup: { display: 'flex', alignItems: 'center', padding: '0 12px', borderRight: '1px solid var(--graphite-800)', gap: 8 },
  pickerLbl:   { fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  pickerVal:   { fontSize: 11, color: 'var(--fg-primary)', fontWeight: 600, letterSpacing: '0.04em' },
  pickerCaret: { color: 'var(--amber-300)', fontSize: 9 },
  layerTab: (active) => ({
    padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: active ? 'var(--amber-300)' : 'var(--fg-tertiary)',
    background: active ? 'var(--graphite-900)' : 'transparent',
    borderRight: '1px solid var(--graphite-800)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  }),
  layerNum: { color: 'var(--fg-muted)', fontWeight: 700 },
  toolBtn: (primary) => ({
    padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: primary ? 'var(--fg-on-amber)' : 'var(--fg-secondary)',
    background: primary ? 'var(--amber-300)' : 'transparent',
    borderLeft: '1px solid var(--graphite-800)',
    cursor: 'pointer', fontWeight: primary ? 700 : 500,
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
  heroSub:   { fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-tertiary)' },

  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 380px',
  },
  left:  { borderRight: '1px solid var(--graphite-800)', minWidth: 0, overflowX: 'auto' },
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
  panelBody: { padding: '14px' },

  /* density grid */
  gridWrap: { padding: 18 },
  gridHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  gridLabel: { fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-tertiary)' },
  gridSub:   { fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  cell: (density, isGap, active) => ({
    position: 'relative',
    aspectRatio: '1.4 / 1',
    padding: '10px 12px',
    background: `rgba(242, 187, 84, ${Math.max(density * 0.16, 0.02)})`,
    border: '1px solid ' + (active ? 'var(--amber-300)' : isGap ? 'rgba(79,176,122,0.5)' : 'var(--graphite-800)'),
    cursor: 'pointer',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    transition: 'border-color 120ms var(--ease-out), background 120ms var(--ease-out)',
    outline: active ? '1px solid var(--amber-300)' : 'none',
  }),
  cellTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' },
  cellCode: { fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '0.04em' },
  cellPlayers: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 18, fontWeight: 500, color: 'var(--amber-300)' },
  cellHub: { fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--fg-secondary)', letterSpacing: 0, marginTop: 2 },
  cellTop_: { fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.04em', color: 'var(--fg-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cellBar: { height: 3, background: 'var(--graphite-900)', border: '1px solid var(--graphite-800)', marginTop: 6, position: 'relative' },
  cellFill: (pct) => ({ position: 'absolute', top: 0, left: 0, bottom: 0, width: pct + '%', background: 'var(--amber-400)' }),
  gapTag: { position: 'absolute', top: 6, right: 6, fontSize: 8, letterSpacing: '0.10em', padding: '1px 4px', background: 'var(--signal-up)', color: 'var(--fg-on-amber)', fontWeight: 700 },

  /* legend strip */
  legend: { display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderTop: '1px solid var(--graphite-800)', fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
  legendSwatch: (a) => ({ width: 14, height: 10, background: `rgba(242,187,84,${a})`, border: '1px solid var(--graphite-700)' }),

  /* gaps panel */
  gapRow: { padding: '12px 0', borderBottom: '1px solid var(--graphite-800)', display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 10, alignItems: 'start' },
  gapCode: { fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--amber-300)', letterSpacing: '0.04em' },
  gapTitle:{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', letterSpacing: 0, marginBottom: 4 },
  gapBody: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-tertiary)', letterSpacing: 0, lineHeight: 1.5 },

  /* contacts */
  contactRow: { padding: '12px 14px', borderBottom: '1px solid var(--graphite-800)' },
  contactName: { fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-primary)', fontWeight: 600, letterSpacing: 0 },
  contactTitle:{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--fg-tertiary)', letterSpacing: 0, marginTop: 2 },
  contactAccount: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-text)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 6 },
  contactSignal: { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '2px 6px', border: '1px solid var(--signal-warn)', color: 'var(--signal-warn)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' },

  /* pricing */
  pricing: { padding: 16, background: 'var(--graphite-900)' },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0' },
  priceLbl: { fontSize: 11, color: 'var(--fg-tertiary)', letterSpacing: 0, fontFamily: 'var(--font-sans)' },
  priceVal: { fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--fg-primary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' },
  priceCta: { marginTop: 12, padding: '10px 14px', background: 'var(--amber-300)', color: 'var(--fg-on-amber)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', cursor: 'pointer' },
};

const TIER_COLOR = { A: 'var(--signal-down)', B: 'var(--signal-warn)', C: 'var(--signal-up)' };
const REL_LABEL = { direct: 'xmap_rel_direct', adjacent: 'xmap_rel_adjacent', partner: 'xmap_rel_partner' };

function ExportMapView({ xmap }) {
  const [lang] = window.IS_I18N.useLang();
  const [layer, setLayer] = React.useState('1');     // 1 players, 2 links, 3 gaps, 4 contacts
  const [activeRegion, setActiveRegion] = React.useState(null);

  const filteredPlayers = activeRegion
    ? xmap.players.filter(p => p.region === activeRegion)
    : xmap.players;

  return (
    <div style={xmapStyles.root}>
      {/* HEADER */}
      <div style={xmapStyles.header}>
        <span style={xmapStyles.headerTitle}>XMAP · {t('xmap_title')} · {xmap.client}</span>
        <span style={xmapStyles.headerMeta}>{t('xmap_kicker')} · {xmap.lastUpdate.toUpperCase()}</span>
      </div>

      {/* TOOLBAR */}
      <div style={xmapStyles.toolbar}>
        <div style={xmapStyles.pickerGroup}>
          <span style={xmapStyles.pickerLbl}>{t('xmap_country_lbl')}</span>
          <span style={xmapStyles.pickerVal}>{xmap.country} · {xmap.countryCode}</span>
          <span style={xmapStyles.pickerCaret}>▾</span>
        </div>
        <div style={xmapStyles.pickerGroup}>
          <span style={xmapStyles.pickerLbl}>{t('xmap_segment_lbl')}</span>
          <span style={xmapStyles.pickerVal}>{xmap.segment}</span>
          <span style={xmapStyles.pickerCaret}>▾</span>
        </div>
        <div style={{ ...xmapStyles.pickerGroup, color: 'var(--fg-muted)' }}>
          <span style={xmapStyles.pickerLbl}>{t('xmap_layer')}</span>
        </div>
        {[
          { id: '1', label: t('xmap_layer_1') },
          { id: '2', label: t('xmap_layer_2') },
          { id: '3', label: t('xmap_layer_3') },
          { id: '4', label: t('xmap_layer_4') },
        ].map(L => (
          <div key={L.id} style={xmapStyles.layerTab(layer === L.id)} onClick={() => setLayer(L.id)}>
            <span style={xmapStyles.layerNum}>{L.id}</span>{L.label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={xmapStyles.toolBtn(false)}>↓ {t('xmap_export_btn')}</div>
        <div style={xmapStyles.toolBtn(true)}>{t('xmap_cta')}</div>
      </div>

      {/* HERO BAND */}
      <div style={xmapStyles.heroBand}>
        <div style={xmapStyles.heroCell}>
          <span style={xmapStyles.heroLabel}>{t('xmap_players')}</span>
          <span style={xmapStyles.heroValue}>{xmap.totals.players}</span>
          <span style={xmapStyles.heroSub}>{xmap.segment.split(' / ')[0]}</span>
        </div>
        <div style={xmapStyles.heroCell}>
          <span style={xmapStyles.heroLabel}>{t('xmap_regions')}</span>
          <span style={xmapStyles.heroValue}>{xmap.totals.regions}</span>
          <span style={xmapStyles.heroSub}>{xmap.country}</span>
        </div>
        <div style={xmapStyles.heroCell}>
          <span style={xmapStyles.heroLabel}>{t('xmap_links')}</span>
          <span style={xmapStyles.heroValue}>{xmap.totals.links}</span>
          <span style={xmapStyles.heroSub}>direct · adjacent · partner</span>
        </div>
        <div style={{ ...xmapStyles.heroCell, background: 'rgba(79,176,122,0.04)' }}>
          <span style={{ ...xmapStyles.heroLabel, color: 'var(--signal-up)' }}>{t('xmap_gaps')}</span>
          <span style={{ ...xmapStyles.heroValue, color: 'var(--signal-up)' }}>{xmap.totals.gaps}</span>
          <span style={xmapStyles.heroSub}>{xmap.gaps.map(g => g.region).join(' · ')}</span>
        </div>
        <div style={{ ...xmapStyles.heroCell, borderRight: 'none' }}>
          <span style={xmapStyles.heroLabel}>{t('xmap_contacts')}</span>
          <span style={xmapStyles.heroValue}>{xmap.totals.contacts}</span>
          <span style={xmapStyles.heroSub}>procurement / FM</span>
        </div>
      </div>

      {/* BODY */}
      <div style={xmapStyles.body}>
        {/* LEFT — density grid + top players table */}
        <div style={xmapStyles.left}>
          <div style={xmapStyles.gridWrap}>
            <div style={xmapStyles.gridHead}>
              <span style={xmapStyles.gridLabel}>{t('xmap_density')}</span>
              <span style={xmapStyles.gridSub}>{t('xmap_density_sub')}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {xmap.regions.map(r => (
                <div key={r.code}
                  onClick={() => setActiveRegion(activeRegion === r.code ? null : r.code)}
                  style={xmapStyles.cell(r.density, !!r.gap, activeRegion === r.code)}>
                  {r.gap && <span style={xmapStyles.gapTag}>GAP</span>}
                  <div style={xmapStyles.cellTop}>
                    <span style={xmapStyles.cellCode}>{r.code}</span>
                    <span style={xmapStyles.cellPlayers}>{r.players}</span>
                  </div>
                  <div>
                    <div style={xmapStyles.cellHub}>{r.hub}</div>
                    <div style={xmapStyles.cellTop_}>{r.top}</div>
                    <div style={xmapStyles.cellBar}><div style={xmapStyles.cellFill(r.density * 100)} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={xmapStyles.legend}>
            <span>{t('xmap_legend')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={xmapStyles.legendSwatch(0.16)} /> {t('xmap_legend_sat')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={xmapStyles.legendSwatch(0.08)} /> {t('xmap_legend_mid')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={xmapStyles.legendSwatch(0.02)} /> {t('xmap_legend_gap')}</div>
            <div style={{ flex: 1 }} />
            {activeRegion && (
              <span style={{ color: 'var(--amber-300)', cursor: 'pointer' }} onClick={() => setActiveRegion(null)}>× CLEAR · {activeRegion}</span>
            )}
          </div>

          {/* Top players table */}
          <div>
            <div style={xmapStyles.panelHeader}>
              <span>{t('xmap_top_players')}{activeRegion ? ` · ${activeRegion}` : ''}</span>
              <span style={{ color: 'var(--fg-muted)' }}>{filteredPlayers.length} / {xmap.totals.players}</span>
            </div>
            <table className="bbg-table" style={{ borderTop: 'none' }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>{t('col_xmap_company')}</th>
                  <th style={{ width: 110 }}>{t('col_xmap_city')}</th>
                  <th style={{ width: 60 }}>{t('col_xmap_region')}</th>
                  <th className="num" style={{ width: 90 }}>{t('col_xmap_emp')}</th>
                  <th className="num" style={{ width: 100 }}>{t('col_xmap_rev')}</th>
                  <th style={{ width: 60 }}>{t('col_xmap_tier')}</th>
                  <th style={{ width: 100 }}>{t('col_xmap_rel')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map(p => (
                  <tr key={p.rank}>
                    <td style={{ color: 'var(--fg-muted)' }}>{String(p.rank).padStart(2, '0')}</td>
                    <td style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: 'var(--fg-secondary)' }}>{p.city}</td>
                    <td><span className="key">{p.region}</span></td>
                    <td className="num" style={{ color: 'var(--fg-primary)' }}>{p.emp}</td>
                    <td className="num" style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{p.rev}</td>
                    <td>
                      <span style={{ padding: '0 6px', fontSize: 10, fontWeight: 700, color: TIER_COLOR[p.tier], border: '1px solid currentColor', letterSpacing: '0.08em' }}>{p.tier}</span>
                    </td>
                    <td style={{ color: p.rel === 'direct' ? 'var(--signal-down)' : p.rel === 'partner' ? 'var(--signal-up)' : 'var(--fg-tertiary)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {t(REL_LABEL[p.rel])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — gaps + contacts + pricing */}
        <div style={xmapStyles.right}>
          {/* GAPS */}
          <div style={xmapStyles.panel}>
            <div style={xmapStyles.panelHeader}>
              <span style={{ color: 'var(--signal-up)' }}>● {t('xmap_gaps_title')}</span>
              <span style={{ color: 'var(--fg-muted)' }}>{xmap.gaps.length} · {xmap.country}</span>
            </div>
            <div style={{ padding: '0 14px' }}>
              {xmap.gaps.map((g, i) => {
                const ucol = g.urgency === 'high' ? 'var(--signal-down)' : g.urgency === 'med' ? 'var(--signal-warn)' : 'var(--fg-tertiary)';
                const ulbl = g.urgency === 'high' ? t('xmap_urg_high') : g.urgency === 'med' ? t('xmap_urg_med') : t('xmap_urg_low');
                return (
                  <div key={g.region} style={{ ...xmapStyles.gapRow, borderBottom: i === xmap.gaps.length - 1 ? 'none' : '1px solid var(--graphite-800)' }}>
                    <span style={xmapStyles.gapCode}>{g.region}</span>
                    <div>
                      <div style={xmapStyles.gapTitle}>{g.title}</div>
                      <div style={xmapStyles.gapBody}>{g.body}</div>
                    </div>
                    <span style={{ fontSize: 9, letterSpacing: '0.10em', padding: '1px 6px', color: ucol, border: '1px solid currentColor', whiteSpace: 'nowrap' }}>{ulbl}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONTACTS */}
          <div style={xmapStyles.panel}>
            <div style={xmapStyles.panelHeader}>
              <span>{t('xmap_contacts_title')}</span>
              <span style={{ color: 'var(--fg-muted)' }}>{xmap.contacts.length} / {xmap.totals.contacts}</span>
            </div>
            <div>
              {xmap.contacts.map((c, i) => (
                <div key={i} style={{ ...xmapStyles.contactRow, borderBottom: i === xmap.contacts.length - 1 ? 'none' : '1px solid var(--graphite-800)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={xmapStyles.contactName}>{c.name}</span>
                    <span className="key" style={{ fontSize: 10 }}>{c.region}</span>
                  </div>
                  <div style={xmapStyles.contactTitle}>{c.title}</div>
                  <div style={xmapStyles.contactAccount}>↳ {c.account}</div>
                  <div style={xmapStyles.contactSignal}>● {t('col_xmap_signal')} · {c.signal}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PRICING */}
          <div style={xmapStyles.panel}>
            <div style={xmapStyles.panelHeader}>
              <span>{t('xmap_pricing_title')}</span>
              <span style={{ color: 'var(--fg-muted)' }}>M2C · PILOT</span>
            </div>
            <div style={xmapStyles.pricing}>
              <div style={xmapStyles.priceRow}>
                <span style={xmapStyles.priceLbl}>{t('xmap_one_time')}</span>
                <span style={xmapStyles.priceVal}>{xmap.pricing.oneTime}</span>
              </div>
              <div style={{ ...xmapStyles.priceRow, borderTop: '1px solid var(--graphite-800)', marginTop: 4, paddingTop: 10 }}>
                <span style={xmapStyles.priceLbl}>{t('xmap_sub')}</span>
                <span style={xmapStyles.priceVal}>{xmap.pricing.sub}</span>
              </div>
              <div style={xmapStyles.priceCta}>→ {t('xmap_cta')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ExportMapView = ExportMapView;
