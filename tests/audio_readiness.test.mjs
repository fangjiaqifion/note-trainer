import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudioProbe} from '../audio_readiness.mjs';
test('audio resume is invoked synchronously in the gesture, shared checks do not prove audibility',async()=>{
 let resumes=0;
 const p=createAudioProbe({getContext:()=>({state:'running',resume(){resumes++;return Promise.resolve();}}),prepare:()=>{},voices:()=>({zh:true,en:true}),timeout:5});
 const a=p.check(),b=p.check();assert.equal(resumes,1);assert.equal(a,b);
 assert.equal((await a).audible,'unverified');await p.check();assert.equal(resumes,2);
});
test('audio hangs and missing voices are bounded; later retry recovers',async()=>{
 let hang=true;
 const p=createAudioProbe({getContext:()=>({state:'running',resume:()=>hang?new Promise(()=>{}):Promise.resolve()}),prepare:()=>{},voices:()=>({zh:false,en:false}),timeout:5});
 const first=await p.check();assert.equal(first.engine,'timeout');assert.equal(first.zh,false);
 hang=false;assert.equal((await p.check()).engine,'running');
});
test('voice initialization waits for voiceschanged without leaking listeners',async()=>{
 const events=new EventTarget();let ready=false;
 const p=createAudioProbe({getContext:()=>({state:'running',resume:()=>Promise.resolve()}),prepare:()=>{},voices:()=>({zh:ready,en:ready}),voiceEvents:events,timeout:20});
 const result=p.check();ready=true;events.dispatchEvent(new Event('voiceschanged'));assert.equal((await result).zh,true);
});
