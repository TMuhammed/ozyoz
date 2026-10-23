import type { Segment } from './types';

/**
 * Splits text into convertible and protected segments. Protected segments are
 * URL-like and e-mail-like tokens (exception E2 in docs/ruleset.md).
 */
const PROTECTED_PATTERN =
  /(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/giu;

export function segment(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  PROTECTED_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(PROTECTED_PATTERN)) {
    const start = match.index;
    if (start > last) segments.push({ text: text.slice(last, start), protected: false });
    segments.push({ text: match[0], protected: true });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), protected: false });
  return segments;
}

const LETTER = /\p{L}/u;

export function isLetter(ch: string | undefined): boolean {
  return ch !== undefined && LETTER.test(ch);
}

export function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

/**
 * Index of the start of the "word" that contains or ends at `caret`:
 * walks back over letters, apostrophe-like characters and combining marks.
 * Used by the input adapter to limit conversion to the word being typed.
 */
export function wordStart(text: string, caret: number, apostropheLike: readonly string[]): number {
  let i = Math.min(caret, text.length);
  while (i > 0) {
    const ch = text[i - 1]!;
    if (isLetter(ch) || apostropheLike.includes(ch) || /\p{M}/u.test(ch)) i -= 1;
    else break;
  }
  return i;
}
