import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const PHOTOS_DIR = FileSystem.documentDirectory + 'photos/';
const THUMBS_DIR = FileSystem.documentDirectory + 'photos/thumbs/';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function ensureDirectories(): Promise<void> {
  const photosInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!photosInfo.exists) await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  const thumbsInfo = await FileSystem.getInfoAsync(THUMBS_DIR);
  if (!thumbsInfo.exists) await FileSystem.makeDirectoryAsync(THUMBS_DIR, { intermediates: true });
}

export async function savePhoto(sourceUri: string): Promise<{
  internalFilename: string;
  thumbnailFilename: string;
  width: number;
  height: number;
  sizeBytes: number;
  permanentUri: string;
  thumbnailUri: string;
}> {
  await ensureDirectories();
  const id = generateId();
  const internalFilename = `${id}.jpg`;
  const thumbnailFilename = `${id}_thumb.jpg`;
  const permanentUri = PHOTOS_DIR + internalFilename;
  const thumbnailUri = THUMBS_DIR + thumbnailFilename;

  // Compress and save the main photo
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1440 } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.88 }
  );
  await FileSystem.copyAsync({ from: manipulated.uri, to: permanentUri });

  // Create thumbnail
  const thumb = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 320 } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.7 }
  );
  await FileSystem.copyAsync({ from: thumb.uri, to: thumbnailUri });

  const fileInfo = await FileSystem.getInfoAsync(permanentUri);
  const sizeBytes = (fileInfo as any).size ?? 0;

  return {
    internalFilename,
    thumbnailFilename,
    width: manipulated.width,
    height: manipulated.height,
    sizeBytes,
    permanentUri,
    thumbnailUri,
  };
}

export function getPhotoUri(filename: string): string {
  return PHOTOS_DIR + filename;
}

export function getThumbnailUri(filename: string): string {
  return THUMBS_DIR + filename;
}

export async function deletePhotoFiles(internalFilename: string, thumbnailFilename: string): Promise<void> {
  try {
    const photoUri = PHOTOS_DIR + internalFilename;
    const thumbUri = THUMBS_DIR + thumbnailFilename;
    const pi = await FileSystem.getInfoAsync(photoUri);
    if (pi.exists) await FileSystem.deleteAsync(photoUri, { idempotent: true });
    const ti = await FileSystem.getInfoAsync(thumbUri);
    if (ti.exists) await FileSystem.deleteAsync(thumbUri, { idempotent: true });
  } catch {}
}

export async function deletePhotoFilesByFilenames(filenames: string[]): Promise<void> {
  for (const filename of filenames) {
    try {
      const isThumb = filename.includes('_thumb');
      const dir = isThumb ? THUMBS_DIR : PHOTOS_DIR;
      const uri = dir + filename;
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {}
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** SQLite datetime('now') and legacy rows: UTC without timezone suffix. */
const SQLITE_UTC_DATETIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/;

export function nowIsoTimestamp(): string {
  return new Date().toISOString();
}

export function parseStoredTimestamp(value: string): Date {
  const trimmed = value.trim();
  const sqliteMatch = SQLITE_UTC_DATETIME.exec(trimmed);
  if (sqliteMatch) {
    return new Date(`${sqliteMatch[1]}T${sqliteMatch[2]}Z`);
  }
  return new Date(trimmed);
}

export function formatDateTime(isoString: string): string {
  const d = parseStoredTimestamp(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hour}:${min}`;
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDatePart(isoString: string): string {
  const d = parseStoredTimestamp(isoString);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function formatTime(isoString: string): string {
  const d = parseStoredTimestamp(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateLong(isoString: string): string {
  const d = new Date(isoString + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function buildWatermarkLines(opts: {
  capturedAt: string;
  blockName: string;
  buildingName: string;
  floorName: string;
  unitName: string;
  serviceName: string;
  projectName?: string;
}): string[] {
  return [
    formatDateTime(opts.capturedAt),
    `${opts.blockName} · ${opts.buildingName} · ${opts.floorName}`,
    `${opts.unitName} · ${opts.serviceName}`,
    ...(opts.projectName ? [opts.projectName] : []),
  ];
}

export async function getAppStorageInfo(): Promise<{ used: number; free: number }> {
  try {
    const fs = await FileSystem.getFreeDiskStorageAsync();
    const total = await FileSystem.getTotalDiskCapacityAsync();
    return { used: total - fs, free: fs };
  } catch {
    return { used: 0, free: 0 };
  }
}

export function todayDateString(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function toLocalDateString(iso: string): string {
  const d = parseStoredTimestamp(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
