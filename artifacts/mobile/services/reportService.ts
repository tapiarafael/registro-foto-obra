import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { getPhotosForReport, getAppSetting, type PhotoWithHierarchy } from '@/db/database';
import { formatDate, formatDateTime, formatDatePart, formatTime, getPhotoUri } from './photoService';

// ── Grouping types ──────────────────────────────────────────────────────────
type GroupField = 'building' | 'floor' | 'unit' | 'service';

const FIELD_LABELS: Record<GroupField, string> = {
  building: 'Prédio',
  floor: 'Pavimento',
  unit: 'Unidade',
  service: 'Serviço',
};

const DEFAULT_GROUPING: GroupField[] = ['building', 'floor', 'unit', 'service'];

function getFieldValue(p: PhotoWithHierarchy, field: GroupField): string {
  switch (field) {
    case 'building': return p.building_name;
    case 'floor': return p.floor_name;
    case 'unit': return p.unit_name;
    case 'service': return p.service_name;
  }
}

function getFieldSort(p: PhotoWithHierarchy, field: GroupField): number {
  switch (field) {
    case 'building': return p.building_sort ?? 0;
    case 'floor': return p.floor_sort ?? 0;
    case 'unit': return p.unit_sort ?? 0;
    case 'service': return p.service_sort ?? 0;
  }
}

// ── Photo caption field types ────────────────────────────────────────────────
type PhotoField = 'date' | 'time' | 'block' | 'building' | 'floor' | 'unit' | 'service';
const ALL_PHOTO_FIELDS: PhotoField[] = ['date', 'time', 'block', 'building', 'floor', 'unit', 'service'];

// ── HTML builders ───────────────────────────────────────────────────────────
function renderGroupedHTML(
  photos: PhotoWithHierarchy[],
  fields: GroupField[],
  base64Map: Map<string, string>,
  color: string,
  photoFields: Set<PhotoField>,
  depth = 0,
): string {
  if (fields.length === 0 || photos.length === 0) {
    return renderPhotoGrid(photos, base64Map, photoFields);
  }
  const [field, ...rest] = fields;
  const groupMap = new Map<string, PhotoWithHierarchy[]>();
  const sortMap = new Map<string, number>();
  for (const p of photos) {
    const key = getFieldValue(p, field);
    const sort = getFieldSort(p, field);
    if (!groupMap.has(key)) { groupMap.set(key, []); sortMap.set(key, sort); }
    groupMap.get(key)!.push(p);
  }
  const sortedKeys = Array.from(groupMap.keys()).sort(
    (a, b) => (sortMap.get(a) ?? 0) - (sortMap.get(b) ?? 0)
  );

  const headingCSS = [
    `font-size:16px;color:${color};border-bottom:2px solid ${color};padding-bottom:4px;margin:20px 0 12px;font-weight:700;`,
    `font-size:14px;color:#333;border-bottom:1px solid #ddd;padding-bottom:3px;margin:14px 0 8px;font-weight:600;`,
    `font-size:12px;color:#555;margin:10px 0 6px;font-weight:600;`,
    `font-size:11px;color:#777;margin:8px 0 4px;font-weight:500;font-style:italic;`,
  ];
  const level = Math.min(depth, 3);
  const tag = depth < 4 ? `h${depth + 2}` : 'div';

  return sortedKeys.map(key => `
    <div>
      <${tag} style="${headingCSS[level]}">${FIELD_LABELS[field]}: ${escHtml(key)}</${tag}>
      ${renderGroupedHTML(groupMap.get(key)!, rest, base64Map, color, photoFields, depth + 1)}
    </div>
  `).join('');
}

function renderPhotoGrid(
  photos: PhotoWithHierarchy[],
  base64Map: Map<string, string>,
  photoFields: Set<PhotoField>,
): string {
  if (photos.length === 0) return '';
  const rows: string[] = [];
  for (let i = 0; i < photos.length; i += 2) {
    const p1 = photos[i];
    const p2 = photos[i + 1];
    rows.push(
      `<div style="display:flex;gap:10px;margin-bottom:12px;page-break-inside:avoid;">` +
      buildPhotoCard(p1, base64Map.get(p1.internal_filename) ?? '', photoFields) +
      (p2 ? buildPhotoCard(p2, base64Map.get(p2.internal_filename) ?? '', photoFields) : '<div style="flex:1;"></div>') +
      `</div>`
    );
  }
  return rows.join('');
}

