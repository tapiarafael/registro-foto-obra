# Task 03: Split `db/database.ts`

**Priority:** Medium (maintainability)  
**Effort:** 1–2 days  
**Risk:** Low  
**Status:** Pending  
**Recommended order:** 4th or parallel with Task 01 (optional early)

## Problem

`db/database.ts` is ~1,030 lines combining:

- TypeScript interfaces
- Connection singleton
- Schema init / migrations
- 50+ query functions across project, structure, photos, history, storage, clone

Hard to navigate, review, and extend. Every DB change touches one massive file.

## Goal

Split into focused modules while preserving the public API (`import { ... } from '@/db/database'`).

## Target structure

```
db/
  connection.ts       # getDatabase, _init, runMigrations
  types.ts            # Block, Building, Photo, DateSummary, etc.
  migrate.ts          # runMigrations (if Task 01 done)
  migrations/         # SQL files (Task 01)
  queries/
    project.ts
    structure.ts      # blocks, buildings, floors, units, services, unit types
    sessions.ts       # inspection_session, photo_group
    photos.ts         # photo CRUD, watermark config
    history.ts        # getDateSummaries, *ForDate queries
    storage.ts        # getStorageStats, deletePhotosByDate
    clone.ts          # cloneBlock, duplicateBuilding, bulkCreateStructure
  index.ts            # re-exports everything
  database.ts         # thin barrel: export * from './index' (backward compat)
```

## Plan

### Phase 1 — Extract types and connection (no behavior change)

1. Move interfaces to `db/types.ts`
2. Move `getDatabase`, `_init` to `db/connection.ts`
3. `database.ts` re-exports from both

### Phase 2 — Extract query modules one domain at a time

Order (lowest coupling first):

1. `project.ts`
2. `structure.ts`
3. `sessions.ts` + `photos.ts`
4. `history.ts` + `storage.ts`
5. `clone.ts`

After each extraction: `pnpm typecheck`

### Phase 3 — Final barrel

`db/index.ts` exports all public functions. `db/database.ts`:

```typescript
export * from './index';
```

## Files to touch

| File | Action |
|------|--------|
| `db/database.ts` | Becomes thin re-export |
| `db/types.ts` | New |
| `db/connection.ts` | New |
| `db/queries/*.ts` | New (6 files) |
| `db/index.ts` | New |

## Acceptance criteria

- [ ] No import path changes required in `app/`, `services/`, `context/`
- [ ] `pnpm typecheck` passes
- [ ] No logic changes — pure file move
- [ ] Each query file &lt; 250 lines

## Dependencies

- Optional: do **after Task 01** so `connection.ts` + `migrate.ts` land in the right place from the start
- Can be done **before** Task 02 if you want cleaner files for the `captured_date` work

## Impact

- **User:** None
- **Developer:** Faster reviews, clearer ownership per domain

## Notes

- Do not refactor query logic during the split — move only
- Grep for `@/db/database` imports before starting; all should keep working via barrel
