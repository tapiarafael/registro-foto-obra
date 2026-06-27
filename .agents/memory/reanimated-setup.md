---
name: reanimated v4 setup & animation conventions
description: How react-native-reanimated v4 is wired in artifacts/mobile and the app's navigation/UI animation conventions.
---

# Reanimated v4 in artifacts/mobile

The app uses `react-native-reanimated` v4 + `react-native-worklets` on Expo SDK 54 (New Architecture).

**Do NOT add the reanimated/worklets babel plugin to `babel.config.js`.** `babel-preset-expo` (SDK 54) already wires the worklets plugin automatically. The config intentionally only sets `babel-preset-expo` with `unstable_transformImportMeta`. Adding the legacy `react-native-reanimated/plugin` will break v4.

**Why:** v4 moved worklet transformation into `react-native-worklets`, which `babel-preset-expo` invokes. A future agent seeing no reanimated plugin may wrongly "fix" it.

## Animation conventions in use
- Navigation: expo-router native-stack uses `animation: 'slide_from_right'` for push stacks (registrar/estrutura), `fade` for `(tabs)`/`setup`, `fade_from_bottom` for the camera (modal-like). Bottom tabs use `animation: 'shift'`.
- `components/LoadingScreen.tsx` — branded animated loader (pulsing circle + expanding ring via `withRepeat`/`withSequence`); used for the app-init gate in `app/_layout.tsx`.
- `HierarchyCard` is an `Animated.createAnimatedComponent(Pressable)` with scale-on-press (`useSharedValue` + `withTiming`), `FadeIn` entrance, and `LinearTransition` layout. It renders inside FlatLists that refetch on focus, so entrance can replay — acceptable for the app's small hierarchy lists; revisit (gate by count) only if a list grows large.

**How to apply:** reuse these patterns for new screens/components rather than introducing a second animation approach; keep press targets ≥48dp and theme colors from `constants/colors`.
