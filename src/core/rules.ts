import type { Ruleset } from './types';

/**
 * Verified against Law O‘RQ-1184 of 21 October 2026 (https://lex.uz/uz/docs/8548754).
 * See docs/ruleset.md for the full record. Do not change mappings without updating
 * the document, the version and the fixtures.
 */
export const RULESET: Ruleset = {
  version: '2026.10.21',
  source: {
    title:
      '"Lotin yozuviga asoslangan oʻzbek alifbosini joriy etish toʻgʻrisida"gi Oʻzbekiston Respublikasi Qonuniga oʻzgartirish kiritish haqida',
    number: 'O‘RQ-1184',
    signedOn: '2026-10-21',
    effectiveOn: '2027-04-22',
    url: 'https://lex.uz/uz/docs/8548754',
    verifiedOn: '2026-10-23',
  },
  apostropheLike: [
    'ʻ', // ʻ modifier letter turned comma (official oʻ/gʻ)
    'ʼ', // ʼ modifier letter apostrophe (official tutuq belgisi)
    "'", // ' ASCII apostrophe
    '’', // ’ right single quotation mark
    '‘', // ‘ left single quotation mark
    '`', // ` grave accent
    '´', // ´ acute accent
  ],
  tutuqCanonical: 'ʼ',
  letterApostrophe: [
    { base: 'o', target: 'ö' }, // ö
    { base: 'g', target: 'ğ' }, // ğ
  ],
  digraphs: [
    { source: 'sh', target: 'ş' }, // ş
    { source: 'ch', target: 'ç' }, // ç
  ],
  alphabet: [
    'A', 'B', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
    'O', 'Ö', 'P', 'Q', 'R', 'S', 'Ş', 'Ç', 'T', 'U', 'V', 'X', 'Y', 'Z',
  ],
};

export const RULES_VERSION = RULESET.version;
