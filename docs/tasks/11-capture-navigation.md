# Task 11: Consistent Capture / Histórico Navigation

**Priority:** Medium (UX)  
**Effort:** 0.5–1 day  
**Risk:** Very low  
**Status:** In progress  
**Recommended order:** Anytime (polish)

## Problem

The registrar capture flow is deep (Quadra → Prédio → … → Câmera). Users need a reliable way to go **back one level** or **home to tabs** without relying only on the system back stack.

Partial work exists but is not rolled out everywhere:

- `components/HierarchyNavBar.tsx` — Voltar + Início row
- `hooks/useRegistrarHome.ts` — resets capture nav + `router.replace('/(tabs)')`
- Wired in `app/(tabs)/historico.tsx` and `app/registrar/camera.tsx`
- `app/registrar/_layout.tsx` — header home button on stack screens

Other `registrar/*` and `estrutura/*` screens may still lack consistent controls.

## Goal

Same navigation pattern across capture and history drill-down: back one level, home to dashboard, accessible labels in PT-BR.

## Plan

### Step 1 — Audit screens

List all routes under `app/registrar/` and history steps in `historico.tsx`. Mark which need `HierarchyNavBar` or stack header home.

### Step 2 — Standardize

- Registrar list screens: use stack `headerRight` home (via `_layout`) + native back
- Histórico drill-down levels: `HierarchyNavBar` at top (already started)
- Camera: keep `useRegistrarHome` for in-flow actions

### Step 3 — Avoid duplicate controls

If `_layout` provides header home, do not also show a second home button in body unless design requires it on full-screen steps (e.g. camera).

## Files to touch

| File | Action |
|------|--------|
| `components/HierarchyNavBar.tsx` | Finish / tweak if needed |
| `hooks/useRegistrarHome.ts` | Reuse across screens |
| `app/registrar/_layout.tsx` | Header options per screen |
| `app/(tabs)/historico.tsx` | Complete all drill-down levels |
| `app/registrar/*.tsx` | Wire home/back where missing |

## Acceptance criteria

- [ ] Every capture step has visible Voltar or stack back
- [ ] Every capture step can return to `(tabs)` in one action
- [ ] Histórico drill-down matches registrar hierarchy UX
- [ ] Touch targets ≥ 48dp; accessibility labels in PT-BR
- [ ] `pnpm typecheck` passes

## Dependencies

- None

## Impact

| Scenario | Effect |
|----------|--------|
| Daily field use | **Medium** — less confusion exiting deep flows |
| New users | **High** — clearer way out of capture |
