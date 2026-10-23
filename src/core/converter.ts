import { RULESET } from './rules';
import { isLetter, isUpper, segment } from './tokenizer';
import { isSeparatingApostrophe } from './exceptions';
import type { ConversionOptions, ConversionResult, Ruleset } from './types';

const DEFAULTS: Required<ConversionOptions> = {
  normalizeApostrophes: false,
  protectUrls: true,
};

function applyCase(target: string, sample: string): string {
  return isUpper(sample) ? target.toUpperCase() : target;
}

/**
 * Converts one unprotected run of text. Single left-to-right scan; multi-character
 * rules (R1, R2) are tried before single-character rules (R4).
 */
export function convertRun(text: string, options: Required<ConversionOptions>, rules: Ruleset): string {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i]!;
    const lower = ch.toLowerCase();
    const next = text[i + 1];
    const nextLower = next?.toLowerCase();

    // R1: o/g + apostrophe-like → ö/ğ
    if (next !== undefined && rules.apostropheLike.includes(next)) {
      const rule = rules.letterApostrophe.find((r) => r.base === lower);
      if (rule) {
        out += applyCase(rule.target, ch);
        i += 2;
        continue;
      }
    }

    // R2: sh/ch → ş/ç
    if (nextLower !== undefined) {
      const rule = rules.digraphs.find((r) => r.source === lower + nextLower);
      if (rule) {
        out += applyCase(rule.target, ch);
        i += 2;
        continue;
      }
    }

    // R4: tutuq belgisi normalisation (only between letters, never E1 pairs)
    if (
      options.normalizeApostrophes &&
      rules.apostropheLike.includes(ch) &&
      ch !== rules.tutuqCanonical &&
      isLetter(text[i - 1]) &&
      isLetter(next) &&
      !isSeparatingApostrophe(text, i, rules)
    ) {
      out += rules.tutuqCanonical;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }
  return out;
}

export function convertText(input: string, options: ConversionOptions = {}, rules: Ruleset = RULESET): ConversionResult {
  const opts: Required<ConversionOptions> = { ...DEFAULTS, ...options };
  if (input.length === 0) return { text: input, changed: false, rulesVersion: rules.version };

  const parts = opts.protectUrls ? segment(input) : [{ text: input, protected: false }];
  let text = '';
  for (const part of parts) {
    text += part.protected ? part.text : convertRun(part.text, opts, rules);
  }
  return { text, changed: text !== input, rulesVersion: rules.version };
}

/**
 * Converts only the word that ends at `caret` (the word being typed) and returns
 * the replacement range. Returns null when nothing changes. Used by the input
 * adapter so that a keystroke never rewrites the whole field.
 */
export function convertWordAtCaret(
  text: string,
  caret: number,
  options: ConversionOptions = {},
  rules: Ruleset = RULESET,
): { start: number; end: number; replacement: string } | null {
  const opts: Required<ConversionOptions> = { ...DEFAULTS, ...options };
  const end = Math.min(caret, text.length);
  // Walk back over letters / apostrophes / marks to find the word start.
  let start = end;
  while (start > 0) {
    const ch = text[start - 1]!;
    if (isLetter(ch) || rules.apostropheLike.includes(ch) || /\p{M}/u.test(ch)) start -= 1;
    else break;
  }
  if (start === end) return null;

  // Extend to the end of the word so a protected token (URL) is seen whole.
  let wordEnd = end;
  while (wordEnd < text.length && !/\s/u.test(text[wordEnd]!)) wordEnd += 1;
  // And back to the previous whitespace for the same reason.
  let tokenStart = start;
  while (tokenStart > 0 && !/\s/u.test(text[tokenStart - 1]!)) tokenStart -= 1;
  const token = text.slice(tokenStart, wordEnd);
  if (opts.protectUrls && segment(token).some((s) => s.protected)) return null;

  const word = text.slice(start, end);
  const replacement = convertRun(word, opts, rules);
  if (replacement === word) return null;
  return { start, end, replacement };
}
