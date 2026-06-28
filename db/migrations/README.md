# Database migrations

Schema changes are versioned SQL files applied automatically at app startup via `PRAGMA user_version`.

## Adding a migration

1. Create `NNN_description.sql` with the next sequential number (e.g. `002_captured_date.sql`).
2. Register it in [`manifest.ts`](./manifest.ts).
3. Test on Android: fresh install **and** upgrade from the previous app version.

## Conventions

- **One migration per logical change** — do not batch unrelated schema edits.
- **Never edit shipped migrations** — add a new numbered file instead.
- **Naming:** `NNN_description.sql` where `NNN` is zero-padded (001, 002, …).
- **Idempotency for baseline:** `001_initial.sql` uses `CREATE TABLE IF NOT EXISTS` and conditional seeds; later migrations should assume prior versions ran.
- **Transactions:** Each migration runs inside a transaction; on failure it rolls back and the app throws at startup.

## Current version

| Version | File | Description |
|---------|------|-------------|
| 1 | `001_initial.sql` | Full baseline schema, indexes, unit_type seeds, app_settings |

## Manual Android test checklist

- [ ] **Fresh install:** `PRAGMA user_version` is `1`; all tables exist; unit types seeded.
- [ ] **Upgrade:** Install a build from before the migration system → add project/photos → install new build → data intact; `user_version` is `1`.
- [ ] **Failed migration:** (dev only) Break a migration SQL → app fails with a clear error; DB version unchanged.

## Debug

Use `getSchemaVersion(db)` from [`../migrate.ts`](../migrate.ts) to read the current schema version (e.g. settings screen).
