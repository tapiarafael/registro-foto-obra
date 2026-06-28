import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import {
  getPhotosForReport,
  getAppSetting,
  getWatermarkConfig,
  getGeneratedReport,
  getPhotoCountForBlockDate,
  getReportConfigHash,
  upsertGeneratedReport,
  type PhotoWithHierarchy,
  type WatermarkConfig,
  type GeneratedReport,
} from '@/db/database';
import { formatDate, formatDateTime, getPhotoUri, getThumbnailUri } from './photoService';
import {
  buildReportPdf,
  type GroupField,
  type ImageQuality,
} from './pdfReportBuilder';

const REPORTS_DIR = FileSystem.documentDirectory + 'reports/';
const PDF_FILENAME = 'relatorio.pdf';
const ZIP_FILENAME = 'export.zip';

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9\u00C0-\u00FF _-]/g, '').trim().replace(/\s+/g, '_');
}

export function buildReportFolderName(date: string, projectName: string, blockName: string): string {
  return `${date}_${sanitize(projectName)}_${sanitize(blockName)}`;
}

export function getReportDir(date: string, projectName: string, blockName: string): string {
  return `${REPORTS_DIR}${buildReportFolderName(date, projectName, blockName)}/`;
}

async function ensureReportDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function writeFileReplacing(path: string, contents: string, encoding: FileSystem.EncodingType): Promise<void> {
  const existing = await FileSystem.getInfoAsync(path);
  if (existing.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
  await FileSystem.writeAsStringAsync(path, contents, { encoding });
}

async function copyFileReplacing(from: string, to: string): Promise<void> {
  const existing = await FileSystem.getInfoAsync(to);
  if (existing.exists) {
    await FileSystem.deleteAsync(to, { idempotent: true });
  }
  await FileSystem.copyAsync({ from, to });
}

type ReportExportOpts = {
  blockName: string;
  date: string;
  projectName: string;
  blockId: number;
  responsibleEngineer?: string | null;
  onProgress?: (current: number, total: number) => void;
};

export type ReportExportResult = { uri: string; fromCache: boolean };

async function isCacheEntryValid(
  report: GeneratedReport | null,
  blockId: number,
  date: string,
  filePath: string | null | undefined,
): Promise<boolean> {
  if (!report || !filePath) return false;
  const [photoCount, configHash] = await Promise.all([
    getPhotoCountForBlockDate(blockId, date),
    getReportConfigHash(),
  ]);
  if (report.photo_count !== photoCount || report.config_hash !== configHash) return false;
  const info = await FileSystem.getInfoAsync(filePath);
  return info.exists;
}

export async function isReportCacheReady(
  blockId: number,
  date: string,
  type: 'pdf' | 'zip',
): Promise<{ ready: boolean; generatedAt?: string }> {
  const report = await getGeneratedReport(blockId, date);
  const path = type === 'pdf' ? report?.pdf_path : report?.zip_path;
  const ready = await isCacheEntryValid(report, blockId, date, path);
  return { ready, generatedAt: ready ? report?.generated_at : undefined };
}

export async function deleteReportArtifactFiles(reports: GeneratedReport[]): Promise<void> {
  const dirs = new Set<string>();
  for (const report of reports) {
    for (const filePath of [report.pdf_path, report.zip_path]) {
      if (!filePath) continue;
      try {
        const info = await FileSystem.getInfoAsync(filePath);
        if (info.exists) await FileSystem.deleteAsync(filePath, { idempotent: true });
        dirs.add(filePath.slice(0, filePath.lastIndexOf('/') + 1));
      } catch {}
    }
  }
  for (const dir of dirs) {
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (info.exists) await FileSystem.deleteAsync(dir, { idempotent: true });
    } catch {}
  }
}

export async function deleteReportArtifactsForDate(reports: GeneratedReport[]): Promise<void> {
  await deleteReportArtifactFiles(reports);
}

// ── Grouping types ──────────────────────────────────────────────────────────

const DEFAULT_GROUPING: GroupField[] = ['building', 'floor', 'unit', 'service'];

// ── Image quality ─────────────────────────────────────────────────────────────

const MEDIUM_WIDTH = 800;
const READ_CONCURRENCY = 4;

