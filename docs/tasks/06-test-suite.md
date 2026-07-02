# Task 06: Test Suite for SQL Helpers

**Priority:** Medium–High (long-term quality)  
**Effort:** 2–4 days  
**Risk:** Low  
**Status:** Pending  
**Recommended order:** 4th (after Tasks 01 + 02, before more schema changes)

## Problem

The project has **zero automated tests** (`*.test.ts` / `*.spec.ts` not found). Critical logic is verified only manually:

- Date filtering and today count
- Cascade deletes and transactions
- `getOrCreatePhotoGroup` race/duplicates
- Migration upgrades on existing DBs
- `getDateSummaries` vs `getStorageByDate` consistency

Regressions in SQL are easy to introduce and hard to catch.

## Goal

Add a focused test suite (~20 tests) for the database layer, runnable via `pnpm test` in CI/local.

## Plan

### Step 1 — Choose test runner and SQLite backend

**Recommended:** Vitest + `better-sqlite3` with a thin adapter that mirrors `expo-sqlite` async API used in `db/database.ts`.

Alternative: extract pure SQL functions testable against any SQLite; mock `expo-sqlite` in tests (more brittle).

### Step 2 — Test harness

```
tests/
  db/
    setup.ts          # in-memory DB, run migrations, seed helpers
    migrations.test.ts
    dates.test.ts
    deletes.test.ts
    photo-group.test.ts
    summaries.test.ts
```

`setup.ts` should:

1. Open in-memory SQLite
2. Run migration files (Task 01) or exec schema SQL
3. Expose `getTestDatabase()` injected into query functions OR test via exported API after `getDatabase` mock

### Step 3 — Priority test cases

#### Migrations (`migrations.test.ts`)

- [ ] Fresh DB reaches latest `user_version`
- [ ] DB at v1 upgrades to v2 (`captured_date` backfill)
- [ ] Failed migration rolls back

#### Date logic (`dates.test.ts`)

- [ ] `getTodayPhotoCount` returns correct count for today only
- [ ] Photos at midnight boundary assigned correct `captured_date`
- [ ] `getBlocksForDate` returns only blocks with photos on that date

#### Deletes (`deletes.test.ts`)

- [ ] `deleteBlock` rejects when photos exist
- [ ] `deleteBlock` on empty structure removes all children
- [ ] `deletePhotosByDate` removes photos and orphan groups atomically
- [ ] `deleteBuilding` transaction rolls back on simulated failure

#### Photo groups (`photo-group.test.ts`)

- [ ] `getOrCreatePhotoGroup` returns same id for same (session, unit, service)
- [ ] Concurrent calls do not create duplicates (after UNIQUE index added)

#### Summaries (`summaries.test.ts`)

- [ ] `getPhotoCountsByDate` matches manual count
- [ ] `getDateSummaries` block_count consistent with hierarchy join

### Step 4 — Wire scripts

```json
// package.json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Step 5 — CI (optional)

Add GitHub Actions job: `pnpm install && pnpm typecheck && pnpm test`

## Files to touch

| File | Action |
|------|--------|
| `package.json` | Add vitest, better-sqlite3 dev deps + scripts |
| `vitest.config.ts` | New |
| `tests/db/*.ts` | New test files |
| `db/database.ts` | Optional: injectable DB for testability |

## Acceptance criteria

- [ ] `pnpm test` runs and passes locally
- [ ] At least 15 meaningful tests (not trivial asserts)
- [ ] Migration upgrade path covered
- [ ] Date + delete paths covered
- [ ] Tests run in &lt; 10 seconds total

## Dependencies

- **Task 01** strongly recommended — tests should validate migration runner
- **Task 02** — add date tests when `captured_date` lands

## Impact

- **User:** None directly
- **Developer:** High confidence when changing SQL
- **Prevents:** Silent regressions in histórico, relatórios, armazenamento

## Notes

- Do not aim for 100% coverage initially — focus on SQL invariants
- Consider `expo-sqlite` integration tests on device later (separate from unit tests)
- Mock `expo-file-system` if testing report service separately (out of scope for v1)
