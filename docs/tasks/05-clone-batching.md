# Task 05: Batch Clone/Duplicate + Transactions + Progress

**Priority:** High (UX + data integrity)  
**Effort:** 2–3 days  
**Risk:** Medium  
**Status:** Done  
**Recommended order:** 3rd (after migration + dates, or 2nd if clone UX is urgent)

## Problem

Structure clone/duplicate operations in `db/database.ts`:

| Function | Issues |
|----------|--------|
| `cloneBlock` | Nested loops, **no transaction**, UI blocks with no progress |
| `duplicateBuilding` | Nested loops, no transaction |
| `duplicateFloor` | Unit loop, no transaction |
| `bulkCreateStructure` | Has transaction ✓ but still row-by-row INSERT |

Each INSERT also runs `SELECT MAX(sort_order)` — 2 queries per row in some paths.

**User impact:** Cloning a large quadra (many prédios × pavimentos × unidades) freezes `estrutura/quadras.tsx` with no feedback. Mid-failure leaves partial structure in DB.

## Goal

1. Wrap all multi-table clone operations in `withTransactionAsync`
2. Batch INSERTs where possible
3. Expose `onProgress` callbacks
4. Show progress in UI (reuse `ProgressModal` from relatórios)

## Plan

### Step 1 — Add transactions

Wrap in `withTransactionAsync`:

- `cloneBlock`
- `duplicateBuilding`
- `duplicateFloor`

On error: full rollback, rethrow with PT-BR message.

### Step 2 — Batch INSERTs

**Per floor (units):**

```sql
INSERT INTO unit (floor_id, unit_type_id, name, sort_order) VALUES
  (?, ?, ?, ?),
  (?, ?, ?, ?),
  ...
```

**Per building (floors + units):** collect all units for a floor, single multi-row insert.

**cloneBlock:** pre-fetch full tree in 4 queries (buildings, floors, units grouped by parent), then insert in transaction with batches.

### Step 3 — Deduplicate `MAX(sort_order)`

One `SELECT MAX(sort_order)` per parent entity, not per child row.

### Step 4 — Progress callbacks

```typescript
export async function cloneBlock(
  sourceId: number,
  projectId: number,
  newName: string,
  onProgress?: (current: number, total: number) => void,
): Promise<number>
```

- `total` = count of INSERT operations (or buildings + floors + units)
- Call `onProgress` after each batch
- Optionally `await new Promise(r => setImmediate(r))` every N rows to yield UI thread

### Step 5 — Wire UI

| Screen | Function | UI |
|--------|----------|-----|
| `app/estrutura/quadras.tsx` | `cloneBlock` | `ProgressModal` + disable actions |
| `app/estrutura/predios.tsx` | `duplicateBuilding` | Same pattern |
| `app/estrutura/pavimentos.tsx` | `duplicateFloor` / `cloneFloor` | Same if used |

Reuse `handleProgress` pattern from `app/(tabs)/relatorios.tsx`.

### Step 6 — Stats queries

Merge `getBlockCloneStats` / `getBuildingCloneStats` / `getFloorCloneStats` into single queries with conditional aggregation (optional cleanup).

## Files to touch

| File | Action |
|------|--------|
| `db/database.ts` | Transactions, batching, progress params |
| `app/estrutura/quadras.tsx` | Progress modal during clone |
| `app/estrutura/predios.tsx` | Progress modal during duplicate |
| `components/ProgressModal.tsx` | Optional: generic label prop |

## Acceptance criteria

- [ ] `cloneBlock` is atomic — failure leaves no partial quadra
- [ ] `duplicateBuilding` is atomic
- [ ] UI shows progress during large clone
- [ ] Clone 20+ floors × 10 units completes without ANR (test on device)
- [ ] `pnpm typecheck` passes

## Dependencies

- None strictly required
- **Task 01** helps if schema changes needed during refactor

## Impact

| Scenario | Effect |
|----------|--------|
| Small structure (1 prédio, 5 pavimentos) | Minor |
| Large quadra clone | **High** — visible UX + integrity |
| Gerador bulk create | Medium — already transactional |

## Test scenarios

1. Clone quadra with 3 prédios, 10 floors each, 8 units each
2. Kill app mid-clone (simulate) — verify rollback
3. Duplicate prédio into another quadra — verify names and sort_order
