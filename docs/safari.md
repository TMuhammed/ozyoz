# Safari build

Safari runs web extensions only inside a signed macOS app. The Xcode project in
`safari/Ozyoz/` wraps the Safari variant of the extension built into
`dist-safari/`. It was generated with Apple's converter and then adjusted
(bundle identifiers `uz.ozyoz.app` / `uz.ozyoz.app.Extension`, display name
«Özyoz»). The project references `dist-safari/` directly, so rebuilding the web
code does not require regenerating the project.

## Differences from the Chromium build

| | Chromium (`dist/`) | Safari (`dist-safari/`) |
|---|---|---|
| Build | `npm run build` (Vite + CRXJS) | `npm run build:safari` (Vite pages + esbuild IIFE bundles) |
| Background | `service_worker` | `background.scripts` |
| Content script | loader + module chunk | single `content-script.js` |
| Omnibox `uz` keyword, `search` permission | yes | not supported by Safari, omitted |
| Everything else (conversion, popup, options, settings) | identical | identical |

The source is shared; the omnibox code in `background.ts` is guarded by a
runtime check so the same file builds for both targets.

## Run locally (no Apple Developer account needed)

```bash
npm run build:safari
open safari/Ozyoz/Ozyoz.xcodeproj
```

1. In Xcode choose the `Ozyoz` scheme and press Run. The container app
   launches; it only hosts the extension.
2. In Safari: Settings → Advanced → enable **Show features for web developers**.
3. Develop menu → **Allow Unsigned Extensions** (asks for your password; resets
   when Safari quits).
4. Settings → Extensions → enable **Özyoz** and allow it on all websites.

Command-line compile check (unsigned):

```bash
xcodebuild -project safari/Ozyoz/Ozyoz.xcodeproj -scheme Ozyoz -configuration Debug \
  CODE_SIGNING_ALLOWED=NO CODE_SIGN_IDENTITY="" build
```

## Publish to the App Store

1. Apple Developer Program membership (99 USD / year).
2. In Xcode set your Team on both targets (`Ozyoz`, `Ozyoz Extension`); keep
   the bundle identifiers above or change both consistently.
3. Bump `CFBundleShortVersionString` / `CFBundleVersion` in both Info.plists
   to match `manifest.json` `version`.
4. Product → Archive → Distribute App → App Store Connect.
5. In App Store Connect create the app «Özyoz», category Utilities, add the
   screenshots (Safari requires at least one Mac screenshot, 1280×800 works),
   paste the privacy policy URL (same `PRIVACY.md`) and the description from
   `docs/store-listing.md`.
6. Safari extensions go through App Review; mention in the review notes that
   all processing is local and that the extension needs access to all
   websites to convert text in editable fields.

## Known limitations on Safari

- Safari asks the user to grant website access per site or "always on all
  websites"; until granted the content script does not run.
- `execCommand('insertText')` is supported by WebKit; undo behaviour matches
  Chromium in textareas and contenteditable.
- Not verified on iOS/iPadOS (the project is macOS-only).
