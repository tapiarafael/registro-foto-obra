# Task 13: Photo File Cleanup Audit

**Priority:** Low–medium (storage integrity)  
**Effort:** 1 day  
**Risk:** Low  
**Status:** Pending  
**Recommended order:** Anytime

## Problem

Photos exist as DB rows plus files under `documentDirectory/photos/` and thumbnails. Not every delete path may remove both files:

| Path | DB delete | File delete |
|------|-----------|-------------|
| Camera undo / delete last | ✓ | ✓ (`deletePhotoFiles`) |
| Armazenamento bulk by date | ✓ | ✓ (`deletePhotoFilesByFilenames`) |
| Structure delete (block/building/floor/unit) | ✓ (if no photos) | N/A when blocked |
| Single photo delete from histórico | ? | ? |
| Failed capture after file write | ? | ? |
| Cached PDF/ZIP under reports dir | Partial | ? |

Orphan files waste device storage; missing files break thumbnails and exports.

## Goal

Document every photo lifecycle path; ensure DB and filesystem stay in sync; optional one-off “reconcile storage” helper for support.

## Plan

### Step 1 — Trace all code paths

Grep for `createPhoto`, `DELETE FROM photo`, `deletePhoto`, `deletePhotoFiles`, structure deletes.

### Step 2 — Fix gaps

Centralize deletion: e.g. `deletePhotoById(id)` that loads row, deletes files, deletes row in transaction.

### Step 3 — Optional maintenance

`reconcilePhotoStorage()` — list files on disk not referenced in `photo` table; list DB rows with missing files (log or settings UI). Dev-only or hidden support action.

### Step 4 — Tests (Task 06)

Delete photo removes both filenames; bulk date delete leaves no orphan groups (already partially covered).

## Files to touch

| File | Action |
|------|--------|
| `db/database.ts` | Centralized delete helper |
| `services/photoService.ts` | Shared file delete |
| `app/(tabs)/historico.tsx` | Use centralized delete if gap found |
| `tests/db/deletes.test.ts` | File cleanup assertions (mock FS) |

## Acceptance criteria

- [ ] Matrix of delete paths documented in this file or code comments
- [ ] No known path leaves orphan JPEGs after intentional delete
- [ ] Report cache files invalidated when photos deleted (verify `deleteGeneratedReportsForDate` / block paths)
- [ ] `pnpm typecheck` passes

## Dependencies

- None (Task 06 helps lock behavior)

## Impact

| Scenario | Effect |
|----------|--------|
| Long-running obra, many deletes | **Medium** — frees storage, fewer broken thumbs |
| Normal use | Low |
