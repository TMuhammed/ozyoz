# Release plan — all channels

Everything below is prepared in this repository. Items marked **you** need an
account, a payment or a manual check that only the owner can do.

## 0. Before anything

- [ ] **you:** push this repo to GitHub as `TMuhammed/ozyoz` (public). `PRIVACY.md` then lives at https://github.com/TMuhammed/ozyoz/blob/main/PRIVACY.md — every store asks for it.
- [ ] **you:** create the Telegram channel for support/feedback and put its link into `src/shared/support.ts` (`telegramUrl`) and `donateUrl` if you want the card published through a link instead of in the app.
- [ ] Run the full check: `npm run test:all && cargo test --workspace`.
- [ ] Bump versions together: `manifest.json`, `package.json`, `desktop/src-tauri/tauri.conf.json`, `desktop/src-tauri/Cargo.toml` (workspace version), Safari Info.plists. Tag `v0.1.0`.

## 1. Chrome Web Store (covers Chrome and Yandex Browser)

1. **you:** developer account at https://chrome.google.com/webstore/devconsole (one-time 5 USD).
2. `npm run package` → upload `release/ozyoz-0.1.0.zip`.
3. Paste texts from `docs/store-listing.md`; upload `store/screenshots/*.png` and `store/logo/promo-440x280.png`.
4. Privacy tab: single purpose, permission justifications and "no data collected" as written in `docs/store-listing.md`; privacy policy URL from step 0.
5. Submit. Review for a new item with `<all_urls>` typically takes 1–3 business days.
6. Yandex Browser users install from the same Chrome Web Store page; nothing else to do.

## 2. Microsoft Edge Add-ons

1. **you:** Partner Center account at https://partner.microsoft.com/dashboard/microsoftedge (free).
2. Upload the same zip, same texts and screenshots. Review up to 7 days.

## 3. Safari (Mac App Store)

1. **you:** Apple Developer Program (99 USD/year).
2. `npm run build:safari`, open `safari/Ozyoz/Ozyoz.xcodeproj`, set your Team on both targets.
3. **you:** test in Safari with "Allow Unsigned Extensions" first (`docs/safari.md`).
4. Product → Archive → Distribute → App Store Connect; fill the listing (same texts, Mac screenshot, privacy URL).
5. App Review for Safari extensions: 1–7 days. Mention local-only processing in the notes.

## 4. Desktop apps

GitHub Releases is the primary channel for all three OSes.

1. **you:** push the repository to GitHub; the workflow `.github/workflows/desktop.yml` builds macOS (universal), Windows (NSIS + MSI) and Linux (deb/rpm/AppImage) on every `v*` tag and creates a draft release.
2. **you (macOS):** for a build users can open without warnings, add the Apple signing secrets listed in the workflow (`APPLE_CERTIFICATE`, …). Without them, the `.dmg` works but requires right-click → Open the first time.
3. **you (Windows):** optional code-signing certificate; unsigned installers trigger a SmartScreen warning. Alternative later: winget manifest.
4. **you:** test the Windows and Linux builds on real machines — they are compile-checked here, not run.
5. Publish the draft release; link it from the Telegram channel and the extension's options page (`repoUrl`).

## 5. Announce

- Telegram channel post with: what it does, install links per platform, the
  22 April 2027 effective date, and the support card/link.
- Ask early users to report sites or apps where conversion misbehaves; add
  them to the default exclusions or the compatibility notes.

## Versions and what ships where

| Artifact | Built by | Path |
|---|---|---|
| Chrome/Edge/Yandex zip | `npm run package` | `release/ozyoz-<version>.zip` |
| Safari project | `npm run build:safari` + Xcode | `safari/Ozyoz/` |
| macOS app/dmg | `cd desktop && npm run tauri build` or CI | `desktop/src-tauri/target/release/bundle/` |
| Windows exe/msi, Linux deb/rpm/AppImage | CI (`desktop.yml`) | GitHub Release assets |
