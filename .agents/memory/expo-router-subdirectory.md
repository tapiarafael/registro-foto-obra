---
name: expo-router subdirectory without _layout
description: Why bare subdirectories in app/ without _layout.tsx cause silent Android crashes in expo-router v6
---

## Rule
All push-stack screens in the `app/` directory must be flat siblings (e.g. `app/marca-dagua.tsx`), NOT in nested subdirectories unless a `_layout.tsx` is present in that subdirectory.

**Why:** In expo-router v6 (Expo SDK 54), a directory like `app/configuracoes/` without `app/configuracoes/_layout.tsx` causes a route initialization failure that silently kills the Android app before any error boundary can catch it. TypeScript typechecks pass and the Metro bundle succeeds, so the crash is invisible until runtime on device.

**How to apply:** When adding new stack screens, place them at `app/<screen-name>.tsx` and register as `<Stack.Screen name="<screen-name>">` in the root `_layout.tsx`. This matches the established pattern: `armazenamento`, `obra`, `relatorio-config`, `marca-dagua` are all flat at root level.
