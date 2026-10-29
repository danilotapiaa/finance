import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_THEME,
  isThemeId,
  THEMES,
  THEME_STORAGE_KEY,
  type ThemeId,
} from '../theme/themes';
import { ThemeContext } from './ThemeContext';

const readStoredTheme = (): ThemeId => {
  if (typeof window === 'undefined') return DEFAULT_THEME;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme === 'night' ? 'dark' : 'light';

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // El tema sigue funcionando aunque el navegador bloquee el almacenamiento.
    }

    const selectedTheme = THEMES.find((option) => option.id === theme);
    const themeColor = document.querySelector('meta[name="theme-color"]');

    if (selectedTheme && themeColor) {
      themeColor.setAttribute('content', selectedTheme.metaColor);
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
