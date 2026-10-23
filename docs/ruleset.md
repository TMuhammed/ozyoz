# Özyoz ruleset — version 2026.10.21

This document records the authoritative source for the conversion rules and every
mapping the engine applies. Every rule here has a regression test in
`tests/unit/converter.test.ts` and fixtures in `tests/fixtures/`.

## Source

| Field | Value |
|---|---|
| Document | Law of the Republic of Uzbekistan O‘RQ-1184 «"Lotin yozuviga asoslangan oʻzbek alifbosini joriy etish toʻgʻrisida"gi Oʻzbekiston Respublikasi Qonuniga oʻzgartirish kiritish haqida» |
| Amends | Law 931-XII of 2 September 1993 (as amended 1995) |
| Signed | 21 October 2026 (President Sh. Mirziyoyev, Uzbek Language Day) |
| Legislative Chamber | passed 7 July 2026 |
| Senate | approved 10 September 2026 |
| Entry into force | six months after official publication (Article 4); lex.uz lists **22 April 2027** |
| Official text | https://lex.uz/uz/docs/8548754 |
| Document passport | https://www.lex.uz/uz/doc-passport/8548754 |
| Ruleset version | `2026.10.21` (date the law was signed) |
| Verified on | 23 October 2026 |

Status: the law is signed and published on lex.uz but **not yet in force**
(lex.uz marks it "Hujjat hali kuchga kirgan emas"). The old alphabet remains
legally valid until the effective date. The extension must present the new
alphabet as "adopted, effective 22 April 2027", not as currently mandatory.

## The alphabet (Article 1 of the amended law)

28 letters and one tutuq belgisi (apostrophe), in official order:

```
A a  B b  D d  E e  F f  G g  Ğ ğ  H h  I i  J j  K k  L l  M m  N n
O o  Ö ö  P p  Q q  R r  S s  Ş ş  Ç ç  T t  U u  V v  X x  Y y  Z z   ʼ
```

Compared with the 1995 alphabet (26 letters + 3 letter combinations Sh, Ch, Ng):

| Old (1995) | New (2026) | Unicode of new letter |
|---|---|---|
| Oʻ oʻ | Ö ö | U+00D6 / U+00F6 |
| Gʻ gʻ | Ğ ğ | U+011E / U+011F |
| Sh sh | Ş ş | U+015E / U+015F |
| Ch ch | Ç ç | U+00C7 / U+00E7 |
| Ng ng | — (no longer a letter; still written `ng`) | unchanged |
| ʼ tutuq belgisi | ʼ tutuq belgisi (kept) | U+02BC |

All other letters are unchanged.

## Mapping rules implemented by the engine

### R1. Letter + apostrophe → Ö / Ğ

`o` or `g` immediately followed by any apostrophe-like character becomes `ö` / `ğ`.
Case follows the base letter: `O‘` → `Ö`, `o‘` → `ö`.

Recognised apostrophe-like characters (input normalisation):

| Char | Code point | Name |
|---|---|---|
| ʻ | U+02BB | modifier letter turned comma (official glyph for oʻ/gʻ) |
| ʼ | U+02BC | modifier letter apostrophe (official tutuq belgisi) |
| ' | U+0027 | ASCII apostrophe |
| ’ | U+2019 | right single quotation mark |
| ‘ | U+2018 | left single quotation mark (used by lex.uz) |
| ` | U+0060 | grave accent |
| ´ | U+00B4 | acute accent |

### R2. Digraph → Ş / Ç

`sh` → `ş`, `ch` → `ç`. Case follows the first letter of the digraph:
`Sh`, `SH` → `Ş`; `sh`, `sH` → `ş`.

### R3. `ng` is unchanged

`ng` stops being a separate letter but the spelling does not change. The engine
does nothing with it.

### R4. Tutuq belgisi

The apostrophe in words such as `maʼno`, `sanʼat`, `eʼlon` is kept. With the
`normalizeApostrophes` option the engine rewrites any apostrophe-like character
that sits **between two letters** (and is not part of R1) to the canonical
U+02BC. Apostrophes next to whitespace or punctuation are left alone so that
quotation marks are not altered. Default: **off**, because the engine cannot
tell an English contraction (`don't`) from a tutuq belgisi.

## Exceptions and ambiguities

### E1. `sʼh` is not a digraph

In the 1995 orthography a tutuq belgisi separates `s` and `h` when they are two
sounds (`Isʼhoq`, `asʼhob`). The engine leaves such sequences unchanged and never
produces `ş` across an apostrophe. Whether the separating apostrophe should be
dropped in the new orthography (`Ishoq`) is **not stated in the law**; the engine
keeps the input as-is until an official orthographic rule says otherwise.

### E2. URLs and e-mail addresses are protected

Tokens that look like URLs (`http://`, `https://`, `www.`) or e-mail addresses
are copied through untouched. Default: on.

### E3. Closing single quote after `o` / `g` (known limitation)

`'bog'` typed with ASCII quotes becomes `'boğ`. The engine cannot distinguish a
closing quote from `gʻ`; words ending in `gʻ` (`bogʻ`, `togʻ`) are common, so
R1 is applied unconditionally. Users should use double quotes around Uzbek text.

### E4. Language is not detected

The engine converts whatever it is given. English `she` becomes `şe`. Language
detection is out of scope for the core; the browser layer provides per-site
disabling and a pause control instead.

### E5. Re-conversion is not fully idempotent

Already-converted text passes through unchanged **unless** it contains a plain
`sh`/`ch` sequence that is legitimately two letters in the new orthography
(for example `Ishoq` if an author dropped the apostrophe). Such sequences would
be converted to `ş`. This is inherent to the digraph change and is documented
rather than guessed around.