// Reads a single photo as base64 according to the chosen report image quality.
async function loadPhotoBase64(p: PhotoWithHierarchy, quality: ImageQuality): Promise<string> {
  if (quality === 'fast') {
    return FileSystem.readAsStringAsync(getThumbnailUri(p.thumbnail_filename), {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  if (quality === 'medium') {
    const result = await ImageManipulator.manipulateAsync(
      getPhotoUri(p.internal_filename),
      [{ resize: { width: MEDIUM_WIDTH } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8, base64: true },
    );
    return result.base64 ?? '';
  }
  return FileSystem.readAsStringAsync(getPhotoUri(p.internal_filename), {
    encoding: FileSystem.EncodingType.Base64,
  });
}

// Loads base64 for all photos using a bounded concurrency pool, reporting
// progress as each photo completes.
async function loadAllPhotoBase64(
  photos: PhotoWithHierarchy[],
  quality: ImageQuality,
  onProgress?: (current: number, total: number) => void,
): Promise<Map<string, string>> {
  const base64Map = new Map<string, string>();
  let completed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < photos.length) {
      const index = cursor++;
      const p = photos[index];
      try {
        const b64 = await loadPhotoBase64(p, quality);
        if (b64) base64Map.set(p.internal_filename, b64);
      } catch {}
      completed++;
      onProgress?.(completed, photos.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(READ_CONCURRENCY, photos.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return base64Map;
}

function isWatermarkFieldOn(wmConfig: WatermarkConfig, key: string): boolean {
  const f = wmConfig.fields.find(wf => wf.field === key);
  return f ? f.enabled : true;
}

// ── PDF export ───────────────────────────────────────────────────────────────
export async function generatePDF(opts: {
  blockName: string;
  date: string;
  projectName: string;
  blockId: number;
  responsibleEngineer?: string | null;
  onProgress?: (current: number, total: number) => void;
}): Promise<string> {
  const [colorSetting, paginationSetting, logoPathSetting, groupingStr, qualitySetting, wmConfig] = await Promise.all([
    getAppSetting('report_primaryColor'),
    getAppSetting('report_paginationMode'),
    getAppSetting('report_logoPath'),
    getAppSetting('report_groupingFields'),
    getAppSetting('report_imageQuality'),
    getWatermarkConfig(),
  ]);

  const primaryColor = colorSetting || '#0D47A1';
  const paginationMode = (paginationSetting as 'none' | 'current' | 'current_total') || 'none';
  const imageQuality: ImageQuality =
    qualitySetting === 'medium' || qualitySetting === 'high' ? qualitySetting : 'fast';

  const groupingFields: GroupField[] = (() => {
    if (!groupingStr) return DEFAULT_GROUPING;
    try {
      const parsed: { field: GroupField; enabled: boolean }[] = JSON.parse(groupingStr);
      if (Array.isArray(parsed)) {
        const enabled = parsed.filter(p => p.enabled).map(p => p.field);
        return enabled.length > 0 ? enabled : DEFAULT_GROUPING;
      }
    } catch {}
    return DEFAULT_GROUPING;
  })();

  const photos = await getPhotosForReport(opts.blockId, opts.date);
  opts.onProgress?.(0, photos.length);

  const base64 = await buildReportPdf({
    projectName: opts.projectName,
    blockName: opts.blockName,
    date: opts.date,
    responsibleEngineer: opts.responsibleEngineer,
    photos,
    groupingFields,
    imageQuality,
    primaryColor,
    paginationMode,
    logoPath: logoPathSetting,
    wmConfig,
    onProgress: opts.onProgress,
  });

  const tempPath = FileSystem.cacheDirectory + `report-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(tempPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return tempPath;
}

export async function getOrGeneratePDF(
  opts: ReportExportOpts,
  options?: { force?: boolean },
): Promise<ReportExportResult> {
  const reportDir = getReportDir(opts.date, opts.projectName, opts.blockName);
  const pdfPath = reportDir + PDF_FILENAME;

  if (!options?.force) {
    const report = await getGeneratedReport(opts.blockId, opts.date);
    if (await isCacheEntryValid(report, opts.blockId, opts.date, report?.pdf_path)) {
      return { uri: report!.pdf_path!, fromCache: true };
    }
  }

  const tempUri = await generatePDF(opts);
  await ensureReportDir(reportDir);
  await copyFileReplacing(tempUri, pdfPath);

  const [photoCount, configHash] = await Promise.all([
    getPhotoCountForBlockDate(opts.blockId, opts.date),
    getReportConfigHash(),
  ]);
  await upsertGeneratedReport({
    blockId: opts.blockId,
    date: opts.date,
    photoCount,
    configHash,
    pdfPath,
  });

  return { uri: pdfPath, fromCache: false };
}

// ── ZIP filename builder ──────────────────────────────────────────────────────
function buildZipFilename(
  p: PhotoWithHierarchy,
  seq: string,
  date: string,
  wmConfig: WatermarkConfig,
): string {
  if (!wmConfig.enabled) return `${date}_${seq}.jpg`;

  const parts: string[] = [date, seq];

  if (isWatermarkFieldOn(wmConfig, 'datetime')) {
    const d = new Date(p.captured_at);
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

// ── ZIP export ───────────────────────────────────────────────────────────────
async function buildZIPContent(opts: {
  blockName: string;
  date: string;
  blockId: number;
  projectName: string;
  pdfPath: string;
  onProgress?: (current: number, total: number) => void;
}): Promise<string> {
  const [photos, wmConfig] = await Promise.all([
    getPhotosForReport(opts.blockId, opts.date),
    getWatermarkConfig(),
  ]);
  const totalSteps = photos.length + 3;
  opts.onProgress?.(0, totalSteps);

  const zip = new JSZip();
  const folderName = buildReportFolderName(opts.date, opts.projectName, opts.blockName);
  const rootFolder = zip.folder(folderName)!;

  const base64Map = await loadAllPhotoBase64(
    photos,
    'high',
    (current) => opts.onProgress?.(current, totalSteps),
  );

  const indexLines: string[] = [];
  let exported = 0;

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const b64 = base64Map.get(p.internal_filename);
    if (!b64) continue;
    exported++;
    const folderPath = `${sanitize(p.building_name)}/${sanitize(p.floor_name)}/${sanitize(p.unit_name)}/${sanitize(p.service_name)}`;
    const folder = rootFolder.folder(folderPath)!;
    const seq = String(exported).padStart(3, '0');
    const filename = buildZipFilename(p, seq, opts.date, wmConfig);
    folder.file(filename, b64, { base64: true });
    indexLines.push(`${folderPath}/${filename} — ${formatDateTime(p.captured_at)}`);
  }

  const skipped = photos.length - exported;
  let index = `REGISTRO FOTOGRÁFICO DE OBRA\n`;
  index += `Obra: ${opts.projectName}\nQuadra: ${opts.blockName}\nData: ${formatDate(opts.date)}\n`;
  index += `Total: ${exported} foto${exported === 1 ? '' : 's'}`;
  if (skipped > 0) index += ` (${skipped} omitida${skipped === 1 ? '' : 's'})`;
  index += `\n\n${indexLines.join('\n')}\n`;

  rootFolder.file('indice.txt', index);
  opts.onProgress?.(photos.length + 1, totalSteps);

  const pdfBase64 = await FileSystem.readAsStringAsync(opts.pdfPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  rootFolder.file(PDF_FILENAME, pdfBase64, { base64: true });
  opts.onProgress?.(photos.length + 2, totalSteps);

  const zipContent = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  opts.onProgress?.(totalSteps, totalSteps);
  return zipContent;
}

export async function generateZIP(opts: {
  blockName: string;
  date: string;
  blockId: number;
  projectName: string;
  onProgress?: (current: number, total: number) => void;
}): Promise<string> {
  const { uri: pdfPath } = await getOrGeneratePDF(opts);
  const zipContent = await buildZIPContent({ ...opts, pdfPath });
  const folderName = buildReportFolderName(opts.date, opts.projectName, opts.blockName);
  const zipPath = FileSystem.cacheDirectory + `${folderName}.zip`;
  await FileSystem.writeAsStringAsync(zipPath, zipContent, { encoding: FileSystem.EncodingType.Base64 });
  return zipPath;
}

export async function getOrGenerateZIP(
  opts: ReportExportOpts,
  options?: { force?: boolean },
): Promise<ReportExportResult> {
  const reportDir = getReportDir(opts.date, opts.projectName, opts.blockName);
  const zipPath = reportDir + ZIP_FILENAME;

  if (!options?.force) {
    const report = await getGeneratedReport(opts.blockId, opts.date);
    if (await isCacheEntryValid(report, opts.blockId, opts.date, report?.zip_path)) {
      return { uri: report!.zip_path!, fromCache: true };
    }
  }

  const { uri: pdfPath } = await getOrGeneratePDF(opts, options);
  const zipContent = await buildZIPContent({ ...opts, pdfPath });
  await ensureReportDir(reportDir);
  await writeFileReplacing(zipPath, zipContent, FileSystem.EncodingType.Base64);

  const [photoCount, configHash] = await Promise.all([
    getPhotoCountForBlockDate(opts.blockId, opts.date),
    getReportConfigHash(),
  ]);
  await upsertGeneratedReport({
    blockId: opts.blockId,
    date: opts.date,
    photoCount,
    configHash,
    zipPath,
  });

  return { uri: zipPath, fromCache: false };
}

export async function shareFile(uri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Compartilhamento não disponível neste dispositivo.');
  await Sharing.shareAsync(uri, { mimeType: uri.endsWith('.pdf') ? 'application/pdf' : 'application/zip' });
}
