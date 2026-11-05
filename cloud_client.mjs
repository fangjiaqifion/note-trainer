// Recoverable, scoped cloud access. No service key, local PIN, or learner name crosses this boundary.
import {createTransport,SyncError} from './experiments/supabase_sync/transport.mjs';
export const CLOUD_URL='https://pokrwqirkjcjlworttvk.supabase.co';
const KEY='nt.cloud.';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const EVENT_FIELDS=['id','seq','pseq','t','sid','mode','phase','battery','skill','kind','note','letter','value','clef','spot','relation','staffY1','staffY2','higher','ask','target','pair','chosen','diff','first','wrong','ms'];
export const STATE_FIELDS=['v','layout','stars','progress','selected','spot','focus','lastSeen','eventSeq','practiceSeq','autoHistory','battery','level7','legacyE4','createdAt','updatedAt','sound','speech','labels','decor','difficulty','autoLevel'];
export function publicConfig(config){
 if(config?.url!==CLOUD_URL || typeof config.publishableKey!=='string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) throw Error('云服务配置不匹配');
 return {url:CLOUD_URL,publishableKey:config.publishableKey};
}
export function statePayload(state){return Object.fromEntries(STATE_FIELDS.filter(k=>state[k]!==undefined).map(k=>[k,state[k]]));}
export function eventPayload(event){
 if(!UUID.test(event?.id)) throw new SyncError('答题记录缺少稳定 ID，请先完成迁移',{permanent:true});
 return Object.fromEntries(EVENT_FIELDS.filter(k=>event[k]!==undefined).map(k=>[k,event[k]]));
}
export function randomCode(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function codeHash(code){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function encodeRecovery(config,secret){
 return 'nt1.'+btoa(JSON.stringify({config:publicConfig(config),secret})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeRecovery(text){
 if(typeof text!=='string' || text.length>2048 || !text.startsWith('nt1.')) throw Error('恢复码格式不正确');
 let value;try{value=JSON.parse(atob(text.slice(4).replace(/-/g,'+').replace(/_/g,'/')));}catch{throw Error('恢复码格式不正确');}
 if(!/^[a-f0-9]{64}$/.test(value.secret)) throw Error('恢复码格式不正确');
 return {config:publicConfig(value.config),secret:value.secret};
}
export function createCloudClient({storage,fetchImpl=fetch,locks=navigator.locks}){
 const load=(key,fallback=null)=>{const raw=storage.getItem(KEY+key);return raw===null?fallback:JSON.parse(raw);};
 const save=(key,value)=>storage.setItem(KEY+key,JSON.stringify(value));
 let config=load('config'),transport,sessionKey=load('authKey',KEY+'auth');
 function configure(value){config=publicConfig(value);save('config',config);transport=null;}
 function auth(){
  if(!config) throw new SyncError('请先加载云服务配置或恢复码',{permanent:true});
  return transport ||= createTransport({...config,storage,sessionKey,fetchImpl});
 }
 async function request(path,{method='GET',body}={}){
  return locks.request(KEY+'auth',async()=>{
   let session=await auth().authenticate();
   for(let attempt=0;attempt<2;attempt++){
    const r=await fetchImpl(config.url+path,{method,headers:{apikey:config.publishableKey,authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(r.status===401 && attempt===0){session=await auth().authenticate(true);continue;}
    if(!r.ok){const raw=r.headers?.get('retry-after'),seconds=Number(raw);throw new SyncError('云端请求未完成 ('+r.status+')',{status:r.status,permanent:[400,401,403,404,409,422].includes(r.status),retryAfter:raw?Math.max(0,Number.isFinite(seconds)?seconds*1000:Date.parse(raw)-Date.now()):0});}
    if(r.status===204) return null;
    return r.json();
   }
  });
 }
 const rpc=(name,body)=>request('/rest/v1/rpc/nt_cloud_'+name,{method:'POST',body});
 async function recover(packet){
  const {config:c,secret}=decodeRecovery(packet);configure(c);
  // Each capability has its own Auth identity. Switching from teacher to learner
  // must never reuse a JWT that still has teacher memberships on the server.
  const digest=await codeHash(secret),previousKey=sessionKey;
  sessionKey=load('identity.'+digest,KEY+'codeAuth.'+digest);transport=null;
  try{
   try{await auth().authenticate(!!storage.getItem(sessionKey));}
   catch(error){
    if(!error.permanent)throw error;
    // Explicit possession of the recovery code authorizes replacing lost auth only.
    const pending=load('pendingIdentity.'+digest);
    sessionKey=pending || KEY+'recoveredAuth.'+crypto.randomUUID();
    if(!pending)save('pendingIdentity.'+digest,sessionKey);
    transport=null;await auth().authenticate();
   }
   const access=await rpc('claim',{recovery_code:secret});
   save('identity.'+digest,sessionKey);save('authKey',sessionKey);save('access',access);
   storage.removeItem(KEY+'pendingIdentity.'+digest);return access;
  }catch(error){sessionKey=previousKey;transport=null;throw error;}
 }
 async function issue(role,student=null){
  const access=load('access');if(access?.role!=='teacher') throw Error('需要云端教师权限');
  let pending=load('pendingCode');
  if(!pending || pending.role!==role || pending.student!==student || pending.workspace!==access.workspace){
   pending={role,student,workspace:access.workspace,secret:randomCode()};save('pendingCode',pending);
  }
  const id=await rpc('issue',{w:access.workspace,s:student,access_role:role,code_hash:await codeHash(pending.secret)});
  return {id,packet:encodeRecovery(config,pending.secret)};
 }
 async function students(){return request('/rest/v1/nt_cloud_students?select=id,workspace_id,local_id,code,state,revision&workspace_id=eq.'+encodeURIComponent(load('access').workspace)+'&order=id');}
 async function profile(id){if(!UUID.test(id)) throw Error('学生 ID 无效');const rows=await request('/rest/v1/nt_cloud_students?select=*&id=eq.'+id);if(rows.length!==1) throw new SyncError('学生未授权或已撤销',{permanent:true});return rows[0];}
 async function readEvents(id){
  if(!UUID.test(id)) throw Error('学生 ID 无效');
  const result=[];let cursor='0';
  for(;;){
   const rows=await request('/rest/v1/nt_cloud_events?select=cursor,event_id,payload&student_id=eq.'+id+'&cursor=gt.'+cursor+'&order=cursor&limit=500');
   for(const row of rows){if(BigInt(row.cursor)<=BigInt(cursor) || !UUID.test(row.event_id)) throw Error('云端记录游标无效');cursor=String(row.cursor);result.push({...row.payload,id:row.event_id});}
   if(rows.length<500) return result;
  }
 }
 return {
  configure,get access(){return load('access');},get config(){return config;},rpc,recover,issue,students,profile,readEvents,
  forgetPendingCode(){storage.removeItem(KEY+'pendingCode');},
  async create(bootstrap){const workspace=await rpc('create',{bootstrap_code:bootstrap});const access={workspace,role:'teacher',student:null};save('access',access);return access;},
  async addStudent(local,code){return rpc('add_student',{w:load('access').workspace,local_key:local,participant_code:code});},
  codes(){return rpc('codes',{w:load('access').workspace});},
  revoke(id){return rpc('revoke',{code_id:id});},
  devices(){return rpc('devices',{w:load('access').workspace});},
  revokeDevice(id){return rpc('revoke_device',{member_id:id});},
  backup(){return rpc('backup',{w:load('access').workspace});},
  async push(id,state,meta){
   const confirmed=new Set(meta.ack||[]),ids=new Set();
   const pending=state.events.map(eventPayload).filter(e=>{if(ids.has(e.id)) throw new SyncError('重复答题 ID',{permanent:true});ids.add(e.id);return !confirmed.has(e.id);});
   for(let i=0;i<pending.length;i+=50){
    const batch=pending.slice(i,i+50);
    const ack=await rpc('batch',{s:id,items:batch.map(e=>({id:e.id,payload:e}))});
    if(!Array.isArray(ack)||new Set(ack).size!==batch.length||batch.some(e=>!ack.includes(e.id))) throw Error('云端回执不完整');
    ack.forEach(x=>confirmed.add(x));meta.ack=[...confirmed];save('meta.'+id,meta);
   }
   const payload=statePayload(state),serialized=JSON.stringify(payload);
   if(meta.lastState===serialized) return meta;
   const out=await rpc('save',{s:id,expected_revision:meta.revision||0,new_state:payload});
   if(out.conflict){const error=new SyncError('另一设备已更新进度。答题记录已同步；请先备份，再载入云端进度。',{permanent:true});error.conflict=out;throw error;}
   meta.revision=out.revision;meta.lastState=serialized;save('meta.'+id,meta);return meta;
  },
  meta(id){return load('meta.'+id,{revision:0,ack:[]});},
  markPulled(id,profile,events){const meta={revision:profile.revision,ack:events.map(e=>e.id),lastState:JSON.stringify(profile.state)};save('meta.'+id,meta);return meta;}
 };
}
