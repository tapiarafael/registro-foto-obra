# Task 09: `photo_group` UNIQUE Constraint

**Priority:** Medium (data integrity)  
**Effort:** 0.5–1 day  
**Risk:** Low–medium (migration on existing DBs)  
**Status:** Pending  
**Recommended order:** After Task 06 (tests) or alongside next schema change

## Problem

`getOrCreatePhotoGroup` selects then inserts on `(inspection_session_id, unit_id, service_id)` with no uniqueness guarantee:

```sql
SELECT * FROM photo_group WHERE inspection_session_id=? AND unit_id=? AND service_id=?
-- then INSERT if missing
```

Concurrent capture or rapid taps can create duplicate groups for the same session/unit/service. Photos split across groups break counts and exports.

Task 01 noted this as a follow-up; it was never shipped.

## Goal

Add a `UNIQUE` index on `(inspection_session_id, unit_id, service_id)` and make `getOrCreatePhotoGroup` safe under concurrency.

## Plan

### Step 1 — Migration `004_photo_group_unique.sql`

1. Deduplicate existing rows (keep lowest `id` per triple; reassign `photo.photo_group_id` from duplicates)
2. `CREATE UNIQUE INDEX idx_photo_group_session_unit_service ON photo_group(inspection_session_id, unit_id, service_id)`

### Step 2 — Harden `getOrCreatePhotoGroup`

Use insert-or-ignore / catch `UNIQUE` violation and re-select, or a single upsert pattern supported by expo-sqlite.

### Step 3 — Tests

Cover in Task 06: concurrent calls return same id; no duplicate rows after migration.

## Files to touch

| File | Action |
|------|--------|
| `db/migrations/004_photo_group_unique.sql` | New |
| `db/migrations/manifest.ts` | Register v4 |
| `db/database.ts` | `getOrCreatePhotoGroup` |
| `tests/db/photo-group.test.ts` | New (with Task 06) |

## Acceptance criteria

- [ ] Migration deduplicates legacy data without photo loss
- [ ] Fresh install has UNIQUE index at `user_version = 4`
- [ ] `getOrCreatePhotoGroup` is idempotent under repeated calls
- [ ] `pnpm typecheck` passes
- [ ] Manual Android test: rapid double-tap capture does not split groups

## Dependencies

- **Task 01** (done)
- **Task 06** strongly recommended before or with this change

## Impact

| Scenario | Effect |
|----------|--------|
| Normal single capture | None |
| Race / double-tap | **High** — prevents split groups and wrong counts |
