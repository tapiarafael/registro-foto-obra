import { File } from 'expo-file-system';
import { Zip, ZipPassThrough, strToU8 } from 'fflate';
import {
  getPhotosForReport,
  getWatermarkConfig,
  type PhotoWithHierarchy,
  type WatermarkConfig,
} from '@/db/database';
import { formatDate, formatDateTime, parseStoredTimestamp } from '@/utils/datetime';
import {
  buildReportBaseName,
  buildReportFolderName,
  uniqueZipSegment,
  zipFolderFromHierarchy,
} from '@/utils/reportNaming';
import { getPhotoUri } from './photoService';

function isWatermarkFieldOn(wmConfig: WatermarkConfig, key: string): boolean {
  const f = wmConfig.fields.find(wf => wf.field === key);
  return f ? f.enabled : true;
}

function buildZipFilename(
  seq: string,
  date: string,
  capturedAt: string,
  wmConfig: WatermarkConfig,
): string {
  const parts: string[] = [date, seq];

  if (wmConfig.enabled && isWatermarkFieldOn(wmConfig, 'datetime')) {
    const d = parseStoredTimestamp(capturedAt);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    parts.push(`${hh}-${mm}`);
  }

  return `${parts.join('_')}.jpg`;
}

function buildHierarchyLabel(p: PhotoWithHierarchy): string {
  return [p.building_name, p.floor_name, p.unit_name, p.service_name]
    .filter(Boolean)
    .join(' · ');
}

// Adds a single already-buffered entry to the zip as a STORE (uncompressed)
// stream. JPEG/PDF are already compressed, so storing avoids the CPU and
// memory cost of DEFLATE while still producing a valid archive.
function addStoredEntry(zip: Zip, path: string, bytes: Uint8Array): void {
  const entry = new ZipPassThrough(path);
  zip.add(entry);
  entry.push(bytes, true);
}

/**
 * Builds the report ZIP by streaming each entry straight to `destPath` on disk.
 *
 * Peak memory stays at roughly one photo at a time: every file is read, pushed
 * through fflate's streaming Zip, and the resulting output chunks are written to
 * the destination file handle immediately. The full archive is never held in
 * memory, so this scales to hundreds of photos on low-RAM devices.
 */
export async function buildReportZip(opts: {
  blockName: string;
  date: string;
  blockId: number;
  projectName: string;
  pdfPath: string;
  destPath: string;
  onProgress?: (current: number, total: number) => void;
}): Promise<void> {
  const [photos, wmConfig] = await Promise.all([
    getPhotosForReport(opts.blockId, opts.date),
    getWatermarkConfig(),
  ]);
  const totalSteps = photos.length + 3;
  opts.onProgress?.(0, totalSteps);

  const folderName = buildReportFolderName(opts.date, opts.projectName, opts.blockName);

  const outFile = new File(opts.destPath);
  if (outFile.exists) outFile.delete();
  outFile.create({ overwrite: true });
  const handle = outFile.open();

  let writeError: unknown = null;
  const zip = new Zip((err, chunk, final) => {
    if (err) {
      writeError = err;
      return;
    }
    if (chunk && chunk.length > 0) {
      handle.writeBytes(chunk);
    }
  });

  const throwIfWriteFailed = () => {
    if (writeError) throw writeError;
  };

  try {
    const indexLines: string[] = [];
    const folderPathByKey = new Map<string, string>();
    const usedFolderPaths = new Set<string>();
    const usedFilePaths = new Set<string>();
    let exported = 0;

    const getFolderPath = (p: PhotoWithHierarchy): string => {
      const key = `${p.building_name ?? ''}\0${p.floor_name ?? ''}\0${p.unit_name ?? ''}\0${p.service_name ?? ''}`;
      const cached = folderPathByKey.get(key);
      if (cached) return cached;
      const base = zipFolderFromHierarchy(p);
      const path = uniqueZipSegment(base, usedFolderPaths);
      folderPathByKey.set(key, path);
      return path;
    };

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      let bytes: Uint8Array | null = null;
      try {
        bytes = await new File(getPhotoUri(p.internal_filename)).bytes();
      } catch {}
      if (bytes) {
        exported++;
        const folderPath = getFolderPath(p);
        const seq = String(exported).padStart(3, '0');
        const filename = buildZipFilename(seq, opts.date, p.captured_at, wmConfig);
        const nested = folderPath ? `${folderPath}/${filename}` : filename;
        const filePath = uniqueZipSegment(nested, usedFilePaths);
        addStoredEntry(zip, `${folderName}/${filePath}`, bytes);
        indexLines.push(`${buildHierarchyLabel(p)} — ${filePath} — ${formatDateTime(p.captured_at)}`);
      }
      throwIfWriteFailed();
      opts.onProgress?.(i + 1, totalSteps);
    }

    const skipped = photos.length - exported;
    let index = `REGISTRO FOTOGRÁFICO DE OBRA\n`;
    index += `Obra: ${opts.projectName}\nQuadra: ${opts.blockName}\nData: ${formatDate(opts.date)}\n`;
    index += `Total: ${exported} foto${exported === 1 ? '' : 's'}`;
    if (skipped > 0) index += ` (${skipped} omitida${skipped === 1 ? '' : 's'})`;
    index += `\n\n${indexLines.join('\n')}\n`;

    addStoredEntry(zip, `${folderName}/indice.txt`, strToU8(index));
    throwIfWriteFailed();
    opts.onProgress?.(photos.length + 1, totalSteps);

    const pdfBytes = await new File(opts.pdfPath).bytes();
    addStoredEntry(zip, `${folderName}/${buildReportBaseName(opts.blockName, opts.date)}.pdf`, pdfBytes);
    throwIfWriteFailed();
    opts.onProgress?.(photos.length + 2, totalSteps);

    zip.end();
    throwIfWriteFailed();
    opts.onProgress?.(totalSteps, totalSteps);
  } finally {
    handle.close();
  }
}
