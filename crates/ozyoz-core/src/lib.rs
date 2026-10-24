//! Özyoz conversion core. Mirrors `src/core/` of the browser extension and
//! reads the same `rules/ruleset.json`; both implementations must pass the
//! fixtures in `rules/fixtures/`.

mod rules;
mod convert;

pub use convert::{convert_run, convert_text, convert_word_at_caret, ConversionOptions, ConversionResult, WordEdit};
pub use rules::{ruleset, Ruleset, RulesetSource};
