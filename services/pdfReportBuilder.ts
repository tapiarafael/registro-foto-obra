import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  PDFDocument,
  PDFPage,
  PDFFont,
  PDFImage,
  RGB,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import type { PhotoWithHierarchy, WatermarkConfig } from '@/db/database';
import { formatDate, formatDateTime, formatDatePart, formatTime } from '@/utils/datetime';
import { getPhotoUri, getThumbnailUri } from './photoService';

export type ImageQuality = 'fast' | 'medium' | 'high';
export type GroupField = 'building' | 'floor' | 'unit' | 'service';
export type PaginationMode = 'none' | 'current' | 'current_total';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 20;
const COL_GAP = 10;
const MAX_IMG_HEIGHT = 150;
const MEDIUM_WIDTH = 800;
const FOOTER_RESERVE = 28;
const ROW_GAP = 12;
const CARD_PADDING = 4;

const FIELD_LABELS: Record<GroupField, string> = {
  building: 'Prédio',
  floor: 'Pavimento',
  unit: 'Unidade',
  service: 'Serviço',
};

const MUTED = rgb(0.32, 0.38, 0.43);
const TEXT_DARK = rgb(0.09, 0.13, 0.16);
const CARD_BG = rgb(0.96, 0.97, 0.98);
const CARD_BORDER = rgb(0.85, 0.89, 0.93);
const PLACEHOLDER_BG = rgb(0.88, 0.88, 0.88);

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function containFit(iw: number, ih: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / iw, boxH / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  return {
    drawW,
    drawH,
    offsetX: (boxW - drawW) / 2,
    offsetY: (boxH - drawH) / 2,
  };
}

function measureCaptionHeight(
  lines: string[],
  colWidth: number,
  font: PDFFont,
  fontBold: PDFFont,
): number {
  if (lines.length === 0) return 0;
  const lineHeight = 11;
  let total = 12;
  for (let i = 0; i < lines.length; i++) {
    const size = i === 1 ? 10 : 9;
    const f = i === 1 ? fontBold : font;
    total += wrapText(lines[i], colWidth - 16, f, size).length * lineHeight;
  }
  return total;
}

function measureCardHeight(
  photo: PhotoWithHierarchy,
  wmConfig: WatermarkConfig,
  colWidth: number,
  font: PDFFont,
  fontBold: PDFFont,
): number {
  const captionH = measureCaptionHeight(buildCaptionLines(photo, wmConfig), colWidth, font, fontBold);
  return MAX_IMG_HEIGHT + captionH + CARD_PADDING;
}

function isWatermarkFieldOn(wmConfig: WatermarkConfig, key: string): boolean {
  const f = wmConfig.fields.find(wf => wf.field === key);
  return f ? f.enabled : true;
}

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

