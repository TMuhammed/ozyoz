import { describe, expect, it } from 'vitest';
import { convertText, RULESET } from '@/core';
import words from '../../rules/fixtures/words.json';
import apostrophes from '../../rules/fixtures/apostrophes.json';
import sentences from '../../rules/fixtures/sentences.json';
import protectedTokens from '../../rules/fixtures/protected.json';

interface Fixture {
  input: string;
  expected: string;
  note: string;
}

function runFixtures(name: string, fixtures: Fixture[]) {
  describe(name, () => {
    for (const f of fixtures) {
      it(`${f.note}: ${JSON.stringify(f.input)}`, () => {
        const result = convertText(f.input);
        expect(result.text).toBe(f.expected);
        expect(result.changed).toBe(f.input !== f.expected);
        expect(result.rulesVersion).toBe(RULESET.version);
      });
    }
  });
}

runFixtures('words (R1, R2, R3, E1)', words);
runFixtures('apostrophe variants (R1 normalisation)', apostrophes);
runFixtures('sentences, punctuation, whitespace, other scripts', sentences);
runFixtures('protected URLs and e-mails (E2)', protectedTokens);

describe('edge cases', () => {
  it('empty string', () => {
    expect(convertText('')).toEqual({ text: '', changed: false, rulesVersion: RULESET.version });
  });

  it('lone s, c, o, g are untouched (incomplete sequences)', () => {
    for (const s of ['s', 'c', 'o', 'g', 'S', 'O', "'", 'so', 'sc']) {
      expect(convertText(s).text).toBe(s);
    }
  });

  it('apostrophe at start or end of text is untouched', () => {
    expect(convertText("'salom'").text).toBe("'salom'");
  });

  it('long text converts every occurrence', () => {
    const unit = "O'zbekiston shahri chiroyli. ";
    const input = unit.repeat(2000);
    const expected = 'Özbekiston şahri çiroyli. '.repeat(2000);
    expect(convertText(input).text).toBe(expected);
  });

  it('already-converted text is unchanged (E5, idempotent on new letters)', () => {
    const converted = 'Özbekiston şahri çiroyli töğri boğ ÖZBEK ŞAHAR';
    const result = convertText(converted);
    expect(result.text).toBe(converted);
    expect(result.changed).toBe(false);
  });

  it('converting twice equals converting once for ordinary text', () => {
    const once = convertText("To'g'ri so'z, yaxshi ish, chiroyli shahar").text;
    expect(convertText(once).text).toBe(once);
  });

  it('surrogate pairs and emoji are preserved', () => {
    expect(convertText("sh 😀 o'z 🇺🇿").text).toBe('ş 😀 öz 🇺🇿');
  });
});

describe('normalizeApostrophes option (R4)', () => {
  const on = { normalizeApostrophes: true };

  it('rewrites tutuq between letters to U+02BC', () => {
    expect(convertText("ma'no", on).text).toBe('maʼno');
    expect(convertText('san’at', on).text).toBe('sanʼat');
    expect(convertText('e‘lon', on).text).toBe('eʼlon');
  });

  it('does not touch apostrophes next to whitespace or punctuation', () => {
    expect(convertText("'salom' dedi", on).text).toBe("'salom' dedi");
    expect(convertText("salom '", on).text).toBe("salom '");
  });

  it('still applies R1 before R4', () => {
    expect(convertText("o'zbek ma'no", on).text).toBe('özbek maʼno');
  });

  it('keeps E1 separating apostrophe as typed', () => {
    expect(convertText("Is'hoq", on).text).toBe("Is'hoq");
  });

  it('leaves canonical U+02BC unchanged', () => {
    expect(convertText('maʼno', on)).toMatchObject({ text: 'maʼno', changed: false });
  });

  it('is off by default', () => {
    expect(convertText("ma'no").text).toBe("ma'no");
  });
});

describe('protectUrls option (E2)', () => {
  it('can be disabled', () => {
    expect(convertText('https://shahar.uz', { protectUrls: false }).text).toBe('https://şahar.uz');
  });
});

describe('documented limitations', () => {
  it('E3: closing ASCII quote directly after o/g is read as oʻ/gʻ', () => {
    expect(convertText("'bog'").text).toBe("'boğ");
  });

  it('E4: no language detection, English sh/ch convert too', () => {
    expect(convertText('she chose').text).toBe('şe çose');
  });
});
