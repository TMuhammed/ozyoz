//! Linux (X11 only): observe keys with the RECORD extension and fix text up
//! afterwards with XTEST. Unlike macOS/Windows the typed key cannot be
//! swallowed, so the user briefly sees `sh` before it becomes `ş` — the same
//! visual behaviour as the browser extension. Wayland is not supported.

use crate::{Controller, Decision, KeyInput, Permission};
use std::sync::Arc;
use x11rb::connection::Connection;
use x11rb::protocol::record::{self, ConnectionExt as _};
use x11rb::protocol::xproto::{self, ConnectionExt as _, KeyButMask, Keycode, Keysym};
use x11rb::protocol::xtest::ConnectionExt as _;
use x11rb::rust_connection::RustConnection;
use x11rb::x11_utils::TryParse;
use xkeysym::Keysym as XKeysym;

const KEY_PRESS: u8 = 2;
const BUTTON_PRESS: u8 = 4;
fn mask(m: KeyButMask) -> u16 {
    m.bits()
}

pub fn check_permission() -> Permission {
    match std::env::var("XDG_SESSION_TYPE").as_deref() {
        Ok("wayland") => Permission::Denied,
        _ if std::env::var("DISPLAY").is_ok() => Permission::Granted,
        _ => Permission::Denied,
    }
}

pub fn frontmost_app() -> Option<String> {
    let (conn, screen) = RustConnection::connect(None).ok()?;
    let root = conn.setup().roots[screen].root;
    let active = conn.intern_atom(false, b"_NET_ACTIVE_WINDOW").ok()?.reply().ok()?.atom;
    let reply = conn.get_property(false, root, active, xproto::AtomEnum::WINDOW, 0, 1).ok()?.reply().ok()?;
    let win = reply.value32()?.next()?;
    let class = conn.get_property(false, win, xproto::AtomEnum::WM_CLASS, xproto::AtomEnum::STRING, 0, 64).ok()?.reply().ok()?;
    let v = class.value;
    let mut parts = v.split(|b| *b == 0).filter(|p| !p.is_empty());
    let _instance = parts.next();
    parts.next().map(|c| String::from_utf8_lossy(c).to_lowercase())
}

struct Keymap {
    min: Keycode,
    per: u8,
    syms: Vec<Keysym>,
}

impl Keymap {
    fn load(conn: &RustConnection) -> Result<Self, String> {
        let setup = conn.setup();
        let min = setup.min_keycode;
        let count = setup.max_keycode - min + 1;
        let reply = conn.get_keyboard_mapping(min, count).map_err(|e| e.to_string())?.reply().map_err(|e| e.to_string())?;
        Ok(Self { min, per: reply.keysyms_per_keycode, syms: reply.keysyms })
    }

    fn keysym(&self, code: Keycode, state: u16) -> Keysym {
        let idx = (code - self.min) as usize * self.per as usize;
        let group = &self.syms[idx..(idx + self.per as usize).min(self.syms.len())];
        let shift = (state & mask(KeyButMask::SHIFT)) != 0;
        let lock = (state & mask(KeyButMask::LOCK)) != 0;
        let lower = group.first().copied().unwrap_or(0);
        let upper = group.get(1).copied().filter(|s| *s != 0).unwrap_or(lower);
        if shift ^ lock {
            upper
        } else {
            lower
        }
    }

    fn keycode_for(&self, sym: Keysym) -> Option<(Keycode, bool)> {
        for (i, chunk) in self.syms.chunks(self.per as usize).enumerate() {
            if chunk.first() == Some(&sym) {
                return Some((self.min + i as u8, false));
            }
            if chunk.get(1) == Some(&sym) {
                return Some((self.min + i as u8, true));
            }
        }
        None
    }

    fn spare_keycode(&self) -> Option<Keycode> {
        self.syms
            .chunks(self.per as usize)
            .enumerate()
            .rev()
            .find(|(_, c)| c.iter().all(|s| *s == 0))
            .map(|(i, _)| self.min + i as u8)
    }
}

fn keysym_to_char(sym: Keysym) -> Option<char> {
    XKeysym::new(sym).key_char()
}

fn char_to_keysym(c: char) -> Keysym {
    // Unicode keysyms are accepted by all modern X servers.
    0x0100_0000 | c as u32
}

struct Injector {
    conn: RustConnection,
    keymap: Keymap,
    shift_code: Option<Keycode>,
    backspace: Option<Keycode>,
}

impl Injector {
    fn new() -> Result<Self, String> {
        let (conn, _) = RustConnection::connect(None).map_err(|e| e.to_string())?;
        conn.xtest_get_version(2, 2).map_err(|e| e.to_string())?.reply().map_err(|e| e.to_string())?;
        let keymap = Keymap::load(&conn)?;
        let shift_code = keymap.keycode_for(xkeysym::key::Shift_L).map(|(c, _)| c);
        let backspace = keymap.keycode_for(xkeysym::key::BackSpace).map(|(c, _)| c);
        Ok(Self { conn, keymap, shift_code, backspace })
    }

