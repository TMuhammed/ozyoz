import type { Ruleset } from './types';

/**
 * Exception E1: `s` + apostrophe + `h` is two sounds (Isʼhoq), not the digraph.
 * Returns true when the character at `index` is an apostrophe that separates
 * such a pair; the converter then leaves the apostrophe untouched.
 */
export function isSeparatingApostrophe(text: string, index: number, rules: Ruleset): boolean {
  const ch = text[index];
  if (ch === undefined || !rules.apostropheLike.includes(ch)) return false;
  const prev = text[index - 1]?.toLowerCase();
  const next = text[index + 1]?.toLowerCase();
  return (prev === 's' || prev === 'c') && next === 'h';
}
