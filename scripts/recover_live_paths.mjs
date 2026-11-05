// Recover only the four artifacts this session wrote with URL.pathname instead of fileURLToPath.
import {readFile,writeFile,readdir,stat,access,copyFile,unlink,rmdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const targetURL=new URL('../.release/cloud_live/',import.meta.url);
const source=targetURL.pathname,target=fileURLToPath(targetURL);
const names=['teacher.json','learner.json','researcher.json','researcher_report.png'];
const digest=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
if(source===target || !await access(source).then(()=>true,()=>false)){console.log('没有需要归位的错误编码目录。');process.exit(0);}
const found=await readdir(source);
if(found.some(n=>!names.includes(n)) || found.length!==names.length)throw Error('错误目录清单不匹配，停止');
const rows=[];
for(const name of names){
 const from=join(source,name),to=join(target,name);
 if(await access(to).then(()=>true,()=>false))throw Error('目标已存在，停止而不覆盖');
 rows.push({from,to,bytes:(await stat(from)).size,sha256:await digest(from)});
}
const manifest={createdAt:new Date().toISOString(),count:rows.length,bytes:rows.reduce((n,r)=>n+r.bytes,0),rows};
await writeFile(join(target,'path_recovery_manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
if(!process.argv.includes('--execute')){console.log({prepared:true,count:manifest.count,bytes:manifest.bytes});process.exit(0);}
for(const row of rows){
 await copyFile(row.from,row.to,constants.COPYFILE_EXCL);
 if((await stat(row.to)).size!==row.bytes || await digest(row.to)!==row.sha256)throw Error('复制后校验失败，保留源件');
 await unlink(row.from);
}
if((await readdir(source)).length)throw Error('源目录尚未搬空');
for(let dir=source;dir!==dirname(dir);dir=dirname(dir)){
 if(!dir.includes('Nutstore%20Files'))break;
 try{await rmdir(dir);}catch(e){if(e.code==='ENOTEMPTY')break;throw e;}
}
console.log({moved:rows.length,bytes:manifest.bytes,hashesVerified:true,sourceEmpty:true});
