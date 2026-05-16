import type { CSSProperties, ReactNode } from 'react';

export type PillTone = 'up' | 'down' | 'dn' | 'warn' | 'info' | 'amber' | 'neutral';

export interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  style?: CSSProperties;
}

const TONE_MAP: Record<PillTone, { bg: string; fg: string }> = {
  up: { bg: 'var(--signal-up-bg)', fg: 'var(--signal-up)' },
  down: { bg: 'var(--signal-down-bg)', fg: 'var(--signal-down)' },
  dn: { bg: 'var(--signal-down-bg)', fg: 'var(--signal-down)' },
  warn: { bg: 'var(--signal-warn-bg)', fg: 'var(--signal-warn)' },
  info: { bg: 'var(--signal-info-bg)', fg: 'var(--signal-info)' },
  amber: { bg: 'var(--amber-300)', fg: 'var(--fg-on-amber)' },
  neutral: { bg: 'var(--graphite-800)', fg: 'var(--fg-tertiary)' },
};

export function Pill({ tone = 'neutral', children, dot = false, pulse = false, style }: PillProps) {
  const c = TONE_MAP[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '3px 9px',
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        border: tone === 'neutral' ? '1px solid var(--ln-border)' : '1px solid transparent',
        ...style,
      }}
    >
      {pulse && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: c.fg,
            position: 'relative',
            display: 'inline-block',
          }}
        />
      )}
      {dot && !pulse && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.fg }} />
      )}
      {children}
    </span>
  );
}
