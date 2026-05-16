import type { CSSProperties, ReactNode } from 'react';

export interface MonoLabelProps {
  children: ReactNode;
  accent?: boolean;
  style?: CSSProperties;
}

// The signature category caption — mono, micro-size, all caps, wide tracking.
export function MonoLabel({ children, accent, style }: MonoLabelProps) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: accent ? 'var(--accent-text)' : 'var(--fg-tertiary)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
