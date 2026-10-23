# Özyoz

Özyoz («öz» — own, «yoz» — write) is a browser extension that converts Uzbek Latin text from the 1995 spelling to the
2026 alphabet **while you type**: `sh→ş`, `ch→ç`, `oʻ→ö`, `gʻ→ğ`.
Everything runs locally in the page; no text ever leaves the browser.

Ruleset: Law O‘RQ-1184 of 21 October 2026 (in force from 22 April 2027).
See [docs/ruleset.md](docs/ruleset.md) for the verified source and every rule,
and [docs/browser-behaviour.md](docs/browser-behaviour.md) for how editing,
undo, paste and IME are handled.

Works in Chrome, Microsoft Edge and Yandex Browser (one Chromium build).

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
src/core/       pure conversion engine — no DOM, no browser APIs
src/browser/    content script, input/contenteditable adapters, site policy, background worker
src/popup/      toolbar popup (React)
src/options/    settings page (React)
src/shared/     settings model and chrome.storage adapter
tests/unit/     Vitest (fixtures in tests/fixtures/)
tests/integration/  Playwright, loads dist/ into Chromium
docs/           ruleset record and browser behaviour notes
```

## Scripts

| Command | What it does |
|---|---|
| `npm test` | unit tests (core, settings, site policy) |
| `npm run build` | production build to `dist/` |
| `npm run test:e2e` | integration tests against `dist/` (build first) |
| `npm run test:all` | unit → build → integration |
| `npm run typecheck` | strict TypeScript check |

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
