/* note-trainer 烟雾测试
   运行：npm install && npm test
   依赖：playwright-core + 本机 Google Chrome（不下载浏览器）
   覆盖：首页十八张卡、40 种题型 × 4 个视口的溢出检查、单音选项、
        新音 14 题的中途续学与完整结算、报告列数、控制台报错。 */

import assert from 'node:assert/strict';
import { generationAudit } from './generation_audit.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const REMOTE_BASE=process.env.NT_REMOTE_TEST_BASE;
if(REMOTE_BASE && REMOTE_BASE !== 'https://fangjiaqifion.github.io/note-trainer/') throw new Error('Unexpected remote test destination');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function startServer(){
  const server = createServer(async function(req, res){
    const url = new URL(req.url, 'http://127.0.0.1');
    let path = decodeURIComponent(url.pathname);
    if(path === '/' || path === '') path = '/index.html';
    const file = normalize(join(ROOT, path));
    if(!file.startsWith(ROOT)){
      res.statusCode = 403;
      res.end('forbidden');
      return;
    }
    try{
      const body = await readFile(file);
      res.setHeader('content-type', MIME[extname(file)] || 'application/octet-stream');
      res.setHeader('cache-control', 'no-store');
      res.end(body);
    }catch(e){
      res.statusCode = 404;
      res.end('not found');
    }
  });
  return new Promise(function(resolve){
    server.listen(0, '127.0.0.1', function(){ resolve(server); });
  });
}

const SEED = {
  accounts: {
    v: 1,
    accounts: [{
      id: 't1', name: '测试', salt: 'smoke', hash: 'fnv1a:0',
      color: '#3C7DD9', createdAt: 0, lastActiveAt: 0
    }],
    currentId: 't1', legacyImported: false, locked: false
  },
  state: {
    v: 3, layout: 2, stars: {}, progress: {}, selected: null,
    spot: { note: 'A4', step: 0 }, focus: 'A4', lastSeen: {},
    events: [], eventSeq: 0, practiceSeq: 0, autoHistory: [],
    battery: null, level7: 1, legacyE4: 0,
    sound: false, speech: false, labels: false, decor: false,
    difficulty: 'auto', autoLevel: 'normal',
    createdAt: 0, updatedAt: 0
  }
};

async function seedLocalStorage(context){
  await context.addInitScript(function(seed){
    try{
      localStorage.setItem('nt.accounts.v1', JSON.stringify(seed.accounts));
      localStorage.setItem('nt.state.t1.v1', JSON.stringify(seed.state));
    }catch(e){}
  }, SEED);
}

/* 在页面里把某道题渲染到游戏页，用于版式检查。 */
async function renderCases(){
  const d = window.__dbg;
  const play = document.querySelector('#play');
  const stage = document.querySelector('#stage');
  const answer = document.querySelector('#answer');
  const savedDiff=d.G.diffKey; d.G.diffKey='hard';
  const placement=d.buildQuestions(10).filter(q=>!q.coverage)[0]; d.G.diffKey=savedDiff;
  const savedSelected=d.S.selected;d.S.selected=['B3','D4','E4'];
  const mixed=d.buildQuestions(12).at(-1);d.S.selected=savedSelected;
  const cases = [
    ['kbfind', d.SPOT_STEPS[0]('A4')],
    ['find', d.SPOT_STEPS[1]('A4')],
    ['kbfind2', d.SPOT_STEPS[2]('A4')],
    ['s2k', d.SPOT_STEPS[3]('A4')],
    ['k2s', d.SPOT_STEPS[4]('A4')],
    ['clef', d.SPOT_STEPS[5]('A4')],
    ['beats', d.SPOT_STEPS[7]('A4')],
    ['play', d.SPOT_STEPS[9]('A4')],
    ['spot', d.buildQuestions(6).filter(q=>!q.coverage)[0]],
    ['pairdir', d.buildQuestions(7).filter(q=>!q.coverage)[0]],
    ['higher', d.buildQuestions(7).filter(q=>!q.coverage).find(function(q){ return q.kind === 'higher'; })],
    ['ledger', d.buildQuestions(8).filter(q=>!q.coverage)[0]],
    ['contrast', d.buildQuestions(9)[0]],
    ['staffPlacement', d.buildQuestions(10).filter(q=>!q.coverage)[0]],
    ['matching', d.buildQuestions(11)[0]],
    ['threeNotes', d.buildQuestions(12)[0]],
    ['grandThree', d.buildQuestions(14)[0]],
    ['flashNotes', d.buildQuestions(15)[0]],
    ['rhythmFill', d.buildQuestions(16)[0]],
    ['meterChoice', d.buildQuestions(17)[0]],
    ...d.IRREGULAR_LAYOUTS.map(layout=>['irregular-'+layout.id,d.qIrregularMatch('C4','name',layout)]),
    ['playThree', d.buildQuestions(13)[0]],
    ['playThreeCompare', d.buildQuestions(13)[0]],
    ['threeNotesMixed', mixed],
    ['ledgerMove',placement]
  ];
  const out = [];
  for(const item of cases){
    const name = item[0], q = item[1];
    if(!q) continue;
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    play.classList.add('active');
    play.classList.remove('with-kb');
    stage.className = 'stage';
    answer.className = 'answer';
    stage.innerHTML = '';
    answer.innerHTML = '';
    d.G.q = q;
    q.answered = true;
    q.render();
    if(name==='playThreeCompare'){
      q.answered=false;
      q.choiceIds.forEach(function(id){document.querySelector('#answer [data-midi="'+d.NOTES[id].midi+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
      q.answered=true;
    }
    await new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); });
    const s = stage.getBoundingClientRect();
    const a = answer.getBoundingClientRect();
    const p = document.querySelector('.prompt').getBoundingClientRect();
    const rhythm=stage.querySelector('.rhythm-bar');
    const rhythmBounds=rhythm&&rhythm.getBoundingClientRect();
    const rhythmFits=!rhythmBounds||(rhythmBounds.left>=0&&rhythmBounds.right<=innerWidth&&rhythmBounds.top>=p.bottom);
    const keyboard=answer.querySelector('.irregular-keyboard');
    let keyboardFits=true;
    if(keyboard){
      const bounds=keyboard.getBoundingClientRect();
      keyboardFits=bounds.left>=0 && bounds.right<=innerWidth && bounds.bottom<=innerHeight;
      const whiteKeys=[...keyboard.querySelectorAll('.white')].map(key=>Number(key.dataset.midi));
      const blackKeys=[...keyboard.querySelectorAll('.black')].map(key=>Number(key.dataset.midi));
      keyboardFits=keyboardFits&&whiteKeys.join()==='48,50,52,53,55,57,59,60,62,64,65,67,69,71'
        &&blackKeys.join()==='49,51,54,56,58,61,63,66,68,70';
      function hitAt(t,depth){
        const point=d.irregularPoint(q.layout,t,depth),local=keyboard.createSVGPoint();
        local.x=point[0];local.y=point[1];
        const screen=local.matrixTransform(keyboard.getScreenCTM());
        return document.elementFromPoint(screen.x,screen.y);
      }
      // Black keys lie on shared boundaries at the back, leaving white tips in front.
      for(let i=0;i<whiteKeys.length-1;i++){
        const boundary=(i+1)/whiteKeys.length,front=hitAt(boundary,.85),back=hitAt(boundary,.3);
        keyboardFits=keyboardFits&&front?.classList.contains('white');
        if([48,50,53,55,57,60,62,65,67,69].includes(whiteKeys[i]))
          keyboardFits=keyboardFits&&back?.dataset.midi===String(whiteKeys[i]+1);
        else keyboardFits=keyboardFits&&!back?.classList.contains('black');
      }
      // At the top of a ring, the black/back edge must be above the white/front edge.
      const backTop=d.irregularPoint(q.layout,.5,0),frontTop=d.irregularPoint(q.layout,.5,1);
      keyboardFits=keyboardFits&&backTop[1]<frontTop[1];
      for(const midi of d.IRREGULAR_MIDIS){
        const i=d.IRREGULAR_MIDIS.indexOf(midi);
        const point=d.irregularPoint(q.layout,(i+.5)/d.IRREGULAR_MIDIS.length,.85);
        const local=keyboard.createSVGPoint();local.x=point[0];local.y=point[1];
        const screen=local.matrixTransform(keyboard.getScreenCTM());
        const hit=document.elementFromPoint(screen.x,screen.y);
        keyboardFits=keyboardFits&&hit?.dataset.midi===String(midi);
      }
    }
    const ok = keyboardFits && rhythmFits && a.bottom <= innerHeight + 0.5 &&
      s.bottom <= innerHeight + 0.5 &&
      s.top >= p.bottom - 0.6 &&
      s.right <= innerWidth + 0.5 &&
      a.right <= innerWidth + 0.5;
    out.push({ name: name, ok: ok, bottom: Math.round(Math.max(s.bottom, a.bottom)) });
  }
  return out;
}

