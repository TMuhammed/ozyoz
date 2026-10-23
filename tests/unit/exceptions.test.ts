import { describe, expect, it } from 'vitest';
import { isSeparatingApostrophe, RULESET } from '@/core';

describe('isSeparatingApostrophe (E1)', () => {
  it("detects s'h and c'h", () => {
    expect(isSeparatingApostrophe("Is'hoq", 2, RULESET)).toBe(true);
    expect(isSeparatingApostrophe("S'H", 1, RULESET)).toBe(true);
    expect(isSeparatingApostrophe('asʼhob', 2, RULESET)).toBe(true);
  });
  it('rejects other positions', () => {
    expect(isSeparatingApostrophe("ma'no", 2, RULESET)).toBe(false);
    expect(isSeparatingApostrophe("Is'hoq", 1, RULESET)).toBe(false);
    expect(isSeparatingApostrophe("Is'hoq", 10, RULESET)).toBe(false);
  });
});
