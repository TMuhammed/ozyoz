export interface ConversionOptions {
  /** Rewrite tutuq belgisi apostrophes between letters to canonical U+02BC. Default: false. */
  normalizeApostrophes?: boolean;
  /** Leave URL and e-mail tokens untouched. Default: true. */
  protectUrls?: boolean;
}

export interface ConversionResult {
  text: string;
  changed: boolean;
  rulesVersion: string;
}

export interface RulesetSource {
  title: string;
  number: string;
  signedOn: string;
  effectiveOn: string;
  url: string;
  verifiedOn: string;
}

export interface Ruleset {
  version: string;
  source: RulesetSource;
  /** Characters accepted as an apostrophe on input. */
  apostropheLike: readonly string[];
  /** Canonical tutuq belgisi. */
  tutuqCanonical: string;
  /** `base` + apostrophe → `target` (lowercase forms; case derived at runtime). */
  letterApostrophe: ReadonlyArray<{ base: string; target: string }>;
  /** Two-letter sequence → single letter (lowercase forms). */
  digraphs: ReadonlyArray<{ source: string; target: string }>;
  /** Full new alphabet in official order, uppercase forms. */
  alphabet: readonly string[];
}

export interface Segment {
  text: string;
  /** Protected segments are copied through without conversion. */
  protected: boolean;
}
