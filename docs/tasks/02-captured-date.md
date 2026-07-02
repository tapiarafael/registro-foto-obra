# Task 02: `captured_date` Column + Rewrite Date Filters

**Priority:** High (performance at scale)  
**Effort:** 2–3 days  
**Risk:** Medium  
**Status:** Done (`002_captured_date.sql`)  
**Recommended order:** 2nd (after Task 01 — Migration System)

## Problem

13 queries in `db/database.ts` filter photos using:

```sql
date(p.captured_at, 'localtime') = ?
```

SQLite cannot use `idx_photo_captured` when the column is wrapped in `date()`. As photo count grows, these queries become full table scans affecting:

- Home screen today count (`getTodayPhotoCount`)
- History drill-down (`get*ForDate`)
- Reports (`getPhotosForReport`, `getDateSummaries`)
- Storage screen (`getStorageByDate`, `deletePhotosByDate`)

## Goal

Store a precomputed `captured_date` (local calendar date as `TEXT 'YYYY-MM-DD'`) on each photo, index it, and rewrite all date filters to use equality on that column.

## Plan

### Step 1 — Migration `002_captured_date.sql`

```sql
ALTER TABLE photo ADD COLUMN captured_date TEXT;
UPDATE photo SET captured_date = date(captured_at, 'localtime') WHERE captured_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_photo_captured_date ON photo(captured_date);
```

Optional: add `NOT NULL` after backfill if all rows are populated.

### Step 2 — Set `captured_date` on INSERT

In the photo capture path (`app/registrar/camera.tsx` → `createPhoto` or equivalent in `db/database.ts`):

- Compute `captured_date` from `captured_at` at insert time using the same local timezone rule
- Or use a shared helper: `toLocalDateString(iso: string): string`

### Step 3 — Rewrite queries (13 occurrences)

Replace patterns like:

```sql
WHERE date(p.captured_at,'localtime') = ?
```

With:

```sql
WHERE p.captured_date = ?
```

**Functions to update:**

| Function | File area |
|----------|-----------|
| `getTodayPhotoCount` | `db/database.ts` |
| `getPhotoCountsByDate` | `db/database.ts` |
| `getBlocksForDate` | `db/database.ts` |
| `getBuildingsForDate` | `db/database.ts` |
| `getFloorsForDate` | `db/database.ts` |
| `getUnitsForDate` | `db/database.ts` |
| `getServicesForDateUnit` | `db/database.ts` |
| `getPhotosForDateUnitService` | `db/database.ts` |
| `getPhotosForReport` | `db/database.ts` |
| `getBlockPhotoCountForDate` | `db/database.ts` |
| `getStorageStats` (MIN/MAX date) | `db/database.ts` |
| `deletePhotosByDate` | `db/database.ts` |

For `getTodayPhotoCount`, pass today's date string or use:

```sql
WHERE captured_date = date('now', 'localtime')
```

### Step 4 — Verify index usage (optional)

Run `EXPLAIN QUERY PLAN` on device or in tests for `getTodayPhotoCount` and `getPhotosForReport`.

### Step 5 — Smoke tests

| Flow | Expected |
|------|----------|
| Capture photo → home count | Increments correctly |
| Delete photo → return home | Count reconciles via `refreshDashboard` |
| Histórico by date | Same dates as before migration |
| Relatórios export | Same photo set for block+date |
| Armazenamento bulk delete | Deletes correct date bucket |

## Files to touch

| File | Action |
|------|--------|
| `db/migrations/002_captured_date.sql` | New |
| `db/database.ts` | Rewrite date filters; update INSERT |
| `services/photoService.ts` | Optional: `toLocalDateString` helper |

## Acceptance criteria

- [ ] Migration backfills all existing photos
- [ ] New photos get `captured_date` on insert
- [ ] All 13 date-filter sites use `captured_date`
- [ ] `idx_photo_captured_date` exists
- [ ] No behavior change for normal data (same photos per date)
- [ ] `pnpm typecheck` passes
- [ ] Manual Android test: upgrade from pre-migration DB

## Dependencies

- **Task 01** (Migration System) — strongly recommended

## Impact

| Scale | Effect |
|-------|--------|
| &lt; 1k photos | Minor — may not be noticeable |
| 5k+ photos | Major — today count, history, reports stay fast |

## Alternative considered

Datetime range query without new column:

```sql
WHERE captured_at >= datetime('now','localtime','start of day')
  AND captured_at < datetime('now','localtime','start of day','+1 day')
```

Uses existing index but is harder to maintain for arbitrary date params. Stored `captured_date` is simpler for this app's query patterns.
