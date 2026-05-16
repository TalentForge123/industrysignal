'use client';

// Command line. Cosmetic for Sprint 1 — input accepts text but doesn't
// route commands yet. Routing logic (HELP / ticker lookup / view switch)
// lands once Search + the rest of the views are in.

import { useState } from 'react';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';

export function CommandBar() {
  const [lang] = useLang();
  const [value, setValue] = useState('');

  return (
    <div
      style={{
        height: 28,
        background: 'var(--graphite-950)',
        borderBottom: '2px solid var(--amber-300)',
        display: 'flex',
        alignItems: 'stretch',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}
    >
      <div
        style={{
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--amber-300)',
          color: 'var(--fg-on-amber)',
          fontWeight: 700,
          letterSpacing: '0.12em',
          fontSize: 10,
          borderRight: '1px solid var(--fg-on-amber)',
        }}
      >
        CMD&nbsp;&gt;
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder={t(lang, 'cmd_placeholder').toUpperCase()}
        style={{
          flex: 1,
          height: '100%',
          padding: '0 10px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--fg-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '0.04em',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 12px',
          fontSize: 10,
          color: 'var(--fg-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderLeft: '1px solid var(--graphite-800)',
        }}
      >
        <span>
          <span style={hintKey}>F1</span>
          {t(lang, 'cmd_help')}
        </span>
        <span>
          <span style={hintKey}>F4</span>
          {t(lang, 'cmd_watch')}
        </span>
        <span>
          <span style={hintKey}>F8</span>
          {t(lang, 'cmd_alerts')}
        </span>
        <span>
          <span style={hintKey}>⌘K</span>
          {t(lang, 'cmd_search')}
        </span>
      </div>
    </div>
  );
}

const hintKey = {
  color: 'var(--accent-text)',
  marginRight: 4,
} as const;
