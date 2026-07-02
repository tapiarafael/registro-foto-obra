# Task 14: Show Schema Version in Settings

**Priority:** Low (support / debug)  
**Effort:** 0.25 day  
**Risk:** Very low  
**Status:** Pending  
**Recommended order:** Anytime

## Problem

`getSchemaVersion()` exists in `db/migrate.ts` but is not visible in the app. When debugging upgrade issues on site, engineers must infer schema state from behavior or logs.

## Goal

Display current `PRAGMA user_version` on an existing settings or about screen (PT-BR), read-only.

## Plan

### Step 1 — Expose version from DB layer

Optional thin wrapper in `db/database.ts`:

```typescript
export async function getAppSchemaVersion(): Promise<number> {
  const db = await getDatabase();
  return getSchemaVersion(db);
}
```

### Step 2 — UI

Add row to settings / armazenamento / about footer:

> Versão do banco de dados: 3

Only show after DB init succeeds.

## Files to touch

| File | Action |
|------|--------|
| `db/database.ts` or `db/migrate.ts` | Export for app use |
| `app/obra.tsx` or settings screen | Display label |

## Acceptance criteria

- [ ] Version matches `MIGRATIONS` latest after upgrade
- [ ] Hidden or de-emphasized (not primary user-facing info)
- [ ] `pnpm typecheck` passes

## Dependencies

- **Task 01** (done)

## Impact

- **User:** None for normal use
- **Support:** Faster diagnosis of migration failures on device
