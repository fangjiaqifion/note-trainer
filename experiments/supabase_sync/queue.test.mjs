import test from 'node:test';
import assert from 'node:assert/strict';
import {createQueue} from './queue.mjs';

function storage() {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
}
const event = id => ({id, student: 'synthetic', correct: true});

test('offline failure keeps records and retry receives one copy', async () => {
  const disk = storage(), server = new Map();
  let offline = true;
  const queue = createQueue({storage: disk, key:'test', send: async batch => {
    if (offline) throw new Error('offline');
    for (const row of batch) server.set(row.id, row);
    return batch.map(row => row.id);
  }});
  queue.enqueue(event('a'));
  await assert.rejects(queue.sync(), /offline/);
  assert.equal(queue.list().length, 1);
  offline = false;
  assert.equal(await queue.sync(), 1);
  assert.equal(server.size, 1);
  assert.equal(queue.list().length, 0);
});

test('lost acknowledgement triggers safe repeat with an idempotent receiver', async () => {
  const disk = storage(), server = new Map();
  let first = true;
  const queue = createQueue({storage: disk, key:'test', send: async batch => {
    for (const row of batch) server.set(row.id, row);
    if (first) { first = false; throw new Error('response lost'); }
    return batch.map(row => row.id);
  }});
  queue.enqueue(event('a'));
  await assert.rejects(queue.sync(), /response lost/);
  assert.equal(queue.list().length, 1);
  await queue.sync();
  assert.equal(server.size, 1);
  assert.equal(queue.list().length, 0);
});

test('new records during upload remain queued and partial acknowledgement removes none', async () => {
  const disk = storage();
  let finish;
  const queue = createQueue({storage: disk, key:'test', send: () => new Promise(resolve => {finish = resolve;})});
  queue.enqueue(event('a'));
  const uploading = queue.sync();
  queue.enqueue(event('b'));
  finish(['a']);
  await uploading;
  assert.deepEqual(queue.list().map(row => row.id), ['b']);
  const partial = queue.sync();
  finish([]);
  await assert.rejects(partial, /acknowledgement/);
  assert.deepEqual(queue.list().map(row => row.id), ['b']);
});

test('storage failure or conflicting IDs do not claim success', () => {
  const disk = storage();
  const queue = createQueue({storage: disk, key:'test', send: async () => []});
  queue.enqueue(event('a'));
  assert.throws(() => queue.enqueue({...event('a'), correct:false}), /conflict/);
  const broken = createQueue({storage: {getItem: () => null, setItem: () => {throw Error('full');}}, key:'x', send: async () => []});
  assert.throws(() => broken.enqueue(event('b')), /full/);
});
