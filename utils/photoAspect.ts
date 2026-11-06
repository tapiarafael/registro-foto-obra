export const PHOTO_ASPECT_RATIO = 9 / 16;
export const LANDSCAPE_PHOTO_ASPECT_RATIO = 16 / 9;

export type DeviceOrientation =
  | 'portrait'
  | 'portrait-upside-down'
  | 'landscape-left'
  | 'landscape-right';

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

function swapped(rotation: number): boolean {
  return Math.abs(rotation) % 180 !== 0;
}

// A sideways hold should stay horizontal. CameraX sometimes still bakes the
// portrait-locked preview, so the bitmap is tall while the phone was horizontal.
export function rotationToUpright(
  width: number,
  height: number,
  orientation?: DeviceOrientation | null,
): number {
  if (!orientation) return 0;
  const bufferIsLandscape = width > height;
  const holdIsLandscape = orientation === 'landscape-left' || orientation === 'landscape-right';
  if (bufferIsLandscape === holdIsLandscape) return 0;
  if (orientation === 'landscape-right' || orientation === 'portrait-upside-down') return -90;
  return 90;
}

export function photoFrameAspect(width: number, height: number): number {
  return width > height ? LANDSCAPE_PHOTO_ASPECT_RATIO : PHOTO_ASPECT_RATIO;
}

export function displayAspectRatio(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return PHOTO_ASPECT_RATIO;
  return width / height;
}

export function captureFrame(
  width: number,
  height: number,
  orientation?: DeviceOrientation | null,
): { rotation: number; crop: CropRect } {
  const rotation = rotationToUpright(width, height, orientation);
  const upright = swapped(rotation) ? { width: height, height: width } : { width, height };
  return {
    rotation,
    crop: centerCropRect(upright.width, upright.height, photoFrameAspect(upright.width, upright.height)),
  };
}
