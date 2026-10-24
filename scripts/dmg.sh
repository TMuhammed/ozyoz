#!/bin/sh
# Plain DMG from the built .app (no Finder styling). Usage: scripts/dmg.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/target/release/bundle/macos/Özyoz.app"
[ -d "$APP" ] || { echo "build the app first: cd desktop && npm run tauri build -- --bundles app"; exit 1; }
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$APP/Contents/Info.plist")
ARCH=$(uname -m)
OUT="$ROOT/release/Ozyoz_${VERSION}_${ARCH}.dmg"
STAGE=$(mktemp -d)
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
mkdir -p "$ROOT/release"
hdiutil create -volname "Özyoz" -srcfolder "$STAGE" -ov -format UDZO "$OUT"
rm -rf "$STAGE"
echo "$OUT"
