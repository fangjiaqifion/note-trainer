import assert from 'node:assert/strict';

// 全部 255 个非空勾选集合 × 三档难度 × 两种错误历史 × 三个固定随机种子。
// 检查返回内容本身，避免「相邻不重复」在全空/全同音时虚假通过。
export async function generationAudit(page){
  const result = await page.evaluate(function(){
    const d = window.__dbg, s = d.S, g = d.G;
    const saved = { selected:s.selected, progress:s.progress, events:s.events, difficulty:s.difficulty,
      diffKey:g.diffKey, lastSeen:s.lastSeen };
    const random = Math.random;
    const failures = [];
    let sessions = 0;
    const samples = [];
    function check(ok, msg){ if(!ok && failures.length < 20) failures.push(msg); }
    function inspect(qs, skill, sel, prefix){
      sessions++;
      if(skill===16){
        check(qs.length===6,prefix+' six rhythm measures');
        check(new Set(qs.map(q=>q.valueId)).size===4,prefix+' four rhythm answers');
        qs.forEach(q=>{
          check(q.values.every(id=>['quarter','half','dotted','whole'].includes(id)),prefix+' allowed durations');
          check(q.values.reduce((sum,id)=>sum+d.VALUES[id].beats,0)===q.meter,prefix+' exact measure total');
          check(q.valueId===q.values[q.missing],prefix+' missing answer');
          check(d.RHYTHM_PATTERNS[q.meter].some(pattern=>pattern.join()===q.values.join()),prefix+' approved grouping');
        });
      }
      if(skill===17){
        check(qs.length===6,prefix+' six meter questions');
        check([2,3,4].every(meter=>qs.filter(q=>q.meter===meter).length===2),prefix+' balanced meters');
        qs.forEach(q=>{
          check(q.measures.length===2,prefix+' two complete measures');
          q.measures.forEach(values=>{
            check(values.reduce((sum,id)=>sum+d.VALUES[id].beats,0)===q.meter,prefix+' meter matches both measures');
            check(d.RHYTHM_PATTERNS[q.meter].some(pattern=>pattern.join()===values.join()),prefix+' approved meter grouping');
          });
        });
      }
      if(skill===18){
        check(qs.length===8,prefix+' eight keyboard rounds');
        check(new Set(qs.map(q=>q.layout)).size===8,prefix+' eight distinct layouts');
        sel.forEach(id=>check(new Set(qs.flatMap(q=>q.cards).filter(card=>card.id===id).map(card=>card.type)).size===2,prefix+' both matching representations '+id));
        qs.forEach(q=>{
          check(q.cards.length===Math.min(3,sel.length),prefix+' matching card count');
          check(new Set(q.noteIds).size===q.noteIds.length,prefix+' unique round pitches');
          check(q.cards.every(card=>sel.includes(card.id)),prefix+' checked matching targets');
        });
      }
      const n = skill === 'daily' ? 10 : d.SKILLS[skill - 1].count
        ? d.SKILLS[skill - 1].count(d.DIFFS[g.diffKey].count) : d.DIFFS[g.diffKey].count;
      // 易混音只允许已定义的相邻/易混对子；没有合法对子时为空。
      if(([13,14].includes(skill) && sel.length<3)||(skill===15 && sel.length<2)){check(qs.length===0,prefix+' under-three pool');return;}
      check(qs.length >= ([9,12].includes(skill)&&qs.every(q=>q.coverage)?sel.length:skill===5?Math.max(n,sel.length):n), prefix + ' count ' + qs.length + '/' + n);
      const covered=new Set();
      qs.forEach(q=>{
        (q.noteIds||q.choiceIds||(q.noteId?[q.noteId==='C4B'?'C4':q.noteId]:[])).forEach(id=>covered.add(id));
        if(q.kind==='find')sel.filter(id=>d.NOTES[id].letter===q.letter).forEach(id=>covered.add(id));
      });
      if(skill!=='daily' && ![16,17].includes(skill))sel.forEach(id=>check(covered.has(id),prefix+' missing selected pitch '+id));
      const key = q => skill === 1 ? q.letter : skill === 3 ? d.NOTES[q.noteId].letter
        : skill === 8 ? q.clef + '|' + q.spot : q.noteId;
      const keys = qs.map(key).filter(Boolean);
      if([1,2,3,4,5,'daily'].includes(skill)){
        const expected = skill === 1 || skill === 3
          ? [...new Set(sel.map(id => d.NOTES[id].letter))] : sel;
        if(n >= expected.length && skill !== 'daily'){
          expected.forEach(id => check(keys.includes(id), prefix + ' missing ' + id));
        }
        qs.forEach(q => {
          if(q.noteId) check(sel.includes(q.noteId === 'C4B' ? 'C4' : q.noteId), prefix + ' unselected ' + q.noteId);
          if(q.kind === 'find') check(sel.some(id => d.NOTES[id].letter === q.letter), prefix + ' unselected letter ' + q.letter);
        });
      }
      if([9,12,13,14,15].includes(skill)) qs.filter(q=>!q.coverage).forEach(q=>{
        check(q.choiceIds.every(id=>sel.includes(id)),prefix+' unselected comparison choice');
        check(([12,15].includes(skill)?[2,3].includes(q.choiceIds.length):q.choiceIds.length===(skill===9?2:3)),prefix+' choice count');
        if(skill===12 && qs.indexOf(q)<qs.length-3)check(!!q.clef,prefix+' mixed clefs before finale');
        if(skill===12 && q.choiceIds.filter(id=>d.NOTES[id].letter===q.letter).length>1)
          check(q.targetLabel.includes('中央 C'),prefix+' ambiguous octave target');
      });
      if(skill===9){
        const actual=qs.filter(q=>!q.coverage);
        if(new Set(actual.map(q=>q.clef)).size===2)
          check(actual.every((q,i)=>!i||q.clef!==actual[i-1].clef),prefix+' consecutive same clef');
        sel.forEach(id=>{
          const clef=d.NOTES[id].clef;
          const pool=sel.filter(other=>other==='C4'||d.NOTES[other].clef===clef);
          if(pool.length>=2)check(actual.some(q=>q.noteId===id),prefix+' missing comparison target '+id);
        });
      }
      if(skill === 9) qs.filter(q=>!q.coverage).forEach(q=>{
        const base=q.clef==='treble'?2:4;
        const letterAt=y=>((base+Math.round((4-y)*2))%7+7)%7;
        check(letterAt(q.y1)!==letterAt(q.y2),prefix+' ambiguous same-letter pair');
      });
      if(skill === 8){const positions=qs.filter(q=>!q.coverage).map(q=>q.clef+'|'+q.spot);check(new Set(positions).size === n,prefix+' duplicate position');}
      if([1,2,3,4,5].includes(skill) && new Set(keys).size > 1){
        const counts = keys.reduce((a,k) => (a[k] = (a[k] || 0) + 1, a), {});
        if(Math.max(...Object.values(counts)) <= Math.ceil(keys.length / 2)){
          check(keys.every((k,i) => i === 0 || k !== keys[i-1]), prefix + ' adjacent ' + keys.join(','));
        }
      }
      if(skill === 'daily'){
        for(let i=1; i<qs.length; i++){
          if(qs[i].noteId && qs[i-1].noteId && sel.length > 1)
            check(qs[i].noteId !== qs[i-1].noteId, prefix + ' daily adjacent');
        }
        // 两个不同字母时，找键盘也必须计入全节音数，恰好各五题。
        if(sel.length === 2 && d.NOTES[sel[0]].letter !== d.NOTES[sel[1]].letter){
          const letters = qs.map(q => q.letter || d.NOTES[q.noteId].letter);
          check(letters.filter(l => l === d.NOTES[sel[0]].letter).length === 5, prefix + ' daily imbalance ' + letters);
          check(letters.every((l,i) => !i || l !== letters[i-1]), prefix + ' daily visible repeat ' + letters);
        }
      }
    }
    try{
      s.progress = Object.fromEntries(d.NOTE_ORDER.map(id => [id,{key:1,pos:1,fin:1}]));
      s.lastSeen = {};
      audit: for(let mask=1; mask < (1 << d.NOTE_ORDER.length); mask++){
        const sel = d.NOTE_ORDER.filter((id,i) => mask & (1 << i));
        s.selected = sel;
        for(const difficulty of ['easy','normal','hard']){
          s.difficulty = g.diffKey = difficulty;
          for(let history=0; history<2; history++){
            s.events = history ? sel.flatMap((id,i) => Array.from({length:8}, () => ({note:id,first:i ? 1 : 0,kind:'s2k',mode:'skill'}))) : [];
            for(let seed=1; seed<=3; seed++){
              let state = seed * 100003 + mask;
              Math.random = function(){ state = (Math.imul(state,1664525) + 1013904223) >>> 0; return state / 4294967296; };
              const prefix = sel.join('+') + '/' + difficulty + '/history' + history + '/seed' + seed;
              for(let skill=1;skill<=d.SKILLS.length;skill++) inspect(d.buildQuestions(skill),skill,sel,prefix + '/skill' + skill);
              inspect(d.buildDailySession(),'daily',sel,prefix);
              if(mask === 12 && difficulty === 'normal' && history === 0)
                samples.push(d.buildQuestions(3).map(q => q.noteId).join(','));
              if(failures.length >= 20) break audit;
            }
          }
        }
      }
    }finally{
      Math.random = random;
      Object.assign(s, {selected:saved.selected,progress:saved.progress,events:saved.events,difficulty:saved.difficulty,lastSeen:saved.lastSeen});
      g.diffKey = saved.diffKey;
    }
    return {failures,sessions,samples};
  });
  assert.deepEqual(result.failures, [], 'generation audit: ' + result.failures.join(' | '));
  console.log(`PASS generation audit: ${result.sessions} sessions, 255 selections x 3 difficulties x 2 histories x 3 seeds x 19 modes`);
  console.log('D+E level 3: ' + result.samples.join(' | '));
}
