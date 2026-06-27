import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { getPhotosForReport } from '@/db/database';
import { formatDate, formatDateTime, getPhotoUri } from './photoService';

export async function generatePDF(opts: {
  blockName: string;
  date: string;
  projectName: string;
  blockId: number;
  responsibleEngineer?: string | null;
  onProgress?: (current: number, total: number) => void;
}): Promise<string> {
  const photos = await getPhotosForReport(opts.blockId, opts.date);
  opts.onProgress?.(0, photos.length);

  // Build photo HTML — 2 per row
  const photoRows: string[] = [];
  for (let i = 0; i < photos.length; i += 2) {
    const left = photos[i];
    const right = photos[i + 1];
    const leftUri = getPhotoUri(left.internal_filename);
    const rightUri = right ? getPhotoUri(right.internal_filename) : null;

    let leftBase64 = '';
    let rightBase64 = '';
    try {
      leftBase64 = await FileSystem.readAsStringAsync(leftUri, { encoding: FileSystem.EncodingType.Base64 });
    } catch {}
    if (rightUri) {
      try {
        rightBase64 = await FileSystem.readAsStringAsync(rightUri, { encoding: FileSystem.EncodingType.Base64 });
      } catch {}
    }

    const leftCard = buildPhotoCard(left, leftBase64);
    const rightCard = right ? buildPhotoCard(right, rightBase64) : '<div style="flex:1;"></div>';
    photoRows.push(`<div style="display:flex;gap:12px;margin-bottom:12px;">${leftCard}${rightCard}</div>`);
    opts.onProgress?.(i + 2, photos.length);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #17202A; background: #fff; padding: 20px; }
  .header { border-bottom: 3px solid #0D47A1; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; color: #0D47A1; margin-bottom: 4px; }
  .header .meta { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px; }
  .header .meta span { font-size: 11px; color: #52606D; }
  .header .meta strong { color: #17202A; }
  .photo-card { flex: 1; border: 1px solid #D9E2EC; border-radius: 6px; overflow: hidden; background: #F5F7FA; }
  .photo-card img { width: 100%; display: block; max-height: 200px; object-fit: cover; }
  .photo-card .info { padding: 6px 8px; }
  .photo-card .watermark { font-size: 9px; color: #52606D; margin-bottom: 2px; }
  .photo-card .hier { font-size: 10px; font-weight: bold; color: #17202A; }
  .photo-card .service { font-size: 9px; color: #0D47A1; margin-top: 2px; }
  .no-photos { text-align: center; color: #52606D; padding: 40px; }
  footer { margin-top: 24px; border-top: 1px solid #D9E2EC; padding-top: 10px; font-size: 9px; color: #52606D; text-align: right; }
</style>
</head>
<body>
<div class="header">
  <h1>Registro Fotográfico de Obra</h1>
  <div style="font-size:14px; color:#17202A; font-weight:bold; margin-top:4px;">${escHtml(opts.projectName)}</div>
  <div class="meta">
    <span>Quadra: <strong>${escHtml(opts.blockName)}</strong></span>
    <span>Data: <strong>${formatDate(opts.date)}</strong></span>
    <span>Total de fotos: <strong>${photos.length}</strong></span>
    ${opts.responsibleEngineer ? `<span>Responsável: <strong>${escHtml(opts.responsibleEngineer)}</strong></span>` : ''}
  </div>
</div>
${photos.length === 0
    ? '<div class="no-photos">Nenhuma foto registrada nesta data e quadra.</div>'
    : photoRows.join('')}
<footer>Relatório gerado em ${formatDateTime(new Date().toISOString())} · ${escHtml(opts.projectName)}</footer>
</body>
</html>`;

  const result = await Print.printToFileAsync({ html, base64: false });
  return result.uri;
}

function buildPhotoCard(photo: { internal_filename: string; captured_at: string; building_name: string; floor_name: string; unit_name: string; service_name: string }, base64: string): string {
  const src = base64 ? `data:image/jpeg;base64,${base64}` : '';
  return `
    <div class="photo-card">
      ${src ? `<img src="${src}" />` : '<div style="height:160px;background:#e0e0e0;display:flex;align-items:center;justify-content:center;color:#999;">Imagem indisponível</div>'}
      <div class="info">
        <div class="watermark">${escHtml(formatDateTime(photo.captured_at))}</div>
        <div class="hier">${escHtml(photo.building_name)} · ${escHtml(photo.floor_name)} · ${escHtml(photo.unit_name)}</div>
        <div class="service">${escHtml(photo.service_name)}</div>
      </div>
    </div>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

  // Index text file
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
