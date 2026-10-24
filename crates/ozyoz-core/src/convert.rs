use crate::rules::{ruleset, Ruleset};
use once_cell::sync::Lazy;
use regex::Regex;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ConversionOptions {
    /// Rewrite tutuq belgisi between letters to canonical U+02BC. Default false.
    pub normalize_apostrophes: bool,
    /// Leave URL and e-mail tokens untouched. Default true.
    pub protect_urls: bool,
}

impl Default for ConversionOptions {
    fn default() -> Self {
        Self { normalize_apostrophes: false, protect_urls: true }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConversionResult {
    pub text: String,
    pub changed: bool,
    pub rules_version: String,
}

/// Replacement of the word ending at the caret; indices are in chars.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WordEdit {
    pub start: usize,
    pub end: usize,
    pub replacement: String,
}

static PROTECTED: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"(?i)(?:https?://|ftp://|www\.)[^\s<>"]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+"#).unwrap()
});

fn is_upper(c: char) -> bool {
    c.is_uppercase()
}

fn apply_case(target: char, sample: char) -> String {
    if is_upper(sample) {
        target.to_uppercase().collect()
    } else {
        target.to_string()
    }
}

fn lower(c: char) -> char {
    c.to_lowercase().next().unwrap_or(c)
}

/// Exception E1: `s` + apostrophe + `h` is two sounds (Isʼhoq), not a digraph.
fn is_separating_apostrophe(chars: &[char], i: usize, rules: &Ruleset) -> bool {
    if !rules.is_apostrophe(chars[i]) {
        return false;
    }
    let prev = if i > 0 { Some(lower(chars[i - 1])) } else { None };
    let next = chars.get(i + 1).map(|c| lower(*c));
    matches!(prev, Some('s') | Some('c')) && next == Some('h')
}

/// Converts one unprotected run of text. Same algorithm as `convertRun` in TS.
pub fn convert_run(text: &str, options: ConversionOptions, rules: &Ruleset) -> String {
    let chars: Vec<char> = text.chars().collect();
    let n = chars.len();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    while i < n {
        let ch = chars[i];
        let lo = lower(ch);
        let next = chars.get(i + 1).copied();

        // R1: o/g + apostrophe-like → ö/ğ
        if let Some(nx) = next {
            if rules.is_apostrophe(nx) {
                if let Some(rule) = rules.letter_apostrophe.iter().find(|r| r.base == lo) {
                    out.push_str(&apply_case(rule.target, ch));
                    i += 2;
                    continue;
                }
            }
        }

        // R2: sh/ch → ş/ç
        if let Some(nx) = next {
            let pair: String = [lo, lower(nx)].iter().collect();
            if let Some(rule) = rules.digraphs.iter().find(|r| r.source == pair) {
                out.push_str(&apply_case(rule.target, ch));
                i += 2;
                continue;
            }
        }

        // R4: tutuq normalisation between letters (never E1 pairs)
        if options.normalize_apostrophes
            && rules.is_apostrophe(ch)
            && ch != rules.tutuq_canonical
            && i > 0
            && chars[i - 1].is_alphabetic()
            && next.map(|c| c.is_alphabetic()).unwrap_or(false)
            && !is_separating_apostrophe(&chars, i, rules)
        {
            out.push(rules.tutuq_canonical);
            i += 1;
            continue;
        }

        out.push(ch);
        i += 1;
    }
    out
}

/// Converts a whole text, protecting URLs and e-mails when enabled.
pub fn convert_text(input: &str, options: ConversionOptions) -> ConversionResult {
    let rules = ruleset();
    if input.is_empty() {
        return ConversionResult { text: String::new(), changed: false, rules_version: rules.version.clone() };
    }
    let text = if options.protect_urls {
        let mut out = String::with_capacity(input.len());
        let mut last = 0;
        for m in PROTECTED.find_iter(input) {
            out.push_str(&convert_run(&input[last..m.start()], options, rules));
            out.push_str(m.as_str());
            last = m.end();
        }
        out.push_str(&convert_run(&input[last..], options, rules));
        out
    } else {
        convert_run(input, options, rules)
    };
    ConversionResult { changed: text != input, text, rules_version: rules.version.clone() }
}

fn is_word_char(c: char, rules: &Ruleset) -> bool {
    c.is_alphabetic() || rules.is_apostrophe(c) || unicode_is_mark(c)
}

fn unicode_is_mark(c: char) -> bool {
    // Combining diacritical marks blocks (good enough for our inputs).
    matches!(c as u32, 0x0300..=0x036F | 0x1AB0..=0x1AFF | 0x1DC0..=0x1DFF | 0x20D0..=0x20FF | 0xFE20..=0xFE2F)
}

/// Converts only the word that ends at `caret` (char index). Mirrors
/// `convertWordAtCaret` in TS. Returns None when nothing changes.
pub fn convert_word_at_caret(text: &str, caret: usize, options: ConversionOptions) -> Option<WordEdit> {
    let rules = ruleset();
    let chars: Vec<char> = text.chars().collect();
    let end = caret.min(chars.len());
    let mut start = end;
    while start > 0 && is_word_char(chars[start - 1], rules) {
        start -= 1;
    }
    if start == end {
        return None;
    }
    if options.protect_urls {
        let mut token_start = start;
        while token_start > 0 && !chars[token_start - 1].is_whitespace() {
            token_start -= 1;
        }
        let mut token_end = end;
        while token_end < chars.len() && !chars[token_end].is_whitespace() {
            token_end += 1;
        }
        let token: String = chars[token_start..token_end].iter().collect();
        if PROTECTED.is_match(&token) {
            return None;
        }
    }
    let word: String = chars[start..end].iter().collect();
    let replacement = convert_run(&word, options, rules);
    if replacement == word {
        return None;
    }
    Some(WordEdit { start, end, replacement })
}
