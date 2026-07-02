#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=android-env.sh
source "$ROOT/scripts/android-env.sh"

ok=0
warn=0
fail=0

pass() { echo "  OK   $1"; ok=$((ok + 1)); }
note() { echo "  WARN $1"; warn=$((warn + 1)); }
die()  { echo "  FAIL $1"; fail=$((fail + 1)); }

echo "Android local build environment"
echo "================================"
echo "ANDROID_HOME=$ANDROID_HOME"
echo "JAVA_HOME=${JAVA_HOME:-<not set>}"
echo

if [ -d "$ANDROID_HOME" ]; then pass "Android SDK directory exists"; else die "Android SDK not found at $ANDROID_HOME"; fi

if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  pass "Java runtime: $("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"
else
  die "Java not found. Install JDK 17+ or open Android Studio once so JBR is available."
fi

if [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
  pass "adb: $($ANDROID_HOME/platform-tools/adb version | head -1)"
else
  die "platform-tools / adb missing. Install via Android Studio SDK Manager."
fi

if [ -d "$ANDROID_HOME/build-tools" ] && [ -n "$(ls -A "$ANDROID_HOME/build-tools" 2>/dev/null)" ]; then
  pass "build-tools: $(ls "$ANDROID_HOME/build-tools" | tr '\n' ' ')"
else
  die "Android SDK Build-Tools not installed."
fi

if [ -d "$ANDROID_HOME/platforms" ] && ls "$ANDROID_HOME/platforms"/android-3* >/dev/null 2>&1; then
  pass "platforms: $(basename -a "$ANDROID_HOME/platforms"/android-* 2>/dev/null | tr '\n' ' ')"
else
  die "Android SDK Platform (API 34+) not installed."
fi

if [ -d "$ANDROID_HOME/ndk" ] && [ -n "$(ls -A "$ANDROID_HOME/ndk" 2>/dev/null)" ]; then
  pass "NDK: $(ls "$ANDROID_HOME/ndk" | tr '\n' ' ')"
else
  note "NDK not found. Some native modules may fail; install NDK in SDK Manager."
fi

if [ -x "$ANDROID_HOME/emulator/emulator" ]; then
  avds="$("$ANDROID_HOME/emulator/emulator" -list-avds 2>/dev/null || true)"
  if [ -n "$avds" ]; then
    pass "Emulator AVDs: $(echo "$avds" | tr '\n' ' ')"
  else
    note "No emulator AVDs configured. You can still use a USB device."
  fi
else
  note "Android emulator not installed."
fi

devices="$("$ANDROID_HOME/platform-tools/adb" devices 2>/dev/null | tail -n +2 | grep -v '^$' || true)"
if [ -n "$devices" ]; then
  pass "Connected device(s):"
  echo "$devices" | sed 's/^/        /'
else
  note "No device/emulator connected right now (adb devices empty)."
fi

if [ -d "$ROOT/android" ]; then
  pass "Native android/ project present"
else
  note "android/ not generated yet. Run: pnpm android:prebuild"
fi

echo
echo "Summary: $ok passed, $warn warnings, $fail failed"
if [ "$fail" -gt 0 ]; then
  echo
  echo "Fix the FAIL items above, then run: pnpm android:check"
  exit 1
fi

echo
echo "Environment looks ready for local Android builds."
