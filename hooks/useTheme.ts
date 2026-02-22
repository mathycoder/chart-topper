'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'felt' | 'classic' | 'lounge' | 'midnight' | 'chalk' | 'watercolor' | 'marker';

const STORAGE_KEY = 'chart-topper-theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('felt');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get('theme') as Theme | null;
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;

    // URL param wins over localStorage; both fall back to 'felt'
    const isValid = (v: string | null): v is Theme =>
      v === 'felt' || v === 'classic' || v === 'lounge' || v === 'midnight' || v === 'chalk' || v === 'watercolor' || v === 'marker';

    const initial: Theme = isValid(urlTheme) ? urlTheme : isValid(stored) ? stored : 'felt';

    setThemeState(initial);
    applyTheme(initial);
    localStorage.setItem(STORAGE_KEY, initial);
    writeUrlParam(initial);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    writeUrlParam(next);
  }, []);

  return { theme, setTheme };
}

function applyTheme(theme: Theme) {
  if (theme === 'felt') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function writeUrlParam(theme: Theme) {
  const params = new URLSearchParams(window.location.search);
  if (theme === 'felt') {
    params.delete('theme');
  } else {
    params.set('theme', theme);
  }
  const qs = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}
