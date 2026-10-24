//! Runs the shared fixtures in rules/fixtures/ — the same files the TypeScript
//! core is tested against — so both engines stay identical.
use ozyoz_core::{convert_text, convert_word_at_caret, ruleset, ConversionOptions, WordEdit};
use serde::Deserialize;

#[derive(Deserialize)]
struct Fixture {
    input: String,
    expected: String,
    note: String,
}

fn run(file: &str, json: &str) {
    let fixtures: Vec<Fixture> = serde_json::from_str(json).unwrap();
    for f in fixtures {
        let r = convert_text(&f.input, ConversionOptions::default());
        assert_eq!(r.text, f.expected, "{file}: {} ({:?})", f.note, f.input);
        assert_eq!(r.changed, f.input != f.expected, "{file}: changed flag for {:?}", f.input);
        assert_eq!(r.rules_version, ruleset().version);
    }
}

#[test]
fn words() {
    run("words", include_str!("../../../rules/fixtures/words.json"));
}
#[test]
fn apostrophes() {
    run("apostrophes", include_str!("../../../rules/fixtures/apostrophes.json"));
}
#[test]
fn sentences() {
    run("sentences", include_str!("../../../rules/fixtures/sentences.json"));
}
#[test]
fn protected() {
    run("protected", include_str!("../../../rules/fixtures/protected.json"));
}

#[test]
fn edge_cases() {
    let o = ConversionOptions::default();
    assert_eq!(convert_text("", o).text, "");
    for s in ["s", "c", "o", "g", "S", "O", "'", "so", "sc"] {
        assert_eq!(convert_text(s, o).text, s);
    }
    assert_eq!(convert_text("'salom'", o).text, "'salom'");
    let once = convert_text("To'g'ri so'z, yaxshi ish, chiroyli shahar", o).text;
    assert_eq!(convert_text(&once, o).text, once);
    assert_eq!(convert_text("sh 😀 o'z 🇺🇿", o).text, "ş 😀 öz 🇺🇿");
    assert_eq!(convert_text("'bog'", o).text, "'boğ"); // E3
    assert_eq!(convert_text("she chose", o).text, "şe çose"); // E4
}

#[test]
fn normalize_apostrophes() {
    let on = ConversionOptions { normalize_apostrophes: true, ..Default::default() };
    assert_eq!(convert_text("ma'no", on).text, "maʼno");
    assert_eq!(convert_text("san’at", on).text, "sanʼat");
    assert_eq!(convert_text("e‘lon", on).text, "eʼlon");
    assert_eq!(convert_text("'salom' dedi", on).text, "'salom' dedi");
    assert_eq!(convert_text("o'zbek ma'no", on).text, "özbek maʼno");
    assert_eq!(convert_text("Is'hoq", on).text, "Is'hoq");
    assert!(!convert_text("maʼno", on).changed);
}

#[test]
fn protect_urls_can_be_disabled() {
    let off = ConversionOptions { protect_urls: false, ..Default::default() };
    assert_eq!(convert_text("https://shahar.uz", off).text, "https://şahar.uz");
}

#[test]
fn word_at_caret() {
    let o = ConversionOptions::default();
    assert_eq!(
        convert_word_at_caret("salom shahar yaxshi", 12, o),
        Some(WordEdit { start: 6, end: 12, replacement: "şahar".into() })
    );
    assert_eq!(convert_word_at_caret("salom s", 7, o), None);
    assert_eq!(convert_word_at_caret("salom o'", 8, o), Some(WordEdit { start: 6, end: 8, replacement: "ö".into() }));
    assert_eq!(convert_word_at_caret("bu sh keyin", 5, o), Some(WordEdit { start: 3, end: 5, replacement: "ş".into() }));
    assert_eq!(convert_word_at_caret("see https://sh.uz/ch", 20, o), None);
    assert_eq!(convert_word_at_caret("mail sh@x.uz", 12, o), None);
    assert_eq!(convert_word_at_caret("", 0, o), None);
    assert_eq!(convert_word_at_caret("salom ", 6, o), None);
    assert_eq!(convert_word_at_caret("o'zbek shahar", 2, o), Some(WordEdit { start: 0, end: 2, replacement: "ö".into() }));
}
