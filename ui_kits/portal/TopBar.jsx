// IndustrySignal TopBar — Bloomberg-style title bar + command line. Localized.

const titlebarStyles = {
  titleBar: {
    height: 32,
    background: 'var(--graphite-1000)',
    borderBottom: '1px solid var(--graphite-800)',
    display: 'flex', alignItems: 'center',
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--fg-tertiary)',
    letterSpacing: '0.04em',
  },
  brandCell: {
    width: 200, padding: '0 12px',
    height: '100%', display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--graphite-1000)',
    borderRight: '1px solid var(--graphite-800)',
  },
  mark: { width: 18, height: 18, background: 'var(--amber-300)', color: 'var(--fg-on-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700, fontStyle: 'italic', fontSize: 14, letterSpacing: '-0.04em', flexShrink: 0 },
  wm: { fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 700, fontStyle: 'italic', letterSpacing: '-0.01em', color: 'var(--fg-primary)' },
  wmAccent: { color: 'var(--amber-300)' },

  tabs: { display: 'flex', height: '100%', alignItems: 'stretch', minWidth: 0, overflow: 'hidden' },
  tab: (active) => ({
    padding: '0 10px', display: 'flex', alignItems: 'center', flexShrink: 0,
    fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: active ? 'var(--amber-300)' : 'var(--fg-tertiary)',
    background: active ? 'var(--graphite-900)' : 'transparent',
    borderRight: '1px solid var(--graphite-800)',
    cursor: 'pointer', gap: 6,
  }),

  spacer: { flex: 1, minWidth: 8 },
  rightCell: {
    height: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: '0 12px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
    flexShrink: 0, whiteSpace: 'nowrap',
  },
  metric: { display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' },
  metricKey: { color: 'var(--fg-muted)' },
  metricValue: { color: 'var(--fg-primary)', fontWeight: 600 },
  up: { color: 'var(--signal-up)' },
  dn: { color: 'var(--signal-down)' },

  langToggle: {
    display: 'inline-flex', height: 18, border: '1px solid var(--amber-400)',
    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
    flexShrink: 0,
  },
  langOpt: (active) => ({
    padding: '0 6px', display: 'flex', alignItems: 'center',
    background: active ? 'var(--amber-300)' : 'transparent',
    color: active ? 'var(--fg-on-amber)' : 'var(--fg-tertiary)',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer', textTransform: 'uppercase',
  }),

  cmdBar: {
    height: 28,
    background: 'var(--graphite-950)',
    borderBottom: '2px solid var(--amber-300)',
    display: 'flex', alignItems: 'stretch',
    fontFamily: 'var(--font-mono)', fontSize: 12,
  },
  cmdPrompt: {
    padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--amber-300)', color: 'var(--fg-on-amber)',
    fontWeight: 700, letterSpacing: '0.12em', fontSize: 10,
    borderRight: '1px solid var(--fg-on-amber)',
  },
  cmdInput: {
    flex: 1, height: '100%', padding: '0 10px',
    background: 'transparent', border: 'none', outline: 'none',
    color: 'var(--fg-primary)', fontFamily: 'var(--font-mono)', fontSize: 12,
    letterSpacing: '0.04em',
  },
  cmdHints: {
    display: 'flex', alignItems: 'center', gap: 16, padding: '0 12px',
    fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
    borderLeft: '1px solid var(--graphite-800)',
  },
  cmdKey: { color: 'var(--accent-text)', marginRight: 4 },

  statusBar: {
    height: 22, background: 'var(--graphite-1000)',
    borderTop: '1px solid var(--graphite-800)',
    display: 'flex', alignItems: 'center', padding: '0 12px',
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.06em', color: 'var(--fg-muted)',
    gap: 18, textTransform: 'uppercase',
  },
  statusItem: { display: 'flex', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--signal-up)' },
};

