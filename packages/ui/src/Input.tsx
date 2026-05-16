'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { MonoLabel } from './MonoLabel';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: boolean;
  icon?: IconName;
}

export function Input({ label, hint, error, icon, type = 'text', ...rest }: InputProps) {
  const [focus, setFocus] = useState(false);
  const borderColor = error
    ? 'var(--signal-down)'
    : focus
      ? 'var(--amber-400)'
      : 'var(--ln-border)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <MonoLabel>{label}</MonoLabel>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: 10,
              color: 'var(--fg-tertiary)',
              display: 'flex',
            }}
          >
            <Icon name={icon} size={14} />
          </span>
        )}
        <input
          type={type}
          {...rest}
          onFocus={(e) => {
            setFocus(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            rest.onBlur?.(e);
          }}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            background: 'var(--bg-input)',
            color: 'var(--fg-primary)',
            border: `1px solid ${borderColor}`,
            borderRadius: 'var(--r-sm)',
            padding: icon ? '9px 12px 9px 32px' : '9px 12px',
            width: '100%',
            boxSizing: 'border-box',
            outline: 'none',
            boxShadow: focus ? '0 0 0 2px rgba(232,165,43,0.18)' : 'none',
            transition:
              'border-color 120ms var(--ease-out), box-shadow 120ms var(--ease-out)',
          }}
        />
      </div>
      {hint && (
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: error ? 'var(--signal-down)' : 'var(--fg-muted)',
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
