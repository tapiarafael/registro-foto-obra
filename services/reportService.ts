import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  getPhotosForReport,
  getAppSetting,
  getWatermarkConfig,
  getGeneratedReport,
  getPhotoCountForBlockDate,
  getReportConfigHash,
  getReportShowLabels,
  upsertGeneratedReport,
  type GeneratedReport,
} from '@/db/database';
import {
  buildReportPdf,
  type GroupField,
  type ImageQuality,
} from './pdfReportBuilder';
import { buildReportZip } from './zipReportBuilder';

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

const BINARY_WRITE_CHUNK = 512 * 1024;

// Writes raw bytes to disk without any base64 conversion, chunking large
// payloads through a FileHandle so we never allocate a second full-size copy.
function writeBytesReplacing(path: string, bytes: Uint8Array): void {
  const file = new File(path);
  if (file.exists) file.delete();
  file.create({ overwrite: true });

  if (bytes.length <= BINARY_WRITE_CHUNK) {
    file.write(bytes);
    return;
  }

  const handle = file.open();
  try {
    for (let i = 0; i < bytes.length; i += BINARY_WRITE_CHUNK) {
      handle.writeBytes(bytes.subarray(i, Math.min(i + BINARY_WRITE_CHUNK, bytes.length)));
    }
  } finally {
    handle.close();
  }
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

// ── PDF export ───────────────────────────────────────────────────────────────
export async function generatePDF(opts: {
  blockName: string;
  date: string;
  projectName: string;
  blockId: number;
  responsibleEngineer?: string | null;
  onProgress?: (current: number, total: number) => void;
}): Promise<string> {
  const [colorSetting, paginationSetting, logoPathSetting, groupingStr, qualitySetting, showSectionLabels, wmConfig] = await Promise.all([
    getAppSetting('report_primaryColor'),
    getAppSetting('report_paginationMode'),
    getAppSetting('report_logoPath'),
    getAppSetting('report_groupingFields'),
    getAppSetting('report_imageQuality'),
    getReportShowLabels(),
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

  const pdfBytes = await buildReportPdf({
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
    showSectionLabels,
    onProgress: opts.onProgress,
  });

  const tempPath = FileSystem.cacheDirectory + `report-${Date.now()}.pdf`;
  writeBytesReplacing(tempPath, pdfBytes);
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

// ── ZIP export ───────────────────────────────────────────────────────────────
export async function generateZIP(opts: {
  blockName: string;
  date: string;
  blockId: number;
  projectName: string;
  onProgress?: (current: number, total: number) => void;
}): Promise<string> {
  const { uri: pdfPath } = await getOrGeneratePDF(opts);
  const folderName = buildReportFolderName(opts.date, opts.projectName, opts.blockName);
  const zipPath = FileSystem.cacheDirectory + `${folderName}.zip`;
  await buildReportZip({ ...opts, pdfPath, destPath: zipPath });
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
  await ensureReportDir(reportDir);
  await buildReportZip({ ...opts, pdfPath, destPath: zipPath });

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