function TitleBar({ current, onNav, alertsCount, user, onLogout, theme, setTheme }) {
  const [lang, setLang] = window.IS_I18N.useLang();
  const TABS = [
    { id: 'report',    code: 'RPRT', label: t('tab_report') },
    { id: 'archive',   code: 'ARCH', label: t('tab_archive') },
    { id: 'watchlist', code: 'WTCH', label: t('tab_watch') },
    { id: 'alerts',    code: 'ALRT', label: t('tab_alerts') },
    { id: 'srsc',      code: 'SRSC', label: t('tab_srsc'),  newTag: true },
    { id: 'xmap',      code: 'XMAP', label: t('tab_xmap'),  newTag: true },
  ];
  return (
    <div className="titlebar" style={titlebarStyles.titleBar}>
      <div style={titlebarStyles.brandCell}>
        <span style={titlebarStyles.mark}>B</span>
        <span style={titlebarStyles.wm}><span style={titlebarStyles.wmAccent}>Industry</span>Signal</span>
      </div>
      <div style={titlebarStyles.tabs}>
        {TABS.map(tb => (
          <div key={tb.id} style={titlebarStyles.tab(current === tb.id)} onClick={() => onNav(tb.id)}>
            <span style={{ color: current === tb.id ? 'var(--amber-300)' : 'var(--fg-muted)', marginRight: 6, fontWeight: 600 }}>{tb.code}</span>
            {tb.label}
            {tb.newTag && (
              <span style={{ marginLeft: 6, padding: '0 4px', background: 'var(--amber-300)', color: 'var(--fg-on-amber)', borderRadius: 1, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>NEW</span>
            )}
            {tb.id === 'alerts' && alertsCount > 0 && (
              <span style={{ marginLeft: 6, padding: '0 4px', background: 'var(--signal-down)', color: 'var(--fg-on-amber)', borderRadius: 2, fontSize: 9, fontWeight: 700 }}>{alertsCount}</span>
            )}
          </div>
        ))}
      </div>
      <div style={titlebarStyles.spacer} />
      <div style={titlebarStyles.rightCell}>
        <div style={titlebarStyles.metric}>
          <span style={titlebarStyles.metricKey}>EUR/CZK</span>
          <span style={titlebarStyles.metricValue}>24.82</span>
          <span style={titlebarStyles.up}>+0.04</span>
        </div>
        <div style={titlebarStyles.metric}>
          <span style={titlebarStyles.metricKey}>PX</span>
          <span style={titlebarStyles.metricValue}>1,742.18</span>
          <span style={titlebarStyles.dn}>-0.62</span>
        </div>
        <div style={titlebarStyles.langToggle} title="Language · Jazyk">
          <span style={titlebarStyles.langOpt(lang === 'cs')} onClick={() => setLang('cs')}>CS</span>
          <span style={titlebarStyles.langOpt(lang === 'en')} onClick={() => setLang('en')}>EN</span>
        </div>
        <div style={titlebarStyles.langToggle} title={theme === 'editorial' ? 'Editorial → Terminal' : 'Terminal → Editorial'}>
          <span style={titlebarStyles.langOpt(theme === 'editorial')} onClick={() => setTheme && setTheme('editorial')}>ED</span>
          <span style={titlebarStyles.langOpt(theme !== 'editorial')} onClick={() => setTheme && setTheme('graphite')}>GR</span>
        </div>
        <div style={titlebarStyles.metric}>
          <span style={titlebarStyles.metricKey}>{user.name.split(' ').map(n => n[0]).join('')}</span>
          <span style={titlebarStyles.metricValue}>{(user.org || '').split(/\s+/)[0]}</span>
        </div>
        <span style={{ color: 'var(--fg-muted)', cursor: 'pointer' }} onClick={onLogout}>{t('exit').toUpperCase()}</span>
      </div>
    </div>
  );
}

function CommandBar() {
  const [lang] = window.IS_I18N.useLang();
  const [val, setVal] = React.useState('');
  return (
    <div className="commandbar" style={titlebarStyles.cmdBar}>
      <div style={titlebarStyles.cmdPrompt}>CMD&nbsp;&gt;</div>
      <input
        style={titlebarStyles.cmdInput}
        value={val}
        onChange={(e) => setVal(e.target.value.toUpperCase())}
        placeholder={t('cmd_placeholder').toUpperCase()}
      />
      <div style={titlebarStyles.cmdHints}>
        <span><span style={titlebarStyles.cmdKey}>F1</span>{t('cmd_help')}</span>
        <span><span style={titlebarStyles.cmdKey}>F4</span>{t('cmd_watch')}</span>
        <span><span style={titlebarStyles.cmdKey}>F8</span>{t('cmd_alerts')}</span>
        <span><span style={titlebarStyles.cmdKey}>⌘K</span>{t('cmd_search')}</span>
      </div>
    </div>
  );
}

function StatusBar({ time }) {
  const [lang] = window.IS_I18N.useLang();
  const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'cs-CZ');
  return (
    <div className="statusbar" style={titlebarStyles.statusBar}>
      <span style={titlebarStyles.statusItem}><span style={titlebarStyles.statusDot} />{t('session_active')}</span>
      <span style={titlebarStyles.statusItem}>{t('feed_live')}</span>
      <span style={titlebarStyles.statusItem}>{t('latency')} 42ms</span>
      <span style={{ marginLeft: 'auto' }}>{t('city')} · {time} CET · {dateStr}</span>
    </div>
  );
}

window.TitleBar = TitleBar;
window.CommandBar = CommandBar;
window.StatusBar = StatusBar;
window.TopBar = TitleBar;
