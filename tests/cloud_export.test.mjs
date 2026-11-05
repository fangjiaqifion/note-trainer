import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('const CSV_HEAD ='),html.indexOf('function exportCsv(){'));
test('CSV adds stable cloud/answer IDs across devices without changing legacy participant columns',()=>{
 const c=vm.createContext({Date,dayKey:()=> '2026-11-05'});vm.runInContext(code+'\nthis.head=CSV_HEAD;',c);
 const state={events:[{id:'event-uuid',t:1,seq:1}]},cloud={cloudWorkspace:'workspace-uuid',cloudStudent:'student-uuid'};
 const a=c.csvEventRows({id:'original-local',name:'P001',...cloud},state)[0];
 const b=c.csvEventRows({id:'restored-local',name:'P001',...cloud},state)[0];
 const field=(row,key)=>row[c.head.indexOf(key)];
 assert.equal(field(a,'participant'),'original-local');assert.equal(field(b,'participant'),'restored-local');
 for(const k of ['cloud_workspace','cloud_participant','event_id'])assert.equal(field(a,k),field(b,k));
 assert.equal(field(a,'cloud_participant'),'student-uuid');assert.equal(field(a,'event_id'),'event-uuid');assert.equal(a.length,c.head.length);
 const old=c.csvEventRows({id:'old',name:'P001'},{events:[{t:1,seq:1}]})[0];assert.equal(field(old,'cloud_participant'),'');assert.equal(field(old,'event_id'),'');
});
