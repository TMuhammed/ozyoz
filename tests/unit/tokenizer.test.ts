import { describe, expect, it } from 'vitest';
import { segment, wordStart, isUpper, RULESET } from '@/core';

describe('segment', () => {
  it('returns a single unprotected segment for plain text', () => {
    expect(segment('salom dunyo')).toEqual([{ text: 'salom dunyo', protected: false }]);
  });

  it('isolates URLs and e-mails', () => {
    expect(segment('a https://x.uz/sh b')).toEqual([
      { text: 'a ', protected: false },
      { text: 'https://x.uz/sh', protected: true },
      { text: ' b', protected: false },
    ]);
    expect(segment('mail: sh@x.uz')).toEqual([
      { text: 'mail: ', protected: false },
      { text: 'sh@x.uz', protected: true },
    ]);
  });

  it('handles adjacent protected tokens and empty input', () => {
    expect(segment('')).toEqual([]);
    expect(segment('www.a.uz www.b.uz')).toEqual([
      { text: 'www.a.uz', protected: true },
      { text: ' ', protected: false },
      { text: 'www.b.uz', protected: true },
    ]);
  });
});

describe('wordStart', () => {
  const ap = RULESET.apostropheLike;
  it('walks back over letters and apostrophes', () => {
    expect(wordStart("salom o'zbek", 12, ap)).toBe(6);
    expect(wordStart("salom o'zbek", 8, ap)).toBe(6);
  });
  it('stops at whitespace and punctuation', () => {
    expect(wordStart('salom, dunyo', 5, ap)).toBe(0);
    expect(wordStart('salom, dunyo', 6, ap)).toBe(6);
    expect(wordStart('salom dunyo', 11, ap)).toBe(6);
  });
  it('clamps caret to text length', () => {
    expect(wordStart('abc', 10, ap)).toBe(0);
  });
});

describe('isUpper', () => {
  it('detects case for Latin letters only', () => {
    expect(isUpper('S')).toBe(true);
    expect(isUpper('s')).toBe(false);
    expect(isUpper("'")).toBe(false);
    expect(isUpper('1')).toBe(false);
  });
});
