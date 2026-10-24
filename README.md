# Özyoz

Özyoz («öz» — own, «yoz» — write) is a browser extension that converts Uzbek Latin text from the 1995 spelling to the
2026 alphabet **while you type**: `sh→ş`, `ch→ç`, `oʻ→ö`, `gʻ→ğ`.
Everything runs locally in the page; no text ever leaves the browser.

Ruleset: Law O‘RQ-1184 of 21 October 2026 (in force from 22 April 2027).
See [docs/ruleset.md](docs/ruleset.md) for the verified source and every rule,
and [docs/browser-behaviour.md](docs/browser-behaviour.md) for how editing,
undo, paste and IME are handled.

Repository: https://github.com/TMuhammed/ozyoz · Privacy policy: [PRIVACY.md](PRIVACY.md)

Three products share one engine and one verified ruleset:

| | Status | Docs |
|---|---|---|
| Browser extension for Chrome, Edge, Yandex Browser (Chromium build) | ready, tested | this file, [docs/browser-behaviour.md](docs/browser-behaviour.md) |
| Safari extension (macOS app wrapper) | builds, needs manual Safari testing | [docs/safari.md](docs/safari.md) |
| Desktop app for macOS, Windows, Linux (system-wide typing) | macOS built; Windows/Linux compile-checked, built by CI | [docs/desktop.md](docs/desktop.md) |

Publication steps for every channel: [docs/release-plan.md](docs/release-plan.md).

## Install (development mode)

```bash
npm install
npm run build        # produces dist/
```

1. Open `chrome://extensions` (Edge: `edge://extensions`, Yandex: `browser://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and choose the `dist/` folder.
4. Click the Özyoz icon in the toolbar to toggle conversion, pause it, or
   disable it for the current site. Settings live under **Sozlamalar**.

To rebuild after changes run `npm run build` again and press the reload icon
on the extension card.

## Project layout

```
rules/              ruleset.json (the verified mapping) + fixtures/ shared by TS and Rust
src/core/           TypeScript conversion engine — no DOM, no browser APIs
src/browser/        content script, input/contenteditable adapters, site policy, background worker
src/popup/          toolbar popup (React)
src/options/        settings page (React)
src/shared/         settings model, chrome.storage adapter, support info
scripts/            build-safari, package (store zip), screenshots
safari/             Xcode wrapper project for the Safari extension
crates/ozyoz-core   Rust conversion engine (same fixtures)
crates/ozyoz-typing keystroke state machine for the desktop app
crates/ozyoz-input  macOS / Windows / Linux keyboard hooks
desktop/            Tauri 2 desktop app (tray + settings window)
tests/unit/         Vitest
tests/integration/  Playwright, loads dist/ into Chromium
docs/               ruleset record, browser behaviour, safari, desktop, store listing, release plan
store/              logo, promo tile, screenshots, demo page
```

## Scripts

| Command | What it does |
|---|---|
| `npm test` | unit tests (core, settings, site policy) |
| `npm run build` | production build to `dist/` |
| `npm run test:e2e` | integration tests against `dist/` (build first) |
| `npm run test:all` | unit → build → integration |
| `npm run typecheck` | strict TypeScript check |
| `npm run build:safari` | Safari variant to `dist-safari/` |
| `npm run package` | build + zip for Chrome Web Store / Edge Add-ons |
| `npm run screenshots` | regenerate store screenshots |
| `cargo test --workspace` | Rust engine tests against the shared fixtures |
| `cd desktop && npm run tauri build` | desktop app bundle for the current OS |

## Permissions

- `storage` — saves your settings locally.
- `activeTab` — lets the popup show which site you are on.
- Content script on all sites — required to see typing in page fields. The
  script reads only the field being typed in and never sends anything anywhere.

## Known limitations

See [docs/browser-behaviour.md](docs/browser-behaviour.md) and the
"Exceptions" section of [docs/ruleset.md](docs/ruleset.md). In short: a closing
single quote right after `o`/`g` is read as `oʻ`/`gʻ`; English `sh`/`ch` in the
same field is converted too (pause or disable per site); some third-party rich
editors are skipped on purpose.
