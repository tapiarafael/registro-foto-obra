# Refactor Tasks

Individual implementation plans for larger improvements identified during the database and app review (June 2026).

## Recommended order

| Order | Task | File | Effort | Primary benefit |
|-------|------|------|--------|-----------------|
| 1 | Formal migration system | [01-migration-system.md](./01-migration-system.md) | 1–2d | Safe schema changes |
| 2 | `captured_date` column | [02-captured-date.md](./02-captured-date.md) | 2–3d | Query performance at scale |
| 3 | Clone batching + progress | [05-clone-batching.md](./05-clone-batching.md) | 2–3d | UX + data integrity |
| 4 | Test suite | [06-test-suite.md](./06-test-suite.md) | 2–4d | Regression prevention |
| 5 | PDF streaming | [04-pdf-streaming.md](./04-pdf-streaming.md) | 3–5d | Large export stability |
| 6 | ZIP memory fix | [08-zip-memory-fix.md](./08-zip-memory-fix.md) | 2–4d | Large ZIP export stability |
| — | Split `database.ts` | [03-split-database.md](./03-split-database.md) | 1–2d | Maintainability (anytime) |
| — | Quarantine artifacts | [07-quarantine-artifacts.md](./07-quarantine-artifacts.md) | 0.5d | Dev hygiene (anytime) |

## Quick wins (completed)

Lite queries, indexes, transactional deletes, context dashboard refresh, ZIP concurrency, and related UI changes were implemented in the first optimization batch.

## How to use these docs

1. Read the task file before starting implementation
2. Check **Dependencies** — some tasks block others
3. Use **Acceptance criteria** as a PR checklist
4. Update the task file with notes / decisions when done

## Decision guide

| If you need… | Start with |
|--------------|------------|
| App fast with 5k+ photos | 01 → 02 |
| Clone/setup not freezing UI | 05 |
| Safer SQL changes going forward | 01 → 06 |
| Large PDF exports without OOM | 04 (done — pdf-lib) |
| Large ZIP exports without OOM | 08 |
| Cleaner codebase navigation | 03 or 07 |
