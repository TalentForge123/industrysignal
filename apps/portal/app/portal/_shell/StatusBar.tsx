'use client';

import { useEffect, useState } from 'react';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';

function formatClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function StatusBar() {
  const [lang] = useLang();
  // The clock is intentionally hydration-tolerant: server renders an empty
  // string, client mounts the real time and ticks every 30 s. Avoids the
  // SSR/CSR text mismatch React would warn about with a Date()-derived
  // string baked into the server tree.
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(formatClock(d));
      setDate(d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'cs-CZ'));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [lang]);

  return (
    <div
      style={{
        height: 22,
        background: 'var(--graphite-1000)',
        borderTop: '1px solid var(--graphite-800)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.06em',
        color: 'var(--fg-muted)',
        gap: 18,
        textTransform: 'uppercase',
      }}
    >
      <span style={statusItem}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--signal-up)',
          }}
        />
        {t(lang, 'session_active')}
      </span>
      <span style={statusItem}>{t(lang, 'feed_live')}</span>
      <span style={statusItem}>{t(lang, 'latency')} 42ms</span>
      <span style={{ marginLeft: 'auto' }}>
        {t(lang, 'city')} {time && `· ${time} CET`} {date && `· ${date}`}
      </span>
    </div>
  );
}

const statusItem = { display: 'flex', alignItems: 'center', gap: 6 } as const;
