# Task 12: Batch `bulkCreateStructure` Inserts

**Priority:** Low–medium (UX on large setups)  
**Effort:** 0.5–1 day  
**Risk:** Low  
**Status:** Pending  
**Recommended order:** After Task 05 (optional follow-up)

## Problem

`bulkCreateStructure` in `db/database.ts` runs inside a transaction but inserts floors and units **row-by-row**:

```typescript
for (const floor of floors) {
  INSERT floor;
  for (const unit of unitsPerFloor) {
    INSERT unit;
  }
}
```

The Gerador de estrutura screen can create many pavimentos × unidades in one action. Large configs cause a long freeze with no progress (unlike `cloneBlock`, which now has batching + `ProgressModal`).

## Goal

Reuse Task 05 patterns: `batchInsertUnits`, optional `onProgress`, yield to UI thread for large trees.

## Plan

### Step 1 — Batch unit inserts per floor

Call existing `batchInsertUnits(db, floorId, units)` instead of per-row `runAsync`.

### Step 2 — Optional progress

Add `onProgress?: CloneProgressCallback` to `bulkCreateStructure`; wire `ProgressModal` in `app/estrutura/gerador.tsx` when total rows &gt; threshold (e.g. 50).

### Step 3 — Precompute `sort_order`

One `MAX(sort_order)` per building before the loop (floors already pass explicit `sort_order` from UI — verify Gerador supplies it).

## Files to touch

| File | Action |
|------|--------|
| `db/database.ts` | `bulkCreateStructure` |
| `app/estrutura/gerador.tsx` | Progress modal (optional) |

## Acceptance criteria

- [ ] Gerador with 20 floors × 10 units completes without ANR
- [ ] Operation remains atomic (transaction)
- [ ] `pnpm typecheck` passes

## Dependencies

- **Task 05** (done) — reuse `batchInsertUnits` / progress helpers

## Impact

| Scenario | Effect |
|----------|--------|
| Small gerador (1 prédio, few floors) | Minor |
| Large bulk create | **Medium** — faster, optional progress |
