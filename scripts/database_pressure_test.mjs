// Bounded, opt-in writes to the fixed test database. No real student records.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createTransport} from '../experiments/supabase_sync/transport.mjs';
if(!process.argv.includes('--execute')) throw new Error('Use --execute for 1000 test rows, two identities, concurrency <= 4');
const url='https://pokrwqirkjcjlworttvk.supabase.co';
const secret=await readFile(new URL('../secrets/api_keys.md',import.meta.url),'utf8');
const publishableKey=secret.match(/^SUPABASE_PUBLISHABLE_KEY=(\S+)\s*$/m)?.[1];
assert.ok(publishableKey?.startsWith('sb_publishable_'));
const dir=new URL('../.release/',import.meta.url);await mkdir(dir,{recursive:true});
const journal=new URL('pressure_identity.json',dir);
let saved;
try{saved=JSON.parse(await readFile(journal,'utf8'));}catch(e){if(e.code!=='ENOENT') throw e;saved={run:randomUUID(),sessions:{}};}
const latencies=[];let calls=0,inflight=0,maxInflight=0;
async function trackedFetch(...args){
 calls++;inflight++;maxInflight=Math.max(maxInflight,inflight);const start=performance.now();
 try{const response=await fetch(...args);latencies.push(performance.now()-start);return response;}
 finally{inflight--;}
}
const clients=['a','b'].map(owner=>{
 const storage={getItem:k=>saved.sessions[k]??null,setItem:(k,v)=>{saved.sessions[k]=v;}};
 const send=createTransport({url,publishableKey,storage,sessionKey:owner,fetchImpl:trackedFetch});
 return {owner,send,storage};
});
// Authenticate sequentially, then save credentials only in ignored private runtime state.
for(const c of clients){await c.send.authenticate();await writeFile(journal,JSON.stringify(saved),{mode:0o600});}
const rows=clients.map(c=>Array.from({length:500},(_,i)=>({id:'pressure-'+saved.run+'-'+c.owner+'-'+i,participant_id:'pressure-test-'+c.owner,payload:{v:1,seq:i+1,first:i%4?1:0,wrong:i%4?0:1,ms:600+i,mode:'pressure-test'}})));
const jobs=[];
for(let owner=0;owner<2;owner++) for(let i=0;i<500;i+=50) jobs.push(async()=>{
 const batch=rows[owner].slice(i,i+50);assert.deepEqual(await clients[owner].send(batch),batch.map(e=>e.id));
});
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<jobs.length) await jobs[cursor++]();}));
// Concurrent identical retry batches exercise uniqueness under overlap.
await Promise.all(Array.from({length:4},()=>clients[0].send(rows[0].slice(0,50))));
async function read(c,ids){
 const session=JSON.parse(c.storage.getItem(c.owner));
 const r=await trackedFetch(url+'/rest/v1/nt_sync_events?select=event_id,participant_id,payload&event_id=in.('+ids.join(',')+')',{headers:{apikey:publishableKey,authorization:'Bearer '+session.access_token},signal:AbortSignal.timeout(8000)});
 assert.equal(r.ok,true);return r.json();
}
for(let i=0;i<2;i++) for(let j=0;j<500;j+=50){
 const batch=rows[i].slice(j,j+50),remote=await read(clients[i],batch.map(e=>e.id));
 assert.equal(remote.length,batch.length);
 for(const e of batch) assert.deepEqual(remote.find(x=>x.event_id===e.id),{event_id:e.id,participant_id:e.participant_id,payload:e.payload});
}
assert.equal((await read(clients[1],rows[0].slice(0,50).map(e=>e.id))).length,0);
// A valid insert followed by a conflicting existing ID must roll back the entire RPC.
const rolled={id:'rollback-'+saved.run,participant_id:'pressure-test-a',payload:{v:1}};
await assert.rejects(clients[0].send([rolled,{...rows[0][0],payload:{v:999}}]),e=>e.status>=400);
assert.equal((await read(clients[0],[rolled.id])).length,0);
assert.deepEqual((await read(clients[0],[rows[0][0].id]))[0].payload,rows[0][0].payload);
latencies.sort((a,b)=>a-b);
const summary={rows:1000,batchSize:50,writeBatches:20,overlappingRetries:4,maxInflight,calls,latencyMs:{p50:Math.round(latencies[Math.floor(latencies.length*.5)]),p95:Math.round(latencies[Math.floor(latencies.length*.95)]),max:Math.round(latencies.at(-1))},checks:['1000 exact payloads','overlap deduplication','cross-identity isolation','conflict rollback','original content retained']};
await writeFile(new URL('database_pressure_summary.json',dir),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
