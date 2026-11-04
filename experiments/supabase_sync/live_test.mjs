// Synthetic test only. Run with SUPABASE_TEST_URL and SUPABASE_PUBLISHABLE_KEY set.
// The test creates two anonymous identities and leaves only fake records in the test project.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createTransport} from './transport.mjs';
import {createQueue} from './queue.mjs';

const url = process.env.SUPABASE_TEST_URL || 'https://pokrwqirkjcjlworttvk.supabase.co';
let publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!publishableKey) {
  try {
    const contents = readFileSync(new URL('../../secrets/api_keys.md', import.meta.url), 'utf8');
    publishableKey = contents.match(/^SUPABASE_PUBLISHABLE_KEY=(\S+)\s*$/m)?.[1];
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
if (!url || !publishableKey) throw new Error('Missing SUPABASE_TEST_URL or SUPABASE_PUBLISHABLE_KEY');
if (!publishableKey.startsWith('sb_publishable_')) throw new Error('A publishable key is required; never use a secret key');
function storage(){ const data=new Map(); return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}; }
const store = storage(), remote = createTransport({url,publishableKey,storage:store,sessionKey:'session'});
const originalFetch = globalThis.fetch;
let first = true;
const failingSend = async batch => {
  const ack = await remote(batch);
  if(first){ first=false; throw new Error('simulated lost response'); }
  return ack;
};
const queue = createQueue({storage:store,key:'queue',send:failingSend});
const id = randomUUID();
queue.enqueue({id,participant_id:'synthetic-only',payload:{first:1,wrong:0,ms:1200}});
await assert.rejects(queue.sync(),/simulated lost response/);
assert.equal(queue.list().length,1);
await queue.sync();
assert.equal(queue.list().length,0);

const session = JSON.parse(store.getItem('session'));
const headers = {apikey:publishableKey, authorization:'Bearer '+session.access_token};
const read = await originalFetch(url.replace(/\/$/,'') + '/rest/v1/nt_sync_events?event_id=eq.' + encodeURIComponent(id), {headers});
assert.equal(read.ok,true,'authenticated read failed');
assert.equal((await read.json()).length,1,'retry must persist exactly one row');
const otherStore=storage();
const other=createTransport({url,publishableKey,storage:otherStore,sessionKey:'session'});
await other([{id:randomUUID(),participant_id:'synthetic-only',payload:{first:1}}]);
const otherSession=JSON.parse(otherStore.getItem('session'));
const cross=await originalFetch(url.replace(/\/$/,'') + '/rest/v1/nt_sync_events?event_id=eq.' + encodeURIComponent(id),{
  headers:{apikey:publishableKey,authorization:'Bearer '+otherSession.access_token}
});
assert.equal(cross.ok,true,'second identity read failed');
assert.equal((await cross.json()).length,0,'second identity must not read first identity records');
console.log('PASS live synthetic: signup, upload, retry deduplication and cross-user isolation');
