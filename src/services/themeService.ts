import { useSyncExternalStore } from 'react';
import { saveTheme } from './storageService';

export type Theme = 'light' | 'dark';

const listeners = new Set<() => void>();

/** The class on <html> is the source of truth. An inline script in index.html sets it before first paint. */
function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  saveTheme(theme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme);
}
