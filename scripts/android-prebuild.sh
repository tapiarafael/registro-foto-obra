#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=android-env.sh
source "$ROOT/scripts/android-env.sh"

cd "$ROOT"
CLEAN="${1:-}"

if [ "$CLEAN" = "--clean" ]; then
  pnpm exec expo prebuild --platform android --clean
else
  pnpm exec expo prebuild --platform android
fi
