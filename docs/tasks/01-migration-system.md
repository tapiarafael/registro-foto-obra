# Task 01: Formal Migration System

**Priority:** High (foundation)  
**Effort:** 1–2 days  
**Risk:** Low  
**Status:** Done (v3 via `db/migrations/manifest.ts`)  
**Recommended order:** 1st (before `captured_date` and other schema changes)

## Problem

Schema changes live inline in `_init()` inside `db/database.ts`, plus ad-hoc checks like:

```typescript
const photoColumns = await db.getAllAsync('PRAGMA table_info(photo)');
if (!hasWatermarkVersion) { await db.execAsync('ALTER TABLE ...'); }
```

This pattern does not scale. Each new column or index needs another fragile check. There is no version tracking, no audit trail, and no clear convention for testing upgrades on existing devices.

## Goal

Introduce a `user_version`-based migration runner with versioned SQL files so every schema change is explicit, ordered, and testable.

## Plan

### Step 1 — Create folder structure

```
db/
  migrations/
    001_initial.sql
    README.md
  migrate.ts
```

### Step 2 — Implement `runMigrations(db)`

1. Read current version: `PRAGMA user_version`
2. List migration files sorted by numeric prefix
3. For each file where `version > user_version`:
   - Execute SQL inside a transaction
   - `PRAGMA user_version = N`
4. Log migration name on success; roll back and throw on failure

### Step 3 — Move existing schema into `001_initial.sql`

- Extract DDL from `_init()` (tables, indexes, seeds for `unit_type`)
- Keep `CREATE TABLE IF NOT EXISTS` for fresh installs
- `_init()` becomes: PRAGMA setup → `runMigrations()` → connection ready

### Step 4 — Document conventions (`db/migrations/README.md`)

- One migration per logical change; never edit shipped migrations
- Naming: `NNN_description.sql` (e.g. `002_captured_date.sql`)
- Test on Android: fresh install + upgrade from previous app version

### Step 5 — Wire into `getDatabase()`

- Call `runMigrations` once during `_init`, before any queries run
- Remove inline `PRAGMA table_info` migration for `watermark_version` (fold into `002` or keep in `001` if already shipped)

## Files to touch

| File | Action |
|------|--------|
| `db/database.ts` | Slim down `_init`, call `runMigrations` |
| `db/migrate.ts` | New — migration runner |
| `db/migrations/001_initial.sql` | New — current schema |
| `db/migrations/README.md` | New — conventions |

## Acceptance criteria

- [ ] Fresh install creates full schema at `user_version = 1`
- [ ] Existing DB with data upgrades without data loss
- [ ] Failed migration rolls back and surfaces a clear error
- [ ] `pnpm typecheck` passes
- [ ] Manual test on Android: install old build → upgrade → verify data intact

## Dependencies

- None (this unblocks all other schema work)

## Enables

- `captured_date` column (Task 02)
- New indexes on existing DBs
- `UNIQUE` constraint on `photo_group`
- `ON DELETE CASCADE` FK changes

## Notes

- `expo-sqlite` supports `PRAGMA user_version` and `execAsync` inside transactions
- Consider exporting `getSchemaVersion()` for debug/settings screen later
