# Task 10: CI Pipeline (typecheck + tests)

**Priority:** Medium (dev quality)  
**Effort:** 0.5–1 day  
**Risk:** Very low  
**Status:** Pending  
**Recommended order:** After Task 06 (or in parallel once `pnpm test` exists)

## Problem

There is no GitHub Actions (or other CI) workflow. Regressions in SQL, migrations, and exports are caught only by manual `pnpm typecheck` and device testing.

## Goal

Run automated checks on every push/PR: install, typecheck, and test suite.

## Plan

### Step 1 — Add workflow

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
```

Adjust pnpm version to match lockfile; use `npm` if the project switches package managers.

### Step 2 — Document in root README

Add a “Checks” section: `pnpm typecheck`, `pnpm test`.

### Step 3 — Branch protection (optional)

Require CI green before merge on `main`.

## Files to touch

| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | New |
| `README.md` | CI / local check commands |

## Acceptance criteria

- [ ] PR to `main` runs typecheck
- [ ] PR runs `pnpm test` once Task 06 lands
- [ ] Workflow completes in &lt; 5 minutes
- [ ] Failed migration or SQL test fails the job

## Dependencies

- **Task 06** — `pnpm test` script (CI can ship with typecheck-only first, then add test step)

## Impact

- **User:** None directly
- **Developer:** Catches regressions before merge