async function layoutCheck(page){
  const viewports = [[844, 390], [390, 844], [820, 1180], [1180, 820]];
  for(const [width, height] of viewports){
    await page.setViewportSize({ width, height });
    const rows = await page.evaluate(renderCases);
    const bad = rows.filter(function(r){ return !r.ok; });
    assert.deepEqual(bad, [], `layout overflow at ${width}x${height}: ${JSON.stringify(bad)}`);
    if(process.env.NT_UI_SCREENSHOTS){
      await page.evaluate(function(){
        const d=window.__dbg;d.G.q=d.buildQuestions(13)[0];d.G.q.answered=false;
        document.querySelector('#stage').innerHTML='';document.querySelector('#answer').innerHTML='';
        document.querySelector('#play').classList.remove('with-kb');d.G.q.render();
      });
      await page.screenshot({path:'/tmp/note-trainer-play-three-'+width+'x'+height+'.png'});
      for(const skill of [15,16,17,18]){
        await page.evaluate(skill=>{
          const d=window.__dbg;d.G.q=d.buildQuestions(skill)[0];d.G.q.answered=false;
          document.querySelector('#stage').innerHTML='';document.querySelector('#answer').innerHTML='';
          document.querySelector('#play').classList.remove('with-kb');d.G.q.render();
        },skill);
        await page.screenshot({path:'/tmp/note-trainer-skill-'+skill+'-'+width+'x'+height+'.png'});
      }

      for(const layout of await page.evaluate(()=>window.__dbg.IRREGULAR_LAYOUTS.map(layout=>layout.id))){
        await page.evaluate(layout=>{
          const d=window.__dbg;d.G.q=d.qIrregularMatch('C4','name',d.IRREGULAR_LAYOUTS.find(l=>l.id===layout));d.G.q.answered=false;
          document.querySelector('#stage').className='stage';document.querySelector('#answer').className='answer';
          document.querySelector('#stage').innerHTML='';document.querySelector('#answer').innerHTML='';d.G.q.render();
        },layout);
        await page.screenshot({path:'/tmp/note-trainer-keyboard-'+layout+'-'+width+'x'+height+'.png'});
      }

    }
  }
}

