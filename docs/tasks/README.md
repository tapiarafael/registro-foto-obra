# Refactor Tasks

Individual implementation plans for improvements identified during the database and app review (June 2026).  
**Last updated:** June 2026 — status reflects current codebase.

## Status overview

### Completed

| Task | File | Notes |
|------|------|-------|
| Formal migration system | [01-migration-system.md](./01-migration-system.md) | `db/migrate.ts`, `db/migrations/*`, `user_version` at startup |
| `captured_date` column | [02-captured-date.md](./02-captured-date.md) | Migration `002`, all date filters rewritten |
| Clone batching + progress | [05-clone-batching.md](./05-clone-batching.md) | Transactions, `batchInsertUnits`, `ProgressModal` on estrutura screens |
| PDF export (pdf-lib) | [04-pdf-streaming.md](./04-pdf-streaming.md) | `services/pdfReportBuilder.ts` — sequential embed, no HTML/base64 Map |
| Report disk cache | — | Migration `003_report_cache.sql`; `getOrGeneratePDF` / `getOrGenerateZIP` |
| Quick wins batch | — | Lite queries, indexes, transactional deletes, dashboard refresh |

### Pending (documented)

| Priority | Task | File | Effort | Primary benefit |
|----------|------|------|--------|-----------------|
| **High** | ZIP memory fix | [08-zip-memory-fix.md](./08-zip-memory-fix.md) | 2–4d | Large ZIP export stability (main user-facing gap) |
| **High** | Test suite | [06-test-suite.md](./06-test-suite.md) | 2–4d | Regression prevention (migrations, SQL) |
| Medium | Export warnings + ZIP OOM messages | [04](./04-pdf-streaming.md) Phase A, [08](./08-zip-memory-fix.md) Phase A | 0.5d | Safer large exports before ZIP rewrite ships |
| Medium | `photo_group` UNIQUE | [09-photo-group-unique.md](./09-photo-group-unique.md) | 0.5–1d | Data integrity under concurrent capture |
| Medium | Capture / histórico navigation | [11-capture-navigation.md](./11-capture-navigation.md) | 0.5–1d | Consistent Voltar / Início (in progress) |
| Medium | CI pipeline | [10-ci-pipeline.md](./10-ci-pipeline.md) | 0.5–1d | Automated typecheck + test on PR |
| Low–medium | Photo file cleanup audit | [13-orphan-file-audit.md](./13-orphan-file-audit.md) | 1d | Storage integrity after deletes |
| Low–medium | Gerador batch inserts | [12-bulk-structure-batching.md](./12-bulk-structure-batching.md) | 0.5–1d | Large structure generator UX |
| Low | Split `database.ts` | [03-split-database.md](./03-split-database.md) | 1–2d | Maintainability (~1,140 lines today) |
| Low | Quarantine artifacts | [07-quarantine-artifacts.md](./07-quarantine-artifacts.md) | 0.5d | Faster typecheck, less confusion |
| Low | Schema version in settings | [14-schema-version-settings.md](./14-schema-version-settings.md) | 0.25d | Support / debug on device |

## Recommended order (remaining work)

| Order | Task | Why |
|-------|------|-----|
| 1 | [08 — ZIP memory fix](./08-zip-memory-fix.md) | PDF is fixed; ZIP still OOMs on 50–160 full-res photos |
| 2 | [06 — Test suite](./06-test-suite.md) | Safe to change SQL/migrations; unlocks 09 and CI |
| 3 | [04/08 Phase A](./04-pdf-streaming.md) | Quick warnings + ZIP OOM copy (~half day) |
| 4 | [09 — photo_group UNIQUE](./09-photo-group-unique.md) | Small schema change, real integrity win |
| 5 | [11 — Capture navigation](./11-capture-navigation.md) | Finish WIP (`HierarchyNavBar`, `useRegistrarHome`) |
| 6 | [10 — CI](./10-ci-pipeline.md) | After `pnpm test` exists |
| — | [07](./07-quarantine-artifacts.md), [03](./03-split-database.md), [12–14](./12-bulk-structure-batching.md) | Anytime / filler |

## Task index

| # | Task | Status |
|---|------|--------|
| 01 | [Migration system](./01-migration-system.md) | Done |
| 02 | [`captured_date`](./02-captured-date.md) | Done |
| 03 | [Split `database.ts`](./03-split-database.md) | Pending |
| 04 | [PDF export](./04-pdf-streaming.md) | Done (pdf-lib); Phase A warnings pending |
| 05 | [Clone batching](./05-clone-batching.md) | Done |
| 06 | [Test suite](./06-test-suite.md) | Pending |
| 07 | [Quarantine artifacts](./07-quarantine-artifacts.md) | Pending |
| 08 | [ZIP memory fix](./08-zip-memory-fix.md) | Pending |
| 09 | [`photo_group` UNIQUE](./09-photo-group-unique.md) | Pending |
| 10 | [CI pipeline](./10-ci-pipeline.md) | Pending |
| 11 | [Capture navigation](./11-capture-navigation.md) | In progress |
| 12 | [Gerador batching](./12-bulk-structure-batching.md) | Pending |
| 13 | [Orphan file audit](./13-orphan-file-audit.md) | Pending |
| 14 | [Schema version UI](./14-schema-version-settings.md) | Pending |

## How to use these docs

1. Read the task file before starting implementation
2. Check **Dependencies** — some tasks block others
3. Use **Acceptance criteria** as a PR checklist
4. Mark **Status** at the top when done; update this README

## Decision guide

| If you need… | Start with |
|--------------|------------|
| Large ZIP exports without OOM | [08](./08-zip-memory-fix.md) |
| Safer SQL changes going forward | [06](./06-test-suite.md) → [09](./09-photo-group-unique.md) |
| App fast with 5k+ photos | Already done (01 + 02) |
| Clone/setup not freezing UI | Already done (05) |
| Large PDF exports without OOM | Already done — pdf-lib ([04](./04-pdf-streaming.md)) |
| Cleaner codebase navigation | [03](./03-split-database.md) or [07](./07-quarantine-artifacts.md) |
| PR checks before merge | [10](./10-ci-pipeline.md) (after 06) |
| Consistent back/home in capture flow | [11](./11-capture-navigation.md) |
| Device storage after many deletes | [13](./13-orphan-file-audit.md) |
