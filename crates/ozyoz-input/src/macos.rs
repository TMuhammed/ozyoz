//! macOS: CGEventTap at session level. Needs Accessibility permission
//! (System Settings → Privacy & Security → Accessibility).

use crate::{utf16_chunks, Controller, Decision, HookState, KeyInput, Permission};
use core_foundation::base::TCFType;
use foreign_types::ForeignType;
use core_foundation::boolean::CFBoolean;
use core_foundation::dictionary::CFDictionary;
use core_foundation::runloop::{kCFRunLoopDefaultMode, CFRunLoop};
use core_foundation::string::CFString;
use core_graphics::event::{
    CGEvent, CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventTapProxy,
    CGEventType, CallbackResult, EventField,
};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

/// Marks events we inject so the tap ignores them.
const MAGIC: i64 = 0x4F7A796F7A; // "Ozyoz"
const KEY_BACKSPACE: u16 = 51;
const RESET_KEYS: &[i64] = &[36, 48, 53, 76, 115, 116, 117, 119, 121, 123, 124, 125, 126];

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrustedWithOptions(options: core_foundation::dictionary::CFDictionaryRef) -> bool;
}

#[link(name = "Carbon", kind = "framework")]
extern "C" {
    fn IsSecureEventInputEnabled() -> bool;
}

extern "C" {
    fn CGEventKeyboardGetUnicodeString(
        event: core_graphics::sys::CGEventRef,
        max_len: libc::c_ulong,
        actual_len: *mut libc::c_ulong,
        buf: *mut u16,
    );
}

pub fn check_permission(prompt: bool) -> Permission {
    let key = CFString::from_static_string("AXTrustedCheckOptionPrompt");
    let value = CFBoolean::from(prompt);
    let dict = CFDictionary::from_CFType_pairs(&[(key.as_CFType(), value.as_CFType())]);
    let trusted = unsafe { AXIsProcessTrustedWithOptions(dict.as_concrete_TypeRef()) };
    if trusted {
        Permission::Granted
    } else {
        Permission::Denied
    }
}

fn app_name_for_pid(pid: i64) -> Option<String> {
    if pid <= 0 {
        return None;
    }
    let mut buf = vec![0u8; 4096];
    let n = unsafe { libc::proc_pidpath(pid as i32, buf.as_mut_ptr() as *mut libc::c_void, buf.len() as u32) };
    if n <= 0 {
        return None;
    }
    let path = String::from_utf8_lossy(&buf[..n as usize]).to_string();
    // "/Applications/Telegram.app/Contents/MacOS/Telegram" → "Telegram.app"
    if let Some(idx) = path.find(".app/") {
        let head = &path[..idx + 4];
        return head.rsplit('/').next().map(str::to_owned);
    }
    path.rsplit('/').next().map(str::to_owned)
}

pub fn secure_input_blocker() -> Option<String> {
    if !unsafe { IsSecureEventInputEnabled() } {
        return None;
    }
    let out = std::process::Command::new("/usr/sbin/ioreg").args(["-l", "-d", "1", "-w", "0"]).output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let pid = text
        .split("kCGSSessionSecureInputPID\"=")
        .nth(1)
        .and_then(|rest| rest.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse::<i64>().ok());
    Some(pid.and_then(app_name_for_pid).unwrap_or_else(|| "noma'lum dastur".into()))
}

pub fn frontmost_app() -> Option<String> {
    // Without AppKit bindings we only know the app when a key arrives; the
    // controller remembers it. Kept for API symmetry.
    None
}

fn unicode_of(event: &CGEvent) -> String {
    let mut buf = [0u16; 8];
    let mut len: libc::c_ulong = 0;
    unsafe { CGEventKeyboardGetUnicodeString(event.as_ptr(), buf.len() as libc::c_ulong, &mut len, buf.as_mut_ptr()) };
    String::from_utf16_lossy(&buf[..len as usize])
}

fn inject(proxy: CGEventTapProxy, backspaces: usize, insert: &str) {
    let Ok(source) = CGEventSource::new(CGEventSourceStateID::CombinedSessionState) else { return };
    let mark = |e: &CGEvent| e.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, MAGIC);
    for _ in 0..backspaces {
        for down in [true, false] {
            if let Ok(e) = CGEvent::new_keyboard_event(source.clone(), KEY_BACKSPACE, down) {
                mark(&e);
                e.post_from_tap(proxy);
            }
        }
    }
    for chunk in utf16_chunks(insert, 20) {
        for down in [true, false] {
            if let Ok(e) = CGEvent::new_keyboard_event(source.clone(), 0, down) {
                e.set_string_from_utf16_unchecked(&chunk);
                mark(&e);
                e.post_from_tap(proxy);
            }
        }
    }
}

