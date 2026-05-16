'use client';

// Client-only language hook. Kept in a separate entry point so that the
// main `@industrysignal/i18n` module stays server-safe (Server Components,
// route handlers, workers can all import `t` without pulling React in).
//
// Reads / persists to localStorage under `is.lang` — same key the legacy
// prototype in `ui_kits/portal/i18n.js` uses. The hook subscribes to a
// shared listener Set so any setLang call propagates to every mounted
// component instantly (no router round-trip).

import { useEffect, useState } from 'react';
import { DEFAULT_LANG, isLang, type Lang } from './index';

const STORAGE_KEY = 'is.lang';
const listeners = new Set<(l: Lang) => void>();

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function useLang(): readonly [Lang, (l: Lang) => void] {
  // Initial state is DEFAULT_LANG so the first client render matches the
  // server-rendered HTML. The useEffect below upgrades to the persisted
  // value after hydration completes, which is safe (no mismatch warning).
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(readStored());
    const fn = (l: Lang) => setLangState(l);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const setLang = (l: Lang) => {
    if (!isLang(l)) return;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore — private mode / quota — listeners still fire so the in-memory
      // state stays consistent for the current tab.
    }
    listeners.forEach((fn) => fn(l));
  };

  return [lang, setLang] as const;
}
