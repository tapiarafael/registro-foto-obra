#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=android-env.sh
source "$ROOT/scripts/android-env.sh"

PROFILE="${1:-}"
case "$PROFILE" in
  preview|production) ;;
  *)
    echo "Usage: $0 [preview|production]"
    exit 1
    ;;
esac

# Expo SDK 54 prebuild crashes on Node 24 (settings.get is not a function).
NVM_SH="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
if [ -s "$NVM_SH" ]; then
  # shellcheck source=/dev/null
  . "$NVM_SH"
  nvm use 22
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -ge 24 ]; then
  echo "Node $(node -v) is too new for local EAS builds. Install Node 22 (nvm install 22)."
  exit 1
fi

cd "$ROOT"
exec eas build --platform android --profile "$PROFILE" --local
