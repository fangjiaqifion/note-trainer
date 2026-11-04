// Append-only test transport. Never use a secret/service-role key in a browser.
export class SyncError extends Error {
  constructor(message,{status=0,retryAfter=0,permanent=false}={}){super(message);Object.assign(this,{status,retryAfter,permanent});}
}
export function createTransport({url,publishableKey,storage,sessionKey,fetchImpl=fetch,now=Date.now}){
  let authFlight=null;
  const endpoint=url.replace(/\/$/,'');
  async function request(path,body,token){
    const headers={'content-type':'application/json',apikey:publishableKey};
    if(token) headers.authorization='Bearer '+token;
    const response=await fetchImpl(endpoint+path,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
    if(!response.ok){
      const raw=response.headers?.get('retry-after');
      const seconds=raw ? Number(raw) : NaN;
      const retryAfter=raw ? (Number.isFinite(seconds) ? seconds*1000 : Math.max(0,Date.parse(raw)-now())) : 0;
      throw new SyncError('Supabase request failed ('+response.status+')',{status:response.status,retryAfter:Number.isFinite(retryAfter)?retryAfter:0,permanent:[400,401,403,404,409,422].includes(response.status)});
    }
    return response.json();
  }
  function readSession(){
    const raw=storage.getItem(sessionKey);
    if(!raw){
      if(storage.getItem(sessionKey+'.established')) throw new SyncError('Saved identity is missing; restore it before syncing',{permanent:true});
      return null;
    }
    let session;
    try{session=JSON.parse(raw);}catch{throw new SyncError('Invalid saved authentication session',{permanent:true});}
    if(!session?.access_token || !session.refresh_token || !Number.isFinite(session.expires_at)) throw new SyncError('Invalid saved authentication session',{permanent:true});
    storage.setItem(sessionKey+'.established','1');
    return session;
  }
  async function authenticate(force=false){
    if(authFlight) return authFlight;
    authFlight=(async()=>{
      let session=readSession();
      if(!force && session && session.expires_at*1000>now()+60000) return session;
      session=session
        ? await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token})
        : await request('/auth/v1/signup',{});
      if(!Number.isFinite(session.expires_at) && Number.isFinite(session.expires_in)) session.expires_at=Math.floor(now()/1000)+session.expires_in;
      if(!session.access_token || !session.refresh_token || !Number.isFinite(session.expires_at)) throw new SyncError('Invalid authentication response',{permanent:true});
      // A partial storage failure must never cause an unnoticed new identity next time.
      storage.setItem(sessionKey+'.established','1');
      storage.setItem(sessionKey,JSON.stringify(session));
      return session;
    })();
    try{return await authFlight;}finally{authFlight=null;}
  }
  const send=async batch=>{
    if(!Array.isArray(batch) || batch.length>50) throw new SyncError('Invalid batch size',{permanent:true});
    let session=await authenticate();
    try{return await request('/rest/v1/rpc/nt_sync_batch',{items:batch},session.access_token);}
    catch(error){
      if(error.status!==401) throw error;
      // Recover a server-rejected token once; do not loop or change identity.
      session=await authenticate(true);
      return request('/rest/v1/rpc/nt_sync_batch',{items:batch},session.access_token);
    }
  };
  send.authenticate=authenticate;
  return send;
}
