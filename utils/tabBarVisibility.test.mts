import assert from 'node:assert/strict';
import { shouldHideAppTabBar } from './tabBarVisibility.ts';

assert.equal(shouldHideAppTabBar(['(tabs)', 'index']), false);
assert.equal(shouldHideAppTabBar(['(tabs)', 'registrar', 'quadras']), false);
assert.equal(shouldHideAppTabBar(['(tabs)', 'registrar', 'revisao']), false);
assert.equal(shouldHideAppTabBar(['(tabs)', 'historico']), false);
assert.equal(shouldHideAppTabBar(['(tabs)', 'estrutura', 'quadras']), false);
assert.equal(shouldHideAppTabBar(['(tabs)', 'registrar', 'camera']), true);
assert.equal(shouldHideAppTabBar(['setup']), true);

console.log('ok');