pub fn run(controller: Arc<Controller>) -> Result<(), String> {
    loop {
        if check_permission(false) != Permission::Granted {
            controller.set_hook_state(HookState::WaitingForPermission);
            std::thread::sleep(Duration::from_secs(2));
            continue;
        }
        match run_once(controller.clone()) {
            Ok(()) => return Ok(()),
            Err(e) => {
                log::error!("event tap failed: {e}; retrying in 5s");
                controller.set_hook_state(HookState::Failed(e));
                std::thread::sleep(Duration::from_secs(5));
            }
        }
    }
}

fn run_once(controller: Arc<Controller>) -> Result<(), String> {
    let disabled = Arc::new(AtomicBool::new(false));
    let seen = Arc::new(AtomicBool::new(false));
    let seen_cb = seen.clone();
    let disabled_cb = disabled.clone();
    let ctl = controller.clone();

    let callback = move |proxy: CGEventTapProxy, etype: CGEventType, event: &CGEvent| -> CallbackResult {
        match etype {
            CGEventType::TapDisabledByTimeout | CGEventType::TapDisabledByUserInput => {
                disabled_cb.store(true, Ordering::SeqCst);
                return CallbackResult::Keep;
            }
            CGEventType::LeftMouseDown | CGEventType::RightMouseDown | CGEventType::OtherMouseDown => {
                ctl.reset_word();
                return CallbackResult::Keep;
            }
            CGEventType::KeyDown => {}
            _ => return CallbackResult::Keep,
        }
        if event.get_integer_value_field(EventField::EVENT_SOURCE_USER_DATA) == MAGIC {
            return CallbackResult::Keep;
        }
        if !seen_cb.swap(true, Ordering::Relaxed) {
            log::info!("first key event received by the tap");
        }
        if unsafe { IsSecureEventInputEnabled() } {
            ctl.reset_word();
            return CallbackResult::Keep;
        }
        let flags = event.get_flags();
        if flags.intersects(
            CGEventFlags::CGEventFlagCommand
                | CGEventFlags::CGEventFlagControl
                | CGEventFlags::CGEventFlagAlternate
                | CGEventFlags::CGEventFlagSecondaryFn,
        ) {
            ctl.reset_word();
            return CallbackResult::Keep;
        }
        let pid = event.get_integer_value_field(EventField::EVENT_TARGET_UNIX_PROCESS_ID);
        let app = app_name_for_pid(pid);
        let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
        let input = if keycode == KEY_BACKSPACE as i64 {
            KeyInput::Backspace
        } else if RESET_KEYS.contains(&keycode) {
            KeyInput::Reset
        } else {
            let s = unicode_of(event);
            let mut it = s.chars();
            match (it.next(), it.next()) {
                (Some(c), None) if !c.is_control() => KeyInput::Char(c),
                (None, _) => return CallbackResult::Keep, // dead key, no text yet
                _ => KeyInput::Reset,
            }
        };
        match ctl.handle(app.as_deref(), input) {
            Decision::PassThrough => CallbackResult::Keep,
            Decision::Replace { backspaces, insert } => {
                inject(proxy, backspaces, &insert);
                CallbackResult::Drop
            }
        }
    };

    let tap = CGEventTap::new(
        CGEventTapLocation::Session,
        CGEventTapPlacement::HeadInsertEventTap,
        CGEventTapOptions::Default,
        vec![
            CGEventType::KeyDown,
            CGEventType::LeftMouseDown,
            CGEventType::RightMouseDown,
            CGEventType::OtherMouseDown,
        ],
        callback,
    )
    .map_err(|_| "could not create event tap (Accessibility permission missing?)".to_string())?;

    let source = tap.mach_port().create_runloop_source(0).map_err(|_| "runloop source".to_string())?;
    let run_loop = CFRunLoop::get_current();
    run_loop.add_source(&source, unsafe { kCFRunLoopDefaultMode });
    tap.enable();
    controller.set_hook_state(HookState::Running);
    log::info!("macOS event tap enabled");
    loop {
        CFRunLoop::run_in_mode(unsafe { kCFRunLoopDefaultMode }, Duration::from_secs(1), false);
        if disabled.swap(false, Ordering::SeqCst) {
            log::warn!("event tap was disabled by the system; re-enabling");
            tap.enable();
        }
    }
}
