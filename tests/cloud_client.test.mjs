import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCloudClient,CLOUD_URL,encodeRecovery,decodeRecovery,eventPayload,statePayload,canSyncAccount} from '../cloud_client.mjs';
const config={url:CLOUD_URL,publishableKey:'sb_publishable_fixture'};
const sid=randomUUID();
function fixture(){
 const data=new Map(),calls=[],received=new Map();let failAck=false,conflict=false;
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const response=value=>({ok:true,status:200,json:async()=>value});
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/signup'))return response({access_token:randomUUID(),refresh_token:'refresh',expires_at:9999999999});
  if(url.includes('/token?'))return response({access_token:randomUUID(),refresh_token:'refresh',expires_at:9999999999});
  const body=JSON.parse(options.body||'{}');
  if(url.endsWith('/batch')){for(const e of body.items)received.set(e.id,e);if(failAck){failAck=false;throw Error('lost');}return response(body.items.map(e=>e.id));}
  if(url.endsWith('_batch')){for(const e of body.items)received.set(e.id,e);if(failAck){failAck=false;throw Error('lost');}return response(body.items.map(e=>e.id));}
  if(url.endsWith('_save'))return response({conflict,revision:1,state:body.new_state});
  return response({workspace:randomUUID(),role:'learner',student:sid});
 };
 const client=createCloudClient({storage,fetchImpl,locks:{request:async(_,fn)=>fn()}});client.configure(config);
 return {client,storage,data,calls,received,lose(){failAck=true;},conflict(){conflict=true;}};
}
test('recovery packets reject untrusted endpoints; uploads use explicit nonidentifying field lists',()=>{
 assert.deepEqual(decodeRecovery(encodeRecovery(config,'a'.repeat(64))),{config,secret:'a'.repeat(64)});
 assert.throws(()=>encodeRecovery({...config,url:'https://attacker.example'},'a'.repeat(64)));
 const e=eventPayload({id:randomUUID(),seq:1,name:'private',pin:'1234',access_token:'private'});
 assert.equal(e.name,undefined);assert.equal(e.pin,undefined);assert.equal(e.access_token,undefined);
 assert.deepEqual(statePayload({v:3,events:[{}],name:'private',hash:'private'}),{v:3});
});
test('batch receipts are durable, lost responses safely replay, unchanged state performs zero requests',async()=>{
 const f=fixture(),state={v:3,events:Array.from({length:51},()=>({id:randomUUID(),seq:1,ms:100}))};
 f.lose();await assert.rejects(f.client.push(sid,state,f.client.meta(sid)));
 assert.equal(f.client.meta(sid).ack.length,0);
 await f.client.push(sid,state,f.client.meta(sid));assert.equal(f.received.size,51);
 const before=f.calls.length;await f.client.push(sid,state,f.client.meta(sid));assert.equal(f.calls.length,before);
});
test('progress conflicts preserve event acknowledgments and do not overwrite the server',async()=>{
 const f=fixture();f.conflict();
 const state={v:3,events:[{id:randomUUID(),seq:1}]};
 await assert.rejects(f.client.push(sid,state,f.client.meta(sid)),e=>!!(e.permanent&&e.conflict));
 assert.equal(f.client.meta(sid).ack.length,1);assert.equal(f.client.meta(sid).revision,0);
});
test('duplicate IDs and missing IDs never reach an upload RPC',async()=>{
 const f=fixture(),id=randomUUID();await assert.rejects(f.client.push(sid,{events:[{id},{id}]},{ack:[]}));
 assert.equal(f.calls.length,0);
});

test('switching recovery roles uses distinct server identities and explicitly repairs lost auth',async()=>{
 const f=fixture();await f.client.recover(encodeRecovery(config,'a'.repeat(64)));
 const teacherKey=JSON.parse(f.storage.getItem('nt.cloud.authKey'));
 await f.client.recover(encodeRecovery(config,'b'.repeat(64)));
 const learnerKey=JSON.parse(f.storage.getItem('nt.cloud.authKey'));assert.notEqual(learnerKey,teacherKey);
 assert.notEqual(JSON.parse(f.storage.getItem(teacherKey)).access_token,JSON.parse(f.storage.getItem(learnerKey)).access_token);
 f.storage.removeItem(learnerKey);
 await f.client.recover(encodeRecovery(config,'b'.repeat(64)));
 assert.notEqual(JSON.parse(f.storage.getItem('nt.cloud.authKey')),learnerKey);
});

test('shared-device learner queue excludes other learners, other classes and readonly roles',()=>{
 const own={id:'local-a',cloudStudent:'student-a',cloudWorkspace:'class-a'},other={id:'local-b',cloudStudent:'student-b',cloudWorkspace:'class-a'};
 assert.equal(canSyncAccount({role:'learner',workspace:'class-a',student:'student-a'},own),true);
 assert.equal(canSyncAccount({role:'learner',workspace:'class-a',student:'student-a'},other),false);
 assert.equal(canSyncAccount({role:'teacher',workspace:'class-a'},other),true);
 assert.equal(canSyncAccount({role:'teacher',workspace:'class-b'},own),false);
 assert.equal(canSyncAccount({role:'researcher',workspace:'class-a'},own),false);
});
