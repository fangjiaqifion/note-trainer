import {createCloudClient,decodeRecovery} from './cloud_client.mjs';
// The host owns game state; this module owns network state and the management dialog.
export function mountCloudUI(host){
 const client=createCloudClient({storage:localStorage});
 let timer,active=false,paused=false,attempt=0,saveVersion=0,disposed=false,releaseLock,hasLock=false;
 const dialog=document.createElement('div');dialog.className='modal';dialog.id='cloudModal';
 dialog.innerHTML=`<div class="sheet"><h2>云端账户与同步</h2>
 <p class="hint">恢复码等同账户钥匙，请离线保存，不要发送给无关人员。四位 PIN 仅保护本机。恢复码一年有效，教师可撤销；每码最多十台设备。</p>
 <p id="cloudStatus" role="status">尚未连接。离线记录会先保存在本机。</p>
 <label class="field"><span>恢复码</span><textarea id="cloudRecovery" rows="3" autocomplete="off" spellcheck="false"></textarea></label>
 <label class="field"><span>或选择恢复码文件</span><input id="cloudRecoveryFile" type="file" accept=".json,application/json"></label>
 <button class="secondary-btn" id="cloudRecover">恢复云端账户</button>
 <details><summary>首次开通班级（教师）</summary>
 <label class="field"><span>云服务配置文件</span><input id="cloudConfig" type="file" accept=".json,application/json"></label>
 <label class="field"><span>管理员提供的一次性开通码</span><input id="cloudBootstrap" autocomplete="off" spellcheck="false"></label>
 <button class="secondary-btn" id="cloudCreate">开通班级</button></details>
 <div id="cloudTeacher" hidden>
 <label class="field"><span>绑定本机学生</span><select id="cloudLocal"></select></label>
 <label class="field"><span>研究参与者编号（英文、数字、下划线；不要填姓名）</span><input id="cloudParticipant" placeholder="P001" maxlength="40"></label>
 <button class="secondary-btn" id="cloudBind">备份并绑定学生</button>
 <button class="secondary-btn" id="cloudTeacherCode">生成教师恢复码</button>
 <button class="secondary-btn" id="cloudResearchCode">生成研究者只读授权码</button>
 <button class="secondary-btn" id="cloudBackup">导出班级云端灾备</button>
 <button class="secondary-btn" id="cloudDevices">查看或撤销设备</button>
 <button class="secondary-btn" id="cloudCodes">查看或撤销授权</button><div id="cloudGrantList"></div></div>
 <div id="cloudPacket" hidden><p class="hint">请下载并另存恢复码。撤销此码也会撤销通过它恢复的设备。</p><textarea id="cloudIssued" rows="4" readonly></textarea><button class="secondary-btn" id="cloudDownloadCode">下载恢复码</button></div>
 <button class="secondary-btn" id="cloudRefresh">刷新云端名册</button>
 <button class="secondary-btn" id="cloudRetry">立即同步 / 重试</button>
 <div id="cloudRoster"></div><div id="cloudReadReport"></div>
 <label class="field"><span>恢复学生到本机时设置四位本地 PIN</span><input id="cloudLocalPin" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></label>
 <p class="hint">在另一设备继续练习前，先确认上一设备已同步。进度冲突时不会自动覆盖；先导出本机备份，再载入云端进度。加载云端数据会保留当前名册快照。</p>
 <div class="sheet-foot"><button class="secondary-btn" id="cloudClose">关闭</button></div></div>`;
 document.body.append(dialog);
 const $=id=>dialog.querySelector('#'+id),status=text=>{$('cloudStatus').textContent=text;};
 function download(name,value){host.download(name,typeof value==='string'?value:JSON.stringify(value),'application/json');}
 async function action(fn){try{await fn();}catch(e){status(e.message || '操作未完成，请保留本机数据并重试');}}
 async function writer(){
  if(hasLock)return;
  if(!navigator.locks)throw Error('云同步需要支持 Web Locks 的新版 Safari 或 Chrome');
  await new Promise((resolve,reject)=>{
   navigator.locks.request('nt.cloud.game',{ifAvailable:true},async lock=>{
    if(!lock){reject(Error('云端练习已在另一个标签页打开，请关闭其他游戏页后重试'));return;}
    hasLock=true;host.setWriter(true);resolve();
    await new Promise(done=>{releaseLock=done;});hasLock=false;host.setWriter(false);
   }).catch(reject);
  });
 }
 function showAccess(){
  $('cloudTeacher').hidden=client.access?.role!=='teacher';
  $('cloudLocal').replaceChildren(...host.accounts().filter(a=>!a.cloudStudent).map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name;return o;}));
 }
 async function issue(role,student){host.requireLocalTeacher();const out=await client.issue(role,student);$('cloudIssued').value=out.packet;$('cloudPacket').hidden=false;status('恢复码已生成，请下载并离线保存。');}
 async function roster(){
  if(!client.access)throw Error('请先恢复账户或开通班级');
  if(client.access.role!=='learner')host.requireLocalTeacher();
  const students=await client.students();$('cloudRoster').replaceChildren();showAccess();
  for(const student of students){
   const row=document.createElement('div');row.className='cloud-row';
   const label=document.createElement('strong');label.textContent=student.code;row.append(label);
   const button=(text,fn)=>{const b=document.createElement('button');b.className='ghost-btn';b.textContent=text;b.onclick=()=>action(fn);row.append(b);};
   button('只读报告',async()=>{
    const events=await client.readEvents(student.id),box=$('cloudReadReport');box.replaceChildren();
    const heading=document.createElement('p');const first=events.filter(e=>e.first).length;
    heading.textContent=student.code+'：'+events.length+' 题；首次正确率 '+(events.length?Math.round(100*first/events.length)+'%':'暂无数据');box.append(heading);
    const b=document.createElement('button');b.className='secondary-btn';b.textContent='导出去标识记录';b.onclick=()=>download('note-trainer_'+student.code+'.json',{participant:student.code,events});box.append(b);
   });
   if(client.access.role!=='researcher')button('载入本机 / 云端进度',async()=>{
    const pin=$('cloudLocalPin').value;if(!/^\d{4}$/.test(pin))throw Error('请先填写四位本地 PIN');
    const profile=await client.profile(student.id),events=await client.readEvents(student.id);
    if(!confirm('载入 '+student.code+' 的云端进度？本机当前名册将保留快照。请先同步或导出本机未上传的记录。'))return;
    await writer();
    // Save local durable data before the receipt metadata; a metadata failure can only cause a retry.
    host.importRemote(profile,events,pin,client.access);
    client.markPulled(student.id,profile,events);location.reload();
   });
   if(client.access.role==='teacher')button('学生恢复码',()=>issue('learner',student.id));
   $('cloudRoster').append(row);
  }
  status('当前云端角色：'+({teacher:'教师',learner:'学生',researcher:'研究者只读'}[client.access.role])+'；名册 '+students.length+' 人。');
 }
 function schedule(ms=10000){if(disposed||paused||timer!=null)return;timer=setTimeout(()=>{timer=null;sync();},ms);}
 async function sync(){
  if(active||paused||disposed||!client.access||client.access.role==='researcher')return;
  if(!navigator.onLine){status('当前离线，答题仍保存在本机。联网后继续同步。');return;}
  active=true;const startedVersion=saveVersion;
  try{
   await writer();
   for(const account of host.accounts()){
    if(!account.cloudStudent || account.cloudWorkspace!==client.access.workspace)continue;
    const state=host.readState(account.id);if(!state || !Array.isArray(state.events))throw Object.assign(Error('本机存档缺失，已停止同步'),{permanent:true});
    await client.push(account.cloudStudent,state,client.meta(account.cloudStudent));
   }
   attempt=0;status('本机记录已同步；服务器确认后仍保留本机副本。');
  }catch(e){
   if(e.permanent){paused=true;status(e.message+'；同步已暂停，本机副本保留。');}
   else{status('同步未完成，本机副本保留，稍后重试。');schedule(Math.max(e.retryAfter||0,Math.min(60000,2000*2**Math.min(attempt++,5))*(0.8+Math.random()*0.4)));}
  }finally{active=false;if(saveVersion!==startedVersion)schedule();}
 }
 $('cloudClose').onclick=()=>dialog.classList.remove('open');
 $('cloudConfig').onchange=()=>action(async()=>{const f=$('cloudConfig').files[0];if(f)client.configure(JSON.parse(await f.text()));status('配置已加载；尚未绑定或上传本机学生。');});
 $('cloudRecover').onclick=()=>action(async()=>{
  const packet=$('cloudRecovery').value.trim();decodeRecovery(packet);await writer();
  const access=await client.recover(packet);host.authorizeManagement(access.role,$('cloudLocalPin').value);$('cloudRecovery').value='';paused=false;await roster();schedule();
 });
 $('cloudCreate').onclick=()=>action(async()=>{host.requireLocalTeacher();await writer();await client.create($('cloudBootstrap').value.trim());$('cloudBootstrap').value='';await roster();await issue('teacher');});
 $('cloudTeacherCode').onclick=()=>action(()=>issue('teacher'));
 $('cloudResearchCode').onclick=()=>action(()=>issue('researcher'));
 $('cloudDownloadCode').onclick=()=>{download('note-trainer_recovery.json',{recovery:$('cloudIssued').value});client.forgetPendingCode();};
 $('cloudBind').onclick=()=>action(async()=>{
  if(client.access?.role!=='teacher')throw Error('需要云端教师权限');
  const id=$('cloudLocal').value,code=$('cloudParticipant').value.trim();
  if(!/^[A-Za-z0-9_-]{1,40}$/.test(code))throw Error('请输入参与者编号');
  if(!confirm('先完整备份本机名册，再将所选学生绑定到云端 '+code+'？只上传练习与进度，不上传姓名或本地 PIN。'))return;
  await writer();host.beforeBind();
  const remote=await client.addStudent(id,code);
  host.bind(id,remote,client.access.workspace);location.reload();
 });
 $('cloudBackup').onclick=()=>action(async()=>{host.requireLocalTeacher();const backup=await client.backup();download('note-trainer_cloud_backup.json',backup);status('云端灾备已导出，含恢复码哈希；请离线保管。此备份由管理员恢复，不含认证会话。');});
 $('cloudDevices').onclick=()=>action(async()=>{
  host.requireLocalTeacher();const devices=await client.devices();$('cloudGrantList').replaceChildren();
  for(const device of devices){const row=document.createElement('p');row.textContent=device.role+' / '+(device.current?'当前设备':'其他设备')+' / '+(device.revoked?'已撤销':'有效');
   if(!device.revoked){const b=document.createElement('button');b.className='ghost-btn';b.textContent='撤销设备';b.onclick=()=>action(async()=>{if(!confirm('撤销此设备的访问？这不删除答题记录；持有效恢复码仍可重新恢复，需要永久撤销时也请撤销对应恢复码。'))return;await client.revokeDevice(device.id);row.textContent+=' / 已撤销';});row.append(b);}$('cloudGrantList').append(row);}
 });
 $('cloudCodes').onclick=()=>action(async()=>{
  const codes=await client.codes();$('cloudGrantList').replaceChildren();
  for(const code of codes){const row=document.createElement('p');row.textContent=code.role+' / '+(code.student||'全班')+' / '+(code.revoked?'已撤销':'有效至 '+code.expires.slice(0,10));
   if(!code.revoked){const b=document.createElement('button');b.className='ghost-btn';b.textContent='撤销';b.onclick=()=>action(async()=>{if(!confirm('撤销此恢复码及通过它恢复的所有设备？教师可重新生成授权码。'))return;await client.revoke(code.id);row.textContent+=' / 已撤销';});row.append(b);}$('cloudGrantList').append(row);}
 });
 $('cloudRefresh').onclick=()=>action(roster);
 $('cloudRetry').onclick=()=>{paused=false;clearTimeout(timer);timer=null;sync();};
 const onSave=()=>{saveVersion++;schedule();},onOnline=()=>{if(!paused){clearTimeout(timer);timer=null;schedule(0);}};
 window.addEventListener('nt-local-saved',onSave);window.addEventListener('online',onOnline);
 async function open(){if(client.access?.role!=='learner' && client.access && !host.isTeacher()){host.notify('请先从老师入口验证本机 PIN，再打开云端管理');return;}dialog.classList.add('open');showAccess();if(client.access)await action(roster);}
 $('cloudRecoveryFile').onchange=()=>action(async()=>{const file=$('cloudRecoveryFile').files[0];if(file){const value=JSON.parse(await file.text());decodeRecovery(value.recovery);$('cloudRecovery').value=value.recovery;}});
 // Bindings are durable before a reload; take the writer lock before the game boots.
 const ready=host.accounts().some(a=>a.cloudStudent)?writer().then(()=>schedule()):Promise.resolve();
 return {open,ready,client,dispose(){disposed=true;clearTimeout(timer);releaseLock?.();window.removeEventListener('nt-local-saved',onSave);window.removeEventListener('online',onOnline);}};
}
