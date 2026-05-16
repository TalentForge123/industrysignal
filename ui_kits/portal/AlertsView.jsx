// IndustrySignal — Alerts, Bloomberg-style alert log.

const alertsStyles = {
  root: { fontFamily: 'var(--font-mono)' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--graphite-800)',
    background: 'var(--graphite-1000)',
  },
  title: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber-300)', fontWeight: 600 },
  meta: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' },
};

function AlertsView({ alerts }) {
  const [lang] = window.IS_I18N.useLang();
  const fresh = alerts.filter(a => a.fresh).length;
  return (
    <div style={alertsStyles.root}>
      <div style={alertsStyles.header}>
        <span style={alertsStyles.title}>ALRT · {t('alerts_title')}</span>
        <span style={alertsStyles.meta}>{t('alerts_meta', alerts.length, fresh)}</span>
      </div>
      <table className="bbg-table">
        <thead>
          <tr>
            <th style={{ width: 64 }}>{t('col_time')}</th>
            <th style={{ width: 80 }}>{t('col_tone')}</th>
            <th style={{ width: 70 }}>{t('col_ticker')}</th>
            <th style={{ width: 100 }}>{t('col_kind')}</th>
            <th style={{ width: 170 }}>{t('col_target')}</th>
            <th>{t('col_message')}</th>
            <th style={{ width: 60 }}>{t('col_state')}</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map(a => {
            const toneColor = a.tone === 'up' ? 'var(--signal-up)' : a.tone === 'dn' ? 'var(--signal-down)' : 'var(--signal-warn)';
            return (
              <tr key={a.id} style={a.fresh ? { background: 'rgba(242,187,84,0.04)' } : undefined}>
                <td style={{ color: 'var(--fg-tertiary)' }}>{a.time}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: toneColor }}>
                    <span style={{ width: 6, height: 6, background: toneColor, borderRadius: '50%' }} />
                    {a.tone === 'up' ? t('tone_pos') : a.tone === 'dn' ? t('tone_neg') : t('tone_warn')}
                  </span>
                </td>
                <td><span className="key">{a.ticker || '—'}</span></td>
                <td><span className="key" style={{ color: 'var(--fg-tertiary)' }}>{a.kind.toUpperCase()}</span></td>
                <td style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{a.target}</td>
                <td style={{ color: 'var(--fg-secondary)', fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: 0 }}>{a.body}</td>
                <td style={{ color: a.fresh ? 'var(--amber-300)' : 'var(--fg-muted)' }}>{a.fresh ? t('state_new') : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

window.AlertsView = AlertsView;
