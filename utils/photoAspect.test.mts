import assert from 'node:assert/strict';
import {
  PHOTO_ASPECT_RATIO,
  captureFrame,
  centerCropRect,
  displayAspectRatio,
  photoFrameAspect,
} from './photoAspect.ts';

assert.equal(PHOTO_ASPECT_RATIO, 9 / 16);

assert.deepEqual(
  centerCropRect(1080, 1920),
  { originX: 0, originY: 0, width: 1080, height: 1920 },
  'already 9:16 stays uncropped',
);

assert.deepEqual(
  centerCropRect(3000, 4000),
  { originX: 375, originY: 0, width: 2250, height: 4000 },
  '3:4 portrait crops left and right to 9:16',
);

assert.deepEqual(
  centerCropRect(4000, 3000),
  { originX: 1156, originY: 0, width: 1688, height: 3000 },
  '4:3 landscape crops the sides to 9:16',
);

assert.deepEqual(
  centerCropRect(1080, 2400),
  { originX: 0, originY: 240, width: 1080, height: 1920 },
  'taller than 9:16 crops top and bottom',
);

const tiny = centerCropRect(1, 1);
assert.equal(tiny.originX + tiny.width <= 1, true);
assert.equal(tiny.width >= 1, true);
assert.equal(tiny.height >= 1, true);

assert.equal(photoFrameAspect(3000, 4000), 9 / 16);
assert.equal(photoFrameAspect(4000, 3000), 16 / 9);

assert.deepEqual(
  captureFrame(4000, 3000, 'landscape-left'),
  { rotation: 0, crop: { originX: 0, originY: 375, width: 4000, height: 2250 } },
  'horizontal hold that is already wide stays 16:9 and is not rotated',
);

assert.deepEqual(
  captureFrame(3000, 4000, 'landscape-left'),
  { rotation: 90, crop: { originX: 0, originY: 375, width: 4000, height: 2250 } },
  'horizontal hold baked as portrait rotates clockwise into 16:9',
);

assert.deepEqual(
  captureFrame(3000, 4000, 'landscape-right').rotation,
  -90,
  'the other horizontal hold rotates the other way',
);

assert.deepEqual(
  captureFrame(4000, 3000, 'portrait'),
  { rotation: 90, crop: { originX: 375, originY: 0, width: 2250, height: 4000 } },
  'vertical hold baked as landscape rotates into 9:16',
);

assert.equal(captureFrame(3000, 4000, 'portrait').rotation, 0);
assert.equal(captureFrame(4000, 3000, null).rotation, 0);
assert.equal(captureFrame(4000, 3000, null).crop.height, 2250);

assert.equal(displayAspectRatio(1920, 1080), 16 / 9);
assert.equal(displayAspectRatio(1080, 1920), 9 / 16);
assert.equal(displayAspectRatio(0, 0), 9 / 16);

console.log('ok');
