#!/bin/sh
# Signs the built .app with a stable identity so macOS keeps the Accessibility
# grant across rebuilds (ad-hoc signatures change on every build and TCC then
# silently stops trusting the app). Usage:
#   APPLE_SIGNING_IDENTITY="Apple Development: you@example.com (TEAMID)" scripts/sign-mac.sh
# or with the certificate's SHA-1 hash from `security find-identity -v -p codesigning`.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/target/release/bundle/macos/Özyoz.app"
[ -d "$APP" ] || { echo "build the app first: cd desktop && npm run tauri build -- --bundles app"; exit 1; }
[ -n "$APPLE_SIGNING_IDENTITY" ] || { echo "set APPLE_SIGNING_IDENTITY"; exit 1; }
codesign --force --deep --sign "$APPLE_SIGNING_IDENTITY" --identifier uz.ozyoz.desktop "$APP"
codesign -dvv "$APP" 2>&1 | grep -E "^Identifier|^Authority" | head -2
