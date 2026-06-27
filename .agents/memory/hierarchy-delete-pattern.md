---
name: hierarchy delete pattern (offline SQLite app)
description: How to delete parent rows in a FK hierarchy without orphaning photo files
---

# Deleting hierarchy rows without orphaning files

The construction-photo app uses a FK hierarchy (block → building → floor → unit → photo_group → photo) with `PRAGMA foreign_keys = ON` and **no** `ON DELETE CASCADE`.

## Rule
Each `deleteX` first **blocks if any descendant photo rows exist** (throws a PT-BR error), then **explicitly deletes the now photo-free descendant rows in dependency order** (photo_group → unit → floor → building → row; deleteBlock also clears `generated_report`).

**Why not `ON DELETE CASCADE`?** Cascade would delete `photo` rows but **not** the image files on disk (`documentDirectory/photos/`), silently orphaning files. The photo-guard means cascade-able rows are always photo-free, so manual descendant deletes are safe and leak nothing. Also, editing `CREATE TABLE` wouldn't migrate existing DBs — manual deletes work regardless of schema version.

**How to apply:** when adding a new level or a new delete path, keep the same shape: guard-on-photos, then delete descendants bottom-up. Never rely on cascade for anything that has a corresponding on-disk file.
