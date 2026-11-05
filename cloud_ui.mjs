const moduleBuild=new URL(import.meta.url).searchParams.get('build')||'dev';
const {createCloudClient,decodeRecovery,canSyncAccount,identifyLegacyEvents,randomCode}=await import('./cloud_client.mjs?build='+moduleBuild);
const {portalConfig}=await import('./portal_config.mjs?build='+moduleBuild);
const {username,teacherKey,parseInvitation}=await import('./portal_identity.mjs?build='+moduleBuild);
// The host owns game state; this module owns network state and the management dialog.
export function mountCloudUI(host){
 if(moduleBuild!==document.querySelector('meta[name="app-build"]').content)throw Error('页面组件版本已变化，请刷新后继续');
 const client=createCloudClient({storage:localStorage});
 let timer,active=false,paused=false,attempt=0,saveVersion=0,managing=false,disposed=false,releaseLock,hasLock=false;
 const dialog=document.createElement('div');dialog.className='modal';dialog.id='cloudModal';
 dialog.innerHTML=`<div class="sheet"><h2>云端账户</h2>
 <p class="hint" id="cloudIntro">教师使用用户名和教师密钥登录。首次使用请先注册。</p>
 <p id="cloudStatus" role="status">尚未连接，练习记录仍保存在本机。</p>
 <div id="cloudEntryTabs" class="cloud-tabs">
 <button class="secondary-btn" id="cloudLoginTab" aria-pressed="true">教师登录</button>
 <button class="secondary-btn" id="cloudRegisterTab" aria-pressed="false">教师注册</button>
 <button class="ghost-btn" id="cloudRecoveryTab" aria-pressed="false">学生 / 旧账户恢复</button></div>
 <section id="cloudLoginPanel">
 <label class="field"><span>用户名</span><input id="cloudLoginName" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="32" placeholder="仅英文字母和数字"></label>
 <label class="field"><span>教师密钥</span><textarea id="cloudLoginKey" rows="3" autocomplete="off" spellcheck="false" placeholder="粘贴 NT2- 开头的教师密钥"></textarea></label>
 <button class="secondary-btn" id="cloudLogin">登录教师账户</button>
 <p class="hint">密钥丢失请联系管理员。用户名不能单独恢复账户。</p></section>
 <section id="cloudRegisterPanel" hidden>
 <label class="field"><span>管理员给你的邀请码</span><textarea id="cloudInvitation" rows="2" autocomplete="off" spellcheck="false" placeholder="粘贴 INV- 开头的邀请码"></textarea></label>
 <label class="field"><span>设置用户名</span><input id="cloudRegisterName" autocapitalize="none" autocomplete="off" spellcheck="false" maxlength="32" placeholder="3–32 位英文字母或数字"></label>
 <p class="hint">用户名不区分大小写。注册后系统会生成你的专属教师密钥，不需要邮箱。</p>
 <button class="secondary-btn" id="cloudRegister">注册教师账户</button></section>
 <section id="cloudRecoveryPanel" hidden>
 <label class="field"><span>学生恢复码或旧版账户恢复码</span><textarea id="cloudRecovery" rows="3" autocomplete="off" spellcheck="false" placeholder="粘贴 nt1. 开头的完整恢复码"></textarea></label>
 <button class="secondary-btn" id="cloudRecover">恢复云端账户</button>
 <details><summary>我保存的是恢复码文件</summary>
 <label class="field"><span>选择恢复码文件</span><input id="cloudRecoveryFile" type="file" accept=".json,application/json"></label></details>
 <details id="cloudLegacySetup"><summary>旧版首次开通班级（教师） · 管理员协助</summary>
 <label class="field"><span>云服务配置文件</span><input id="cloudConfig" type="file" accept=".json,application/json"></label>
 <label class="field"><span>旧版一次性开通码</span><input id="cloudBootstrap" autocomplete="off" spellcheck="false"></label>
 <button class="secondary-btn" id="cloudCreate">开通班级</button></details></section>
 <details id="cloudLocalPinBox" open><summary>本机 PIN / 载入学生</summary><label class="field"><span>本机四位 PIN（新设备教师登录，或载入学生时使用）</span><input id="cloudLocalPin" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></label>
 <p class="hint">PIN 只保护这台设备，不能代替教师密钥。</p></details>
 <section id="cloudPacket" hidden><h3 id="cloudIssuedTitle">保存恢复码</h3>
 <p class="hint" id="cloudIssuedHelp">这是一段文字，请复制到你私下保管的位置。换设备时粘贴即可，下载文件是可选的。</p>
 <textarea id="cloudIssued" aria-label="新生成的恢复码" aria-describedby="cloudIssuedHelp" rows="4" readonly></textarea>
 <button class="secondary-btn" id="cloudCopyCode">复制密钥 / 恢复码</button>
 <button class="ghost-btn" id="cloudDownloadCode">另存为文件（可选）</button>
 <button class="secondary-btn" id="cloudSavedCode">我已妥善保存</button></section>
 <div id="cloudManagement" hidden>
 <div id="cloudTeacher" hidden>
 <h3>添加云端学生</h3>
 <label class="field"><span>选择本机学生</span><select id="cloudLocal"></select></label>
 <label class="field"><span>学生编号（不要填姓名）</span><input id="cloudParticipant" placeholder="例如 P001" maxlength="40"></label>
 <button class="secondary-btn" id="cloudBind">备份并绑定学生</button>
 <details id="cloudSafety"><summary>账户安全与备份</summary>
 <button class="secondary-btn" id="cloudTeacherCode">生成备用教师恢复码</button>
 <button class="secondary-btn" id="cloudResearchCode">生成研究者只读授权码</button>
 <button class="secondary-btn" id="cloudBackup">导出班级云端灾备</button>
 <button class="secondary-btn" id="cloudDevices">查看或撤销设备</button>
 <button class="secondary-btn" id="cloudCodes">查看或撤销授权</button><div id="cloudGrantList"></div></details></div>
 <h3>云端学生</h3><button class="ghost-btn" id="cloudRefresh">刷新云端名册</button>
 <button class="secondary-btn" id="cloudRetry">立即同步 / 重试</button>
 <div id="cloudRoster"></div><div id="cloudReadReport"></div>
 <p class="hint">另一设备继续练习前，请先确认原设备已同步。进度冲突不会自动覆盖，请先备份本机记录。</p>
 <button class="ghost-btn" id="cloudSwitch">登录 / 恢复其他账户</button></div>
 <div class="sheet-foot"><button class="secondary-btn" id="cloudClose">关闭</button></div></div>`;
 document.body.append(dialog);
 const $=id=>dialog.querySelector('#'+id),status=text=>{$('cloudStatus').textContent=text;};
 function entry(mode){
  dialog.querySelector('.sheet').scrollTop=0;
  for(const [name,panel] of [['login','cloudLoginPanel'],['register','cloudRegisterPanel'],['recover','cloudRecoveryPanel']])$(panel).hidden=mode!==name;
  for(const [name,tab] of [['login','cloudLoginTab'],['register','cloudRegisterTab'],['recover','cloudRecoveryTab']])$(tab).setAttribute('aria-pressed',String(mode===name));
 }
 $('cloudLoginTab').onclick=()=>entry('login');$('cloudRegisterTab').onclick=()=>entry('register');$('cloudRecoveryTab').onclick=()=>entry('recover');
 $('cloudSwitch').onclick=()=>{
  if(active){status('正在同步，请稍后再切换账户。');return;}
  $('cloudManagement').hidden=true;$('cloudEntryTabs').hidden=false;$('cloudLocalPinBox').hidden=false;entry('login');
  $('cloudIntro').textContent='登录其他账户前，请先确认当前账户的记录已同步。';
 };
 function download(name,value){host.download(name,typeof value==='string'?value:JSON.stringify(value),'application/json');}
 async function action(fn){
  if(managing)return;managing=true;dialog.setAttribute('aria-busy','true');
  try{await fn();}catch(e){status(e.message || '操作未完成，请保留本机数据并重试');}
  finally{managing=false;dialog.removeAttribute('aria-busy');}
 }
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
  const connected=!!client.access;
  $('cloudManagement').hidden=!connected;$('cloudEntryTabs').hidden=connected;
  $('cloudIntro').textContent=connected?'已连接'+(client.access.username?'：'+client.access.username:'云端账户')+'。仅绑定的学生同步练习记录。':'教师使用用户名和教师密钥登录。首次使用请先注册。';
  $('cloudLocalPinBox').hidden=!connected&&host.isTeacher();$('cloudLocalPinBox').open=!connected&&!host.isTeacher();
  if(connected){for(const id of ['cloudLoginPanel','cloudRegisterPanel','cloudRecoveryPanel'])$(id).hidden=true;}
  else entry('login');
  $('cloudTeacher').hidden=client.access?.role!=='teacher';
  $('cloudLocal').replaceChildren(...host.accounts().filter(a=>!a.cloudStudent).map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name;return o;}));
 }
 function showIssued(value,title='保存恢复码'){$('cloudIssued').value=value;$('cloudIssuedTitle').textContent=title;$('cloudPacket').hidden=false;}
 async function issue(role,student){
  host.requireLocalTeacher();const out=await client.issue(role,student);
  showIssued(role==='teacher'&&client.access?.username?teacherKey(decodeRecovery(out.packet).secret):out.packet);
  status('恢复码已生成，请复制并私下保存。');
 }
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
    const b=document.createElement('button');b.className='secondary-btn';b.textContent='导出去标识记录';b.onclick=()=>download('note-trainer_'+student.code+'.json',{schema_version:1,workspace_id:student.workspace_id,student_id:student.id,participant:student.code,events});box.append(b);
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
  // Credential changes and sync must not interleave on the shared client.
  if(managing){schedule();return;}
  if(!navigator.onLine){status('当前离线，答题仍保存在本机。联网后继续同步。');return;}
  active=true;const startedVersion=saveVersion;
  try{
   await writer();
   for(const account of host.accounts()){
    if(!canSyncAccount(client.access,account))continue;
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
 $('cloudRegister').onclick=()=>action(async()=>{
  if(client.access)throw Error('这台设备已经连接账户。请在独立浏览器中注册其他教师，避免混用本机档案。');
  const name=username($('cloudRegisterName').value),invitation=parseInvitation($('cloudInvitation').value);
  if(!host.isTeacher())host.authorizeManagement('teacher',$('cloudLocalPin').value);
  host.requireLocalTeacher();
  let pending=JSON.parse(localStorage.getItem('nt.cloud.registrationPending')||'null');
  if(!pending||pending.name!==name||pending.invitation!==invitation){pending={name,invitation,secret:randomCode()};localStorage.setItem('nt.cloud.registrationPending',JSON.stringify(pending));}
  client.configure(portalConfig);await writer();
  await client.registerTeacher(invitation,name,pending.secret);
  $('cloudInvitation').value='';await roster();
  showIssued(teacherKey(pending.secret),'保存教师密钥 · '+name);
  status('教师账户已创建。请复制并保存教师密钥；以后换设备仍使用它。');
 });
 $('cloudLogin').onclick=()=>action(async()=>{
  if(active)throw Error('正在同步，请稍后再登录');
  const name=username($('cloudLoginName').value);
  if(!host.isTeacher()&&!/^\d{4}$/.test($('cloudLocalPin').value))throw Error('新设备请先填写四位本机 PIN');
  client.configure(portalConfig);await writer();
  const access=await client.loginTeacher(name,$('cloudLoginKey').value);
  host.authorizeManagement(access.role,$('cloudLocalPin').value);$('cloudLoginKey').value='';
  $('cloudIssued').value='';$('cloudPacket').hidden=true;paused=false;await roster();schedule();
 });
 $('cloudConfig').onchange=()=>action(async()=>{const f=$('cloudConfig').files[0];if(f)client.configure(JSON.parse(await f.text()));status('配置已加载；尚未绑定或上传本机学生。');});
 $('cloudRecover').onclick=()=>action(async()=>{
  if(active)throw Error('正在同步，请稍后再恢复账户');
  const packet=$('cloudRecovery').value.trim();decodeRecovery(packet);await writer();
  const access=await client.recover(packet);host.authorizeManagement(access.role,$('cloudLocalPin').value);$('cloudRecovery').value='';paused=false;await roster();schedule();
 });
 $('cloudCreate').onclick=()=>action(async()=>{host.requireLocalTeacher();await writer();await client.create($('cloudBootstrap').value.trim());$('cloudBootstrap').value='';await roster();await issue('teacher');});
 $('cloudTeacherCode').onclick=()=>action(()=>issue('teacher'));
 $('cloudResearchCode').onclick=()=>action(()=>issue('researcher'));
 $('cloudDownloadCode').onclick=()=>{download('note-trainer_recovery.json',{username:client.access?.username,recovery:$('cloudIssued').value});};
 $('cloudSavedCode').onclick=()=>{
  localStorage.removeItem('nt.cloud.registrationPending');client.forgetPendingCode();
  $('cloudIssued').value='';$('cloudPacket').hidden=true;status('请妥善保管密钥 / 恢复码。本机登录状态会保留。');
 };
 $('cloudCopyCode').onclick=()=>action(async()=>{
  try{await navigator.clipboard.writeText($('cloudIssued').value);status('恢复码已复制，请粘贴到你私下保管的位置。');}
  catch{$('cloudIssued').focus();$('cloudIssued').select();status('无法自动复制，已选中恢复码。请手动复制并私下保存。');}
 });
 $('cloudBind').onclick=()=>action(async()=>{
  if(client.access?.role!=='teacher')throw Error('需要云端教师权限');
  const id=$('cloudLocal').value,code=$('cloudParticipant').value.trim();
  if(!/^[A-Za-z0-9_-]{1,40}$/.test(code))throw Error('请输入参与者编号');
  if(!confirm('先完整备份本机名册，再将所选学生绑定到云端 '+code+'？只上传练习与进度，不上传姓名或本地 PIN。'))return;
  await writer();const rosterToken=host.beforeBind(),source=host.readState(id);
  if(!source||!Array.isArray(source.events))throw Error('本机存档缺失，已停止绑定');
  const remote=await client.addStudent(id,code);
  const events=await identifyLegacyEvents(remote,source.events);
  host.bind(id,remote,client.access.workspace,{rosterToken,original:JSON.stringify(source),events});location.reload();
 });
 $('cloudBackup').onclick=()=>action(async()=>{host.requireLocalTeacher();const backup=await client.backup();download('note-trainer_cloud_backup.json',backup);status('云端灾备已导出，含恢复码哈希；请离线保管。此备份由管理员恢复，不含认证会话。');});
 $('cloudDevices').onclick=()=>action(async()=>{
  host.requireLocalTeacher();const devices=await client.devices();$('cloudGrantList').replaceChildren();
  for(const device of devices){const row=document.createElement('p');row.textContent=device.role+' / '+(device.current?'当前设备':'其他设备')+' / '+(device.revoked?'已撤销':'有效');
   if(!device.revoked){const b=document.createElement('button');b.className='ghost-btn';b.textContent='撤销设备';b.onclick=()=>action(async()=>{if(!confirm('撤销此设备的访问？这不删除答题记录；持有效恢复码仍可重新恢复，需要永久撤销时也请撤销对应恢复码。'))return;await client.revokeDevice(device.id);row.textContent+=' / 已撤销';});row.append(b);}$('cloudGrantList').append(row);}
 });
 $('cloudCodes').onclick=()=>action(async()=>{
  const codes=await client.codes();$('cloudGrantList').replaceChildren();
  for(const code of codes){const row=document.createElement('p');row.textContent=code.role+' / '+(code.student||'全班')+' / '+(code.revoked?'已撤销':code.expires==='infinity'?'长期有效':'有效至 '+code.expires.slice(0,10));
   if(!code.revoked){const b=document.createElement('button');b.className='ghost-btn';b.textContent='撤销';b.onclick=()=>action(async()=>{if(!confirm('撤销此恢复码及通过它恢复的所有设备？教师可重新生成授权码。'))return;await client.revoke(code.id);row.textContent+=' / 已撤销';});row.append(b);}$('cloudGrantList').append(row);}
 });
 $('cloudRefresh').onclick=()=>action(roster);
 $('cloudRetry').onclick=()=>{paused=false;clearTimeout(timer);timer=null;sync();};
 const onSave=()=>{saveVersion++;schedule();},onOnline=()=>{if(!paused){clearTimeout(timer);timer=null;schedule(0);}};
 window.addEventListener('nt-local-saved',onSave);window.addEventListener('online',onOnline);
 async function open(){
  if(client.access?.role!=='learner' && client.access && !host.isTeacher()){host.notify('请先从老师入口验证本机 PIN，再打开云端管理');return;}
  dialog.classList.add('open');showAccess();if(client.access)await action(roster);
  const pending=JSON.parse(localStorage.getItem('nt.cloud.registrationPending')||'null');
  if(pending&&pending.name===client.access?.username)showIssued(teacherKey(pending.secret),'保存教师密钥 · '+pending.name);
 }
 $('cloudRecoveryFile').onchange=()=>action(async()=>{const file=$('cloudRecoveryFile').files[0];if(file){const value=JSON.parse(await file.text());if(value.recovery?.startsWith('NT2-')){$('cloudLoginName').value=username(value.username);$('cloudLoginKey').value=value.recovery;entry('login');}else{decodeRecovery(value.recovery);$('cloudRecovery').value=value.recovery;}}});
 // Bindings are durable before a reload; take the writer lock before the game boots.
 const ready=host.accounts().some(a=>a.cloudStudent)?writer().then(()=>schedule()):Promise.resolve();
 return {open,ready,client,dispose(){disposed=true;clearTimeout(timer);releaseLock?.();window.removeEventListener('nt-local-saved',onSave);window.removeEventListener('online',onOnline);}};
}
