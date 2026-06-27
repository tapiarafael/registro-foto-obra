# Registro Fotográfico de Obra

A fully offline Android app (Expo/React Native) for construction site engineers to capture date/time-watermarked photos organized by Quadra → Prédio → Pavimento → Unidade → Serviço, and generate PDF reports and ZIP exports — all on-device, no internet, auth, or cloud.

## Run & Operate

- `restart_workflow artifacts/mobile: expo` — run the mobile app (Expo, port 18115). Test on Android via Expo Go (scan QR) — native features (SQLite, camera, print, sharing) only fully work on device.
- `pnpm --filter @workspace/mobile run typecheck` — typecheck the mobile app
- No env vars required — the app is fully offline and on-device.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- App: Expo SDK 54 / React Native, expo-router
- Local DB: expo-sqlite (`obra.db`, on-device)
- Photos: expo-camera, expo-image-manipulator, file storage via `expo-file-system/legacy`
- Export: expo-print (PDF), jszip + expo-sharing (ZIP)

## Where things live

- `artifacts/mobile/db/database.ts` — SQLite schema + all CRUD (source of truth for data model)
- `artifacts/mobile/context/AppContext.tsx` — `useApp()` global state (project, session, today count)
- `artifacts/mobile/services/photoService.ts` — photo capture/storage/watermark helpers
- `artifacts/mobile/services/reportService.ts` — PDF + ZIP generation (fetches photos internally)
- `artifacts/mobile/constants/colors.ts` — theme (`colors.light.*`, `colors.radius`)
- `artifacts/mobile/app/` — expo-router routes: `setup`, `(tabs)`, `registrar/*`, `estrutura/*`

## Architecture decisions

- Fully offline by design: no auth, no network, no cloud. All data in on-device SQLite; photos under `documentDirectory/photos/`.
- Hierarchy: Quadra → Prédio → Pavimento → Unidade → Serviço, each with its own CRUD + capture flow.
- Watermark (date/time) is rendered live on the camera overlay and baked into PDF/ZIP exports.
- Uses `expo-file-system/legacy` (v19 still ships it); the new v56 API is not used. `getInfoAsync` must not be passed `{size:true}`.
- `metro.config.js` adds `wasm` to `assetExts` so the web bundle resolves expo-sqlite's wa-sqlite.wasm.

## Product

Engineers configure an obra (project), build the structural hierarchy, capture watermarked photos per serviço, review history, and export PDF reports / ZIP archives — entirely offline on Android.

## User preferences

- All UI text in Brazilian Portuguese.
- Touch targets ≥48dp; theme primary `#0D47A1`, accent `#F59E0B`.

## Gotchas

- Workflow name is exactly `artifacts/mobile: expo` (not `mobile` or `expo`).
- Web preview is for visual checks only — expo-sqlite/camera/print/sharing don't run on web; SQLite init is guarded by a web-only 2s timeout in `AppContext` so the UI still renders. Verify real behavior on Android.
- After changing package versions, run `pnpm exec expo install --fix` in `artifacts/mobile` to keep versions aligned with SDK 54.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
