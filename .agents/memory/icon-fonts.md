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
