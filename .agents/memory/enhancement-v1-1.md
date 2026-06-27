---
name: Enhancement v1.1 patterns
description: Key decisions from the gerador rewrite, clone UI, and report-settings feature work.
---

## gerador.tsx (mass generator)
- Zero-validation fix: use `=== ''` checks + explicit `parseInt`; never `|| 1` fallback.
- Per-entity `GenSettings` state (De/Até, prefix, suffix, numberFormat cardinal/ordinal, leadingZeros, minDigits).
- Live preview shows first 3 + last + total count — render synchronously from state, no async.
- Ordinal suffix: º for default, ª togglable per entity.

## Clone modal pattern (all 4 hierarchy levels)
- Structure screens (quadras/predios/pavimentos/unidades) open a Modal (not CrudList modal) with a TextInput + stats row.
- Stats loaded async after modal opens; show ActivityIndicator while null.
- DB functions: `cloneBlock`, `cloneFloor` (wrappers), `cloneUnit` (new); `duplicateBuilding`/`duplicateFloor` already existed.
- Stats queries: `getBlockCloneStats`, `getBuildingCloneStats`, `getFloorCloneStats`.
- CrudList `onDuplicate?: (item: T) => void` — optional; renders copy icon only when provided.

## app_settings table
- Added to `_init` as a separate `execAsync` after the unit_type seed block.
- Schema: `key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT ''`.
- `getAppSetting(key)` / `setAppSetting(key, value)` — INSERT OR REPLACE pattern.
- Report settings keys: `report_primaryColor`, `report_paginationMode`, `report_logoPath`, `report_groupingFields`.

## relatorio-config.tsx
- `report_groupingFields` stored as JSON array of `{field, enabled}` objects (all 4 always stored, order preserved).
- reportService reads `enabled` flags + order; falls back to DEFAULT_GROUPING if missing/invalid.
- Logo copied to `documentDirectory/report_logo.jpg` via FileSystem.copyAsync; path stored in settings.
- `expo-image-picker` v17.0.9 is installed; use `requestMediaLibraryPermissionsAsync` before launch.
- Color presets: 7 values; custom hex validated with `/^#[0-9A-Fa-f]{6}$/`; committed on blur/submit.

## reportService.ts grouping
- `renderGroupedHTML` recurses over enabled groupFields; groups by field value, sorts by field sort_order.
- `PhotoWithHierarchy` extended with optional `building_sort/floor_sort/unit_sort/service_sort` fields.
- Pre-loads ALL photo base64 into a `Map<filename, b64>` before building HTML (one pass, efficient).
- Pagination CSS uses `@page { @bottom-center { content: ... } }` — 'none'/'current'/'current_total'.
