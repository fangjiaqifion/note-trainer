import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

// Isolated synthetic browser context; never reads the user's browser profile.
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:820,height:1180}});
  await context.addInitScript(()=>{
    localStorage.setItem('nt.accounts.v1',JSON.stringify({v:1,accounts:[{id:'notation',name:'Synthetic notation',salt:'test',hash:'fnv1a:0',color:'#3C7DD9',createdAt:0,lastActiveAt:0}],currentId:'notation',legacyImported:false,locked:false}));
    localStorage.setItem('nt.state.notation.v1',JSON.stringify({v:3,layout:2,stars:{},progress:{},selected:null,spot:{note:'A4',step:0},focus:'A4',lastSeen:{},events:[],eventSeq:0,practiceSeq:0,autoHistory:[],battery:null,level7:1,legacyE4:0,sound:false,speech:false,labels:false,decor:false,difficulty:'normal',createdAt:0,updatedAt:0}));
  });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:8775/index.html');
  await page.waitForSelector('#home.active');
  const result=await page.evaluate(()=>{
    const d=window.__dbg;
    d.S.selected=d.NOTE_ORDER.slice();d.S.selected.forEach(id=>d.S.progress[id]={key:1,pos:1,fin:1});
    d.startLevel(14);
    const svg=document.querySelector('#stage svg');
    const bars=svg.querySelector('path:last-child').getBBox();
    const grand={width:bars.width,height:bars.height};
    d.G.session++;d.G.busy=false;d.G.q=d.buildQuestions(15)[0];d.G.q.answered=false;d.G.q.render();
    const upright=[...document.querySelectorAll('.note-number')].every(el=>getComputedStyle(el).transform==='none');
    return {grand,upright};
  });
  assert.ok(result.grand.width>10&&result.grand.height>=12,'both sides of the grand staff must have full-height barlines');
  assert.ok(result.upright,'flash badges must remain upright');
  await page.waitForTimeout(2400);
  assert.equal(await page.locator('#stage svg').count(),2,'flash must remain visible beyond two seconds');
  await page.waitForFunction(()=>window.__dbg.G.q.phase==='answer');
  assert.equal(await page.locator('#stage svg').count(),0);
  console.log('PASS notation refinements: closing grand-staff barline, upright badges, three-second observation');
  await context.close();
}finally{await browser.close();}
