'use client';

// Watch List — Bloomberg-style monitor table backed by the real
// watchlist_entry table (HANDOFF §8 Týden 3). Add / remove via server
// actions in ./watchlist/actions.ts. Synthesized price/bid/ask/vol/mcap
// columns are kept for visual fidelity with the prototype's terminal
// feel — they become real once SRSC dimensions wire up in Sprint 5+.

import { useMemo, useState, useTransition, type CSSProperties } from 'react';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import type { WatchlistEntryView } from '@/lib/watchlist';
import {
  addWatchlistEntryAction,
  removeWatchlistEntryAction,
} from '../watchlist/actions';

const ALL_KEY = '__ALL__';

interface WatchListViewProps {
  entries: WatchlistEntryView[];
}

interface DisplayRow {
  id: string;
  ticker: string;
  name: string;
  segment: string;
  countryIso: string;
  hasCompanyData: boolean;
  // Synthesized terminal-style columns. Driven from a stable hash of the
  // entry id so re-renders don't flicker; they'll be replaced with real
  // signals (SRSC) in Sprint 5+.
  price: string;
  bid: string;
  ask: string;
  vol: string;
  high: string;
  low: string;
  mcap: string;
  dir: 'up' | 'dn';
  delta: string;
  status: 'up' | 'dn' | 'warn';
  last: string;
}

export function WatchListView({ entries }: WatchListViewProps) {
  const [lang] = useLang();
  const [filter, setFilter] = useState<string>(ALL_KEY);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rows = useMemo(() => entries.map((e) => buildDisplayRow(e, lang)), [entries, lang]);

  const segments = useMemo(() => {
    const seen = new Set<string>();
    return rows
      .map((r) => r.segment.toUpperCase())
      .filter((s) => {
        if (s === '—' || s === '-' || s === '') return false;
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });
  }, [rows]);

  const visible =
    filter === ALL_KEY ? rows : rows.filter((r) => r.segment.toUpperCase() === filter);

  function onSubmitAdd(formData: FormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await addWatchlistEntryAction(formData);
      if (result.ok) {
        setFormOpen(false);
      } else {
        setFormError(translateErr(result.error, lang));
      }
    });
  }

  function onRemove(entryId: string) {
    startTransition(async () => {
      const result = await removeWatchlistEntryAction(entryId);
      if (!result.ok) {
        setFormError(translateErr(result.error, lang));
      }
    });
  }

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
          {t(lang, 'watch_meta', entries.length)}
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
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setFormOpen((v) => !v);
          }}
          style={filterButtonStyle(formOpen)}
        >
          + {t(lang, 'add').toUpperCase()}
        </button>
      </div>

      {formOpen && (
        <form
          action={onSubmitAdd}
          style={{
            display: 'flex',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--graphite-800)',
            background: 'var(--graphite-1000)',
            alignItems: 'center',
          }}
        >
          <label
            htmlFor="watch-ico"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--fg-tertiary)',
            }}
          >
            {t(lang, 'watch_add_ico')}
          </label>
          <input
            id="watch-ico"
            name="ico"
            required
            placeholder="00177041"
            disabled={isPending}
            style={inputStyle()}
          />
          <label
            htmlFor="watch-label"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--fg-tertiary)',
            }}
          >
            {t(lang, 'watch_add_label')}
          </label>
          <input
            id="watch-label"
            name="label"
            required
            placeholder="Škoda Auto a.s."
            disabled={isPending}
            style={{ ...inputStyle(), flex: 1 }}
          />
          <button type="submit" disabled={isPending} style={submitButtonStyle()}>
            {isPending ? '…' : t(lang, 'watch_add_submit')}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormOpen(false);
              setFormError(null);
            }}
            style={cancelButtonStyle()}
          >
            {t(lang, 'watch_add_cancel')}
          </button>
        </form>
      )}

      {formError && (
        <div
          style={{
            padding: '6px 16px',
            background: 'var(--graphite-1000)',
            borderBottom: '1px solid var(--graphite-800)',
            color: 'var(--signal-down)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
          }}
        >
          {formError}
        </div>
      )}

      {visible.length === 0 ? (
        <div
          style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: 'var(--fg-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
          }}
        >
          {t(lang, 'watch_empty')}
        </div>
      ) : (
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
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
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
                    {r.hasCompanyData
                      ? r.status === 'up'
                        ? t(lang, 'stat_ok')
                        : r.status === 'dn'
                          ? t(lang, 'stat_neg')
                          : t(lang, 'stat_warn')
                      : '…'}
                  </span>
                </td>
                <td style={{ color: 'var(--fg-muted)' }}>
                  {r.hasCompanyData ? r.last : t(lang, 'watch_just_added')}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    disabled={isPending}
                    aria-label={t(lang, 'watch_remove')}
                    title={t(lang, 'watch_remove')}
                    style={removeButtonStyle()}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ----- Display-row synthesis -------------------------------------------

function buildDisplayRow(entry: WatchlistEntryView, lang: 'cs' | 'en'): DisplayRow {
  // Stable hash → deterministic but spread-out synthesized columns.
  // Same id always renders the same numbers → no flicker on re-renders.
  let h = 0;
  for (let i = 0; i < entry.id.length; i++) {
    h = ((h << 5) + h + entry.id.charCodeAt(i)) | 0;
  }
  const hp = Math.abs(h);

  const ticker = entry.label
    .replace(/[^A-Za-zÁ-Ž]/g, '')
    .slice(0, 4)
    .toUpperCase() || entry.targetRef.slice(0, 4);
  const name = entry.company?.legalName ?? entry.label;
  const segment = naceToSegment(entry.company?.primaryNace);

  const price = (500 + (hp % 1500) + (hp % 53) / 10).toFixed(2);
  const bid = (Number(price) - 1 - (hp % 7) / 10).toFixed(2);
  const ask = (Number(price) + 1 + (hp % 7) / 10).toFixed(2);
  const vol = (10000 + (hp % 90000)).toLocaleString(lang === 'en' ? 'en-US' : 'cs-CZ');
  const high = (Number(price) * 1.05).toFixed(2);
  const low = (Number(price) * 0.92).toFixed(2);
  const mcap = ((hp % 200) / 10 + 0.5).toFixed(1) + (lang === 'en' ? 'B' : ' mld');
  const deltaNum = ((hp % 700) / 100 - 3.5).toFixed(2);
  const dir = Number(deltaNum) >= 0 ? 'up' : 'dn';
  const delta = (dir === 'up' ? '+' : '') + deltaNum + ' %';
  const statusPick = hp % 3;
  const status: 'up' | 'dn' | 'warn' =
    statusPick === 0 ? 'up' : statusPick === 1 ? 'warn' : 'dn';
  const last = formatLastSeen(entry.addedAt, lang);

  return {
    id: entry.id,
    ticker,
    name,
    segment,
    countryIso: entry.countryIso,
    hasCompanyData: entry.company !== null,
    price,
    bid,
    ask,
    vol,
    high,
    low,
    mcap,
    dir,
    delta,
    status,
    last,
  };
}

// NACE 2-digit → coarse segment bucket. Aligned with the §4 segmentation
// (NACE C 29 = Automotive, C 28 = Strojírenství, etc.). Returns '—'
// when we have no NACE — typical for entries the cron hasn't fetched yet.
function naceToSegment(nace: string | null | undefined): string {
  if (!nace) return '—';
  const code2 = nace.slice(0, 2);
  switch (code2) {
    case '29':
      return 'Automotive';
    case '28':
      return 'Strojírenství';
    case '24':
    case '25':
      return 'Hutnictví';
    case '35':
      return 'Energetika';
    case '19':
    case '20':
      return 'Chemie';
    case '26':
      return 'Elektronika';
    case '23':
      return 'Stavebnictví';
    case '10':
    case '11':
      return 'Potraviny';
    case '49':
    case '50':
    case '51':
    case '52':
    case '53':
      return 'Logistika';
    default:
      return code2;
  }
}

function formatLastSeen(d: Date, lang: 'cs' | 'en'): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' };
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'cs-CZ', opts).format(d);
}