    fn tap(&self, code: Keycode, shift: bool) -> Result<(), String> {
        let root = self.conn.setup().roots[0].root;
        let fake = |typ: u8, code: Keycode| self.conn.xtest_fake_input(typ, code, 0, root, 0, 0, 0).map(|_| ()).map_err(|e| e.to_string());
        if shift {
            if let Some(s) = self.shift_code {
                fake(KEY_PRESS, s)?;
            }
        }
        fake(KEY_PRESS, code)?;
        fake(KEY_PRESS + 1, code)?;
        if shift {
            if let Some(s) = self.shift_code {
                fake(KEY_PRESS + 1, s)?;
            }
        }
        Ok(())
    }

    fn type_char(&mut self, c: char) -> Result<(), String> {
        let sym = char_to_keysym(c);
        if let Some((code, shift)) = self.keymap.keycode_for(sym) {
            return self.tap(code, shift);
        }
        // Not on the current layout: temporarily map a spare keycode to it.
        let Some(spare) = self.keymap.spare_keycode() else { return Err("no spare keycode".into()) };
        self.conn.change_keyboard_mapping(1, spare, 1, &[sym]).map_err(|e| e.to_string())?;
        self.conn.flush().map_err(|e| e.to_string())?;
        self.tap(spare, false)?;
        self.conn.flush().map_err(|e| e.to_string())?;
        std::thread::sleep(std::time::Duration::from_millis(5));
        self.conn.change_keyboard_mapping(1, spare, 1, &[0]).map_err(|e| e.to_string())?;
        self.conn.flush().map_err(|e| e.to_string())
    }

    fn apply(&mut self, backspaces: usize, insert: &str) -> Result<(), String> {
        if let Some(bs) = self.backspace {
            for _ in 0..backspaces {
                self.tap(bs, false)?;
            }
        }
        for c in insert.chars() {
            self.type_char(c)?;
        }
        self.conn.flush().map_err(|e| e.to_string())
    }
}

pub fn run(controller: Arc<Controller>) -> Result<(), String> {
    if check_permission() != Permission::Granted {
        return Err("X11 session required (Wayland is not supported)".into());
    }
    let (ctrl_conn, _) = RustConnection::connect(None).map_err(|e| e.to_string())?;
    let (data_conn, _) = RustConnection::connect(None).map_err(|e| e.to_string())?;
    ctrl_conn.record_query_version(1, 13).map_err(|e| e.to_string())?.reply().map_err(|e| e.to_string())?;
    let keymap = Keymap::load(&ctrl_conn)?;
    let mut injector = Injector::new()?;

    let rc = ctrl_conn.generate_id().map_err(|e| e.to_string())?;
    let range = record::Range {
        device_events: record::Range8 { first: KEY_PRESS, last: BUTTON_PRESS },
        ..Default::default()
    };
    ctrl_conn
        .record_create_context(rc, 0, &[record::CS::ALL_CLIENTS.into()], &[range])
        .map_err(|e| e.to_string())?
        .check()
        .map_err(|e| e.to_string())?;
    let cookie = data_conn.record_enable_context(rc).map_err(|e| e.to_string())?;
    log::info!("X11 RECORD context enabled");

    let mut injected_pending = 0usize; // our own fake events come back through RECORD
    for reply in cookie {
        let reply = reply.map_err(|e| e.to_string())?;
        if reply.category != 0 {
            continue;
        }
        let mut data = &reply.data[..];
        while !data.is_empty() {
            let Ok((ev, rest)) = xproto::KeyPressEvent::try_parse(data) else { break };
            data = rest;
            match ev.response_type & 0x7f {
                BUTTON_PRESS => controller.reset_word(),
                KEY_PRESS => {
                    if injected_pending > 0 {
                        injected_pending -= 1;
                        continue;
                    }
                    let state = ev.state.bits();
                    if state & (mask(KeyButMask::CONTROL) | mask(KeyButMask::MOD1) | mask(KeyButMask::MOD4)) != 0 {
                        controller.reset_word();
                        continue;
                    }
                    let sym = keymap.keysym(ev.detail, state);
                    let input = if sym == xkeysym::key::BackSpace {
                        KeyInput::Backspace
                    } else if [
                        xkeysym::key::Return, xkeysym::key::Tab, xkeysym::key::Escape, xkeysym::key::Delete,
                        xkeysym::key::Home, xkeysym::key::End, xkeysym::key::Page_Up, xkeysym::key::Page_Down,
                        xkeysym::key::Left, xkeysym::key::Right, xkeysym::key::Up, xkeysym::key::Down, xkeysym::key::KP_Enter,
                    ]
                    .iter()
                    .any(|k| *k == sym)
                    {
                        KeyInput::Reset
                    } else {
                        match keysym_to_char(sym) {
                            Some(c) if !c.is_control() => KeyInput::Char(c),
                            _ => continue, // modifier or dead key
                        }
                    };
                    let app = frontmost_app();
                    if let Decision::Replace { backspaces, insert } = controller.handle(app.as_deref(), input) {
                        // The key has already been delivered: remove it too.
                        let total_bs = backspaces + 1;
                        injected_pending += total_bs + insert.chars().count();
                        if let Err(e) = injector.apply(total_bs, &insert) {
                            log::warn!("inject failed: {e}");
                            controller.reset_word();
                        }
                    }
                }
                _ => {}
            }
        }
    }
    Ok(())
}
