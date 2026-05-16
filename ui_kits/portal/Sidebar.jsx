// IndustrySignal Sidebar — Bloomberg-style "function index" panel. Localized.

const sidebarStyles = {
  root: {
    width: 200, height: '100%',
    background: 'var(--graphite-1000)',
    borderRight: '1px solid var(--graphite-800)',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'var(--font-mono)',
    overflow: 'auto',
  },
  group: { borderBottom: '1px solid var(--graphite-800)' },
  groupTitle: {
    padding: '6px 12px',
    fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--amber-300)',
    background: 'var(--graphite-900)',
    borderBottom: '1px solid var(--graphite-800)',
    fontWeight: 600,
  },
  item: (active, hover) => ({
    display: 'grid',
    gridTemplateColumns: '36px 1fr auto',
    alignItems: 'center',
    padding: '4px 12px',
    color: active ? 'var(--amber-300)' : (hover ? 'var(--fg-primary)' : 'var(--fg-secondary)'),
    fontSize: 11, cursor: 'pointer',
    background: active ? 'rgba(242,187,84,0.08)' : (hover ? 'var(--graphite-900)' : 'transparent'),
    borderLeft: active ? '2px solid var(--amber-300)' : '2px solid transparent',
    paddingLeft: active ? 10 : 12,
    letterSpacing: '0.04em',
  }),
  code: { fontWeight: 700, color: 'var(--accent-text)', fontSize: 10, letterSpacing: '0.08em' },
  badge: { fontSize: 9, padding: '0 4px', borderRadius: 2, background: 'var(--signal-down)', color: 'var(--fg-on-amber)', fontWeight: 700 },
  newTag: { fontSize: 8, padding: '0 4px', borderRadius: 1, background: 'var(--amber-300)', color: 'var(--fg-on-amber)', fontWeight: 700, letterSpacing: '0.08em' },
  meterCell: { padding: '10px 12px', borderBottom: '1px solid var(--graphite-800)', display: 'flex', flexDirection: 'column', gap: 6 },
  meterRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--fg-tertiary)', letterSpacing: '0.04em' },
  meterLabel: { width: 38, color: 'var(--fg-muted)', textTransform: 'uppercase' },
  meterBar: { flex: 1, height: 4, background: 'var(--graphite-800)', position: 'relative', borderRadius: 1 },
  meterFill: (pct, color) => ({ position: 'absolute', top: 0, left: 0, height: '100%', width: pct + '%', background: color }),
  meterValue: { width: 38, textAlign: 'right', color: 'var(--fg-primary)', fontWeight: 600 },
};

function Sidebar({ current, onNav, alertsCount, user }) {
  const [lang] = window.IS_I18N.useLang();
  const [hover, setHover] = React.useState(null);
  const NAV_GROUPS = [
    { title: t('nav_reports'), items: [
      { id: 'report',  code: 'RPRT', label: t('nav_current') },
      { id: 'archive', code: 'ARCH', label: t('nav_archive_full') },
    ]},
    { title: t('nav_monitor'), items: [
      { id: 'watchlist', code: 'WTCH', label: t('nav_watchlist') },
      { id: 'alerts',    code: 'ALRT', label: t('nav_alerts_full'), badged: true },
    ]},
    { title: t('nav_intelligence'), items: [
      { id: 'srsc', code: 'SRSC', label: t('nav_srsc'), newTag: true },
      { id: 'xmap', code: 'XMAP', label: t('nav_xmap'), newTag: true },
    ]},
  ];
  const SECTIONS = [
    { id: 'macro',     label: t('sec_macro') },
    { id: 'segments',  label: t('sec_segments') },
    { id: 'risks',     label: t('sec_risks') },
    { id: 'companies', label: t('sec_companies') },
    { id: 'outlook',   label: t('sec_outlook') },
  ];

  const goSection = (sid) => {
    if (current !== 'report') {
      onNav('report');
      setTimeout(() => {
        const el = document.querySelector(`[data-section="${sid}"]`);
        if (el) {
          const main = document.querySelector('.main');
          if (main) main.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
        }
      }, 80);
    } else {
      const el = document.querySelector(`[data-section="${sid}"]`);
      if (el) {
        const main = document.querySelector('.main');
        if (main) main.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
      }
    }
  };
  return (
    <nav className="sidebar" style={sidebarStyles.root}>
      {NAV_GROUPS.map(g => (
        <div key={g.title} style={sidebarStyles.group}>
          <div style={sidebarStyles.groupTitle}>{g.title}</div>
          {g.items.map(it => {
            const active = current === it.id;
            return (
              <div key={it.id}
                onClick={() => onNav(it.id)}
                onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)}
                style={sidebarStyles.item(active, hover === it.id)}>
                <span style={sidebarStyles.code}>{it.code}</span>
                <span>{it.label}</span>
                {it.badged && alertsCount > 0 && <span style={sidebarStyles.badge}>{alertsCount}</span>}
                {it.newTag && <span style={sidebarStyles.newTag}>NEW</span>}
              </div>
            );
          })}
        </div>
      ))}
      <div style={sidebarStyles.group}>
        <div style={sidebarStyles.groupTitle}>{t('nav_section')}</div>
        {SECTIONS.map((s, i) => (
          <div key={s.id} style={sidebarStyles.item(false, hover === 'sec'+i)}
            onClick={() => goSection(s.id)}
            onMouseEnter={() => setHover('sec'+i)} onMouseLeave={() => setHover(null)}>
            <span style={sidebarStyles.code}>{String(i+1).padStart(2,'0')}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={sidebarStyles.meterCell}>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>{t('risk_map')}</div>
        <div style={sidebarStyles.meterRow}>
          <span style={sidebarStyles.meterLabel}>{t('risk_high')}</span>
          <div style={sidebarStyles.meterBar}><div style={sidebarStyles.meterFill(60, 'var(--signal-down)')} /></div>
          <span style={sidebarStyles.meterValue}>3</span>
        </div>
        <div style={sidebarStyles.meterRow}>
          <span style={sidebarStyles.meterLabel}>{t('risk_med')}</span>
          <div style={sidebarStyles.meterBar}><div style={sidebarStyles.meterFill(80, 'var(--signal-warn)')} /></div>
          <span style={sidebarStyles.meterValue}>4</span>
        </div>
        <div style={sidebarStyles.meterRow}>
          <span style={sidebarStyles.meterLabel}>{t('risk_low')}</span>
          <div style={sidebarStyles.meterBar}><div style={sidebarStyles.meterFill(40, 'var(--signal-up)')} /></div>
          <span style={sidebarStyles.meterValue}>2</span>
        </div>
      </div>
      <div style={{ marginTop: 'auto', padding: '8px 12px', fontSize: 9, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', borderTop: '1px solid var(--graphite-800)' }}>
        <div>{t('user')} · {user.name.split(' ').map(n => n[0]).join('')}</div>
        <div style={{ marginTop: 2 }}>{user.org}</div>
      </div>
    </nav>
  );
}

window.Sidebar = Sidebar;
