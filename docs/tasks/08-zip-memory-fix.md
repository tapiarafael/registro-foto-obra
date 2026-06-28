# Task 08: ZIP Export Memory Fix

**Priority:** Medium–High (large exports)  
**Effort:** 2–4 days  
**Risk:** Medium  
**Recommended order:** After PDF pdf-lib rewrite (Task 04 follow-up)

## Context

PDF export was rewritten to use **pdf-lib** (`services/pdfReportBuilder.ts`) with sequential `embedJpg` per photo. That resolved OOM for 160+ photos at high quality on Android.

**ZIP export was not changed** and still uses the original preload pattern.

## Problem

`services/reportService.ts` → `buildZIPContent`:

1. Loads **all** photos via `getPhotosForReport`
2. Preloads **all** full-resolution base64 into a `Map` via `loadAllPhotoBase64(..., 'high')` (concurrency 4)
3. Adds every photo to a JSZip in-memory tree as base64 strings
4. Reads the generated PDF from disk as base64 and adds it to the same JSZip object
5. Calls `zip.generateAsync({ type: 'base64' })` — another full in-memory copy
6. Writes the result with `writeAsStringAsync` (base64 encoding again in `generateZIP` / `getOrGenerateZIP`)

Peak memory ≈ N × full JPEG in base64 (Map) + JSZip internal buffers + final base64 ZIP string. On low-RAM Android (256MB heap), **50–160 full-res photos can OOM** — the same class of failure PDF had before the rewrite.

ZIP always uses `'high'` quality regardless of the user's PDF quality setting (`report_imageQuality`).

## Goal

Cap memory during ZIP export so large same-day exports (100+ photos) remain stable on real devices, while preserving:

- Folder structure: `{building}/{floor}/{unit}/{service}/`
- Watermark-based filenames (`buildZipFilename`)
- `indice.txt` manifest
- Embedded `relatorio.pdf` (already generated via pdf-lib path)

## Plan

### Phase A — Quick mitigations (0.5 day)

1. **Photo count warning** in `app/(tabs)/relatorios.tsx` before ZIP when `photo_count > 50`
2. **Clearer error message** for OOM on ZIP (mirror PDF `pdfErrorMessage` pattern)
3. **Progress phases**: reading photos → adding to ZIP → compressing (labels in `ProgressModal`)
4. Document recommended max photos per ZIP in README (interim)

### Phase B — Sequential ZIP assembly (1–2 days)

Replace `loadAllPhotoBase64` + `Map` in `buildZIPContent` with a **one-photo-at-a-time** loop:

```text
for each photo (sequential):
  read file bytes / base64 for single photo
  rootFolder.file(path, bytes, { base64: true })
  release reference before next iteration
  onProgress(current, total)
```

- Set concurrency to **1** for ZIP photo reads (do not reuse `READ_CONCURRENCY = 4` pool)
- Keep PDF embed: read `pdfPath` once after all photos (unavoidable single large read, but PDF is one file not N photos)

**Expected win:** peak drops from N × photo size to ~1 × photo size + JSZip growth. JSZip may still hold compressed entries internally — measure on device.

### Phase C — Reduce base64 churn at write (1 day)

Investigate alternatives to `generateAsync({ type: 'base64' })`:

| Option | Notes |
|--------|--------|
| `generateAsync({ type: 'uint8array' })` | Avoid base64 string for ZIP body; write binary if expo-file-system supports it |
| `generateAsync({ type: 'blob' })` | Web only — not for RN |
| Stream to temp file | JSZip 3.x has limited streaming; may need `fflate` or native module research |

Target: single representation of final ZIP bytes on disk, not Map + JSZip tree + base64 string simultaneously.

### Phase D — Optional quality alignment

Consider respecting `report_imageQuality` for ZIP photos, or a dedicated ZIP setting. Today ZIP is always full resolution — correct for archival but worst-case for memory.

Default recommendation: keep full-res for ZIP (user expectation: ZIP = originals) but fix memory via sequential assembly.

## Files to touch

| File | Action |
|------|--------|
| `services/reportService.ts` | Refactor `buildZIPContent`, possibly extract `zipReportBuilder.ts` |
| `app/(tabs)/relatorios.tsx` | ZIP warning UI, OOM error message, progress labels |
| `components/ProgressModal.tsx` | Optional: distinct compressing phase label |
| `README.md` | Document large-export limits until Phase B ships |

## Acceptance criteria

### Phase A

- [ ] User sees warning before ZIP export when photo count > 50
- [ ] OOM errors show actionable PT-BR message

### Phase B+

- [ ] ZIP export completes on Android with 160 photos without OOM
- [ ] Output structure identical: folders, filenames, `indice.txt`, embedded PDF
- [ ] Progress bar reflects read → compress phases
- [ ] Cached ZIP (`generated_report.zip_path`) still invalidates correctly on photo/config change

## Test matrix

| Photos | Expected |
|--------|----------|
| 20 | ZIP completes; spot-check folder layout and PDF inside |
| 160 | ZIP completes without OOM (primary regression target) |
| 0 | ZIP with PDF + empty index (edge case) |

## Dependencies

- **Task 04** (PDF streaming) — PDF path fixed; this task completes the export story
- **Task 02** (`captured_date`) — faster photo query (nice to have, not blocking)

## Out of scope

- Server-side ZIP generation
- Splitting one export into multiple ZIP files
- Changing ZIP folder naming conventions

## Notes

- `loadAllPhotoBase64` can remain for nothing once ZIP is migrated — remove if unused
- PDF inside ZIP benefits from pdf-lib rewrite (smaller, stable generation); ZIP memory is dominated by **N full-res JPEGs**, not the PDF
- If Phase B is insufficient, profile JSZip heap during `generateAsync` before investing in alternative libraries
