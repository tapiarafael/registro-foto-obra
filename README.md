# Registro Fotográfico de Obra

A fully offline Android app (Expo/React Native) for construction site engineers to capture date/time-watermarked photos organized by Quadra → Prédio → Pavimento → Unidade → Serviço, and generate PDF reports and ZIP exports — all on-device, no internet, auth, or cloud.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) (included via `@expo/cli`)
- [EAS CLI](https://docs.expo.dev/build/setup/) for native builds (`npm install -g eas-cli`)
- Android device with [Expo Go](https://expo.dev/go) for development, or EAS Build for installable APK/AAB

## Development

```bash
pnpm install
pnpm start
```

Scan the QR code with Expo Go on Android. Native features (SQLite, camera, print, sharing) only work on a real device — web preview is for visual checks only.

```bash
pnpm typecheck
```

No environment variables are required. The app is fully offline and on-device.

## Production builds (EAS)

Log in to your Expo account first:

```bash
eas login
```

Build an internal APK for sideloading:

```bash
pnpm build:preview
```

Build an AAB for Google Play:

```bash
pnpm build:production
```

## Stack

- Expo SDK 54 / React Native, expo-router
- Local DB: expo-sqlite (`obra.db`, on-device)
- Photos: expo-camera, expo-image-manipulator, file storage via `expo-file-system/legacy`
- Export: pdf-lib (PDF), fflate + expo-sharing (ZIP)

## Export notes

ZIP exports include the on-disk photos (stored, not recompressed). The archive is streamed entry-by-entry straight to disk via fflate's streaming `Zip` + the `expo-file-system` `FileHandle.writeBytes` API, so peak memory stays at roughly one photo regardless of report size. This scales to hundreds of photos per report on low-RAM Android devices.

## Where things live

- `db/database.ts` — SQLite CRUD (source of truth for data model)
- `db/migrate.ts` + `db/migrations/` — versioned schema migrations (`PRAGMA user_version`)
- `context/AppContext.tsx` — `useApp()` global state (project, session, today count)
- `services/photoService.ts` — photo capture/storage/watermark helpers
- `services/reportService.ts` — PDF + ZIP generation (fetches photos internally)
- `services/zipReportBuilder.ts` — streaming ZIP assembly (fflate, written directly to disk)
- `constants/colors.ts` — theme (`colors.light.*`, `colors.radius`)
- `app/` — expo-router routes: `setup`, `(tabs)`, `registrar/*`, `estrutura/*`

## Architecture decisions

- Fully offline by design: no auth, no network, no cloud. All data in on-device SQLite; photos under `documentDirectory/photos/`.
- Hierarchy: Quadra → Prédio → Pavimento → Unidade → Serviço, each with its own CRUD + capture flow.
- Watermark (date/time) is rendered live on the camera overlay and baked into PDF/ZIP exports.
- Uses `expo-file-system/legacy` for most file I/O; ZIP output uses the new `expo-file-system` `File.write(Uint8Array)` API to avoid base64 OOM on large exports.
- `metro.config.js` adds `wasm` to `assetExts` so the web bundle resolves expo-sqlite's wa-sqlite.wasm.

## User preferences

- All UI text in Brazilian Portuguese.
- Touch targets ≥48dp; theme primary `#0D47A1`, accent `#F59E0B`.

## Gotchas

- Web preview is for visual checks only — expo-sqlite/camera/print/sharing don't run on web; SQLite init is guarded by a web-only 2s timeout in `AppContext` so the UI still renders. Verify real behavior on Android.
- After changing package versions, run `pnpm exec expo install --fix` to keep versions aligned with SDK 54.

## Planned work

Implementation plans and status for larger improvements live in [`docs/tasks/README.md`](docs/tasks/README.md).

**Done:** migration system, `captured_date`, clone batching, PDF via pdf-lib, report disk cache.

**Next up:** test suite (Task 06), then `photo_group` UNIQUE, CI, and capture navigation polish.
