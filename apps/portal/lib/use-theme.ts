'use client';

// Client-side theme hook. Companion to the FOUC-safe inline bootstrap
// script in app/layout.tsx — the script applies the persisted theme to
// <html> before React mounts; this hook keeps React in sync and exposes
// a setter that updates DOM + localStorage + every subscribed component.
//
// Lives in apps/portal/lib (not in a shared package) because no other
// app needs it yet; can be promoted to @industrysignal/tokens-client or
// similar when Studio app lands.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'is.theme.v2';
const DEFAULT_THEME: Theme = 'editorial';

export type Theme = 'editorial' | 'graphite';

const listeners = new Set<(t: Theme) => void>();

function isTheme(value: unknown): value is Theme {
  return value === 'editorial' || value === 'graphite';
}

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && isTheme(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function useTheme(): readonly [Theme, (t: Theme) => void] {
  // Initial value matches what the inline bootstrap script applied at SSR
  // time — keeps the first client render hydration-compatible.
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    setThemeState(readStored());
    const fn = (t: Theme) => setThemeState(t);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const setTheme = (t: Theme) => {
    if (!isTheme(t)) return;
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // private mode / quota — proceed with in-memory + DOM update so the
      // current tab stays consistent.
    }
    document.documentElement.setAttribute('data-theme', t);
    listeners.forEach((fn) => fn(t));
  };

  return [theme, setTheme] as const;
}
