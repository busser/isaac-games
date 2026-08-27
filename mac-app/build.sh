#!/usr/bin/env bash
# Build IsaacGames.app into mac-app/build/.
set -euo pipefail
cd "$(dirname "$0")"

swift build -c release

APP=build/IsaacGames.app
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp .build/release/IsaacGames "$APP/Contents/MacOS/"
cp Info.plist "$APP/Contents/"
codesign --force --sign - "$APP"

echo "Built $APP"
echo "If not done yet, install with: ln -sfn $PWD/$APP /Applications/IsaacGames.app"
