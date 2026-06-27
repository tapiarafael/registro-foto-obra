---
name: vector icon fonts must be preloaded
description: why @expo/vector-icons glyphs render on one device but show as broken boxes on another
---

# Preload @expo/vector-icons fonts in the root layout

Icon glyphs from `@expo/vector-icons` (this app uses `Feather`) can render fine on
one Android device but show as broken/tofu boxes on another.

**Why:** `@expo/vector-icons` lazy-loads its font file at first render. On a fast or
previously-cached device the font is ready in time; on a fresh/slower device the first
screens paint before the font finishes loading, so glyphs are missing. It is a race,
not a per-device bug — "works on my phone" is misleading.

**How to apply:** Preload every icon family used, alongside the app fonts, in the root
`_layout.tsx` `useFonts({ ... })` call by spreading the family's `.font` object, e.g.
`...Feather.font`. `useFonts` already gates render until fonts resolve, so this
guarantees glyphs are available before any screen mounts. If you start using another
family (Ionicons, MaterialIcons, etc.), add its `.font` here too.

## When tofu persists on ONE device but not another (same JS bundle)

If the runtime preload is in place yet glyphs are still boxes on a specific phone
while another phone renders the SAME dev-server bundle fine, the cause is **Expo Go
environment skew on the failing device** (outdated Expo Go whose pre-bundled icon font
mismatches the project's glyph map, or a stale/corrupt font cache) — NOT app code.
Fix on-device: update Expo Go to the latest SDK-54-compatible version, clear its cache
/ app data (or reinstall), then full-reload from the QR (Fast Refresh may not re-run
root font loading).

**Durable fix for field use:** stop relying on Expo Go. Embed the icon TTF natively via
the `expo-font` config plugin (`["expo-font", { "fonts": ["./assets/fonts/Feather.ttf"] }]`)
and ship a dev-client / standalone build — config plugins only apply at prebuild/native
build time, never inside Expo Go. Copy the TTF into `assets/fonts/` and reference THAT
path, not `node_modules/@expo/vector-icons/.../Feather.ttf` (the node_modules path is
brittle across pnpm version bumps).
