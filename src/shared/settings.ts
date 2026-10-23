export type AmbiguousMode = 'immediate' | 'wordBoundary';

export interface Settings {
  /** Global on/off switch. */
  enabled: boolean;
  /** Epoch ms until which conversion is paused, or null. */
  pausedUntil: number | null;
  /** When to convert the word being typed. */
  ambiguousMode: AmbiguousMode;
  /** Rewrite tutuq belgisi to canonical U+02BC. */
  normalizeApostrophes: boolean;
  /** Convert plain-text paste. */
  convertPaste: boolean;
  /** Hostnames where conversion is disabled. */
  disabledSites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  pausedUntil: null,
  ambiguousMode: 'immediate',
  normalizeApostrophes: false,
  convertPaste: true,
  disabledSites: [],
};

export const PAUSE_DURATIONS_MIN = [15, 60] as const;

export function withDefaults(partial: Partial<Settings> | undefined): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, ...(partial ?? {}) };
  if (!Array.isArray(s.disabledSites)) s.disabledSites = [];
  if (s.ambiguousMode !== 'immediate' && s.ambiguousMode !== 'wordBoundary') s.ambiguousMode = 'immediate';
  return s;
}

export function isPaused(s: Settings, now: number = Date.now()): boolean {
  return s.pausedUntil !== null && s.pausedUntil > now;
}

/** Normalises a hostname for the site list: lowercase, no leading "www.". */
export function siteKey(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

export function isSiteDisabled(s: Settings, hostname: string): boolean {
  const key = siteKey(hostname);
  return s.disabledSites.some((d) => key === d || key.endsWith('.' + d));
}

/** True when conversion should run on this site right now. */
export function isActiveFor(s: Settings, hostname: string, now: number = Date.now()): boolean {
  return s.enabled && !isPaused(s, now) && !isSiteDisabled(s, hostname);
}