function buildCaptionLines(photo: PhotoWithHierarchy, wmConfig: WatermarkConfig): string[] {
  const isOn = (key: string) => wmConfig.enabled && isWatermarkFieldOn(wmConfig, key);
  const lines: string[] = [];

  const dtParts: string[] = [];
  if (isOn('datetime')) {
    dtParts.push(formatDatePart(photo.captured_at));
    dtParts.push(formatTime(photo.captured_at));
  }
  if (dtParts.length) lines.push(dtParts.join(' '));

  const locParts: string[] = [];
  if (isOn('quadra') && photo.block_name) locParts.push(photo.block_name);
  if (isOn('predio') && photo.building_name) locParts.push(photo.building_name);
  if (isOn('pavimento') && photo.floor_name) locParts.push(photo.floor_name);
  if (locParts.length) lines.push(locParts.join(' · '));

  const unitParts: string[] = [];
  if (isOn('unidade') && photo.unit_name) unitParts.push(photo.unit_name);
  if (isOn('servico') && photo.service_name) unitParts.push(photo.service_name);
  if (unitParts.length) lines.push(unitParts.join(' · '));

  return lines;
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

class PdfLayout {
  private cursorY = 0;
  private readonly contentHeight: number;
  private readonly colWidth: number;

  constructor(
    private pdfDoc: PDFDocument,
    private page: PDFPage,
    private font: PDFFont,
    private fontBold: PDFFont,
    private primaryColor: RGB,
    private showSectionLabels = true,
    private readonly pageWidth = PAGE_WIDTH,
    private readonly pageHeight = PAGE_HEIGHT,
    private readonly margin = MARGIN,
  ) {
    this.contentHeight = pageHeight - margin * 2 - FOOTER_RESERVE;
    this.colWidth = (pageWidth - margin * 2 - COL_GAP) / 2;
  }

  get currentPage(): PDFPage {
    return this.page;
  }

  private topY(): number {
    return this.pageHeight - this.margin - this.cursorY;
  }

  ensureSpace(needed: number): void {
    if (this.cursorY + needed > this.contentHeight) {
      this.page = this.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.cursorY = 0;
    }
  }

  advance(amount: number): void {
    this.cursorY += amount;
  }

  drawLine(yOffset: number, color: RGB, thickness = 1): void {
    const y = this.topY() - yOffset;
    this.page.drawLine({
      start: { x: this.margin, y },
      end: { x: this.pageWidth - this.margin, y },
      thickness,
      color,
    });
  }

  drawQuadraHeading(label: string): void {
    const text = this.showSectionLabels ? `Quadra: ${label}` : label;
    const size = 16;
    const gap = 20;
    const lineH = size + 6;

    this.ensureSpace(gap + lineH + 4);
    this.advance(gap);

    const y = this.topY() - size;
    this.page.drawText(text, {
      x: this.margin,
      y,
      size,
      font: this.fontBold,
      color: this.primaryColor,
    });
    this.drawLine(size + 4, this.primaryColor, 2);
    this.advance(lineH + 4);
  }

  drawHeading(field: GroupField, label: string, level: number, isFirstService: boolean): void {
    const text = this.showSectionLabels ? `${FIELD_LABELS[field]}: ${label}` : label;
    const isService = field === 'service';

    if (isService) {
      const gap = isFirstService ? 8 : 20;
      const boxH = 22;
      const blockH = gap + boxH + 8;
      this.ensureSpace(blockH);
      if (!isFirstService) {
        this.advance(4);
        this.drawLine(0, CARD_BORDER, 2);
        this.advance(12);
      } else {
        this.advance(gap);
      }
      const boxBottom = this.pageHeight - this.margin - this.cursorY - boxH;
      this.page.drawRectangle({
        x: this.margin,
        y: boxBottom,
        width: this.pageWidth - this.margin * 2,
        height: boxH,
        color: rgb(0.94, 0.96, 0.97),
      });
      this.page.drawRectangle({
        x: this.margin,
        y: boxBottom,
        width: 4,
        height: boxH,
        color: this.primaryColor,
      });
      this.page.drawText(text, {
        x: this.margin + 10,
        y: boxBottom + 5,
        size: 13,
        font: this.fontBold,
        color: this.primaryColor,
      });
      this.advance(boxH + 8);
      return;
    }

    const sizes = [16, 14, 12, 11];
    const gaps = [20, 14, 10, 8];
    const size = sizes[Math.min(level, 3)];
    const gap = gaps[Math.min(level, 3)];
    const lineH = size + 6;

    this.ensureSpace(gap + lineH + 4);
    this.advance(gap);

    const y = this.topY() - size;
    const colors = [this.primaryColor, TEXT_DARK, rgb(0.33, 0.33, 0.33), rgb(0.47, 0.47, 0.47)];
    const useFont = level === 0 ? this.fontBold : this.font;

    this.page.drawText(text, {
      x: this.margin,
      y,
      size,
      font: useFont,
      color: colors[Math.min(level, 3)],
    });

    if (level === 0) {
      this.drawLine(size + 4, this.primaryColor, 2);
    } else if (level === 1) {
      this.drawLine(size + 2, rgb(0.87, 0.87, 0.87), 1);
    }

    this.advance(lineH + 4);
  }

  drawHeader(opts: {
    projectName: string;
    blockName: string;
    date: string;
    photoCount: number;
    responsibleEngineer?: string | null;
    logoImage?: PDFImage | null;
  }): void {
    const headerStartY = this.cursorY;
    let headerHeight = 0;

    if (opts.logoImage) {
      const maxLogoW = 140;
      const maxLogoH = 48;
      const { width: lw, height: lh } = opts.logoImage.size();
      const scale = Math.min(maxLogoW / lw, maxLogoH / lh, 1);
      const drawW = lw * scale;
      const drawH = lh * scale;
      this.page.drawImage(opts.logoImage, {
        x: this.pageWidth - this.margin - drawW,
        y: this.pageHeight - this.margin - drawH,
        width: drawW,
        height: drawH,
      });
      headerHeight = Math.max(headerHeight, drawH + 6);
    }

    const title = 'Registro Fotográfico de Obra';
    const titleSize = 20;
    let y = this.pageHeight - this.margin - titleSize;
    this.page.drawText(title, {
      x: this.margin,
      y,
      size: titleSize,
      font: this.fontBold,
      color: this.primaryColor,
    });
    headerHeight = Math.max(headerHeight, titleSize + 4);

    y -= 22;
    this.page.drawText(opts.projectName, {
      x: this.margin,
      y,
      size: 14,
      font: this.fontBold,
      color: TEXT_DARK,
    });
    headerHeight = Math.max(headerHeight, titleSize + 22);

    const metaLines = [
      `Quadra: ${opts.blockName}`,
      `Data: ${formatDate(opts.date)}`,
      `Total de fotos: ${opts.photoCount}`,
      ...(opts.responsibleEngineer ? [`Responsável: ${opts.responsibleEngineer}`] : []),
    ];
    y -= 16;
    for (const line of metaLines) {
      this.page.drawText(line, {
        x: this.margin,
        y,
        size: 11,
        font: this.font,
        color: MUTED,
      });
      y -= 14;
      headerHeight = Math.max(headerHeight, this.pageHeight - this.margin - y);
    }

    this.cursorY = headerStartY + headerHeight + 12;
    this.drawLine(0, this.primaryColor, 3);
    this.advance(20);
  }

  drawEmptyState(): void {
    this.ensureSpace(60);
    const text = 'Nenhuma foto registrada nesta data e quadra.';
    const size = 11;
    const w = this.font.widthOfTextAtSize(text, size);
    this.page.drawText(text, {
      x: (this.pageWidth - w) / 2,
      y: this.topY() - 40,
      size,
      font: this.font,
      color: MUTED,
    });
    this.advance(60);
  }

  drawFooter(projectName: string): void {
    this.ensureSpace(36);
    const text = `Relatório gerado em ${formatDateTime(new Date().toISOString())} · ${projectName}`;
    const size = 9;
    this.advance(8);
    this.drawLine(0, CARD_BORDER, 1);
    const w = this.font.widthOfTextAtSize(text, size);
    this.page.drawText(text, {
      x: this.pageWidth - this.margin - w,
      y: this.margin + 4,
      size,
      font: this.font,
      color: MUTED,
    });
    this.advance(28);
  }

  async drawPhotoCard(
    photo: PhotoWithHierarchy,
    colX: number,
    rowTopY: number,
    quality: ImageQuality,
    wmConfig: WatermarkConfig,
    primaryColor: RGB,
  ): Promise<number> {
    const cardW = this.colWidth;
    const captionLines = buildCaptionLines(photo, wmConfig);
    const captionH = measureCaptionHeight(captionLines, cardW, this.font, this.fontBold);
    const cardH = MAX_IMG_HEIGHT + captionH + CARD_PADDING;

    const cardBottom = this.pageHeight - this.margin - rowTopY - cardH;

    this.page.drawRectangle({
      x: colX,
      y: cardBottom,
      width: cardW,
      height: cardH,
      color: CARD_BG,
      borderColor: CARD_BORDER,
      borderWidth: 1,
    });

    const imgSlotBottom = cardBottom + captionH + CARD_PADDING;
    const imgSlotW = cardW - 2;
    const imgSlotX = colX + 1;
    let imageDrawn = false;

    try {
      const b64 = await loadPhotoBase64(photo, quality);
      if (b64) {
        const img = await this.pdfDoc.embedJpg(b64);
        const { width: iw, height: ih } = img.size();
        const { drawW, drawH, offsetX, offsetY } = containFit(iw, ih, imgSlotW, MAX_IMG_HEIGHT);
        this.page.drawImage(img, {
          x: imgSlotX + offsetX,
          y: imgSlotBottom + offsetY,
          width: drawW,
          height: drawH,
        });
        imageDrawn = true;
      }
    } catch {}

    if (!imageDrawn) {
      this.page.drawRectangle({
        x: imgSlotX,
        y: imgSlotBottom,
        width: imgSlotW,
        height: MAX_IMG_HEIGHT,
        color: PLACEHOLDER_BG,
      });
      const msg = 'Imagem indisponível';
      const msgSize = 10;
      const mw = this.font.widthOfTextAtSize(msg, msgSize);
      this.page.drawText(msg, {
        x: colX + (cardW - mw) / 2,
        y: imgSlotBottom + MAX_IMG_HEIGHT / 2 - msgSize / 2,
        size: msgSize,
        font: this.font,
        color: rgb(0.6, 0.6, 0.6),
      });
    }

    let capY = cardBottom + captionH - 8;
    for (let i = 0; i < captionLines.length; i++) {
      const size = i === 1 ? 10 : 9;
      const font = i === 1 ? this.fontBold : this.font;
      const color = i === 2 ? primaryColor : i === 1 ? TEXT_DARK : MUTED;
      const wrapped = wrapText(captionLines[i], cardW - 16, font, size);
      for (const wl of wrapped) {
        this.page.drawText(wl, {
          x: colX + 8,
          y: capY,
          size,
          font,
          color,
        });
        capY -= 11;
      }
    }

    return cardH;
  }

  async drawPhotoRow(
    photos: PhotoWithHierarchy[],
    quality: ImageQuality,
    wmConfig: WatermarkConfig,
    primaryColor: RGB,
  ): Promise<void> {
    const heights = photos.map(p =>
      measureCardHeight(p, wmConfig, this.colWidth, this.font, this.fontBold),
    );
    const rowH = heights.length > 0 ? Math.max(...heights) : 0;

    this.ensureSpace(rowH + ROW_GAP);
    const rowTopY = this.cursorY;

    const col1X = this.margin;
    const col2X = this.margin + this.colWidth + COL_GAP;

    if (photos[0]) {
      await this.drawPhotoCard(photos[0], col1X, rowTopY, quality, wmConfig, primaryColor);
    }
    if (photos[1]) {
      await this.drawPhotoCard(photos[1], col2X, rowTopY, quality, wmConfig, primaryColor);
    }

    this.cursorY = rowTopY + rowH + ROW_GAP;
  }
}

async function renderGroupedPhotos(
  layout: PdfLayout,
  photos: PhotoWithHierarchy[],
  fields: GroupField[],
  quality: ImageQuality,
  wmConfig: WatermarkConfig,
  primaryColor: RGB,
  onPhoto: ((current: number, total: number) => void) | undefined,
  total: number,
  photoCounter: { current: number },
  depth = 0,
): Promise<void> {
  if (fields.length === 0 || photos.length === 0) {
    for (let i = 0; i < photos.length; i += 2) {
      const row = [photos[i], photos[i + 1]].filter(Boolean) as PhotoWithHierarchy[];
      await layout.drawPhotoRow(row, quality, wmConfig, primaryColor);
      photoCounter.current += row.length;
      onPhoto?.(photoCounter.current, total);
    }
    return;
  }

  const [field, ...rest] = fields;
  const groupMap = new Map<string, PhotoWithHierarchy[]>();
  const sortMap = new Map<string, number>();
  for (const p of photos) {
    const key = getFieldValue(p, field);
    const sort = getFieldSort(p, field);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
      sortMap.set(key, sort);
    }
    groupMap.get(key)!.push(p);
  }

  const sortedKeys = Array.from(groupMap.keys()).sort(
    (a, b) => (sortMap.get(a) ?? 0) - (sortMap.get(b) ?? 0),
  );

  const level = Math.min(depth, 3);

  for (let idx = 0; idx < sortedKeys.length; idx++) {
    const key = sortedKeys[idx];
    layout.drawHeading(field, key, level, idx === 0);
    await renderGroupedPhotos(
      layout,
      groupMap.get(key)!,
      rest,
      quality,
      wmConfig,
      primaryColor,
      onPhoto,
      total,
      photoCounter,
      depth + 1,
    );
  }
}

