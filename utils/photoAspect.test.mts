import assert from 'node:assert/strict';
import { PHOTO_ASPECT_RATIO, centerCropRect } from './photoAspect.ts';

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

console.log('ok');
