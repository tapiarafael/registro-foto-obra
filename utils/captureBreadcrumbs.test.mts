import assert from 'node:assert/strict';
import { captureBreadcrumbItems } from './captureBreadcrumbs.ts';

const fullNav = {
  block: { name: 'Quadra A' },
  building: { name: 'Torre 1' },
  floor: { name: '1º' },
  unit: { name: '101' },
  service: { name: 'Pintura' },
};

assert.deepEqual(
  captureBreadcrumbItems({ block: { name: 'Quadra A' } }, 'predios'),
  [{ label: 'Quadra A', target: null }],
  'prédios: only the current quadra, not a link',
);

assert.deepEqual(
  captureBreadcrumbItems(
    { block: { name: 'Quadra A' }, building: { name: 'Torre 1' } },
    'pavimentos',
  ),
  [
    { label: 'Quadra A', target: 'predios' },
    { label: 'Torre 1', target: null },
  ],
  'pavimentos: quadra navigates to prédios; prédio is current',
);

assert.deepEqual(
  captureBreadcrumbItems(
    {
      block: { name: 'Quadra A' },
      building: { name: 'Torre 1' },
      floor: { name: '1º' },
    },
    'unidades',
  ),
  [
    { label: 'Quadra A', target: 'predios' },
    { label: 'Torre 1', target: 'pavimentos' },
    { label: '1º', target: null },
  ],
);

assert.deepEqual(
  captureBreadcrumbItems(
    {
      block: { name: 'Quadra A' },
      building: { name: 'Torre 1' },
      floor: { name: '1º' },
      unit: { name: '101' },
    },
    'servicos',
  ),
  [
    { label: 'Quadra A', target: 'predios' },
    { label: 'Torre 1', target: 'pavimentos' },
    { label: '1º', target: 'unidades' },
    { label: '101', target: null },
  ],
);

assert.deepEqual(
  captureBreadcrumbItems(fullNav, 'revisao'),
  [
    { label: 'Quadra A', target: 'predios' },
    { label: 'Torre 1', target: 'pavimentos' },
    { label: '1º', target: 'unidades' },
    { label: '101', target: 'servicos' },
    { label: 'Pintura', target: null },
  ],
  'revisão: every ancestor is a link; serviço is current',
);

assert.deepEqual(
  captureBreadcrumbItems(
    { block: { name: 'Quadra A' }, building: null, floor: null, unit: null, service: { name: 'Pintura' } },
    'revisao',
  ),
  [
    { label: 'Quadra A', target: 'predios' },
    { label: 'Pintura', target: null },
  ],
  'skipped levels are omitted',
);

assert.equal(
  captureBreadcrumbItems(fullNav, 'revisao').every((item, i, arr) => (
    i === arr.length - 1 ? item.target === null : item.target != null
  )),
  true,
  'current item never has a target',
);

console.log('ok');
