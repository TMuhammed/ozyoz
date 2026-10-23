import { DEFAULT_SETTINGS, withDefaults, type Settings } from './settings';

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await chrome.storage.local.get(KEY);
    return withDefaults(stored[KEY] as Partial<Settings> | undefined);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings });
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = withDefaults({ ...current, ...patch });
  await saveSettings(next);
  return next;
}

/** Subscribes to settings changes; returns an unsubscribe function. */
export function onSettingsChanged(listener: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local' || !(KEY in changes)) return;
    listener(withDefaults(changes[KEY]?.newValue as Partial<Settings> | undefined));
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
