//! Windows: WH_KEYBOARD_LL hook + SendInput(KEYEVENTF_UNICODE).
//! No special permission is needed, but elevated (admin) windows do not
//! receive injected input from a non-elevated process.

use crate::{utf16_chunks, Controller, Decision, HookState, KeyInput, Permission};
use std::sync::{Arc, OnceLock};
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::{
    GetCurrentThreadId, OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT,
    PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, GetKeyboardLayout, GetKeyboardState, SendInput, ToUnicodeEx, INPUT, INPUT_0, INPUT_KEYBOARD,
    KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, VIRTUAL_KEY, VK_BACK, VK_CONTROL, VK_DELETE,
    VK_DOWN, VK_END, VK_ESCAPE, VK_HOME, VK_LEFT, VK_LWIN, VK_MENU, VK_NEXT, VK_PRIOR, VK_RETURN, VK_RIGHT, VK_RWIN,
    VK_TAB, VK_UP,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetForegroundWindow, GetMessageW, GetWindowThreadProcessId, SetWindowsHookExW,
    TranslateMessage, HHOOK, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL, WM_KEYDOWN, WM_SYSKEYDOWN,
};

const MAGIC: usize = 0x4F7A796F7A;
static CONTROLLER: OnceLock<Arc<Controller>> = OnceLock::new();

pub fn frontmost_app() -> Option<String> {
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(handle, PROCESS_NAME_FORMAT(0), windows::core::PWSTR(buf.as_mut_ptr()), &mut len).is_ok();
        let _ = windows::Win32::Foundation::CloseHandle(handle);
        if !ok {
            return None;
        }
        let path = String::from_utf16_lossy(&buf[..len as usize]);
        path.rsplit('\\').next().map(|s| s.to_lowercase())
    }
}

fn modifier_down(vk: VIRTUAL_KEY) -> bool {
    unsafe { (GetAsyncKeyState(vk.0 as i32) as u16 & 0x8000) != 0 }
}

fn char_for(kb: &KBDLLHOOKSTRUCT) -> Option<char> {
    unsafe {
        let mut state = [0u8; 256];
        if GetKeyboardState(&mut state).is_err() {
            return None;
        }
        let hwnd = GetForegroundWindow();
        let tid = GetWindowThreadProcessId(hwnd, None);
        let layout = GetKeyboardLayout(tid);
        let mut buf = [0u16; 8];
        // Flag 0x4: do not change the keyboard's dead-key state (Win10 1607+).
        let n = ToUnicodeEx(kb.vkCode, kb.scanCode, &state, &mut buf, 0x4, Some(layout));
        if n == 1 {
            char::decode_utf16(buf[..1].iter().copied()).next()?.ok()
        } else if n == 2 {
            char::decode_utf16(buf[..2].iter().copied()).next()?.ok()
        } else {
            None
        }
    }
}

fn send_inputs(backspaces: usize, insert: &str) {
    let mut inputs: Vec<INPUT> = Vec::new();
    let key = |vk: u16, scan: u16, flags: KEYBD_EVENT_FLAGS| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT { wVk: VIRTUAL_KEY(vk), wScan: scan, dwFlags: flags, time: 0, dwExtraInfo: MAGIC },
        },
    };
    for _ in 0..backspaces {
        inputs.push(key(VK_BACK.0, 0, KEYBD_EVENT_FLAGS(0)));
        inputs.push(key(VK_BACK.0, 0, KEYEVENTF_KEYUP));
    }
    for chunk in utf16_chunks(insert, 64) {
        for unit in chunk {
            inputs.push(key(0, unit, KEYEVENTF_UNICODE));
            inputs.push(key(0, unit, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP));
        }
    }
    unsafe {
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
}

unsafe extern "system" fn hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code < 0 {
        return CallNextHookEx(None, code, wparam, lparam);
    }
    let kb = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
    let msg = wparam.0 as u32;
    if kb.dwExtraInfo == MAGIC || (msg != WM_KEYDOWN && msg != WM_SYSKEYDOWN) {
        return CallNextHookEx(None, code, wparam, lparam);
    }
    let Some(ctl) = CONTROLLER.get() else { return CallNextHookEx(None, code, wparam, lparam) };
    let app = frontmost_app();
    let vk = VIRTUAL_KEY(kb.vkCode as u16);
    let input = if modifier_down(VK_CONTROL) || modifier_down(VK_MENU) || modifier_down(VK_LWIN) || modifier_down(VK_RWIN) {
        KeyInput::Reset
    } else if vk == VK_BACK {
        KeyInput::Backspace
    } else if [VK_RETURN, VK_TAB, VK_ESCAPE, VK_DELETE, VK_HOME, VK_END, VK_PRIOR, VK_NEXT, VK_LEFT, VK_RIGHT, VK_UP, VK_DOWN]
        .contains(&vk)
    {
        KeyInput::Reset
    } else {
        match char_for(kb) {
            Some(c) if !c.is_control() => KeyInput::Char(c),
            _ => return CallNextHookEx(None, code, wparam, lparam),
        }
    };
    match ctl.handle(app.as_deref(), input) {
        Decision::PassThrough => CallNextHookEx(None, code, wparam, lparam),
        Decision::Replace { backspaces, insert } => {
            send_inputs(backspaces, &insert);
            LRESULT(1)
        }
    }
}

pub fn run(controller: Arc<Controller>) -> Result<(), String> {
    let _ = CONTROLLER.set(controller.clone());
    unsafe {
        let hmod = GetModuleHandleW(None).map_err(|e| e.to_string())?;
        let hook: HHOOK = SetWindowsHookExW(WH_KEYBOARD_LL, Some(hook_proc), Some(hmod.into()), 0)
            .map_err(|e| { controller.set_hook_state(HookState::Failed(e.to_string())); e.to_string() })?;
        log::info!("Windows keyboard hook installed on thread {}", GetCurrentThreadId());
        if let Some(c) = CONTROLLER.get() { c.set_hook_state(HookState::Running); }
        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
        let _ = windows::Win32::UI::WindowsAndMessaging::UnhookWindowsHookEx(hook);
    }
    Ok(())
}

pub fn check_permission() -> Permission {
    Permission::NotRequired
}
