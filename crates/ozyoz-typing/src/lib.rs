//! Keystroke-level conversion engine for the desktop app.
//!
//! The platform layer intercepts key events *before* the focused application
//! sees them and feeds them here. For each printable character the engine
//! answers either `PassThrough` (deliver the key unchanged) or
//! `Replace { backspaces, insert }` (swallow the key, send that many
//! Backspaces and then type `insert`). The engine never sees or stores text
//! beyond the current word; buffers are cleared on every word boundary.

use ozyoz_core::{convert_run, ruleset, ConversionOptions};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    /// Convert as soon as a sequence is complete (`sh` → `ş` when `h` is typed).
    Immediate,
    /// Convert the whole word when a boundary character (space, punctuation) is typed.
    WordBoundary,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EngineOptions {
    pub mode: Mode,
    pub conversion: ConversionOptions,
}

impl Default for EngineOptions {
    fn default() -> Self {
        Self { mode: Mode::Immediate, conversion: ConversionOptions::default() }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum KeyInput {
    /// A printable character as the OS would insert it (layout already applied).
    Char(char),
    Backspace,
    /// Anything that moves the caret or changes focus: arrows, Enter, Tab,
    /// mouse click, app switch, shortcuts with Ctrl/Cmd/Alt.
    Reset,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Decision {
    PassThrough,
    Replace { backspaces: usize, insert: String },
}

const MAX_WORD: usize = 48;

#[derive(Debug, Default)]
pub struct TypingEngine {
    options: EngineOptions,
    /// Raw characters typed in the current word (old spelling).
    typed: Vec<char>,
    /// What is currently on screen for the current word.
    displayed: Vec<char>,
    /// Non-whitespace run typed so far (to recognise URLs / e-mails).
    token: String,
}

impl TypingEngine {
    pub fn new(options: EngineOptions) -> Self {
        Self { options, ..Default::default() }
    }

    pub fn set_options(&mut self, options: EngineOptions) {
        self.options = options;
        self.reset();
    }

    pub fn options(&self) -> EngineOptions {
        self.options
    }

    pub fn reset(&mut self) {
        self.typed.clear();
        self.displayed.clear();
        self.token.clear();
    }

    fn is_word_char(c: char) -> bool {
        c.is_alphabetic() || ruleset().is_apostrophe(c) || matches!(c as u32, 0x0300..=0x036F)
    }

    fn token_is_protected(&self) -> bool {
        let t = &self.token;
        t.contains("://") || t.starts_with("www.") || t.contains('@')
    }

    pub fn feed(&mut self, input: KeyInput) -> Decision {
        match input {
            KeyInput::Reset => {
                self.reset();
                Decision::PassThrough
            }
            KeyInput::Backspace => {
                self.displayed.pop();
                self.typed = self.displayed.clone();
                self.token.pop();
                Decision::PassThrough
            }
            KeyInput::Char(c) => self.feed_char(c),
        }
    }

    fn feed_char(&mut self, c: char) -> Decision {
        if c.is_whitespace() {
            let decision = self.finish_word(c);
            self.reset();
            return decision;
        }
        self.token.push(c);
        if self.token_is_protected() {
            // A URL or e-mail is being typed: deliver everything unchanged until
            // whitespace, and undo a conversion already applied to its first word
            // (e.g. "ş@" → "sh@").
            let decision = if self.displayed != self.typed && !self.displayed.is_empty() {
                let mut insert: String = self.typed.iter().collect();
                insert.push(c);
                Decision::Replace { backspaces: self.displayed.len(), insert }
            } else {
                Decision::PassThrough
            };
            self.typed.clear();
            self.displayed.clear();
            return decision;
        }

        if !Self::is_word_char(c) {
            let decision = self.finish_word(c);
            self.typed.clear();
            self.displayed.clear();
            return decision;
        }

        if self.typed.len() >= MAX_WORD {
            // Pathologically long word: start a fresh buffer with this character.
            self.typed.clear();
            self.displayed.clear();
        }
        self.typed.push(c);

        if self.options.mode == Mode::WordBoundary {
            self.displayed.push(c);
            return Decision::PassThrough;
        }

        let word: String = self.typed.iter().collect();
        let new_display: Vec<char> = convert_run(&word, self.options.conversion, ruleset()).chars().collect();
        let prefix = self.displayed.iter().zip(new_display.iter()).take_while(|(a, b)| a == b).count();
        let backspaces = self.displayed.len() - prefix;
        let insert: String = new_display[prefix..].iter().collect();
        self.displayed = new_display;
        if backspaces == 0 && insert.chars().eq(std::iter::once(c)) {
            Decision::PassThrough
        } else {
            Decision::Replace { backspaces, insert }
        }
    }

    /// Word-boundary character `c` typed: in WordBoundary mode convert the
    /// finished word and re-type it together with `c`.
    fn finish_word(&self, c: char) -> Decision {
        if self.options.mode != Mode::WordBoundary || self.typed.is_empty() {
            return Decision::PassThrough;
        }
        let word: String = self.typed.iter().collect();
        let converted = convert_run(&word, self.options.conversion, ruleset());
        if converted == word {
            return Decision::PassThrough;
        }
        let mut insert = converted;
        insert.push(c);
        Decision::Replace { backspaces: self.displayed.len(), insert }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(engine: &mut TypingEngine, text: &str) -> String {
        // Simulates the screen: applies decisions to a string.
        let mut screen = String::new();
        for c in text.chars() {
            let input = match c {
                '\u{8}' => KeyInput::Backspace,
                '\n' => KeyInput::Reset,
                _ => KeyInput::Char(c),
            };
            match engine.feed(input.clone()) {
                Decision::PassThrough => match input {
                    KeyInput::Char(c) => screen.push(c),
                    KeyInput::Backspace => {
                        screen.pop();
                    }
                    KeyInput::Reset => {}
                },
                Decision::Replace { backspaces, insert } => {
                    for _ in 0..backspaces {
                        screen.pop();
                    }
                    screen.push_str(&insert);
                }
            }
        }
        screen
    }

    #[test]
    fn immediate_mode_converts_while_typing() {
        let mut e = TypingEngine::new(EngineOptions::default());
        assert_eq!(run(&mut e, "O'zbekiston shahri chiroyli, to'g'ri bog'."), "Özbekiston şahri çiroyli, töğri boğ.");
    }

    #[test]
    fn step_by_step_decisions() {
        let mut e = TypingEngine::new(EngineOptions::default());
        assert_eq!(e.feed(KeyInput::Char('s')), Decision::PassThrough);
        assert_eq!(e.feed(KeyInput::Char('h')), Decision::Replace { backspaces: 1, insert: "ş".into() });
        assert_eq!(e.feed(KeyInput::Char('a')), Decision::PassThrough);
        assert_eq!(e.feed(KeyInput::Char(' ')), Decision::PassThrough);
        assert_eq!(e.feed(KeyInput::Char('o')), Decision::PassThrough);
        assert_eq!(e.feed(KeyInput::Char('\'')), Decision::Replace { backspaces: 1, insert: "ö".into() });
    }

    #[test]
    fn separating_apostrophe_and_ng_untouched() {
        let mut e = TypingEngine::new(EngineOptions::default());
        assert_eq!(run(&mut e, "Is'hoq tong"), "Is'hoq tong");
    }

    #[test]
    fn urls_and_emails_pass_through() {
        let mut e = TypingEngine::new(EngineOptions::default());
        assert_eq!(run(&mut e, "https://sh.uz/ch shahar"), "https://sh.uz/ch şahar");
        e.reset();
        assert_eq!(run(&mut e, "sh@x.uz chiroyli"), "sh@x.uz çiroyli");
        e.reset();
        assert_eq!(e.feed(KeyInput::Char('s')), Decision::PassThrough);
        assert_eq!(e.feed(KeyInput::Char('h')), Decision::Replace { backspaces: 1, insert: "ş".into() });
        assert_eq!(e.feed(KeyInput::Char('@')), Decision::Replace { backspaces: 1, insert: "sh@".into() });
        e.reset();
        assert_eq!(run(&mut e, "www.shahar.uz"), "www.shahar.uz");
    }

    #[test]
    fn backspace_keeps_state_consistent() {
        let mut e = TypingEngine::new(EngineOptions::default());
        // type "sh" → ş, backspace → "", then "ch" → ç
        assert_eq!(run(&mut e, "sh\u{8}ch"), "ç");
        e.reset();
        // "şa" backspace → "ş", then type "h": no rule → "şh"
        assert_eq!(run(&mut e, "sha\u{8}h"), "şh");
    }

    #[test]
    fn reset_clears_the_word() {
        let mut e = TypingEngine::new(EngineOptions::default());
        assert_eq!(run(&mut e, "s\nh"), "sh");
    }

    #[test]
    fn word_boundary_mode() {
        let mut e = TypingEngine::new(EngineOptions { mode: Mode::WordBoundary, ..Default::default() });
        assert_eq!(e.feed(KeyInput::Char('s')), Decision::PassThrough);
        assert_eq!(e.feed(KeyInput::Char('h')), Decision::PassThrough);
        assert_eq!(e.feed(KeyInput::Char(',')), Decision::Replace { backspaces: 2, insert: "ş,".into() });
        e.reset();
        assert_eq!(run(&mut e, "shahar bog'. kitob"), "şahar boğ. kitob");
    }

    #[test]
    fn uppercase_follows_input() {
        let mut e = TypingEngine::new(EngineOptions::default());
        assert_eq!(run(&mut e, "SHAHAR Choy G'arb"), "ŞAHAR Çoy Ğarb");
    }

    #[test]
    fn long_words_do_not_grow_unbounded() {
        let mut e = TypingEngine::new(EngineOptions::default());
        let long = "a".repeat(200) + "sh";
        let out = run(&mut e, &long);
        assert!(out.ends_with('ş'));
        assert_eq!(out.chars().count(), 201);
    }
}
