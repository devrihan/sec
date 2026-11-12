/** All browser persistence goes through here, so a backend can replace it later. */

const KEY = 'slp.demo.state';
export const SCHEMA_VERSION = 2;

interface Envelope<T> {
  version: number;
  state: T;
}

let memoryFallback: string | null = null;

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  try {
    return safeStorage()?.getItem(KEY) ?? memoryFallback;
  } catch {
    return memoryFallback;
  }
}

/** Returns null for missing, corrupted or outdated data, which restores the seed. */
export function loadState<T>(): T | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Envelope<T>;
    return parsed.version === SCHEMA_VERSION ? parsed.state : null;
  } catch {
    return null;
  }
}

/** Kept apart from the demo state, so a demo reset doesn't change the theme. */
const THEME_KEY = 'slp.theme';

export function saveTheme(theme: string): void {
  try {
    safeStorage()?.setItem(THEME_KEY, theme);
  } catch {
    /* Storage is full or blocked: the theme lasts until the page reloads. */
  }
}

export function saveState<T>(state: T): void {
  const raw = JSON.stringify({ version: SCHEMA_VERSION, state } satisfies Envelope<T>);
  memoryFallback = raw;
  try {
    safeStorage()?.setItem(KEY, raw);
  } catch {
    /* Storage is full or blocked: the session continues from memory. */
  }
}

export function clearState(): void {
  memoryFallback = null;
  try {
    safeStorage()?.removeItem(KEY);
  } catch {
    /* Nothing to clear. */
  }
}

/** Calls back when another tab saves, so two tabs cannot spend the same coins. */
export function onExternalChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: StorageEvent) => {
    if (event.key === KEY) callback();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
