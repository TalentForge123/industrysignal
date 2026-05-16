// IndustrySignal — App shell. Bloomberg-style: title bar, command bar, sidebar, status bar.

const VIEWS = {
  report:    { code: 'RPRT' },
  archive:   { code: 'ARCH' },
  watchlist: { code: 'WTCH' },
  alerts:    { code: 'ALRT' },
  srsc:      { code: 'SRSC' },
  xmap:      { code: 'XMAP' },
};

// Theme is global (affects login screen too). Persisted in localStorage.
// Key was bumped from 'is.theme' → 'is.theme.v2' to force the new editorial
// default on existing sessions that had 'graphite' cached.
const THEME_KEY = 'is.theme.v2';
function useTheme() {
  const [theme, setThemeState] = React.useState(() => {
    try {
      // sweep legacy key
      localStorage.removeItem('is.theme');
      return localStorage.getItem(THEME_KEY) || 'editorial';
    } catch { return 'editorial'; }
  });
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);
  return [theme, setThemeState];
}
window.useISTheme = useTheme;

function App() {
  const [logged, setLogged] = React.useState(false);
  const [view, setView] = React.useState('report');
  const [time, setTime] = React.useState('');
  const [theme, setTheme] = useTheme();
  const [lang] = window.IS_I18N.useLang();
  const data = window.ISData;
  const alertsCount = data.alerts.filter(a => a.fresh).length;

  React.useEffect(() => {
    window.__navigateView = setView;
    return () => { delete window.__navigateView; };
  }, []);

  React.useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => { window.__navigateView = setView; return () => { delete window.__navigateView; }; }, []);

  if (!logged) return <LoginView onLogin={() => setLogged(true)} theme={theme} setTheme={setTheme} />;

  return (
    <div className="app">
      <TitleBar
        current={view}
        onNav={setView}
        alertsCount={alertsCount}
        user={data.user}
        onLogout={() => setLogged(false)}
        time={time}
        theme={theme}
        setTheme={setTheme}
      />
      <CommandBar />
      <Sidebar
        current={view}
        onNav={setView}
        alertsCount={alertsCount}
        user={data.user}
        onLogout={() => setLogged(false)}
      />
      <main className="main">
        {view === 'report'    && <ReportView    report={data.report} />}
        {view === 'archive'   && <ArchiveView   archive={data.archive} />}
        {view === 'watchlist' && <WatchListView watchlist={data.watchlist} />}
        {view === 'alerts'    && <AlertsView    alerts={data.alerts} />}
        {view === 'srsc'      && <SupplierRiskView srsc={data.srsc} />}
        {view === 'xmap'      && <ExportMapView xmap={data.xmap} />}
      </main>
      <StatusBar time={time} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