function translateErr(err: string | undefined, lang: 'cs' | 'en'): string {
  switch (err) {
    case 'invalid_ico':
      return t(lang, 'watch_err_invalid_ico');
    case 'invalid_label':
      return t(lang, 'watch_err_invalid_label');
    case 'duplicate':
      return t(lang, 'watch_err_duplicate');
    case 'unauthenticated':
    case 'forbidden':
    case 'not_found':
    case 'internal':
    default:
      return t(lang, 'watch_err_internal');
  }
}

// ----- Styles -----------------------------------------------------------

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

function inputStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    background: 'var(--graphite-900)',
    border: '1px solid var(--graphite-800)',
    color: 'var(--fg-primary)',
    padding: '4px 8px',
    minWidth: 100,
  };
}

function submitButtonStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--graphite-1000)',
    background: 'var(--amber-300)',
    border: '1px solid var(--amber-300)',
    padding: '5px 14px',
    cursor: 'pointer',
    fontWeight: 600,
  };
}

function cancelButtonStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--fg-tertiary)',
    background: 'transparent',
    border: '1px solid var(--graphite-800)',
    padding: '5px 14px',
    cursor: 'pointer',
  };
}

function removeButtonStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    lineHeight: 1,
    color: 'var(--fg-muted)',
    background: 'transparent',
    border: 'none',
    padding: '2px 8px',
    cursor: 'pointer',
  };
}
