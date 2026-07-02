# Task 07: Quarantine `artifacts/` and Dead `lib/` Stubs

**Priority:** Low (dev hygiene)  
**Effort:** 0.5 day  
**Risk:** Very low  
**Status:** Pending  
**Recommended order:** Anytime (good filler task)

## Problem

`tsconfig.json` includes all TypeScript in the repo:

```json
"include": ["**/*.ts", "**/*.tsx"]
```

This pulls in:

- **`artifacts/`** — ~168 files (old Replit copies: `mobile/`, `mockup-sandbox/`, `api-server/`)
- **`lib/db/`**, **`lib/api-*`** — Drizzle/API stubs not wired into the running app

Effects:

- Slower / noisier `pnpm typecheck`
- Confusion about which `db/database.ts` is source of truth (`artifacts/mobile/db/` vs root `db/`)
- Duplicate symbols if imports go wrong

The live app lives at repo root: `app/`, `db/`, `services/`, `context/`.

## Goal

Exclude non-app folders from TypeScript compilation and document what `artifacts/` is.

## Plan

### Step 1 — Tighten `tsconfig.json`

```json
{
  "include": [
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.ts",
    "components/**/*.tsx",
    "context/**/*.ts",
    "context/**/*.tsx",
    "db/**/*.ts",
    "services/**/*.ts",
    "hooks/**/*.ts",
    "constants/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "artifacts",
    "lib",
    "scripts"
  ]
}
```

Adjust list to match actual root source folders.

### Step 2 — Add `artifacts/README.md`

```markdown
# Artifacts (archived)

Reference copies from earlier prototyping (Replit). **Not part of the production app.**

Source of truth: repository root (`app/`, `db/`, `services/`).
Do not edit these files for app changes.
```

### Step 3 — Audit `lib/`

```bash
grep -r "from '@/lib" app/ db/ services/ context/
grep -r "from '../lib" .
```

- If unused: add to `exclude` only (no delete yet)
- If dead: delete `lib/db/`, `lib/api-*` in a follow-up PR with team approval

### Step 4 — Verify

```bash
pnpm typecheck
pnpm start  # smoke check Expo still bundles
```

## Files to touch

| File | Action |
|------|--------|
| `tsconfig.json` | Explicit include/exclude |
| `artifacts/README.md` | New |
| `lib/` | Exclude or delete after audit |

## Acceptance criteria

- [ ] `pnpm typecheck` passes
- [ ] `artifacts/` not typechecked
- [ ] Expo app starts and runs on Android
- [ ] README explains artifacts purpose

## Dependencies

- None

## Impact

- **User:** None
- **Developer:** Cleaner typecheck, less confusion

## Optional follow-ups

- Move `artifacts/` to a separate branch or tarball if repo size matters
- Add `.cursorignore` / `.gitignore` patterns if artifacts should not be indexed by AI tools
