#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=android-env.sh
source "$ROOT/scripts/android-env.sh"

cd "$ROOT"

if [ ! -d "$ROOT/android" ]; then
  echo "android/ not found — running prebuild first..."
  "$ROOT/scripts/android-prebuild.sh"
fi

pnpm exec expo run:android "$@"