async function embedLogoFromBase64(pdfDoc: PDFDocument, b64: string): Promise<PDFImage | null> {
  const isPng = b64.startsWith('iVBOR');
  const isJpeg = b64.startsWith('/9j/');

  if (isPng) {
    try {
      return await pdfDoc.embedPng(b64);
    } catch {}
  }
  if (isJpeg) {
    try {
      return await pdfDoc.embedJpg(b64);
    } catch {}
  }
  // Extension may not match bytes — try both embedders
  if (!isPng) {
    try {
      return await pdfDoc.embedPng(b64);
    } catch {}
  }
  if (!isJpeg) {
    try {
      return await pdfDoc.embedJpg(b64);
    } catch {}
  }
  return null;
}

async function loadLogoImage(pdfDoc: PDFDocument, logoPath: string | null | undefined): Promise<PDFImage | null> {
  if (!logoPath) return null;
  try {
    const info = await FileSystem.getInfoAsync(logoPath);
    if (!info.exists) return null;
    const b64 = await FileSystem.readAsStringAsync(logoPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!b64) return null;

    const embedded = await embedLogoFromBase64(pdfDoc, b64);
    if (embedded) return embedded;

    // HEIC / WebP / other formats — normalize to PNG to preserve transparency
    const converted = await ImageManipulator.manipulateAsync(
      logoPath,
      [],
      { format: ImageManipulator.SaveFormat.PNG, base64: true },
    );
    if (converted.base64) {
      return await pdfDoc.embedPng(converted.base64);
    }
    return null;
  } catch {
    return null;
  }
}

