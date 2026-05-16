// IndustrySignal — WatchList, Bloomberg-style monitor table.

const watchStyles = {
  root: { padding: 0, fontFamily: 'var(--font-mono)' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--graphite-800)',
    background: 'var(--graphite-1000)',
  },
  title: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber-300)', fontWeight: 600 },
  meta: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  toolbar: { display: 'flex', gap: 0, borderBottom: '1px solid var(--graphite-800)', background: 'var(--graphite-1000)' },
  filter: (active) => ({
    padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: active ? 'var(--amber-300)' : 'var(--fg-tertiary)',
    background: active ? 'var(--graphite-900)' : 'transparent',
    borderRight: '1px solid var(--graphite-800)',
    cursor: 'pointer',
  }),
};

function WatchListView({ watchlist }) {
  const [lang] = window.IS_I18N.useLang();
  const [filter, setFilter] = React.useState('ALL');
  const segments = ['ALL', ...new Set(watchlist.map(w => w.segment.toUpperCase()))];
  const rows = filter === 'ALL' ? watchlist : watchlist.filter(w => w.segment.toUpperCase() === filter);

  // Synthesize prices and vols (mock market microstructure for the terminal feel).
  const enriched = rows.map((r, i) => ({
    ...r,
    price: (1000 - i * 73 + (i*i*11)).toFixed(2),
    bid: (998 - i * 73).toFixed(2),
    ask: (1002 - i * 73).toFixed(2),
    vol: (12000 + i * 4321).toLocaleString(lang === 'en' ? 'en-US' : 'cs-CZ'),
    high: (1100 - i * 70).toFixed(2),
    low: (920 - i * 75).toFixed(2),
    mcap: (12.4 - i * 0.8).toFixed(1) + (lang === 'en' ? 'B' : ' mld'),
    updateAt: r.last,
  }));

  return (
    <div style={watchStyles.root}>
      <div style={watchStyles.header}>
        <span style={watchStyles.title}>WTCH · {t('watch_title')}</span>
        <span style={watchStyles.meta}>{t('watch_meta', watchlist.length)}</span>
      </div>
      <div style={watchStyles.toolbar}>
        {segments.map(s => (
          <div key={s} style={watchStyles.filter(filter === s)} onClick={() => setFilter(s)}>
            {s === 'ALL' ? t('filter_all') : s}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ ...watchStyles.filter(false), borderRight: 'none' }}>+ {t('add').toUpperCase()}</div>
      </div>
      <table className="bbg-table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>{t('col_ticker')}</th>
            <th>{t('col_name')}</th>
            <th>{t('col_segment')}</th>
            <th className="num">{t('col_last')}</th>
            <th className="num">{t('col_qq')}</th>
            <th className="num">{t('col_bid')}</th>
            <th className="num">{t('col_ask')}</th>
            <th className="num">{t('col_vol')}</th>
            <th className="num">{t('col_high')}</th>
            <th className="num">{t('col_low')}</th>
            <th className="num">{t('col_mcap')}</th>
            <th>{t('col_status')}</th>
            <th>{t('col_update')}</th>
          </tr>
        </thead>
        <tbody>
          {enriched.map((r, i) => (
            <tr key={i}>
              <td><span className="key">{r.ticker}</span></td>
              <td style={{ color: 'var(--fg-primary)' }}>{r.name}</td>
              <td style={{ color: 'var(--fg-tertiary)' }}>{r.segment}</td>
              <td className="num" style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{r.price}</td>
              <td className={'num ' + (r.dir === 'up' ? 'up' : 'dn')}>{r.delta}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{r.bid}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{r.ask}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{r.vol}</td>
              <td className="num up">{r.high}</td>
              <td className="num dn">{r.low}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{r.mcap}</td>
              <td>
                <span style={{
                  padding: '0 6px', fontSize: 10, letterSpacing: '0.06em',
                  color: r.status === 'up' ? 'var(--signal-up)' : r.status === 'dn' ? 'var(--signal-down)' : 'var(--signal-warn)',
                  border: '1px solid currentColor',
                }}>
                  {r.status === 'up' ? t('stat_ok') : r.status === 'dn' ? t('stat_neg') : t('stat_warn')}
                </span>
              </td>
              <td style={{ color: 'var(--fg-muted)' }}>{r.updateAt} 14:32</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

window.WatchListView = WatchListView;
