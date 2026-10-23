import { describe, expect, it } from 'vitest';
import { convertWordAtCaret } from '@/core';

describe('convertWordAtCaret', () => {
  it('converts only the word ending at the caret', () => {
    const text = 'salom shahar yaxshi';
    // caret after "shahar"
    expect(convertWordAtCaret(text, 12)).toEqual({ start: 6, end: 12, replacement: 'şahar' });
  });

  it('returns null for incomplete sequences', () => {
    expect(convertWordAtCaret('salom s', 7)).toBeNull();
    expect(convertWordAtCaret("salom o", 7)).toBeNull();
  });

  it("converts o' as soon as the apostrophe is typed", () => {
    expect(convertWordAtCaret("salom o'", 8)).toEqual({ start: 6, end: 8, replacement: 'ö' });
  });

  it('converts a partial word in the middle of the text', () => {
    const text = 'bu sh keyin';
    expect(convertWordAtCaret(text, 5)).toEqual({ start: 3, end: 5, replacement: 'ş' });
  });

  it('does not touch URLs being typed', () => {
    expect(convertWordAtCaret('see https://sh.uz/ch', 20)).toBeNull();
    expect(convertWordAtCaret('mail sh@x.uz', 12)).toBeNull();
  });

  it('returns null when caret is at a word boundary or text is empty', () => {
    expect(convertWordAtCaret('', 0)).toBeNull();
    expect(convertWordAtCaret('salom ', 6)).toBeNull();
  });

  it('leaves text after the caret untouched', () => {
    const text = "o'zbek shahar";
    expect(convertWordAtCaret(text, 2)).toEqual({ start: 0, end: 2, replacement: 'ö' });
  });
});
