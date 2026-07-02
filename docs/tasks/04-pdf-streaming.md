# Task 04: Streaming / Chunked PDF Generation

**Priority:** Medium–High (large exports)  
**Effort:** 3–5 days (full); 1 day (Phase A only)  
**Risk:** High  
**Status:** Done (pdf-lib rewrite); Phase A export warnings still pending  
**Recommended order:** 5th (after core DB work)

## Problem

`services/reportService.ts` → `generatePDF`:

1. Loads **all** photos for block+date via `getPhotosForReport`
2. Preloads **all** base64 into a `Map` via `loadAllPhotoBase64` (concurrency 4)
3. Builds one giant HTML string with inline `data:image/jpeg;base64,...`
4. Passes entire HTML to `expo-print`

Peak memory ≈ N × compressed JPEG size in base64 (~33% overhead). On low-RAM Android devices, 50+ full-res photos can cause OOM or kill the app.

ZIP export has the same preload pattern after the quick-win concurrency change.

## Goal

Cap memory during PDF (and optionally ZIP) export so large same-day exports remain stable on real devices.

## Plan

### Phase A — Quick mitigations (1 day)

1. **Photo count warning** in `app/(tabs)/relatorios.tsx` when `photo_count > 30`
2. **Default quality downgrade** for large sets: if `photos.length > 40`, force `'fast'` unless user overrides in config
3. **Clear progress phases** in `ProgressModal`: reading → rendering → compressing

### Phase B — Batched HTML generation (2–3 days)

1. Split photos into chunks of e.g. 10–15 per batch
2. For each batch:
   - Load base64 for batch only
   - Render HTML section
   - Release batch from memory before next
3. Concatenate sections or use separate print jobs

**Challenge:** `expo-print` `printToFileAsync` expects one HTML document. Options:

- Single HTML with sections loaded sequentially (still one final string — limited win)
- Multiple PDFs merged (needs native module or server-side tool — likely out of scope offline)

### Phase C — File URI instead of base64 (research spike)

1. Investigate if `expo-print` / WebView accepts `file://` URIs in `<img src>`
2. If yes: reference `getPhotoUri(internal_filename)` directly — massive memory savings
3. Document SDK 54 limitations in this file after spike

### Phase D — ZIP alignment

See **[08-zip-memory-fix.md](./08-zip-memory-fix.md)** — dedicated follow-up now that PDF uses pdf-lib.

## Files to touch

| File | Action |
|------|--------|
| `services/reportService.ts` | Batching, quality heuristics, progress |
| `app/(tabs)/relatorios.tsx` | Warning UI, progress phase labels |
| `components/ProgressModal.tsx` | Optional: phase-aware labels |

## Acceptance criteria

### Phase A

- [ ] User warned before exporting 30+ photos
- [ ] Export completes on device with 50 photos without crash (test matrix)

### Phase B+ (if pursued)

- [ ] Peak memory measurably lower than baseline (Android profiler or log heap)
- [ ] PDF output visually identical to current export
- [ ] Progress bar reflects all phases

## Dependencies

- **Task 02** (`captured_date`) — faster photo query before export (nice to have, not blocking)

## Research questions (answer before Phase B)

1. Does `expo-print` on Android support local file URIs in HTML?
2. Is there a lightweight PDF merge library that works in Expo without native code?
3. What is the largest export users realistically need same-day?

## Impact

| Scenario | Effect |
|----------|--------|
| &lt; 20 photos per block/day | Low — current approach works |
| 50+ photos | High — prevents OOM |
| Multiple blocks same day | Very high |

## Notes

- PDF generation now uses **pdf-lib** (`services/pdfReportBuilder.ts`) — sequential `embedJpg` per photo, no WebView/HTML. Resolves OOM for 160+ photos at high quality.
- PDF path no longer uses concurrency pool or base64 `Map`; ZIP export still uses `loadAllPhotoBase64` — follow-up needed for large ZIP exports.
- Consider documenting max recommended photos per ZIP export in README
