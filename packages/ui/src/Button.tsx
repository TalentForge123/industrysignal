'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  kind?: ButtonKind;
  children: ReactNode;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

const KIND_STYLES: Record<ButtonKind, { bg: string; bgHover: string; fg: string; bd: string }> = {
  primary: {
    bg: 'var(--amber-300)',
    bgHover: 'var(--amber-400)',
    fg: 'var(--fg-on-amber)',
    bd: 'transparent',
  },
  secondary: {
    bg: 'var(--bg-card)',
    bgHover: 'var(--bg-card-hover)',
    fg: 'var(--fg-primary)',
    bd: 'var(--ln-border)',
  },
  ghost: {
    bg: 'transparent',
    bgHover: 'var(--bg-card)',
    fg: 'var(--fg-secondary)',
    bd: 'transparent',
  },
  danger: {
    bg: 'transparent',
    bgHover: 'transparent',
    fg: 'var(--signal-down)',
    bd: 'rgba(226,92,92,0.4)',
  },
};

export function Button({
  kind = 'secondary',
  children,
  icon,
  iconRight,
  disabled,
  onClick,
  style,
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const s = disabled
    ? { bg: 'var(--graphite-800)', fg: 'var(--graphite-500)', bd: 'transparent' }
    : {
        bg: hover ? KIND_STYLES[kind].bgHover : KIND_STYLES[kind].bg,
        fg: KIND_STYLES[kind].fg,
        bd: KIND_STYLES[kind].bd,
      };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 500,
        padding: '8px 14px',
        borderRadius: 'var(--r-sm)',
        border: `1px solid ${s.bd}`,
        background: s.bg,
        color: s.fg,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 120ms var(--ease-out), border-color 120ms var(--ease-out)',
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}

export interface IconButtonProps {
  name: IconName;
  onClick?: () => void;
  badge?: number;
  title?: string;
  style?: CSSProperties;
}

export function IconButton({ name, onClick, badge, title, style }: IconButtonProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32,
        height: 32,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--r-sm)',
        background: hover ? 'var(--bg-card)' : 'transparent',
        color: hover ? 'var(--fg-primary)' : 'var(--fg-tertiary)',
        border: '1px solid transparent',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 120ms var(--ease-out), color 120ms var(--ease-out)',
        ...style,
      }}
    >
      <Icon name={name} size={16} />
      {badge != null && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 14,
            height: 14,
            padding: '0 4px',
            background: 'var(--signal-down)',
            color: 'var(--fg-on-amber)',
            borderRadius: 999,
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-app)',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
