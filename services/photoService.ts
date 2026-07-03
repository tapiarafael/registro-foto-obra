import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const PHOTOS_DIR = FileSystem.documentDirectory + 'photos/';
const THUMBS_DIR = FileSystem.documentDirectory + 'photos/thumbs/';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1440 } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.88 }
  );

  const thumb = await ImageManipulator.manipulateAsync(
    manipulated.uri,
    [{ resize: { width: 320 } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.7 }
  );

  await Promise.all([
    FileSystem.copyAsync({ from: manipulated.uri, to: permanentUri }),
    FileSystem.copyAsync({ from: thumb.uri, to: thumbnailUri }),
  ]);

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
