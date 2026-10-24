# Özyoz Desktop (macOS, Windows, Linux)

System-wide conversion while typing in any application. Built with Tauri 2
(Rust backend, small React settings window) and three Rust crates:

| Crate | Role |
|---|---|
| `crates/ozyoz-core` | The conversion engine. Same algorithm as `src/core/` (TypeScript); both read `rules/ruleset.json` and pass the fixtures in `rules/fixtures/`. |
| `crates/ozyoz-typing` | Keystroke state machine: remembers only the current word, answers *pass through* or *replace N characters with this text*. |
| `crates/ozyoz-input` | Platform hooks that intercept keys, call the engine and inject the replacement. |
| `desktop/src-tauri` | The app: tray icon, settings window, persistence, autostart. |

Nothing typed is stored or sent anywhere. The engine keeps at most the current
word (48 characters) in memory and clears it at every word boundary.

## How each platform works

| | macOS | Windows | Linux |
|---|---|---|---|
| Observe keys | `CGEventTap` (session level) | `WH_KEYBOARD_LL` hook | X11 RECORD extension |
| Swallow the key | yes (tap returns null) | yes (hook returns 1) | **no** — the key is delivered, then fixed up |
| Inject text | `CGEventPost` with Unicode string | `SendInput(KEYEVENTF_UNICODE)` | XTEST, remapping a spare keycode for letters not on the layout |
| Permission | **Accessibility** (prompted on first run) | none | X11 session required; **Wayland is not supported** |
| Focused app for exclusions | executable path from the event's target PID (`Telegram.app`) | foreground window process (`notepad.exe`) | `_NET_ACTIVE_WINDOW` → `WM_CLASS` (`gnome-terminal`) |
| Secure fields | skipped while `IsSecureEventInputEnabled()` (password fields, Terminal secure entry) | not detectable; rely on exclusions | not detectable; rely on exclusions |
| Injected-event marker | `kCGEventSourceUserData` | `dwExtraInfo` | counted and skipped in RECORD stream |

On macOS and Windows the user never sees the old spelling: `s` then `h` shows
`ş` directly. On Linux `sh` appears for a moment and becomes `ş`, exactly like
the browser extension.

Keys that reset the current word on every platform: Space/Enter/Tab, arrows,
Home/End/PageUp/PageDown, Escape, Delete, mouse clicks, any Ctrl/Cmd/Alt/Win
shortcut, and switching to another application. Backspace removes the last
character from the word buffer.

Default exclusions (editable in settings): terminals, code editors/IDEs and
password managers, because converting keystrokes there is almost always wrong.

## Build

Prerequisites: Node 20+, Rust stable, and Tauri's per-OS requirements
(https://v2.tauri.app/start/prerequisites/): Xcode CLT on macOS; MSVC Build
Tools + WebView2 on Windows; `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev
librsvg2-dev patchelf` on Debian/Ubuntu.

```bash
cd desktop
npm install
npm run tauri dev      # run with hot reload
npm run tauri build    # bundles into desktop/src-tauri/target/release/bundle/
```

Outputs: `.app` + `.dmg` (macOS), `.msi` + NSIS `.exe` (Windows), `.deb`,
`.rpm`, `.AppImage` (Linux). The workspace `target/` is at the repository
root, so bundles land in `target/release/bundle/`.

macOS note: Tauri styles the `.dmg` through Finder (AppleScript). From a
terminal without Automation permission for Finder, or over SSH, that step
times out after the `.app` is already built. Either grant Terminal
"Automation → Finder" in Privacy & Security, or build only the app and make a
plain image yourself:

```bash
npm run tauri build -- --bundles app
npm run dmg      # hdiutil wrapper, writes release/Ozyoz_<version>_<arch>.dmg
``` The GitHub Actions workflow in
`.github/workflows/desktop.yml` builds all three on every tag `v*`.

Engine tests (shared fixtures) and platform compile checks:

```bash
cargo test --workspace
cargo check -p ozyoz-input --target x86_64-pc-windows-msvc
cargo check -p ozyoz-input --target x86_64-unknown-linux-gnu
```

## Run on macOS the first time

1. Open Özyoz. It lives in the menu bar (no Dock icon). The settings window
   opens on first launch.
2. Click **Ruxsat söraş**; macOS opens System Settings → Privacy & Security →
   Accessibility. Enable Özyoz. Relaunch the app (macOS applies the grant to
   the next launch).
3. Type `shahar` anywhere. You should get `şahar`.

**Signing matters for Accessibility.** macOS ties the Accessibility grant to
the app's code signature. An ad-hoc signed build (the default when no identity
is configured) gets a new signature on every rebuild, and the grant silently
stops applying: the app still shows as enabled in System Settings, but
`AXIsProcessTrusted` stays false and the event tap is never created. The
settings window shows this as «Ulanmoqda…» / hook state `waitingForPermission`.

Fix: sign with any stable identity, even a free "Apple Development"
certificate from Xcode:

```bash
security find-identity -v -p codesigning          # pick an identity
cd desktop
APPLE_SIGNING_IDENTITY="Apple Development: you@example.com (TEAMID)" npm run mac
#   = tauri build --bundles app  →  codesign  →  hdiutil dmg
```

After the first signed build, toggle Özyoz off and on once in Accessibility.
Later rebuilds with the same identity keep the grant.

Diagnostics: the settings window shows the hook state, the number of key
events seen by the tap and which app holds "secure input" if any; the log is
at `~/Library/Logs/uz.ozyoz.desktop/ozyoz.log`.

## Known limitations

- **Wayland (Linux):** no global key access by design of the protocol. The app
  shows a notice and does nothing. Workarounds (IBus/Fcitx input method) are a
  separate project.
- **Elevated windows (Windows):** a non-admin Özyoz cannot inject into admin
  windows (UAC isolation).
- **Secure input on Windows/Linux** is not detectable; add password managers
  and banking apps to the exclusions if needed.
- **Apps with their own input handling** (games, remote desktops, some
  Electron terminals) may ignore synthesized Unicode input.
- **Dead keys / IMEs:** keys that produce no character are ignored; the composed
  character is processed when it arrives.
- **Closing single quote after `o`/`g`** is read as `oʻ`/`gʻ` (same as the
  extension); use double quotes around Uzbek text.
- Undo in the host app will undo the injected replacement as the app's own undo
  stack sees it (usually one step for the backspace + insert pair, but this is
  up to the application).

## Distribution

| OS | Format | Signing |
|---|---|---|
| macOS | `.dmg` | Developer ID certificate + notarization (`tauri build` can sign when `APPLE_*` env vars are set); without it users must right-click → Open |
| Windows | NSIS `.exe` / `.msi` | optional code-signing certificate; SmartScreen warns on unsigned installers |
| Linux | `.deb` / `.rpm` / `.AppImage` | none required |

Publishing targets: GitHub Releases (all three), Homebrew cask (macOS, later),
winget (Windows, later), Flathub is not applicable (needs Wayland-safe design).