function buildPhotoCard(
  photo: PhotoWithHierarchy,
  base64: string,
  photoFields: Set<PhotoField>,
): string {
  const src = base64 ? `data:image/jpeg;base64,${base64}` : '';

  // Compose caption sections
  const dtParts: string[] = [];
  if (photoFields.has('date')) dtParts.push(formatDatePart(photo.captured_at));
  if (photoFields.has('time')) dtParts.push(formatTime(photo.captured_at));

  const locParts: string[] = [];
  if (photoFields.has('block') && photo.block_name) locParts.push(photo.block_name);
  if (photoFields.has('building') && photo.building_name) locParts.push(photo.building_name);
  if (photoFields.has('floor') && photo.floor_name) locParts.push(photo.floor_name);

  const unitParts: string[] = [];
  if (photoFields.has('unit') && photo.unit_name) unitParts.push(photo.unit_name);
  if (photoFields.has('service') && photo.service_name) unitParts.push(photo.service_name);

  const captionLines = [
    dtParts.length ? `<div class="cap-dt">${escHtml(dtParts.join(' '))}</div>` : '',
    locParts.length ? `<div class="cap-loc">${escHtml(locParts.join(' · '))}</div>` : '',
    unitParts.length ? `<div class="cap-unit">${escHtml(unitParts.join(' · '))}</div>` : '',
  ].filter(Boolean);

  return `
    <div class="photo-card">
      ${src
    ? `<img src="${src}" />`
    : '<div style="height:160px;background:#e0e0e0;display:flex;align-items:center;justify-content:center;color:#999;font-size:10px;">Imagem indisponível</div>'
  }
      ${captionLines.length > 0 ? `<div class="info">${captionLines.join('')}</div>` : ''}
    </div>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  // Load all settings in parallel
  const [colorSetting, paginationSetting, logoPathSetting, groupingStr, photoFieldsStr] = await Promise.all([
    getAppSetting('report_primaryColor'),
    getAppSetting('report_paginationMode'),
    getAppSetting('report_logoPath'),
    getAppSetting('report_groupingFields'),
    getAppSetting('report_photoFields'),
  ]);

  const primaryColor = colorSetting || '#0D47A1';
  const paginationMode = (paginationSetting as 'none' | 'current' | 'current_total') || 'none';

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

  const enabledPhotoFields: Set<PhotoField> = (() => {
    if (!photoFieldsStr) return new Set(ALL_PHOTO_FIELDS);
    try {
      const arr = JSON.parse(photoFieldsStr) as PhotoField[];
      return new Set(Array.isArray(arr) ? arr : ALL_PHOTO_FIELDS);
    } catch { return new Set(ALL_PHOTO_FIELDS); }
  })();

  // Load photos
  const photos = await getPhotosForReport(opts.blockId, opts.date);
  opts.onProgress?.(0, photos.length);

  // Pre-load all photo base64 into a Map (single pass)
  const base64Map = new Map<string, string>();
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    try {
      const b64 = await FileSystem.readAsStringAsync(getPhotoUri(p.internal_filename), {
        encoding: FileSystem.EncodingType.Base64,
      });
      base64Map.set(p.internal_filename, b64);
    } catch {}
    opts.onProgress?.(i + 1, photos.length);
  }

  // Load logo base64
  let logoBase64 = '';
  if (logoPathSetting) {
    try {
      const info = await FileSystem.getInfoAsync(logoPathSetting);
      if (info.exists) {
        logoBase64 = await FileSystem.readAsStringAsync(logoPathSetting, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch {}
  }

  // Pagination CSS
  const paginationCSS =
    paginationMode === 'current'
      ? `@page { @bottom-center { content: 'Página ' counter(page); font-size:9px; color:#666; } }`
      : paginationMode === 'current_total'
      ? `@page { @bottom-center { content: 'Página ' counter(page) ' de ' counter(pages); font-size:9px; color:#666; } }`
      : '';

  // Build body content
  const bodyContent =
    photos.length === 0
      ? '<div style="text-align:center;color:#777;padding:48px 0;">Nenhuma foto registrada nesta data e quadra.</div>'
      : renderGroupedHTML(photos, groupingFields, base64Map, primaryColor, enabledPhotoFields);

  const logoHTML = logoBase64
    ? `<img src="data:image/jpeg;base64,${logoBase64}" style="height:48px;max-width:140px;object-fit:contain;float:right;margin:0 0 6px 12px;" />`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #17202A; background: #fff; padding: 20px; }
  .header { border-bottom: 3px solid ${primaryColor}; padding-bottom: 12px; margin-bottom: 20px; overflow: hidden; }
  .header h1 { font-size: 20px; color: ${primaryColor}; margin-bottom: 4px; }
  .header .meta { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px; }
  .header .meta span { font-size: 11px; color: #52606D; }
  .header .meta strong { color: #17202A; }
  .photo-card { flex: 1; border: 1px solid #D9E2EC; border-radius: 6px; overflow: hidden; background: #F5F7FA; }
  .photo-card img { width: 100%; display: block; max-height: 200px; object-fit: cover; }
  .photo-card .info { padding: 6px 8px; }
  .cap-dt { font-size: 9px; color: #52606D; margin-bottom: 2px; }
  .cap-loc { font-size: 10px; font-weight: bold; color: #17202A; }
  .cap-unit { font-size: 9px; color: ${primaryColor}; margin-top: 2px; }
  footer { margin-top: 24px; border-top: 1px solid #D9E2EC; padding-top: 10px; font-size: 9px; color: #52606D; text-align: right; }
  ${paginationCSS}
</style>
</head>
<body>
<div class="header">
  ${logoHTML}
  <h1>Registro Fotográfico de Obra</h1>
  <div style="font-size:14px;color:#17202A;font-weight:bold;margin-top:4px;">${escHtml(opts.projectName)}</div>
  <div class="meta">
    <span>Quadra: <strong>${escHtml(opts.blockName)}</strong></span>
    <span>Data: <strong>${formatDate(opts.date)}</strong></span>
    <span>Total de fotos: <strong>${photos.length}</strong></span>
    ${opts.responsibleEngineer ? `<span>Responsável: <strong>${escHtml(opts.responsibleEngineer)}</strong></span>` : ''}
  </div>
</div>
${bodyContent}
<footer>Relatório gerado em ${formatDateTime(new Date().toISOString())} · ${escHtml(opts.projectName)}</footer>
</body>
</html>`;

  const result = await Print.printToFileAsync({ html, base64: false });
  return result.uri;
}

// ── ZIP export ───────────────────────────────────────────────────────────────
export async function generateZIP(opts: {
  blockName: string;
  date: string;
  blockId: number;
  projectName: string;
  onProgress?: (current: number, total: number) => void;
}): Promise<string> {
  const photos = await getPhotosForReport(opts.blockId, opts.date);
  opts.onProgress?.(0, photos.length + 1);

  const zip = new JSZip();
  const folderName = `${opts.date}_${sanitize(opts.projectName)}_${sanitize(opts.blockName)}`;
  const rootFolder = zip.folder(folderName)!;

  let index = `REGISTRO FOTOGRÁFICO DE OBRA\n`;
  index += `Obra: ${opts.projectName}\nQuadra: ${opts.blockName}\nData: ${formatDate(opts.date)}\nTotal: ${photos.length} fotos\n\n`;

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const folderPath = `${sanitize(p.building_name)}/${sanitize(p.floor_name)}/${sanitize(p.unit_name)}/${sanitize(p.service_name)}`;
    const folder = rootFolder.folder(folderPath)!;
    const seq = String(i + 1).padStart(3, '0');
    const filename = `${opts.date}_${seq}.jpg`;
    try {
      const uri = getPhotoUri(p.internal_filename);
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      folder.file(filename, b64, { base64: true });
      index += `${folderPath}/${filename} — ${formatDateTime(p.captured_at)}\n`;
    } catch {}
    opts.onProgress?.(i + 1, photos.length + 1);
  }

  rootFolder.file('indice.txt', index);
  opts.onProgress?.(photos.length + 1, photos.length + 1);

  const zipContent = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const zipPath = FileSystem.cacheDirectory + `${folderName}.zip`;
  await FileSystem.writeAsStringAsync(zipPath, zipContent, { encoding: FileSystem.EncodingType.Base64 });
  return zipPath;
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9\u00C0-\u00FF _-]/g, '').trim().replace(/\s+/g, '_');
}

export async function shareFile(uri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Compartilhamento não disponível neste dispositivo.');
  await Sharing.shareAsync(uri, { mimeType: uri.endsWith('.pdf') ? 'application/pdf' : 'application/zip' });
}
