'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  pad?: boolean;
  style?: CSSProperties;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, pad = true, style, hoverable, onClick }: CardProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hoverable && hover ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: '1px solid var(--ln-divider)',
        borderRadius: 'var(--r-md)',
        padding: pad ? 24 : 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 120ms var(--ease-out)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
