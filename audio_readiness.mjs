// A running engine is diagnostic evidence, never evidence that the speaker was audible.
export function createAudioProbe({getContext,prepare,voices,voiceEvents,timeout=4000,clock=globalThis}){
 let flight;
 function check(){
  if(flight)return flight;
  const started=performance.now();let context,resume;
  // Invoke resume synchronously inside the caller's user gesture, before any await.
  try{context=getContext();resume=context?context.resume():Promise.reject(Error('unsupported'));}
  catch(error){resume=Promise.reject(error);}
  flight=new Promise(resolve=>{
   let engine='checking',voice=voices(),finished=false;
   const done=()=>{
    if(finished || engine==='checking' || (!voice.zh || !voice.en))return;
    finish();
   };
   const onVoices=()=>{voice=voices();done();};
   function finish(){
    if(finished)return;finished=true;clock.clearTimeout(timer);voiceEvents?.removeEventListener('voiceschanged',onVoices);
    resolve({engine,zh:!!voice.zh,en:!!voice.en,elapsed:Math.round(performance.now()-started),audible:'unverified'});
   }
   const timer=clock.setTimeout(()=>{if(engine==='checking')engine='timeout';finish();},timeout);
   voiceEvents?.addEventListener('voiceschanged',onVoices);
   Promise.resolve(resume).then(()=>{if(finished)return;if(context.state!=='running')throw Error('not running');prepare(context);engine='running';done();})
    .catch(()=>{if(!finished){engine='failed';done();}});
  }).finally(()=>{flight=null;});
  return flight;
 }
 return {check};
}
