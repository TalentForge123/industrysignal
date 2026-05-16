'use client';

// Watch List — Bloomberg-style monitor table with segment filter.
// 1:1 port of ui_kits/portal/WatchListView.jsx. Real per-org CRUD +
// daily diff worker lands in Sprint 3 (HANDOFF §8 Týden 3) once the
// watchlist table is wired up.
//
// Synthesized prices / bid / ask / vol / mcap are kept for visual
// fidelity with the prototype's terminal feel — they're not pretending
// to be a real market feed.

import { useMemo, useState, type CSSProperties } from 'react';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { getWatchlist } from '@/lib/mock-data';

const ALL_KEY = '__ALL__';

export function WatchListView() {
  const [lang] = useLang();
  const watchlist = getWatchlist(lang);
  const [filter, setFilter] = useState<string>(ALL_KEY);

  const segments = useMemo(() => {
    const seen = new Set<string>();
    return watchlist
      .map((w) => w.segment.toUpperCase())
      .filter((s) => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });
  }, [watchlist]);

  const rows = filter === ALL_KEY ? watchlist : watchlist.filter((w) => w.segment.toUpperCase() === filter);

  const enriched = rows.map((r, i) => {
    const price = (1000 - i * 73 + i * i * 11).toFixed(2);
    const bid = (998 - i * 73).toFixed(2);
    const ask = (1002 - i * 73).toFixed(2);
    const vol = (12000 + i * 4321).toLocaleString(lang === 'en' ? 'en-US' : 'cs-CZ');
    const high = (1100 - i * 70).toFixed(2);
    const low = (920 - i * 75).toFixed(2);
    const mcap = (12.4 - i * 0.8).toFixed(1) + (lang === 'en' ? 'B' : ' mld');
    return { ...r, price, bid, ask, vol, high, low, mcap };
  });

  return (
    <div style={{ padding: 0, fontFamily: 'var(--font-mono)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--graphite-800)',
          background: 'var(--graphite-1000)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--amber-300)',
            fontWeight: 600,
          }}
        >
          WTCH · {t(lang, 'watch_title')}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {t(lang, 'watch_meta', watchlist.length)}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--graphite-800)',
          background: 'var(--graphite-1000)',
        }}
      >
        <button
          type="button"
          onClick={() => setFilter(ALL_KEY)}
          style={filterButtonStyle(filter === ALL_KEY)}
        >
          {t(lang, 'filter_all')}
        </button>
        {segments.map((segment) => (
          <button
            key={segment}
            type="button"
            onClick={() => setFilter(segment)}
            style={filterButtonStyle(filter === segment)}
          >
            {segment}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" style={{ ...filterButtonStyle(false), borderRight: 'none' }}>
          + {t(lang, 'add').toUpperCase()}
        </button>
      </div>

      <table className="bbg-table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>{t(lang, 'col_ticker')}</th>
            <th>{t(lang, 'col_name')}</th>
            <th>{t(lang, 'col_segment')}</th>
            <th className="num">{t(lang, 'col_last')}</th>
            <th className="num">{t(lang, 'col_qq')}</th>
            <th className="num">{t(lang, 'col_bid')}</th>
            <th className="num">{t(lang, 'col_ask')}</th>
            <th className="num">{t(lang, 'col_vol')}</th>
            <th className="num">{t(lang, 'col_high')}</th>
            <th className="num">{t(lang, 'col_low')}</th>
            <th className="num">{t(lang, 'col_mcap')}</th>
            <th>{t(lang, 'col_status')}</th>
            <th>{t(lang, 'col_update')}</th>
          </tr>
        </thead>
        <tbody>
          {enriched.map((r) => (
            <tr key={r.ticker}>
              <td>
                <span className="key">{r.ticker}</span>
              </td>
              <td style={{ color: 'var(--fg-primary)' }}>{r.name}</td>
              <td style={{ color: 'var(--fg-tertiary)' }}>{r.segment}</td>
              <td className="num" style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>
                {r.price}
              </td>
              <td className={'num ' + (r.dir === 'up' ? 'up' : 'dn')}>{r.delta}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{r.bid}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{r.ask}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{r.vol}</td>
              <td className="num up">{r.high}</td>
              <td className="num dn">{r.low}</td>
              <td className="num" style={{ color: 'var(--fg-tertiary)' }}>{r.mcap}</td>
              <td>
                <span
                  style={{
                    padding: '0 6px',
                    fontSize: 10,
                    letterSpacing: '0.06em',
                    color:
                      r.status === 'up'
                        ? 'var(--signal-up)'
                        : r.status === 'dn'
                          ? 'var(--signal-down)'
                          : 'var(--signal-warn)',
                    border: '1px solid currentColor',
                  }}
                >
                  {r.status === 'up'
                    ? t(lang, 'stat_ok')
                    : r.status === 'dn'
                      ? t(lang, 'stat_neg')
                      : t(lang, 'stat_warn')}
                </span>
              </td>
              <td style={{ color: 'var(--fg-muted)' }}>{r.last} 14:32</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function filterButtonStyle(active: boolean): CSSProperties {
  return {
    padding: '6px 14px',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: active ? 'var(--amber-300)' : 'var(--fg-tertiary)',
    background: active ? 'var(--graphite-900)' : 'transparent',
    borderTop: 'none',
    borderBottom: 'none',
    borderLeft: 'none',
    borderRight: '1px solid var(--graphite-800)',
    cursor: 'pointer',
  };
}
