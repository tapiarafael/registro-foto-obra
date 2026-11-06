import assert from 'node:assert/strict';
import { historicoBreadcrumbItems } from './historicoBreadcrumbs.ts';

const path = {
  block: { name: 'Quadra A' },
  building: { name: 'Torre 1' },
  floor: { name: '1º' },
  unit: { name: '101' },
};

assert.deepEqual(
  historicoBreadcrumbItems('12 de março', {}, 'blocks'),
  [{ label: '12 de março', target: null }],
  'blocks: date is the current level',
);

assert.deepEqual(
  historicoBreadcrumbItems('12 de março', { block: { name: 'Quadra A' } }, 'buildings'),
  [
    { label: '12 de março', target: 'blocks' },
    { label: 'Quadra A', target: null },
  ],
);

assert.deepEqual(
  historicoBreadcrumbItems('12 de março', path, 'services'),
  [
    { label: '12 de março', target: 'blocks' },
    { label: 'Quadra A', target: 'buildings' },
    { label: 'Torre 1', target: 'floors' },
    { label: '1º', target: 'units' },
    { label: '101', target: null },
  ],
);

assert.deepEqual(
  historicoBreadcrumbItems('12 de março', path, 'photos'),
  [
    { label: '12 de março', target: 'blocks' },
    { label: 'Quadra A', target: 'buildings' },
    { label: 'Torre 1', target: 'floors' },
    { label: '1º', target: 'units' },
    { label: '101', target: 'services' },
  ],
  'photos: every crumb is navigable because none is the current screen',
);

console.log('ok');
