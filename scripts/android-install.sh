#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=android-env.sh
source "$ROOT/scripts/android-env.sh"

VARIANT="${1:-debug}"
VARIANT_LC="$(echo "$VARIANT" | tr '[:upper:]' '[:lower:]')"

case "$VARIANT_LC" in
  debug) OUT_DIR="debug" ;;
  release) OUT_DIR="release" ;;
  *)
    echo "Usage: $0 [debug|release]"
    exit 1
    ;;
esac

APK="$ROOT/android/app/build/outputs/apk/$OUT_DIR/app-$OUT_DIR.apk"

if [ ! -f "$APK" ]; then
  echo "APK not found. Building first..."
  "$ROOT/scripts/android-apk.sh" "$VARIANT_LC"
fi

"$ANDROID_HOME/platform-tools/adb" install -r "$APK"
