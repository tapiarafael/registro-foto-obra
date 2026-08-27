import assert from 'node:assert/strict';
import { captureHeader } from './captureHeader.ts';

assert.deepEqual(
  captureHeader({ block: { name: 'Bloco A' } }),
  { title: 'Bloco A', path: '' },
  'block-only capture should not show empty dots',
);

assert.deepEqual(
  captureHeader({
    block: { name: 'Bloco A' },
    building: { name: 'Torre 1' },
    floor: { name: '1º' },
    unit: { name: '101' },
    service: { name: 'Pintura' },
  }),
  { title: 'Pintura', path: 'Bloco A · Torre 1 · 1º · 101' },
);

assert.deepEqual(
  captureHeader({
    block: { name: 'Bloco A' },
    building: null,
    floor: null,
    unit: null,
    service: { name: 'Pintura' },
  }),
  { title: 'Pintura', path: 'Bloco A' },
);

console.log('ok');