async function rhythmAndIrregularInteractionCheck(page){
  const results=await page.evaluate(function(){
    const d=window.__dbg,g=d.G,stage=document.querySelector('#stage'),answer=document.querySelector('#answer');
    const saved={mode:g.mode,level:g.level};
    function mount(q,level){
      g.session++;g.busy=false;g.mode='skill';g.level=level;g.q=q;q.answered=false;
      stage.className='stage';answer.className='answer';stage.innerHTML='';answer.innerHTML='';q.render();
    }
    const q=d.buildQuestions(17)[0];mount(q,17);
    const promptCorrect=document.querySelector('.prompt').textContent.includes('选择对应的拍号');
    const initialBarlines=stage.querySelectorAll('.rhythm-bar > path').length;
    const options=[...answer.querySelectorAll('[data-meter]')].map(b=>Number(b.dataset.meter)).sort();
    answer.querySelector('[data-meter="'+(q.meter===2?3:2)+'"]').click();
    const meterWrong=q.wrong===1&&!q.answered;
    answer.querySelector('[data-meter="'+q.meter+'"]').click();
    const meterComplete=q.answered&&d.S.events.at(-1).skill===17;
    const noInitialBar=initialBarlines===2&&stage.querySelectorAll('.rhythm-bar > path').length===2;
    const rounds=d.buildQuestions(18).map(function(q,round){
      mount(q,18);
      const singleCard=stage.querySelectorAll('.irregular-card').length===1&&!stage.querySelector('button,sub');
      const plainName=q.cardType!=='name'||stage.querySelector('.card-letter').textContent===d.NOTES[q.noteId].letter;
      answer.querySelector('[data-midi="54"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
      const wrongBlack=q.wrong===1&&!q.answered;
      let partial=true,repeatIgnored=true;
      q.requiredMidis.forEach(function(midi,i){
        answer.querySelector('[data-midi="'+midi+'"]').dispatchEvent(new KeyboardEvent('keydown',{key:round%2?'Enter':' ',bubbles:true}));
        if(i<q.requiredMidis.length-1){
          partial=partial&&!q.answered&&q.foundMidis.length===i+1;
          answer.querySelector('[data-midi="'+midi+'"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
          repeatIgnored=repeatIgnored&&q.foundMidis.length===i+1&&!q.answered;
        }
      });
      const complete=q.answered&&d.S.events.at(-1).skill===18;
      const before=d.S.events.length;
      answer.querySelector('[data-midi="60"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
      return {layout:q.layout,singleCard,plainName,wrongBlack,partial,repeatIgnored,complete,noDuplicate:d.S.events.length===before};
    });
    // A name-only A accepts A3 and A4; the staff form must still identify its exact pitch.
    const original=d.S.selected,progress=d.S.progress;d.S.selected=['A3'];d.S.progress={...progress,A3:{key:1,pos:1,fin:1}};
    const nameQ=d.buildQuestions(18).find(q=>q.cardType==='name');
    mount(nameQ,18);answer.querySelector('[data-midi="69"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const nameAnyOctave=!nameQ.answered&&nameQ.foundMidis.includes(69);
    answer.querySelector('[data-midi="57"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const nameAllComplete=nameQ.answered;
    const staffQ=d.buildQuestions(18).find(q=>q.cardType==='staff');
    mount(staffQ,18);answer.querySelector('[data-midi="69"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const staffExact=!staffQ.answered&&staffQ.wrong===1;
    answer.querySelector('[data-midi="57"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const staffComplete=staffQ.answered;d.S.selected=original;d.S.progress=progress;
    g.session++;g.busy=false;Object.assign(g,saved);
    return {options,meterWrong,meterComplete,noInitialBar,promptCorrect,rounds,nameAnyOctave,nameAllComplete,staffExact,staffComplete};
  });
  assert.deepEqual(results.options,[2,3,4]);
  assert.ok(results.meterWrong&&results.meterComplete,'meter choice rejects wrong answers and records completion');
  assert.ok(results.noInitialBar&&results.promptCorrect,'meter prompt and two barlines after completion');
  assert.ok(results.nameAnyOctave&&results.nameAllComplete&&results.staffExact&&results.staffComplete,'letter-only names accept octaves; staff answers remain exact');
  assert.equal(results.rounds.length,8);
  for(const round of results.rounds){
    assert.ok(round.singleCard&&round.plainName&&round.wrongBlack&&round.partial&&round.repeatIgnored&&round.complete&&round.noDuplicate,JSON.stringify(round));
  }
  console.log('PASS skills 17–18: meter answers; eight single-note keyboards, letter-only names, octave rules, black-key errors and records');
}

async function homeNavigationCheck(page){
  for(const [width,height] of [[1280,720],[844,390],[390,844],[820,1180]]){
    await page.setViewportSize({width,height});
    await page.evaluate(function(){
      document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
      document.querySelector('#home').classList.add('active');
    });
    for(const which of ['first','last']){
      const card=which==='first'?page.locator('.level-card').first():page.locator('.level-card').last();
      await card.scrollIntoViewIfNeeded();
      await card.click({trial:true,timeout:3000});
    }
  }
  await page.setViewportSize({width:820,height:1180});
}

async function singleChoiceCheck(page){
  const count = await page.evaluate(async function(){
    const d = window.__dbg;
    const old = d.S.selected.slice();
    d.S.selected = ['B3'];
    const q = d.buildQuestions(2).find(function(x){ return x.kind === 'k2s'; });
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    document.querySelector('#play').classList.add('active');
    const stage = document.querySelector('#stage');
    const answer = document.querySelector('#answer');
    stage.className = 'stage';
    answer.className = 'answer';
    stage.innerHTML = '';
    answer.innerHTML = '';
    d.G.q = q;
    q.answered = true;
    q.render();
    const n = answer.querySelectorAll('.card-btn').length;
    d.S.selected = old;
    return n;
  });
  assert.ok(count >= 2, 'key -> staff must keep at least two choices');
}

async function answerOne(page){
  const kind = await page.evaluate(function(){ return window.__dbg.G.q && window.__dbg.G.q.kind; });
  if(!kind) throw new Error('no current question');

  if(kind === 'play'){
    await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      const b = document.querySelector('[data-side="' + d.NOTES[q.noteId].hand + '"]');
      if(b) b.click();
    });
    await page.waitForSelector('[data-finger]', { timeout: 4000 });
    await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      const b = document.querySelector('[data-finger="' + d.NOTES[q.noteId].finger + '"]');
      if(b) b.click();
    });
    await page.waitForSelector('#answer .kb .w', { timeout: 4000 });
  }else if(kind === 'beats' || kind === 'shape'){
    await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      if(q.kind === 'beats'){
        const b = Array.from(document.querySelectorAll('#answer .opt')).find(function(x){
          const n = x.querySelector('.num');
          return n && Number(n.textContent) === d.VALUES[q.valueId].beats;
        });
        if(b) b.click();
      }else{
        const b = document.querySelector('#answer .card-btn[data-value="' + q.valueId + '"]');
        if(b) b.click();
      }
    });
    await page.waitForSelector('#answer .kb .w', { timeout: 4000 });
  }else if(kind === 'k2s'){
    await page.evaluate(function(){
      const q = window.__dbg.G.q;
      const b = document.querySelector('#answer .card-btn[data-note="' + q.noteId + '"]');
      if(b) b.click();
    });
  }else if(kind === 'clef'){
    await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      const b = document.querySelector('[data-clef="' + d.NOTES[q.noteId].clef + '"]');
      if(b) b.click();
    });
  }else if(kind === 's2k' || kind === 'kbfind' || kind === 'find'){
    await page.evaluate(function(kind){
      const d = window.__dbg, q = d.G.q;
      const L = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const letter = function(m){ return L[((m % 12) + 12) % 12]; };
      const keys = Array.from(document.querySelectorAll('#answer .kb .w'));
      let k = null;
      if(kind === 'find'){
        k = keys.find(function(x){ return letter(Number(x.dataset.midi)) === q.letter; });
      }else{
        const used = keys.filter(function(x){ return x.classList.contains('used'); })
          .map(function(x){ return Number(x.dataset.midi); });
        k = keys.find(function(x){
          return Number(x.dataset.midi) === d.NOTES[q.noteId].midi && used.indexOf(Number(x.dataset.midi)) < 0;
        });
        if(!k){
          k = keys.find(function(x){
            return letter(Number(x.dataset.midi)) === d.NOTES[q.noteId].letter &&
              used.indexOf(Number(x.dataset.midi)) < 0;
          });
        }
      }
      if(k) k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    }, kind);
  }else{
    throw new Error('answerOne does not handle ' + kind);
  }

  if(kind === 'beats' || kind === 'shape' || kind === 'play'){
    const info = await page.evaluate(function(){
      const d = window.__dbg, q = d.G.q;
      const ms = Math.round(60000 / d.DIFFS[d.G.diffKey].bpm);
      const k = Array.from(document.querySelectorAll('#answer .kb .w'))
        .find(function(x){ return Number(x.dataset.midi) === d.NOTES[q.noteId].midi; });
      if(!k) return null;
      k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return { ms: ms, beats: d.VALUES[q.valueId].beats };
    });
    assert.ok(info, 'hold key not found');
    await page.waitForTimeout(Math.round(info.ms * info.beats * 1.03));
    await page.evaluate(function(){
      const k = Array.from(document.querySelectorAll('#answer .kb .w'))
        .find(function(x){ return x.classList.contains('on'); });
      if(k) k.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
  }

  const prev = await page.evaluate(function(){ return window.__dbg.G.i; });
  await page.waitForFunction(function(p){
    const result = document.querySelector('#result');
    return window.__dbg.G.i > p || (result && result.classList.contains('active'));
  }, prev, { timeout: 6000 });
}

async function clefOrderCheck(page){
  const result = await page.evaluate(function(){
    const d = window.__dbg;
    const bad = [];
    const seen = {};
    for(let k = 0; k < 200; k++){
      const letters = d.buildQuestions(3).map(function(q){
        return d.NOTES[q.noteId].letter;
      });
      seen[letters.join('')] = 1;
      for(let i = 1; i < letters.length; i++){
        if(letters[i] === letters[i - 1]){
          bad.push(letters.join(''));
          break;
        }
      }
    }
    return { bad: bad.slice(0, 5), distinct: Object.keys(seen).length };
  });
  assert.deepEqual(result.bad, [], 'skill 3 must not repeat the same note name twice in a row');
  assert.ok(result.distinct >= 20, 'skill 3 must produce varied orders');
}

async function repeatCheck(page){
  const problems = await page.evaluate(function(){
    const d = window.__dbg;
    const bad = [];
    function noteAdjacent(skill){
      for(let k = 0; k < 100; k++){
        const qs = d.buildQuestions(skill);
        for(let i = 1; i < qs.length; i++){
          if(qs[i].noteId && qs[i - 1].noteId && qs[i].noteId === qs[i - 1].noteId){
            bad.push('skill ' + skill + ': ' + qs.map(function(q){ return q.noteId; }).join(' '));
            return;
          }
        }
      }
    }
    [2, 4, 5, 9].forEach(noteAdjacent);
    for(let k = 0; k < 100; k++){
      const qs = d.buildDailySession();
      for(let i = 1; i < qs.length; i++){
        if(qs[i].noteId && qs[i - 1].noteId && qs[i].noteId === qs[i - 1].noteId){
          bad.push('daily: ' + qs.map(function(q){ return q.noteId; }).join(' '));
          return;
        }
      }
    }
    for(let k = 0; k < 100; k++){
      const qs = d.buildQuestions(8).filter(q=>!q.coverage);
      for(let i = 1; i < qs.length; i++){
        if(qs[i].clef + '|' + qs[i].spot === qs[i - 1].clef + '|' + qs[i - 1].spot){
          bad.push('skill 8 position repeated');
          break;
        }
      }
    }
    return bad.slice(0, 5);
  });
  assert.deepEqual(problems, [], 'adjacent repeats: ' + problems.join(' | '));
}

/* 不同勾选组合下的出题多样性。旧测试只跑默认的「全部已学音」，
   所以第三关在「只勾 D、E」时退化成八题全是 D，测试照样通过。
   这里逐个换勾选音集，要求：有至少两个音时不能只剩一个；
   第三关勾过的音名都要出现，有对应写法时才要求两种谱号；
   第八关一节课里不能出现两道同一个位置。 */
async function selectionVarietyCheck(page){
  const result = await page.evaluate(function(){
    const d = window.__dbg;
    const oldSel = d.S.selected.slice();
    const oldProgress = JSON.parse(JSON.stringify(d.S.progress));
    const problems = [];
    const cases = [
      { name:'D+E', sel:['D4', 'E4'] },
      { name:'E only', sel:['E4'] },
      { name:'B only', sel:['B3'] },
      { name:'C only', sel:['C4'] },
      { name:'D+E+A3', sel:['D4', 'E4', 'A3'] },
      { name:'all', sel:d.NOTE_ORDER.slice() }
    ];
    const skills = [1, 2, 3, 4, 5, 8, 9];

    function keyOf(q, skill){
      if(skill === 1) return q.letter;
      if(skill === 3) return d.NOTES[q.noteId].letter;
      if(skill === 8) return q.clef + '|' + q.spot;
      return q.noteId;
    }

    cases.forEach(function(c){
      d.S.progress = JSON.parse(JSON.stringify(oldProgress));
      d.S.selected = c.sel.slice();
      c.sel.forEach(function(id){ d.S.progress[id] = { key:1, pos:1, fin:1 }; });

      skills.forEach(function(skill){
        const active = d.activeNotes(d.SKILLS[skill - 1].needs);
        if(skill === 9 && !d.buildQuestions(9).length) return;
        for(let k = 0; k < 30; k++){
          const qs = d.buildQuestions(skill).filter(q=>!q.coverage);
          if(!qs.length){
            if(skill===9)return;
            problems.push(c.name + ' skill ' + skill + ' empty');
            break;
          }
          const keys = qs.map(function(q){ return keyOf(q, skill); });
          const distinct = {};
          keys.forEach(function(x){ distinct[x] = 1; });
          const distinctCount = Object.keys(distinct).length;
          /* 只勾一个音时，整节课只出这个音是正常的；
             有第二个音可出却还是同一个音，才是退化。 */
          if(distinctCount >= 2){
            for(let i = 1; i < keys.length; i++){
              if(keys[i] && keys[i] === keys[i - 1]){
                problems.push(c.name + ' skill ' + skill + ' adjacent ' + keys[i] + ': ' + keys.join(' '));
                break;
              }
            }
          }
          if(active.length >= 2 && distinctCount < 2){
            problems.push(c.name + ' skill ' + skill + ' collapsed to one item: ' + keys.join(' '));
          }
          if(skill === 3){
            c.sel.forEach(function(id){
              const letter = d.NOTES[id].letter;
              if(keys.indexOf(letter) < 0){
                problems.push(c.name + ' skill 3 missing selected ' + letter + ': ' + keys.join(' '));
              }
            });
            const clefs = {};
            qs.forEach(function(q){ clefs[d.NOTES[q.noteId].clef] = 1; });
            if(c.sel.includes('C4') || (c.sel.some(id => d.NOTES[id].clef === 'bass') && c.sel.some(id => d.NOTES[id].clef === 'treble'))){
              if(Object.keys(clefs).length < 2){
                problems.push(c.name + ' skill 3 only one clef: ' + keys.join(' '));
              }
            }
          }
          if(skill === 8){
            const seen = {};
            qs.forEach(function(q){
              const spot = q.clef + '|' + q.spot;
              if(seen[spot]) problems.push(c.name + ' skill 8 duplicate ' + spot);
              seen[spot] = 1;
            });
          }
        }
      });

      for(let k = 0; k < 20; k++){
        const qs = d.buildDailySession();
        const distinct = {};
        qs.forEach(function(q){ if(q.noteId) distinct[q.noteId] = 1; });
        if(Object.keys(distinct).length < 2) continue;
        for(let i = 1; i < qs.length; i++){
          if(qs[i].noteId && qs[i].noteId === qs[i - 1].noteId){
            problems.push(c.name + ' daily adjacent ' + qs[i].noteId);
            break;
          }
        }
      }
    });

    d.S.selected = oldSel;
    d.S.progress = oldProgress;
    return { problems: problems.slice(0, 12) };
  });
  assert.deepEqual(result.problems, [], 'selection variety: ' + result.problems.join(' | '));
}

async function ledgerCheck(page){
  const info = await page.evaluate(function(){
    const d = window.__dbg;
    const qs = d.buildQuestions(8).filter(q=>!q.coverage);
    const q = qs[0];
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    document.querySelector('#play').classList.add('active');
    const stage = document.querySelector('#stage');
    const answer = document.querySelector('#answer');
    stage.className = 'stage';
    answer.className = 'answer';
    stage.innerHTML = '';
    answer.innerHTML = '';
    d.G.q = q;
    q.answered = true;
    q.render();
    const sel = document.querySelector('.ledger-sentence select[data-key="num"]');
    return {
      count: qs.length,
      numbers: sel ? Array.from(sel.options).map(function(o){ return o.value; }).filter(Boolean) : []
    };
  });
  assert.equal(info.count, 6, 'skill 8 must have six questions');
  assert.deepEqual(info.numbers, ['1', '2', '3', '4', '5', '6', '7', '8'],
    'skill 8 number choices must always be 1-8');
}

async function comparisonSelectionCheck(page){
  const result=await page.evaluate(function(){
    const d=window.__dbg, old={selected:d.S.selected,progress:d.S.progress,diff:d.G.diffKey};
    const errors=[];
    try{
      d.S.selected=['B3','C4','D4','E4'];
      d.S.progress=Object.fromEntries(d.NOTE_ORDER.map(id=>[id,{pos:1,key:1,fin:1}]));
      for(const tier of ['easy','normal','hard']){
        d.G.diffKey=tier;
        const orders=new Set();
        for(let run=0;run<40;run++){
          const qs=d.buildQuestions(9),targets=qs.map(q=>q.noteId);
          orders.add(targets.join('|'));
          if(d.S.selected.some(id=>!targets.includes(id)))errors.push('missing selected target');
          qs.forEach(function(q,i){
            if(q.coverage)errors.push('BCDE should be real comparison items');
            if(i && q.clef===qs[i-1].clef)errors.push('not alternating');
            if(i && q.pair===qs[i-1].pair)errors.push('immediate reversed pair');
            const allowed=q.clef==='treble'?['C4','D4','E4']:['B3','C4'];
            if(q.choiceIds.some(id=>!allowed.includes(id)))errors.push('unfamiliar spelling');
          });
        }
        if(orders.size<5)errors.push('order not random enough');
      }
      d.S.selected=['C4','D4','E4'];
      const q=d.buildQuestions(12)[0];d.G.q=q;q.answered=false;q.render();
      if(document.querySelectorAll('#stage .note-hit').length!==3)errors.push('missing hit regions');
      document.querySelector('#stage :is(.note-hit,button)[data-i="'+q.target+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      if(!q.answered)errors.push('correct tap not accepted');
      d.S.selected=['E4'];
      for(const skill of [9,12])if(!d.buildQuestions(skill).some(q=>q.noteId==='E4'))errors.push('single selection missing');
    }finally{d.S.selected=old.selected;d.S.progress=old.progress;d.G.diffKey=old.diff;}
    return errors.slice(0,10);
  });
  assert.deepEqual(result,[],'selected-note and alternating-clef comparison regression');
}

async function concisePromptCheck(page){
  const result=await page.evaluate(function(){
    const d=window.__dbg,sel=d.S.selected,progress=d.S.progress,errors=[];
    try{
      d.S.selected=['A3','B3','C4','D4','E4'];d.S.progress=Object.fromEntries(d.S.selected.map(id=>[id,{key:1,pos:1,fin:1}]));
      const qs=d.buildQuestions(12);
      if(qs.slice(0,-3).some(q=>!q.clef))errors.push('early mixed clefs');
      if(qs.slice(-3).some(q=>q.clef))errors.push('finale not mixed');
      if(!qs.slice(0,-3).some(q=>q.clef==='bass')||!qs.slice(0,-3).some(q=>q.clef==='treble'))errors.push('missing separate clef block');
      for(const skill of [13,14]){
        const qs=d.buildQuestions(skill);
        for(let i=0;i<2;i++){
          const q=qs[i];d.G.q=q;q.answered=false;d.G.busy=false;q.render();
          const text=document.querySelector('.prompt').textContent;
          if(text.includes('从左到右')!==(i===0))errors.push('repeated direction '+skill);
        }
      }
    }finally{d.S.selected=sel;d.S.progress=progress;}
    return errors;
  });
  assert.deepEqual(result,[],'clef progression and concise prompts');
}

async function flashCheck(page){
  await page.evaluate(function(){
    const d=window.__dbg;
    d.G.session++;const qs=d.buildQuestions(15);
    if(qs.length<10||qs.slice(0,5).some(q=>q.choiceIds.length!==2)||qs.slice(5).some(q=>q.choiceIds.length!==3))throw Error('flash progression');
    if(qs[0].ask!=='higher'||qs[2].ask!=='name')throw Error('flash task progression');
    d.G.q=qs[2];d.G.q.answered=false;d.G.busy=false;d.G.q.render();
    if(document.querySelector('#answer button'))throw Error('flash answers visible early');
  });
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('#stage svg').count(),2,'notes remain during observation');
  await page.waitForFunction(()=>window.__dbg.G.q.phase==='answer');
  assert.equal(await page.locator('#stage svg').count(),0,'flash notes hidden');
  assert.equal(await page.locator('#answer button').count(),2,'numbered answers');
  await page.evaluate(function(){
    const q=window.__dbg.G.q;
    document.querySelector('#answer button[data-i="'+((q.target+1)%2)+'"]').click();
    if(q.answered)throw Error('wrong memory answer accepted');
    document.querySelector('#answer button[data-i="'+q.target+'"]').click();
    if(!q.answered)throw Error('correct memory answer rejected');
    const d=window.__dbg;d.G.session++;d.G.busy=false;const grand=d.buildQuestions(14)[0];d.G.q=grand;grand.answered=false;grand.render();
    if(document.querySelectorAll('#stage svg > g').length!==2)throw Error('grand staff missing');
    grand.choiceIds.forEach(id=>document.querySelector('#answer [data-midi="'+d.NOTES[id].midi+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
    if(grand.phase!=='compare')throw Error('grand playing sequence');
    document.querySelector('#stage .note-hit[data-i="'+grand.target+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    if(!grand.answered)throw Error('grand extreme rejected');
  });
}

async function playThreeCheck(page){
  const result=await page.evaluate(function(){
    const d=window.__dbg,old={sel:d.S.selected,progress:d.S.progress,diff:d.G.diffKey};
    const errors=[];
    try{
      d.S.selected=['A3','C4','E4'];d.S.progress=Object.fromEntries(d.S.selected.map(id=>[id,{key:1,pos:1,fin:1}]));
      d.G.diffKey='normal';
      const qs=d.buildQuestions(13);
      if(new Set(qs.map(q=>q.ask)).size!==2)errors.push('missing higher/lower');
      for(const q of qs.slice(0,2)){
        d.G.busy=false;d.G.q=q;q.answered=false;q.render();
        if(qs.indexOf(q)===0&&q.clef!=='treble')errors.push('CA ledger comparison missing');
        if(qs.indexOf(q)===1&&q.clef!==null)errors.push('bass comparison missing');
        if(document.querySelectorAll('#stage .note-hit').length)errors.push('comparison enabled early');
        const press=m=>document.querySelector('#answer [data-midi="'+m+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
        const midis=q.choiceIds.map(id=>d.NOTES[id].midi);
        press(midis[1]);if(q.played!==0||q.wrong!==1||q.answered)errors.push('wrong key advanced');
        midis.forEach((m,i)=>{press(m);if(q.played!==i+1)errors.push('wrong play step');});
        if(q.phase!=='compare'||q.answered)errors.push('missing comparison phase');
        const wrong=(q.target+1)%3;
        document.querySelector('#stage :is(.note-hit,button)[data-i="'+wrong+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
        if(q.answered)errors.push('wrong extreme accepted');
        document.querySelector('#stage :is(.note-hit,button)[data-i="'+q.target+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
        if(!q.answered)errors.push('correct extreme rejected');
      }
      d.S.selected=['C4','E4'];if(d.buildQuestions(13).length)errors.push('ambiguous under-three pool');
    }finally{d.S.selected=old.sel;d.S.progress=old.progress;d.G.diffKey=old.diff;}
    return errors;
  });
  assert.deepEqual(result,[],'three-note keyboard sequence and extreme selection');
}

async function newSkillsCheck(page){
  const info=await page.evaluate(function(){
    const d=window.__dbg, old=d.G.diffKey;
    const stage=document.querySelector('#stage'),answer=document.querySelector('#answer');
    function render(q){stage.innerHTML='';answer.innerHTML='';d.G.q=q;q.answered=false;q.render();}
    d.G.diffKey='normal';render(d.buildQuestions(8).filter(q=>!q.coverage)[0]);
    const icons=answer.querySelectorAll('.ledger-sentence select, .symbol-trigger').length;
    const digits=Array.from(answer.querySelector('select[data-key="num"]').options).slice(1).map(o=>o.textContent);
    const symbols=Array.from(answer.querySelectorAll('.symbol-menu [role=option]')).every(o=>o.querySelector('svg') || ['↑','↓'].includes(o.textContent));
    const placements=['easy','normal','hard'].map(function(tier){d.G.diffKey=tier;return d.buildQuestions(10).filter(q=>!q.coverage).map(q=>({kind:q.kind,y:q.y1}));});
    d.G.diffKey='normal';
    const basic=d.buildQuestions(9).map(q=>({clef:q.clef,y:q.noteId,ys:[q.y1,q.y2]}));
    d.G.diffKey='hard';const q=d.buildQuestions(10).filter(q=>!q.coverage)[0];render(q);
    const svg=stage.querySelector('svg');svg.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
    stage.querySelector('svg').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
    const moved=stage.querySelector('.note ellipse').getAttribute('cy');
    const focused=document.activeElement===stage.querySelector('svg');
    const kinds=d.buildQuestions(11).map(q=>q.pair);
    d.G.diffKey=old;
    return {icons,digits,symbols,placements,basic,moved,focused,kinds};
  });
  assert.equal(info.icons,4,'four compact symbolic dropdowns');
  assert.ok(info.symbols,'non-numeric dropdowns contain only music symbols, arrows and diagrams');
  for(const qs of info.placements){
    assert.equal(qs.length,6);assert.ok(qs.every(q=>q.kind==='ledgerMove'));
    assert.ok(qs[0].y>=0 && qs[0].y<=4,'first placement is inside the staff');
    assert.ok(qs.slice(1).every(q=>q.y<0 || q.y>4),'last five placements are ledger positions');
  }
  assert.deepEqual(info.digits,['1','2','3','4','5','6','7','8']);
  assert.ok(info.basic.some(q=>q.clef==='treble') && info.basic.some(q=>q.clef==='bass'));
  for(const q of info.basic){
    assert.ok((q.clef==='treble'?['C4','D4','E4','F4','G4','A4']:['A3','B3','C4']).includes(q.y));
    assert.ok(q.ys.every(y=>y>=-1&&y<=5),'basic contrast has at most one ledger line');
  }
  assert.equal(info.moved,'1','two arrow keys move the note two half staff steps');
  assert.ok(info.focused,'movement retains keyboard focus after redrawing');
  assert.deepEqual(info.kinds,['name-key','name-staff','key-staff','duration-beats']);
  const placed=await page.evaluate(function(){
    const d=window.__dbg,results=[];
    for(const tier of ['easy','normal','hard']){
      d.startLevel(10);d.G.diffKey=tier;d.G.qs=d.buildQuestions(10).filter(q=>!q.coverage);
      for(const q of d.G.qs){
        d.G.session++;d.G.busy=false;d.G.q=q;q.answered=false;
        document.querySelector('#answer').innerHTML='';q.render();
        const key=q.y1<2?'ArrowUp':'ArrowDown';
        for(let step=0;step<Math.abs(q.y1-2)*2;step++)document.querySelector('#stage svg').dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));
        document.querySelector('#answer .primary-btn').click();results.push(q.answered===true);
      }
    }
    d.G.session++;d.G.busy=false;return results;
  });
  assert.equal(placed.length,18);assert.ok(placed.every(Boolean),'all six placement tasks complete in every tier');
  const corrected=await page.evaluate(function(){
    const d=window.__dbg;document.querySelector('#answer').innerHTML='';const q=d.buildQuestions(8).filter(q=>!q.coverage)[0];d.G.busy=false;d.G.q=q;q.answered=false;q.render();
    function choose(key,value){
      document.querySelector('.symbol-trigger[data-key="'+key+'"]').click();
      document.querySelector('#ledger-'+key+'-options [data-value="'+value+'"]').click();
    }
    choose('clef',q.clef);choose('dir',q.y1<0?'down':'up');
    const k=Math.round(Math.abs(q.y1-(q.y1>4?4:0))*2);
    const num=document.querySelector('select[data-key="num"]');num.value=String(Math.ceil(k/2));num.dispatchEvent(new Event('change'));
    choose('kind',k%2?'space':'line');const wrong=q.wrong;
    choose('dir',q.y1<0?'up':'down');
    return {wrong,answered:q.answered,correct:document.querySelectorAll('.symbol-trigger.correct').length};
  });
  assert.ok(corrected.wrong>=1,'symbolic selection records a wrong combination');
  assert.ok(corrected.answered,'correcting one symbolic dropdown completes the answer');
  assert.equal(corrected.correct,3,'all symbolic dropdowns mark success');
  // Every mode starts face up, keeps full notation inside each card, and completes by matching.
  for(const viewport of [[820,1180],[1180,820],[390,844],[844,390]]){
    await page.setViewportSize({width:viewport[0],height:viewport[1]});
    const results=await page.evaluate(function(){
      const d=window.__dbg;
      return d.buildQuestions(11).map(function(q){
        document.querySelector('#stage').innerHTML='';document.querySelector('#answer').innerHTML='';
        d.G.q=q;q.answered=true;q.render();
        const cards=Array.from(document.querySelectorAll('.match-card'));
        return cards.every(function(c,i){
          const side=i%2?'right':'left',type=q.pair.split('-')[i%2];
          if(c.dataset.side!==side || c.dataset.type!==type)return false;
          const child=c.firstElementChild,r=c.getBoundingClientRect(),x=child.getBoundingClientRect();
          if(i%2){const left=cards[i-1].getBoundingClientRect();if(r.left<=left.right || Math.abs(r.top-left.top)>.5)return false;}
          return child && x.left>=r.left && x.right<=r.right+.5 && x.top>=r.top && x.bottom<=r.bottom+.5;
        });
      });
    });
    assert.ok(results.every(Boolean),'full card content fits at '+viewport.join('x'));
    const keyboard=await page.evaluate(async function(){
      const d=window.__dbg;document.querySelector('#answer').innerHTML='';d.G.q=d.buildQuestions(11)[2];d.G.q.answered=true;d.G.q.render();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      return Array.from(document.querySelectorAll('.card-keyboard')).every(function(kb){
        const r=kb.getBoundingClientRect(),host=kb.parentElement.getBoundingClientRect();
        return kb.offsetWidth===Math.min(innerWidth-28,1200) && Math.abs(r.width/r.height-kb.offsetWidth/kb.offsetHeight)<.01 && r.left>=host.left-.5 && r.right<=host.right+.5 && r.top>=host.top-.5 && r.bottom<=host.bottom+.5;
      });
    });
    assert.ok(keyboard,'whole standard keyboard scales uniformly inside cards at '+viewport.join('x'));
    if(process.env.NT_UI_SCREENSHOTS) await page.screenshot({path:'/tmp/note-trainer-matching-'+viewport.join('x')+'.png'});
  }
  await page.setViewportSize({width:820,height:1180});
  const rhythm=await page.evaluate(function(){
    const d=window.__dbg,q=d.buildQuestions(11)[3];d.G.q=q;q.answered=false;q.render();
    const cards=Array.from(document.querySelectorAll('.match-card'));
    cards.filter(c=>c.dataset.type==='duration').forEach(function(c){
      c.click();cards.find(x=>x.dataset.type==='beats' && x.dataset.pair===c.dataset.pair).click();
    });
    return {total:cards.length,matched:document.querySelectorAll('.match-card.matched').length};
  });
  assert.equal(rhythm.matched,rhythm.total,'duration matches numeric beat counts');
  const sameSide=await page.evaluate(function(){
    const d=window.__dbg;d.startLevel(11);
    const cards=Array.from(document.querySelectorAll('.match-card')),left=cards.filter(c=>c.dataset.side==='left');
    if(left.length<2)return true;
    left[0].click();left[1].click();
    return d.G.q.wrong===0 && !left[0].classList.contains('selected') && left[1].classList.contains('selected');
  });
  assert.ok(sameSide,'choosing another card in the same column changes selection without an error');
  // One checked pitch still produces a playable matching pair in every mode.
  await page.evaluate(function(){
    const d=window.__dbg;const old=d.S.selected;d.S.selected=['C4'];
    d.startLevel(11);d.S.selected=old;
  });
  await page.locator('.match-card').nth(0).click();
  await page.locator('.match-card').nth(1).click();
  assert.equal(await page.locator('.match-card.matched').count(),2);
  await page.waitForTimeout(1200);
}

async function spotlightCheck(page){
  await page.evaluate(function(){
    const d = window.__dbg;
    d.S.progress.A4 = { key: 0, pos: 0, fin: 0 };
    d.S.spot = { note: 'A4', step: 0 };
    d.S.focus = 'A4';
    d.startNoteImport('A4');
  });
  await page.waitForSelector('#play.active');

  for(let i = 0; i < 3; i++) await answerOne(page);
  assert.equal(await page.evaluate(function(){ return window.__dbg.S.spot.step; }), 3,
    'spotlight step must be saved after each answer');

  await page.click('#btnBack');
  await page.waitForSelector('#home.active');
  assert.equal(await page.evaluate(function(){ return window.__dbg.S.spot.step; }), 3,
    'spotlight step must survive leaving the lesson');

  await page.evaluate(function(){ window.__dbg.startSpotlight(); });
  await page.waitForSelector('#play.active');
  assert.equal(await page.evaluate(function(){ return window.__dbg.G.spotFrom; }), 3,
    'resume must start at the saved step');

  for(let i = 0; i < 20; i++){
    const done = await page.evaluate(function(){
      return document.querySelector('#result').classList.contains('active');
    });
    if(done) break;
    await answerOne(page);
  }

  const end = await page.evaluate(function(){
    const d = window.__dbg;
    return {
      result: document.querySelector('#result').classList.contains('active'),
      text: document.querySelector('#result').innerText,
      progress: d.S.progress.A4,
      spot: d.S.spot,
      selected: d.S.selected
    };
  });
  assert.ok(end.result, 'spotlight must reach the result screen');
  assert.match(end.text, /11\s*\/\s*11/, 'resumed lesson must finish its 11 remaining questions, got: ' + end.text.replace(/\s+/g, ' '));
  assert.match(end.text, /键位、谱位、指法都打开了/, 'resumed lesson must open all three flags');
  assert.deepEqual(end.progress, { key: 1, pos: 1, fin: 1 }, 'all three flags must open');
  assert.equal(end.spot, null, 'S.spot must clear after the lesson');
  assert.ok(end.selected.indexOf('A4') >= 0, 'A4 must be selected automatically');
}

async function reportCheck(page){
  await page.evaluate(function(){ window.__dbg.openReport(); });
  await page.waitForSelector('#reportModal.open');
  const report = await page.evaluate(function(){
    return {
      text: document.querySelector('#reportBody').innerText,
      headers: Array.from(document.querySelectorAll('.matrix th')).map(function(th){
        return th.textContent;
      })
    };
  });
  assert.ok(report.text.indexOf('十八个技能') >= 0, 'report must say eighteen skills');
  assert.equal(report.headers.length, 20, 'matrix must have date + 18 skills + total');
}

/* clear-cache.html 的独立测试：用允许 Service Worker 的新 context，
   先种一个本游戏的旧缓存和一个别家缓存，清完只掉本游戏的缓存，
   localStorage 必须保留。 */
async function cacheResetCheck(browser, port){
  const base=REMOTE_BASE || 'http://127.0.0.1:'+port+'/';
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    serviceWorkers: 'allow'
  });
  await seedLocalStorage(context);
  const page = await context.newPage();
  try{
    await page.goto(base + 'manifest.webmanifest');
    await page.evaluate(async function(){
      const other = await caches.open('other-app-cache');
      await other.put('./other', new Response('keep'));
      const sibling = await caches.open('note-trainer-sibling@' + location.origin + '/another-game/');
      await sibling.put('./sibling', new Response('keep sibling'));
    });
    await page.goto(base + 'index.html');
    await page.waitForSelector('#home.active');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const before = await page.evaluate(async function(){
      await navigator.serviceWorker.ready;
      const c = await caches.open('note-trainer-old-test');
      await c.put('./index.html', new Response('old', { headers: { 'content-type': 'text/html' } }));
      const other = await caches.open('other-app-cache');
      await other.put('./other', new Response('keep'));
      localStorage.setItem('nt.cache-test.keep', 'yes');
      return {
        sw: (await navigator.serviceWorker.getRegistrations()).length,
        caches: await caches.keys()
      };
    });
    assert.ok(before.sw >= 1, 'the game should register a service worker');
    assert.ok(before.caches.some(function(k){ return k.indexOf('note-trainer-') === 0; }));
    assert.ok(before.caches.includes('other-app-cache'), 'worker activation must preserve unrelated caches');
    assert.ok(before.caches.some(k => k.includes('sibling@')), 'worker activation must preserve sibling scope');

    await page.goto(base + 'clear-cache.html?stay=1&next=%2Findex.html');
    await page.waitForFunction(function(){
      return document.querySelector('h1').textContent === '缓存已清理';
    }, null, { timeout: 8000 });

    const after = await page.evaluate(async function(){
      return {
        sw: (await navigator.serviceWorker.getRegistrations()).length,
        caches: await caches.keys(),
        keep: localStorage.getItem('nt.cache-test.keep')
      };
    });
    assert.equal(after.sw, 0, 'clear-cache must unregister the game service worker');
    assert.ok(!after.caches.some(function(k){ return k.indexOf('note-trainer-') === 0 && !k.includes('sibling@'); }),
      'clear-cache must delete note-trainer caches');
    assert.ok(after.caches.some(k => k.includes('sibling@')), 'reset must preserve sibling scope');
    assert.ok(after.caches.indexOf('other-app-cache') >= 0,
      'clear-cache must leave other apps on the same origin alone');
    assert.equal(after.keep, 'yes', 'clear-cache must keep localStorage');
    assert.equal(await page.title(), 'note-trainer-cache:ok:', 'successful reset must send a completion receipt');

    // SW 开启时的真实升级/离线路径，不能把清理页缓存成游戏首页。
    await page.goto(base + 'index.html');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector('#home.active');
    assert.ok(await page.locator('meta[name="app-build"]').count(), 'offline fallback must be the game shell');
    await context.setOffline(false);

    const build = await page.locator('meta[name="app-build"]').getAttribute('content');
    await page.goto(base + 'clear-cache.html?launch=1&token=auto&build=' + build);
    await page.waitForFunction(expected => document.title === 'note-trainer-ready:' + expected + ':auto', build);
    assert.equal(new URL(page.url()).searchParams.get('build'), build, 'reset must open the verified build');

    await page.route('**/manifest.webmanifest', route => route.fulfill({status:500,body:'test failure'}));
    await page.goto(base + 'clear-cache.html?stay=1&token=failure');
    await page.waitForFunction(() => document.documentElement.dataset.cacheStatus === 'failed');
    assert.equal(await page.title(), 'note-trainer-cache:failed:failure', 'HTTP errors must not report a successful reset');

    await page.goto(base + 'index.html?build=0000000000&verify=old-page');
    assert.equal(await page.title(), 'note-trainer-load:failed:old-page', 'an old page must not claim the requested build');
    assert.match(await page.locator('body').innerText(), /版本尚未更新/);

    // 模拟 Safari 的 SW 接口不返回：必须在步骤级超时后失败，不能无限挂起。
    await page.addInitScript(() => {
      Object.defineProperty(navigator.serviceWorker,'getRegistrations',{
        value:() => new Promise(() => {})
      });
    });
    await page.goto(base + 'clear-cache.html?stay=1&token=hang');
    await page.waitForFunction(() => document.documentElement.dataset.cacheStatus === 'failed', null, {timeout:12000});
    assert.equal(await page.title(),'note-trainer-cache:failed:hang');
    assert.match(await page.locator('body').innerText(),/service-worker 超时/);
  }finally{
    await context.close();
  }
}

async function main(){
  const server = await startServer();
  const port = server.address().port;
  const base=REMOTE_BASE || 'http://127.0.0.1:'+port+'/';
  console.log('Test destination: '+base);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    serviceWorkers: 'block'
  });
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', function(e){ errors.push(e.message); });
  page.on('console', function(m){ if(m.type() === 'error') errors.push(m.text()); });

  try{
    await seedLocalStorage(context);
    await page.goto(base + 'index.html');
    await page.waitForSelector('#home.active');

    const cards = await page.evaluate(function(){
      return document.querySelectorAll('#levelGrid .level-card').length;
    });
    assert.equal(cards, 18, 'home must show eighteen skill cards');
    console.log('PASS home: 18 skill cards');
    const build = await page.evaluate(() => ({
      meta: document.querySelector('meta[name="app-build"]').content,
      settings: document.querySelector('#buildTag').textContent
    }));
    assert.equal(build.settings, '构建 ' + build.meta, 'settings must display the actual page build');
    console.log('PASS build: settings matches page build ' + build.meta);

    await homeNavigationCheck(page);
    await layoutCheck(page);
    console.log('PASS layout: 40 question types x 4 viewports');

    await singleChoiceCheck(page);
    console.log('PASS single note: key -> staff keeps 2 choices');

    await clefOrderCheck(page);
    console.log('PASS level 3: no adjacent same note name, varied order');

    await repeatCheck(page);
    console.log('PASS repeats: no adjacent same note in skills 2, 4, 5, 8, 9 and daily');

    await selectionVarietyCheck(page);
    console.log('PASS selection: every checked set keeps variety in skills 1-9 and daily');

    await generationAudit(page);
    const rhythmResult=await page.evaluate(()=>{
      const d=window.__dbg,q=d.buildQuestions(16)[0];d.G.q=q;q.answered=false;
      document.querySelector('#stage').innerHTML='';document.querySelector('#answer').innerHTML='';q.render();
      const options=[...document.querySelectorAll('.rhythm-choices button')].map(b=>b.dataset.value);
      document.querySelector('.rhythm-choices [data-value="'+q.valueId+'"]').click();
      return {options,answered:q.answered,blank:!!document.querySelector('.rhythm-bar rect')};
    });
    assert.deepEqual(rhythmResult.options.slice().sort(),['quarter','half','dotted','whole'].sort());
    assert.ok(rhythmResult.answered && !rhythmResult.blank,'rhythm answer fills missing note');


    await ledgerCheck(page);
    console.log('PASS level 8: 6 questions, numbers 1-8');

    await newSkillsCheck(page);
    await rhythmAndIrregularInteractionCheck(page);
    await comparisonSelectionCheck(page);
    await concisePromptCheck(page);
    await playThreeCheck(page);
    await flashCheck(page);
    console.log('PASS levels 8-11: symbolic dropdowns, six placement tasks in every tier, proportional keyboards, four matching modes');
    await spotlightCheck(page);
    console.log('PASS spotlight: resume at saved step, open all flags');

    await reportCheck(page);
    console.log('PASS report: eighteen-skill matrix');

    await cacheResetCheck(browser, port);
    console.log('PASS cache reset: game caches cleared, other caches and localStorage kept');

    assert.deepEqual(errors, [], 'console errors: ' + errors.join(' | '));
    console.log('PASS console: no errors');
    console.log('\nAll smoke tests passed.');
  }finally{
    await browser.close();
    await new Promise(function(resolve){ server.close(resolve); });
  }
}

main().catch(function(err){
  console.error('\nFAIL:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
