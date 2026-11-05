// Prepare owner-reviewed SQL only. Never connects, executes, pushes, or prints secrets.
import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {teacherKey} from '../portal_identity.mjs';
const [command,id,replacement]=process.argv.slice(2),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
if(!uuid.test(id||'')||!['grant-admin','revoke-admin','reset-teacher'].includes(command)||replacement&&!uuid.test(replacement))throw Error('Usage: node scripts/portal_maintenance.mjs grant-admin|revoke-admin|reset-teacher UUID [OLD_ADMIN_UUID]');
const dir=new URL('../.release/portal_maintenance/',import.meta.url);await mkdir(dir,{recursive:true,mode:0o700});
const prefix=command+'_'+Date.now();let sql='begin;\n';
if(command==='grant-admin'){
 if(replacement===id)throw Error('Replacement and previous administrator must differ');
 sql+=`insert into nt_private.portal_admins(user_id,enabled,require_mfa_after) values('${id}',true,now()) on conflict(user_id) do update set enabled=true,require_mfa_after=now();\n`;
 if(replacement)sql+=`update nt_private.portal_admins set enabled=false where user_id='${replacement}';\n`;
 sql+=`insert into nt_private.portal_audit(action,subject) values('admin.owner-grant','${id}');\n`;
}else if(command==='revoke-admin'){
 sql+=`do $$ begin if not exists(select 1 from nt_private.portal_admins where enabled and user_id<>'${id}') then raise exception 'Refusing to revoke the last enabled admin; grant a replacement first'; end if; end $$;\nupdate nt_private.portal_admins set enabled=false where user_id='${id}';\ninsert into nt_private.portal_audit(action,subject) values('admin.owner-revoke','${id}');\n`;
}else{
 const raw=randomBytes(32).toString('hex'),hash=createHash('sha256').update(raw).digest('hex');
 sql+=`select nt_private.portal_reset_teacher('${id}','${hash}');\n`;
 await writeFile(new URL(prefix+'_credential.txt',dir),teacherKey(raw)+'\n',{mode:0o600,flag:'wx'});
}
sql+='commit;\n';await writeFile(new URL(prefix+'.sql',dir),sql,{mode:0o600,flag:'wx'});
console.log('Prepared owner-maintenance files under .release/portal_maintenance/. Review SQL and execute through the project owner. Credentials were not printed.');
