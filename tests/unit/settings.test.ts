import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isActiveFor, isPaused, isSiteDisabled, siteKey, withDefaults } from '@/shared/settings';

describe('withDefaults', () => {
  it('fills missing fields and repairs invalid ones', () => {
    expect(withDefaults(undefined)).toEqual(DEFAULT_SETTINGS);
    const s = withDefaults({ enabled: false, disabledSites: 'x' as unknown as string[], ambiguousMode: 'zzz' as never });
    expect(s.enabled).toBe(false);
    expect(s.disabledSites).toEqual([]);
    expect(s.ambiguousMode).toBe('immediate');
  });
});

describe('siteKey / isSiteDisabled', () => {
  it('normalises hostnames', () => {
    expect(siteKey('WWW.Example.COM')).toBe('example.com');
  });
  it('matches exact hosts and subdomains', () => {
    const s = withDefaults({ disabledSites: ['google.com'] });
    expect(isSiteDisabled(s, 'google.com')).toBe(true);
    expect(isSiteDisabled(s, 'docs.google.com')).toBe(true);
    expect(isSiteDisabled(s, 'www.google.com')).toBe(true);
    expect(isSiteDisabled(s, 'notgoogle.com')).toBe(false);
  });
});

describe('isPaused / isActiveFor', () => {
  it('respects pause expiry', () => {
    expect(isPaused(withDefaults({ pausedUntil: 1000 }), 999)).toBe(true);
    expect(isPaused(withDefaults({ pausedUntil: 1000 }), 1000)).toBe(false);
    expect(isPaused(withDefaults({ pausedUntil: null }), 0)).toBe(false);
  });
  it('combines all switches', () => {
    expect(isActiveFor(DEFAULT_SETTINGS, 'a.uz')).toBe(true);
    expect(isActiveFor(withDefaults({ enabled: false }), 'a.uz')).toBe(false);
    expect(isActiveFor(withDefaults({ pausedUntil: Date.now() + 1000 }), 'a.uz')).toBe(false);
    expect(isActiveFor(withDefaults({ disabledSites: ['a.uz'] }), 'a.uz')).toBe(false);
  });
});
