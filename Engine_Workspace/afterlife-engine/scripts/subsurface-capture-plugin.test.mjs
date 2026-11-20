import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {subsurfaceCapturePlugin} from './subsurface-capture-plugin.mjs';

const chunk = new URL('../node_modules/@forgeax/engine/node_modules/@forgeax/engine-render/dist/chunk-2P5VQUEP.mjs', import.meta.url);
const source = readFileSync(chunk, 'utf8');
const plugin = subsurfaceCapturePlugin();
const apply = text => plugin.transform.call({error(message) { throw new Error(message); }}, text, chunk.pathname);
test('checked engine chunk retains all slots except hidden unbound defaults without a frame receipt', () => {
  const patched = apply(source).code;
  const start = patched.indexOf('  add(source, materials) {', patched.indexOf('var SubsurfaceSelection = class {'));
  const end = patched.indexOf('  addMember(resource, materials) {', start);
  const Selection = Function('return class {' + patched.slice(start, end) + 'addMember(slot) { this.accepted.push(slot); }}')();
  for (const authorVisible of [true, false, undefined]) {
    const records = [0, 0, 23].map(materialHandle => ({snapshot:{materialHandle}}));
    const receipts = new Map([[records[1], {}]]);
    const selection = new Selection();
    selection.accepted = [];
    selection.add({authorVisible, materials:records}, receipts);
    assert.deepEqual(selection.accepted, authorVisible === false ? records.slice(1) : records);
    selection.accepted = [];
    selection.add({authorVisible, materials:[], material:records[0]}, receipts);
    assert.equal(selection.accepted.length, authorVisible === false ? 0 : 1);
  }
});
test('fails closed on SDK changes and ignores other project modules', () => {
  assert.throws(() => apply(source.replace('this.addMember(slots[index2], materials)', 'renamed()')));
  assert.equal(plugin.transform(source, '/project/src/other.mjs'), null);
});
