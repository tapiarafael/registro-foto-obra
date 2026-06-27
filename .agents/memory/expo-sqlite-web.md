---
name: expo-sqlite web bundling & native-only preview
description: Why the web preview hangs/fails for native-feature Expo apps, and the metro wasm fix
---

# expo-sqlite on web & native-only verification

For Expo apps that use expo-sqlite (and camera/print/sharing), the **web preview is not a valid test surface** — verify real behavior on Android via Expo Go.

## Web bundle fails without wasm assetExt
expo-sqlite's web build imports `./wa-sqlite/wa-sqlite.wasm`. Metro does not treat `.wasm` as an asset by default, so the **web bundle fails** with `Unable to resolve "./wa-sqlite/wa-sqlite.wasm"` and the page is stuck on a blank/spinner.
**Fix:** in `metro.config.js`, `config.resolver.assetExts.push("wasm")`.

## SQLite init can still hang on web
Even after the bundle resolves, `openDatabaseAsync` may never settle on web (needs OPFS/COOP-COEP headers the Replit proxy doesn't provide).
**Mitigation used:** guard DB init with a `Promise.race` timeout — **web-only short (2s), native generous (15s)**. A short timeout on native is dangerous: a slow cold-start could falsely report "no project" and re-trigger the setup wizard. Gate with `Platform.OS === 'web'`.

## The app_preview screenshot reloads fresh
The screenshot tool navigates to a fresh page each call and captures within a few seconds, so any multi-second init/timeout will always show the spinner. Don't conclude "broken" from an early screenshot — check the metro bundle log for the real failure instead.

**Why:** these cost real debugging cycles; the root cause is never visible in the browser console (the bundle failure only shows in metro/workflow logs).
