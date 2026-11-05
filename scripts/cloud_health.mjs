// No learner records, Auth identities, or privileged keys are needed.
const url=process.env.NT_SUPABASE_URL,key=process.env.NT_SUPABASE_PUBLISHABLE_KEY;
if(url!=='https://pokrwqirkjcjlworttvk.supabase.co'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key||''))throw Error('Missing valid public health-check configuration');
let healthy=false;
for(let attempt=0;attempt<3;attempt++){
 try{
  const r=await fetch(url+'/rest/v1/rpc/nt_portal_health',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(r.ok&&await r.json()===true){healthy=true;break;}
 }catch{}
 if(attempt<2)await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));
}
if(!healthy){console.error('Database health check failed; inspect project status and workflow configuration.');process.exitCode=1;}
else console.log('Database health check passed.');
