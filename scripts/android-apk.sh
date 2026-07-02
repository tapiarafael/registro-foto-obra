#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=android-env.sh
source "$ROOT/scripts/android-env.sh"

VARIANT="${1:-debug}"
VARIANT_LC="$(echo "$VARIANT" | tr '[:upper:]' '[:lower:]')"

case "$VARIANT_LC" in
  debug) GRADLE_TASK="assembleDebug"; OUT_DIR="debug" ;;
  release) GRADLE_TASK="assembleRelease"; OUT_DIR="release" ;;
  *)
    echo "Usage: $0 [debug|release]"
    exit 1
    ;;
esac

cd "$ROOT"

if [ ! -d "$ROOT/android" ]; then
  echo "android/ not found — running prebuild first..."
  "$ROOT/scripts/android-prebuild.sh"
fi

cd "$ROOT/android"
chmod +x gradlew
./gradlew "$GRADLE_TASK"

APK="$ROOT/android/app/build/outputs/apk/$OUT_DIR/app-$OUT_DIR.apk"
echo
echo "APK built:"
echo "  $APK"
