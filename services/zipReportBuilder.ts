import { File } from 'expo-file-system';
import { Zip, ZipPassThrough, strToU8 } from 'fflate';
import {
  getPhotosForReport,
  getWatermarkConfig,
  type PhotoWithHierarchy,
  type WatermarkConfig,
} from '@/db/database';
import { formatDate, formatDateTime, parseStoredTimestamp } from '@/utils/datetime';
import { buildReportBaseName } from '@/utils/reportNaming';
import { getPhotoUri } from './photoService';

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9\u00C0-\u00FF _-]/g, '').trim().replace(/\s+/g, '_');
}

function buildReportFolderName(date: string, projectName: string, blockName: string): string {
  return `${date}_${sanitize(projectName)}_${sanitize(blockName)}`;
}

function isWatermarkFieldOn(wmConfig: WatermarkConfig, key: string): boolean {
  const f = wmConfig.fields.find(wf => wf.field === key);
  return f ? f.enabled : true;
}

function buildZipFilename(
  p: PhotoWithHierarchy,
  seq: string,
  date: string,
  wmConfig: WatermarkConfig,
): string {
  if (!wmConfig.enabled) return `${date}_${seq}.jpg`;

  const parts: string[] = [date, seq];

  if (isWatermarkFieldOn(wmConfig, 'datetime')) {
    const d = parseStoredTimestamp(p.captured_at);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    parts.push(`${hh}-${mm}`);
  }
  if (isWatermarkFieldOn(wmConfig, 'quadra') && p.block_name) parts.push(sanitize(p.block_name));
  if (isWatermarkFieldOn(wmConfig, 'predio') && p.building_name) parts.push(sanitize(p.building_name));
  if (isWatermarkFieldOn(wmConfig, 'pavimento') && p.floor_name) parts.push(sanitize(p.floor_name));
  if (isWatermarkFieldOn(wmConfig, 'unidade') && p.unit_name) parts.push(sanitize(p.unit_name));
  if (isWatermarkFieldOn(wmConfig, 'servico') && p.service_name) parts.push(sanitize(p.service_name));

  return `${parts.join('_')}.jpg`;
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
    let exported = 0;

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      let bytes: Uint8Array | null = null;
      try {
        bytes = await new File(getPhotoUri(p.internal_filename)).bytes();
      } catch {}
      if (bytes) {
        exported++;
        const folderPath = `${sanitize(p.building_name)}/${sanitize(p.floor_name)}/${sanitize(p.unit_name)}/${sanitize(p.service_name)}`;
        const seq = String(exported).padStart(3, '0');
        const filename = buildZipFilename(p, seq, opts.date, wmConfig);
        addStoredEntry(zip, `${folderName}/${folderPath}/${filename}`, bytes);
        indexLines.push(`${folderPath}/${filename} — ${formatDateTime(p.captured_at)}`);
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
