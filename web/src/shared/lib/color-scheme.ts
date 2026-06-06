export type ColorSchemePreference = 'system' | 'light' | 'dark';
export type ResolvedColorScheme = 'light' | 'dark';

export const COLOR_SCHEME_STORAGE_KEY = 'fortify-color-scheme';

export function readStoredPreference(): ColorSchemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function getSystemColorScheme(): ResolvedColorScheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveColorScheme(preference: ColorSchemePreference): ResolvedColorScheme {
  return preference === 'system' ? getSystemColorScheme() : preference;
}

export function applyColorScheme(preference: ColorSchemePreference): ResolvedColorScheme {
  const resolved = resolveColorScheme(preference);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.colorScheme = resolved;
  root.style.colorScheme = resolved;
  return resolved;
}
