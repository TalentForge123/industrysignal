// IndustrySignal — Password-protected login gate.

const loginStyles = {
  root: {
    minHeight: '100vh', width: '100%',
    background: 'var(--bg-app)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  scanline: {
    position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none',
    backgroundImage: 'radial-gradient(circle at 1px 1px, var(--graphite-700) 1px, transparent 0)',
    backgroundSize: '32px 32px',
    maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
    WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
  },
  card: {
    position: 'relative', zIndex: 1,
    width: 380,
    background: 'var(--bg-card)',
    border: '1px solid var(--ln-divider)',
    borderRadius: 'var(--r-lg)',
    padding: '36px 36px 28px',
    boxShadow: 'var(--elev-3)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  mark: { width: 28, height: 28, background: 'var(--amber-300)', color: 'var(--fg-on-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700, fontStyle: 'italic', fontSize: 22, letterSpacing: '-0.04em' },
  markCap: { display: 'none' },
  wm: { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, fontStyle: 'italic', letterSpacing: '-0.01em', color: 'var(--fg-primary)' },
  wmAccent: { color: 'var(--amber-300)' },

  title: { fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 22, color: 'var(--fg-primary)', margin: '0 0 6px', letterSpacing: '-0.01em' },
  sub: { fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-tertiary)', margin: '0 0 22px', lineHeight: 1.5 },

  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  err: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', color: 'var(--signal-down)', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid rgba(226,92,92,0.4)', borderRadius: 'var(--r-sm)', background: 'var(--signal-down-bg)' },

  footer: { marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--ln-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--accent-text)', cursor: 'pointer', borderBottom: '1px solid rgba(242,187,84,0.3)' },
  meta: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-muted)' },
};

function LoginView({ onLogin, theme, setTheme }) {
  const [lang, setLang] = window.IS_I18N.useLang();
  const [email, setEmail] = React.useState('jan.novak@cez.cz');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const submit = (e) => {
    e && e.preventDefault();
    if (!password) { setErr(t('login_error_empty')); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 400);
  };

  return (
    <div style={loginStyles.root}>
      <div style={loginStyles.scanline} />
      <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 2, display: 'flex', gap: 10 }}>
        <div style={{ display: 'inline-flex', border: '1px solid var(--ln-border)', background: 'var(--bg-card)' }}>
          <span onClick={() => setLang('cs')} style={{ padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', whiteSpace: 'nowrap', color: lang === 'cs' ? 'var(--fg-on-amber)' : 'var(--fg-tertiary)', background: lang === 'cs' ? 'var(--amber-300)' : 'transparent', cursor: 'pointer', fontWeight: lang === 'cs' ? 700 : 500, borderRight: '1px solid var(--ln-border)' }}>CS · ČESKY</span>
          <span onClick={() => setLang('en')} style={{ padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', whiteSpace: 'nowrap', color: lang === 'en' ? 'var(--fg-on-amber)' : 'var(--fg-tertiary)', background: lang === 'en' ? 'var(--amber-300)' : 'transparent', cursor: 'pointer', fontWeight: lang === 'en' ? 700 : 500 }}>EN · ENGLISH</span>
        </div>
        {setTheme && (
          <div style={{ display: 'inline-flex', border: '1px solid var(--ln-border)', background: 'var(--bg-card)' }} title="Theme">
            <span onClick={() => setTheme('editorial')} style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', whiteSpace: 'nowrap', color: theme === 'editorial' ? 'var(--fg-on-amber)' : 'var(--fg-tertiary)', background: theme === 'editorial' ? 'var(--amber-300)' : 'transparent', cursor: 'pointer', fontWeight: theme === 'editorial' ? 700 : 500, borderRight: '1px solid var(--ln-border)' }}>ED · EDITORIAL</span>
            <span onClick={() => setTheme('graphite')} style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', whiteSpace: 'nowrap', color: theme !== 'editorial' ? 'var(--fg-on-amber)' : 'var(--fg-tertiary)', background: theme !== 'editorial' ? 'var(--amber-300)' : 'transparent', cursor: 'pointer', fontWeight: theme !== 'editorial' ? 700 : 500 }}>GR · TERMINAL</span>
          </div>
        )}
      </div>
      <form onSubmit={submit} style={loginStyles.card}>
        <div style={loginStyles.brand}>
          <span style={loginStyles.mark}>B</span>
          <span style={loginStyles.wm}><span style={loginStyles.wmAccent}>Industry</span>Signal</span>
        </div>
        <h1 style={loginStyles.title}>{t('login_title')}</h1>
        <p style={loginStyles.sub}>{t('login_sub')}</p>

        <div style={loginStyles.form}>
          <Input label={t('login_email')} value={email} onChange={(e) => setEmail(e.target.value)} icon="user" />
          <Input label={t('login_password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon="lock" placeholder={t('login_password_hint')} />
          {err && <div style={loginStyles.err}><Icon name="alert-triangle" size={12} /> {err}</div>}
          <Button kind="primary" iconRight="chevron-right" onClick={submit} disabled={loading}>{loading ? t('login_loading') : t('login_submit')}</Button>
        </div>

        <div style={loginStyles.footer}>
          <span style={loginStyles.link}>{t('login_forgot')}</span>
          <span style={loginStyles.meta}>{t('login_meta')}</span>
        </div>
      </form>
    </div>
  );
}

window.LoginView = LoginView;