export async function buildReportPdf(opts: {
  projectName: string;
  blockName: string;
  date: string;
  responsibleEngineer?: string | null;
  photos: PhotoWithHierarchy[];
  groupingFields: GroupField[];
  imageQuality: ImageQuality;
  primaryColor: string;
  paginationMode: PaginationMode;
  logoPath?: string | null;
  wmConfig: WatermarkConfig;
  showSectionLabels?: boolean;
  onProgress?: (current: number, total: number) => void;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const primaryRgb = hexToRgb(opts.primaryColor);

  const logoImage = await loadLogoImage(pdfDoc, opts.logoPath);
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const layout = new PdfLayout(pdfDoc, page, font, fontBold, primaryRgb, opts.showSectionLabels !== false);

  layout.drawHeader({
    projectName: opts.projectName,
    blockName: opts.blockName,
    date: opts.date,
    photoCount: opts.photos.length,
    responsibleEngineer: opts.responsibleEngineer,
    logoImage,
  });

  if (opts.photos.length === 0) {
    layout.drawEmptyState();
  } else {
    layout.drawQuadraHeading(opts.blockName);
    const photoCounter = { current: 0 };
    await renderGroupedPhotos(
      layout,
      opts.photos,
      opts.groupingFields,
      opts.imageQuality,
      opts.wmConfig,
      primaryRgb,
      opts.onProgress,
      opts.photos.length,
      photoCounter,
      1,
    );
  }

  layout.drawFooter(opts.projectName);

  if (opts.paginationMode !== 'none') {
    const pages = pdfDoc.getPages();
    pages.forEach((p, idx) => {
      const label = opts.paginationMode === 'current_total'
        ? `Página ${idx + 1} de ${pages.length}`
        : `Página ${idx + 1}`;
      const size = 9;
      const w = font.widthOfTextAtSize(label, size);
      p.drawText(label, {
        x: (PAGE_WIDTH - w) / 2,
        y: 12,
        size,
        font,
        color: MUTED,
      });
    });
  }

  opts.onProgress?.(opts.photos.length, opts.photos.length);

  return pdfDoc.save({ objectsPerTick: 50 });
}
