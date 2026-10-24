//! System-wide keystroke interception for Özyoz desktop.
//!
//! A platform hook feeds printable characters to [`Controller`], which runs
//! the [`ozyoz_typing::TypingEngine`] and answers with a [`Decision`]. The
//! hook then either lets the key through or swallows it and injects
//! Backspaces plus the converted text.
//!
//! Nothing is logged or stored: the engine only remembers the current word.

mod controller;

#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "linux")]
pub mod linux;

pub use controller::{Controller, Snapshot};
pub use ozyoz_typing::{Decision, EngineOptions, KeyInput, Mode};

use std::sync::Arc;

/// Whether the OS lets us observe and inject keystrokes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Permission {
    Granted,
    /// macOS: Accessibility not granted. Linux: not an X11 session.
    Denied,
    /// Platform does not need an explicit grant (Windows).
    NotRequired,
}

#[derive(Debug)]
pub struct HookError(pub String);

impl std::fmt::Display for HookError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for HookError {}

/// Checks (and on macOS optionally prompts for) the permission the hook needs.
pub fn check_permission(prompt: bool) -> Permission {
    #[cfg(target_os = "macos")]
    {
        macos::check_permission(prompt)
    }
    #[cfg(target_os = "windows")]
    {
        let _ = prompt;
        Permission::NotRequired
    }
    #[cfg(target_os = "linux")]
    {
        let _ = prompt;
        linux::check_permission()
    }
}

/// Starts the platform hook on a background thread. Returns immediately.
/// The thread lives for the rest of the process.
pub fn start(controller: Arc<Controller>) -> Result<(), HookError> {
    std::thread::Builder::new()
        .name("ozyoz-input".into())
        .spawn(move || {
            #[cfg(target_os = "macos")]
            let r = macos::run(controller);
            #[cfg(target_os = "windows")]
            let r = windows::run(controller);
            #[cfg(target_os = "linux")]
            let r = linux::run(controller);
            if let Err(e) = r {
                log::error!("input hook stopped: {e}");
            }
        })
        .map_err(|e| HookError(e.to_string()))?;
    Ok(())
}

/// Human-readable name of the application that owns the keyboard focus, as
/// used in the exclusion list (e.g. `Telegram.app`, `notepad.exe`, `gnome-terminal`).
pub fn frontmost_app() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        macos::frontmost_app()
    }
    #[cfg(target_os = "windows")]
    {
        windows::frontmost_app()
    }
    #[cfg(target_os = "linux")]
    {
        linux::frontmost_app()
    }
}

/// Splits a replacement string into chunks the platform can inject in one
/// event (macOS caps a keyboard event at 20 UTF-16 units).
#[allow(dead_code)]
pub(crate) fn utf16_chunks(s: &str, max_units: usize) -> Vec<Vec<u16>> {
    let mut chunks = Vec::new();
    let mut cur: Vec<u16> = Vec::new();
    for ch in s.chars() {
        let mut buf = [0u16; 2];
        let units = ch.encode_utf16(&mut buf);
        if cur.len() + units.len() > max_units {
            chunks.push(std::mem::take(&mut cur));
        }
        cur.extend_from_slice(units);
    }
    if !cur.is_empty() {
        chunks.push(cur);
    }
    chunks
}
