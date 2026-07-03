import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import type { PDFDocument, PDFFont } from 'pdf-lib';

function getFontkit() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@pdf-lib/fontkit') as { create?: unknown; default?: { create?: unknown } };
  const fontkit = typeof mod?.create === 'function' ? mod : mod?.default;
  if (!fontkit || typeof fontkit.create !== 'function') {
    throw new Error('Failed to load @pdf-lib/fontkit');
  }
  return fontkit;
}

export function registerPdfFontkit(pdfDoc: PDFDocument): void {
  // Loaded via require(); pdf-lib's Fontkit type is not exported for external modules.
  pdfDoc.registerFontkit(getFontkit() as Parameters<PDFDocument['registerFontkit']>[0]);
}

async function loadFontBytes(moduleId: number): Promise<Uint8Array> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const isTtf =
    (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) ||
    (bytes[0] === 0x4f && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4f);
  if (!isTtf) {
    throw new Error(`Invalid font asset at ${uri}: expected TTF/OTF data`);
  }
  return bytes;
}

export async function loadReportFonts(pdfDoc: PDFDocument): Promise<{ font: PDFFont; fontBold: PDFFont }> {
  registerPdfFontkit(pdfDoc);
  const [regularBytes, boldBytes] = await Promise.all([
    loadFontBytes(require('@/assets/fonts/ArchivoNarrow-Regular.ttf')),
    loadFontBytes(require('@/assets/fonts/ArchivoNarrow-Bold.ttf')),
  ]);
  const font = await pdfDoc.embedFont(regularBytes, { subset: true });
  const fontBold = await pdfDoc.embedFont(boldBytes, { subset: true });
  return { font, fontBold };
}
