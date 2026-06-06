import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  applyColorScheme,
  COLOR_SCHEME_STORAGE_KEY,
  readStoredPreference,
  resolveColorScheme,
  type ColorSchemePreference,
  type ResolvedColorScheme,
} from '@shared/lib/color-scheme';

type ColorSchemeContextValue = {
  preference: ColorSchemePreference;
  resolved: ResolvedColorScheme;
  setPreference: (preference: ColorSchemePreference) => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ColorSchemePreference>(() => readStoredPreference());
  const [resolved, setResolved] = useState<ResolvedColorScheme>(() => resolveColorScheme(readStoredPreference()));

  useEffect(() => {
    setResolved(applyColorScheme(preference));
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, preference);
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setResolved(applyColorScheme('system'));
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [preference]);

  function setPreference(next: ColorSchemePreference) {
    setPreferenceState(next);
  }

  return (
    <ColorSchemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) {
    throw new Error('useColorScheme must be used within ColorSchemeProvider');
  }
  return ctx;
}
