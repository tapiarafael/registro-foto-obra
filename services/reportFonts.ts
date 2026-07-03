import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import fontkit from '@pdf-lib/fontkit';
import type { PDFDocument, PDFFont } from 'pdf-lib';

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
  return bytes;
}

export async function loadReportFonts(pdfDoc: PDFDocument): Promise<{ font: PDFFont; fontBold: PDFFont }> {
  pdfDoc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    loadFontBytes(require('@/assets/fonts/ArchivoNarrow-Regular.ttf')),
    loadFontBytes(require('@/assets/fonts/ArchivoNarrow-Bold.ttf')),
  ]);
  const font = await pdfDoc.embedFont(regularBytes, { subset: true });
  const fontBold = await pdfDoc.embedFont(boldBytes, { subset: true });
  return { font, fontBold };
}
