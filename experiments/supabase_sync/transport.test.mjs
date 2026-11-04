import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransport} from './transport.mjs';
function disk(){ const m=new Map(); return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}; }
const sess={access_token:'test-access', refresh_token:'test-refresh', expires_at:9999999999};
const ok = data => ({ok:true, json:async()=>data});

test('anonymous auth persists and reuses one identity for batch writes', async () => {
  const calls=[], storage=disk();
  const send=createTransport({url:'https://example.invalid/',publishableKey:'public-test',storage,sessionKey:'test',fetchImpl:async (url, opts)=>{
    calls.push({url, opts}); return url.endsWith('/signup') ? ok(sess) : ok(['one']);
  }});
  assert.deepEqual(await send([{id:'one'}]), ['one']);
  await send([{id:'one'}]);
  assert.equal(calls.filter(c=>c.url.endsWith('/signup')).length,1);
  assert.equal(calls[1].opts.headers.authorization,'Bearer test-access');
});

test('failed refresh preserves old session and never creates a replacement identity', async () => {
  const storage=disk(), calls=[];
  storage.setItem('test',JSON.stringify({...sess,expires_at:1}));
  const send=createTransport({url:'https://example.invalid',publishableKey:'public-test',storage,sessionKey:'test',fetchImpl:async url=>{calls.push(url);return {ok:false,status:503};}});
  await assert.rejects(send([{id:'one'}]), /503/);
  assert.equal(calls.length,1);
  assert.match(calls[0],/refresh_token/);
  assert.equal(JSON.parse(storage.getItem('test')).refresh_token,'test-refresh');
});

test('invalidated access token refreshes once without replacing identity',async()=>{
 const storage=disk(),calls=[];storage.setItem('s',JSON.stringify(sess));let invalid=true;
 const send=createTransport({url:'https://example.invalid',publishableKey:'public-test',storage,sessionKey:'s',fetchImpl:async(url)=>{
   calls.push(url);if(url.includes('refresh_token')) return ok({...sess,access_token:'renewed'});
   if(invalid){invalid=false;return {ok:false,status:401};}return ok(['a']);
 }});
 assert.deepEqual(await send([{id:'a'}]),['a']);assert.equal(calls.length,3);assert.equal(calls.some(u=>u.endsWith('signup')),false);
});
test('missing established identity never registers another user',async()=>{
 const storage=disk();storage.setItem('s.established','1');let calls=0;
 const send=createTransport({url:'https://example.invalid',publishableKey:'public-test',storage,sessionKey:'s',fetchImpl:async()=>{calls++;}});
 await assert.rejects(send([]),e=>e.permanent && /missing/.test(e.message));assert.equal(calls,0);
});
test('oversize batch rejected before auth and server Retry-After is preserved',async()=>{
 const storage=disk();storage.setItem('s',JSON.stringify(sess));let calls=0;
 const send=createTransport({url:'https://example.invalid',publishableKey:'public-test',storage,sessionKey:'s',fetchImpl:async()=>{calls++;return {ok:false,status:429,headers:new Headers({'retry-after':'30'})};}});
 await assert.rejects(send(Array(51).fill({})),e=>e.permanent);assert.equal(calls,0);
 await assert.rejects(send([{id:'a'}]),e=>e.status===429 && e.retryAfter===30000 && !e.permanent);
});
