import {portalConfig} from './portal_config.mjs';
import {invitationKey} from './portal_identity.mjs';
// Admin tokens and plaintext invitations stay in memory, separate from game storage.
let session=null,factor=null,data={invites:[],teachers:[]},editing=null,selected=null,filterInvite=null,pending=null,busy=false;
const $=id=>document.getElementById(id),status=text=>{$('status').textContent=text;};
async function request(path,body,method='POST'){
 const response=await fetch(portalConfig.url+path,{method,headers:{apikey:portalConfig.publishableKey,'content-type':'application/json',...(session?{authorization:'Bearer '+session.access_token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(response.status===401?'登录已过期，请退出后重新登录':response.status===403?'没有管理权限，或需要重新进行双重验证':'操作未完成（'+response.status+'），请重试');
 return response.status===204?null:response.json();
}
const rpc=(name,body={})=>request('/rest/v1/rpc/nt_portal_admin_'+name,body);
async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){status(e.message||'连接未完成，请重试');}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
function tab(which){for(const name of ['invites','teachers']){$(name+'Panel').hidden=name!==which;$(name+'Tab').setAttribute('aria-pressed',String(name===which));$(name+'Tab').classList.toggle('secondary',name!==which);}}
function button(text,fn){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=text;b.onclick=()=>action(fn);return b;}
function table(target,headers,rows){const t=document.createElement('table'),head=t.createTHead().insertRow();for(const text of headers){const th=document.createElement('th');th.scope='col';th.textContent=text;head.append(th);}const body=t.createTBody();for(const cells of rows){const r=body.insertRow();for(const value of cells){const td=r.insertCell();if(value instanceof Node)td.append(value);else td.textContent=String(value??'—');}}if(!rows.length){const td=body.insertRow().insertCell();td.colSpan=headers.length;td.textContent='暂无记录';}$(target).replaceChildren(t);}
const date=value=>value?new Date(value).toLocaleString('zh-CN',{hour12:false}):'尚未登录';
function render(){
 table('inviteTable',['备注','状态','已注册 / 上限','有效至','操作'],data.invites.map(i=>{
  const actions=document.createElement('div');actions.append(button('管理',()=>{editing=i;$('editExpiry').value=localDate(i.expires_at);$('editLimit').value=i.max_uses;$('editEnabled').value=String(i.enabled);$('editInviteForm').hidden=false;}),button('查看教师',()=>{filterInvite=i.id;tab('teachers');renderTeachers();}));
  return [i.note||'未备注',!i.enabled?'已暂停':new Date(i.expires_at)<=new Date()?'已到期':i.used>=i.max_uses?'名额已满':'有效',i.used+' / '+i.max_uses,date(i.expires_at),actions];
 }));renderTeachers();
}
function renderTeachers(){
 const q=$('search').value.toLowerCase();$('clearFilter').hidden=!filterInvite;$('teacherFilter').textContent=filterInvite?'仅显示所选邀请码注册的教师':'';
 table('teacherTable',['用户名','备注','状态','最近登录','操作'],data.teachers.filter(t=>(!filterInvite||t.invite_id===filterInvite)&&(t.username+' '+t.note).toLowerCase().includes(q)).map(t=>[t.username,t.note,t.enabled?'正常':'已停用',date(t.last_login),button('查看',()=>detail(t))]));
}
function localDate(value){const d=new Date(value);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
async function refresh(){data=await rpc('list');render();status('已更新管理数据。');}
async function detail(t){
 selected=t;$('teacherDetail').hidden=false;$('teacherTitle').textContent=t.username;$('teacherNote').value=t.note;$('toggleTeacher').textContent=t.enabled?'停用账户':'恢复账户';
 $('teacherInfo').textContent='注册：'+date(t.created_at)+'；邀请码备注：'+(data.invites.find(i=>i.id===t.invite_id)?.note||'未备注');
 const devices=await rpc('devices',{teacher_id:t.id});$('devices').replaceChildren();
 for(const d of devices){const row=document.createElement('p');row.textContent=d.role+' · '+d.id.slice(0,8)+' · '+(d.revoked?'已撤销':'有效')+' ';if(!d.revoked)row.append(button('撤销设备',async()=>{if(!confirm('撤销这台设备的云端访问？有效教师密钥仍可重新登录。'))return;await rpc('revoke_device',{member_id:d.id});await detail(selected);status('设备云端授权已撤销。');}));$('devices').append(row);}
}
$('loginForm').onsubmit=e=>{e.preventDefault();action(async()=>{
 session=null;session=await request('/auth/v1/token?grant_type=password',{email:$('email').value,password:$('password').value});$('password').value='';$('logout').hidden=false;
 const user=await request('/auth/v1/user',undefined,'GET'),verified=(user.factors||[]).filter(f=>f.factor_type==='totp'&&f.status==='verified');
 $('enrollment').hidden=true;$('totpSecret').textContent='';$('factorChoice').replaceChildren();
 if(verified.length){factor=verified[0].id;for(const f of verified){const o=document.createElement('option');o.value=f.id;o.textContent=f.friendly_name||'验证器';$('factorChoice').append(o);}$('factorChoice').hidden=verified.length<2;}
 else{
  if(!await rpc('setup'))throw Error('此账户未获管理员授权，请通过项目所有者设置。');
  const enrolled=await request('/auth/v1/factors',{factor_type:'totp',friendly_name:'Note Trainer Admin '+Date.now()});
  factor=enrolled.id;$('factorChoice').hidden=true;$('totpSecret').textContent=enrolled.totp.secret;$('enrollment').hidden=false;
 }
 $('loginForm').hidden=true;$('mfaForm').hidden=false;status('请输入验证器动态码。');
 });};
$('factorChoice').onchange=()=>{factor=$('factorChoice').value;};
$('mfaForm').onsubmit=e=>{e.preventDefault();action(async()=>{
 const challenge=await request('/auth/v1/factors/'+encodeURIComponent(factor)+'/challenge',{});
 session=await request('/auth/v1/factors/'+encodeURIComponent(factor)+'/verify',{challenge_id:challenge.id,code:$('otp').value});$('otp').value='';
 $('totpSecret').textContent='';$('enrollment').hidden=true;
 await refresh();$('loginPanel').hidden=true;$('dashboard').hidden=false;
 });};
$('logout').onclick=()=>action(async()=>{try{if(session)await request('/auth/v1/logout?scope=local',{});}finally{session=null;factor=null;data={invites:[],teachers:[]};pending=null;selected=null;location.reload();}});
$('invitesTab').onclick=()=>tab('invites');$('teachersTab').onclick=()=>tab('teachers');$('refresh').onclick=()=>action(refresh);
$('search').oninput=renderTeachers;$('clearFilter').onclick=()=>{filterInvite=null;renderTeachers();};
$('newInvite').onclick=()=>{$('inviteForm').hidden=false;};$('cancelInvite').onclick=()=>{$('inviteForm').hidden=true;};$('cancelEdit').onclick=()=>{$('editInviteForm').hidden=true;editing=null;};
$('inviteForm').onsubmit=e=>{e.preventDefault();action(async()=>{
 const note=$('inviteNote').value,days=Number($('inviteDays').value),max=Number($('inviteLimit').value);
 if(!Number.isInteger(days)||days<1||days>3650||!Number.isInteger(max)||max<1||max>10000)throw Error('请检查有效天数和注册人数');
 if(pending&&(pending.note!==note||pending.max!==max||pending.days!==days))throw Error('上一次生成结果尚未确认，请恢复原参数重试，或刷新后先检查邀请码列表。');
 if(!pending){const raw=[...crypto.getRandomValues(new Uint8Array(24))].map(x=>x.toString(16).padStart(2,'0')).join('');pending={raw,note,max,days,expires_at:new Date(Date.now()+days*86400000).toISOString()};}
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pending.raw)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 await rpc('invite',{invite_hash:hash,note:pending.note,expires_at:pending.expires_at,max_uses:pending.max});
 $('issuedInvite').value=invitationKey(pending.raw);$('issuedPanel').hidden=false;$('inviteForm').hidden=true;await refresh();status('邀请码已生成，请复制保存。');
 });};
$('copyInvite').onclick=()=>action(async()=>{try{await navigator.clipboard.writeText($('issuedInvite').value);status('邀请码已复制，请私下保存。');}catch{$('issuedInvite').focus();$('issuedInvite').select();status('请手动复制已选中的邀请码。');}});
$('savedInvite').onclick=()=>{pending=null;$('issuedInvite').value='';$('issuedPanel').hidden=true;};
$('editInviteForm').onsubmit=e=>{e.preventDefault();action(async()=>{
 const expires_at=new Date($('editExpiry').value).toISOString(),max_uses=Number($('editLimit').value),enabled=$('editEnabled').value==='true';
 if(!editing)throw Error('请先选择邀请码');await rpc('update_invite',{invite_id:editing.id,enabled,expires_at,max_uses});$('editInviteForm').hidden=true;editing=null;await refresh();
 });};
$('saveTeacherNote').onclick=()=>action(async()=>{if(!selected)return;await rpc('note',{teacher_id:selected.id,note:$('teacherNote').value});const id=selected.id;await refresh();await detail(data.teachers.find(t=>t.id===id));});
$('toggleTeacher').onclick=()=>action(async()=>{if(!selected||!confirm(selected.enabled?'停用此教师的云端访问？教学数据保留。':'恢复此教师的云端访问？'))return;const id=selected.id;await rpc('teacher',{teacher_id:id,enabled:!selected.enabled,note:$('teacherNote').value});await refresh();await detail(data.teachers.find(t=>t.id===id));});
