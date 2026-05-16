import type { ReactNode } from 'react';
import { Card } from './Card';
import { MonoLabel } from './MonoLabel';

export interface TileProps {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  dir?: 'up' | 'dn' | 'warn';
  sub?: ReactNode;
  big?: boolean;
}

const DELTA_COLOR = {
  up: 'var(--signal-up)',
  dn: 'var(--signal-down)',
  warn: 'var(--signal-warn)',
} as const;

const ARROW = { up: '▲', dn: '▼', warn: '≈' } as const;

export function Tile({ label, value, delta, dir = 'up', sub, big = false }: TileProps) {
  return (
    <Card style={{ padding: 18 }}>
      <MonoLabel>{label}</MonoLabel>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: big ? 36 : 28,
          fontWeight: 500,
          lineHeight: 1.05,
          color: 'var(--fg-primary)',
          letterSpacing: '-0.01em',
          margin: '10px 0 8px',
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 12,
            color: DELTA_COLOR[dir] ?? 'var(--fg-tertiary)',
            display: 'inline-flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <span>{ARROW[dir]}</span>
          <span>{delta}</span>
          {sub && <span style={{ color: 'var(--fg-muted)', marginLeft: 4 }}>{sub}</span>}
        </div>
      )}
    </Card>
  );
}
