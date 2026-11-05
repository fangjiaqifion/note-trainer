// Usernames identify accounts; only random credentials authorize them.
export function username(value){
 if(typeof value!=='string'||! /^[A-Za-z0-9]{3,32}$/.test(value))throw Error('用户名须为 3–32 位英文字母或数字，不允许空格或符号');
 return value.toLowerCase();
}
export function teacherKey(secret){
 if(!/^[a-f0-9]{64}$/.test(secret))throw Error('教师密钥格式不正确');
 return 'NT2-'+secret.match(/.{8}/g).join('-');
}
export function parseTeacherKey(value){
 const raw=typeof value==='string'?value.trim():'';
 if(!/^NT2-(?:[a-fA-F0-9]{8}-){7}[a-fA-F0-9]{8}$/.test(raw))throw Error('请粘贴完整教师密钥（NT2- 开头）');
 return raw.slice(4).replaceAll('-','').toLowerCase();
}
export function invitationKey(secret){
 if(!/^[a-f0-9]{48}$/.test(secret))throw Error('邀请码格式不正确');
 return 'INV-'+secret.match(/.{8}/g).join('-');
}
export function parseInvitation(value){
 const raw=typeof value==='string'?value.trim():'';
 if(!/^INV-(?:[a-fA-F0-9]{8}-){5}[a-fA-F0-9]{8}$/.test(raw))throw Error('请粘贴完整邀请码（INV- 开头）');
 return raw.slice(4).replaceAll('-','').toLowerCase();
}
export function portalResult(value){
 if(!value?.error)return value;
 const messages={rate_limit:'尝试次数过多，请稍后再试',invalid_login:'用户名或教师密钥不正确，或账户已停用',username_unavailable:'该用户名已被使用，请换一个',invitation_unavailable:'邀请码已过期、暂停或名额已用完，请联系管理员',registration_exists:'这台浏览器已完成过注册，请使用教师密钥登录',invalid_registration:'注册信息格式不正确'};
 throw Error(messages[value.error]||'操作未完成，请联系管理员');
}
