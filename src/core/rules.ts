import type { Ruleset } from './types';
import ruleset from '../../rules/ruleset.json';

/**
 * Verified against Law O‘RQ-1184 of 21 October 2026 (https://lex.uz/uz/docs/8548754).
 * The data lives in rules/ruleset.json so that the Rust desktop engine reads the
 * same file. See docs/ruleset.md. Do not change mappings without updating the
 * document, the version and the fixtures in rules/fixtures/.
 */
export const RULESET: Ruleset = ruleset as Ruleset;

export const RULES_VERSION = RULESET.version;
