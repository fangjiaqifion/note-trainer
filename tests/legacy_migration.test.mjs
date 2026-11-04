import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function migrateLegacyState(){');
const code = html.slice(start, html.indexOf('/* ---------------------------------------------------------------------', start));

function migrate(old) {
  const context = vm.createContext({
    STORE_KEY:'old', SCHEMA_VERSION:3,
    readJSON: () => structuredClone(old),
    newState: () => ({events:[], autoHistory:[], battery:null, eventSeq:0, practiceSeq:0, stars:{}}),
    DIFFS:{normal:{}}, Date
  });
  vm.runInContext(code, context);
  return JSON.parse(JSON.stringify(context.migrateLegacyState()));
}

test('legacy migration retains events, history, battery and monotonically increasing counters', () => {
  const old = {events:[{seq:9,pseq:6,mode:'test'}], eventSeq:2, practiceSeq:1,
    autoHistory:[{t:10}], battery:{id:'test-battery',items:[{kind:'x'}]}, stars:{}, difficulty:'normal'};
  const out = migrate(old);
  assert.deepEqual(out.events, old.events);
  assert.deepEqual(out.autoHistory, old.autoHistory);
  assert.deepEqual(out.battery, old.battery);
  assert.equal(out.eventSeq, 9);
  assert.equal(out.practiceSeq, 6);
});

test('migration handles old archives without research fields', () => {
  const out = migrate({stars:{}, difficulty:'normal'});
  assert.deepEqual(out.events, []);
  assert.deepEqual(out.autoHistory, []);
  assert.equal(out.battery, null);
});
