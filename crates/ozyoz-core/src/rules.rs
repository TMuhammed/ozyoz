use once_cell::sync::Lazy;
use serde::Deserialize;

const RULESET_JSON: &str = include_str!("../../../rules/ruleset.json");

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RulesetSource {
    pub title: String,
    pub number: String,
    pub signed_on: String,
    pub effective_on: String,
    pub url: String,
    pub verified_on: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LetterApostrophe {
    pub base: char,
    pub target: char,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Digraph {
    pub source: String,
    pub target: char,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ruleset {
    pub version: String,
    pub source: RulesetSource,
    pub apostrophe_like: Vec<char>,
    pub tutuq_canonical: char,
    pub letter_apostrophe: Vec<LetterApostrophe>,
    pub digraphs: Vec<Digraph>,
    pub alphabet: Vec<char>,
}

impl Ruleset {
    pub fn is_apostrophe(&self, c: char) -> bool {
        self.apostrophe_like.contains(&c)
    }
}

static RULESET: Lazy<Ruleset> = Lazy::new(|| serde_json::from_str(RULESET_JSON).expect("rules/ruleset.json is valid"));

/// The verified ruleset embedded at compile time.
pub fn ruleset() -> &'static Ruleset {
    &RULESET
}
