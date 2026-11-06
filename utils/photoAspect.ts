export const PHOTO_ASPECT_RATIO = 9 / 16;

export type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export function centerCropRect(
  width: number,
  height: number,
  aspectRatio: number = PHOTO_ASPECT_RATIO,
): CropRect {
  const w = Math.round(width);
  const h = Math.round(height);
  if (w <= 0 || h <= 0) {
    return { originX: 0, originY: 0, width: Math.max(1, w), height: Math.max(1, h) };
  }

  const current = w / h;
  let cropW: number;
  let cropH: number;
  let originX: number;
  let originY: number;

  if (current > aspectRatio) {
    cropH = h;
    cropW = Math.min(w, Math.max(1, Math.round(h * aspectRatio)));
    originX = Math.round((w - cropW) / 2);
    originY = 0;
  } else {
    cropW = w;
    cropH = Math.min(h, Math.max(1, Math.round(w / aspectRatio)));
    originX = 0;
    originY = Math.round((h - cropH) / 2);
  }

  if (originX + cropW > w) originX = w - cropW;
  if (originY + cropH > h) originY = h - cropH;
  if (originX < 0) originX = 0;
  if (originY < 0) originY = 0;

  return { originX, originY, width: cropW, height: cropH };
}
