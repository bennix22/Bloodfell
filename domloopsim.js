// Drives the REAL UI (tickCombat, renderCharCard, arenaHtml, the real render
// router) in JSDOM, fighting a realm the character takes real damage in, and
// reads the ACTUAL rendered bar widths each frame.
const { JSDOM } = require('jsdom'); const fs=require('fs'), path=require('path');
const ROOT='/home/claude/opus-realms';
const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'file://'+ROOT+'/index.html',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){let raf=[];w.requestAnimationFrame=fn=>{raf.push(fn);return raf.length;};w.__raf=raf;const st={};Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}}});}});
const W=dom.window;
for(const src of [...W.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))){
  const el=W.document.createElement('script'); el.textContent=fs.readFileSync(path.join(ROOT,src),'utf8'); W.document.head.appendChild(el);
}
W.document.dispatchEvent(new W.Event('DOMContentLoaded',{bubbles:true}));

// a level-30 character in a level-40 realm: takes real damage, ends fights low
W.eval(`
S.level=30; S.settings.autoRetreat=90;  // fires after any fight
for(const s of SLOTS) S.equipment[s.key]=generateItem({ilvl:26,rarity:'uncommon',slot:s.type||s.key,primary:'str'});
S.talents={}; ['w1','w1','w1','w5','w5','w5'].forEach(t=>spendTalent(t));
const realm = REALMS.find(r=>r.lvl===40);
S.settings.autoGrind=true;
UI.grind={mode:'realm', id:realm.id};
UI.go('realms');
Combat.start('realm', realm);
`);

// read actual DOM bar widths
function arenaHp(){ const el=W.document.querySelector('#f-player .bar.hp i'); return el?Math.round(parseFloat(el.style.width)):null; }
function cardHp(){ const el=W.document.querySelector('#charcard .bar.hp i, .charcard .bar.hp i'); return el?Math.round(parseFloat(el.style.width)):null; }

// the real frame() lives in a module IIFE; replicate its exact body calling REAL methods
function frame(dt){
  const S=W.eval('S'), Combat=W.eval('Combat'), UI=W.eval('UI');
  if(Combat.active){
    Combat.advance(dt);
    UI.tickCombat(false);
    UI.renderCharCard();
  } else if(W.__pn>0){
    W.__pn -= dt;
    if(W.__pn<=0){ W.__pn=0; W.eval('startNextFight()'); UI.tickCombat(true); }
  }
}
// hook onUpdate to set our pendingNext (mirrors main.js autoGrind branch)
W.__pn=0;
W.eval(`Combat.onUpdate=function(kind,result){ if(!result)return; if(result.won && S.settings.autoRetreat>0 && S.run.realmId){ const v=currentVitals(); if(v.hp/v.maxHp*100 < S.settings.autoRetreat){ retreatFromRun(); } } if(S.settings.autoGrind && UI.grind){ window.__pn=0.3; } };`);

let log=[], frames=0, kills=0;
for(let i=0;i<5000 && kills<4;i++){
  const wasActive=W.eval('Combat.active');
  frame(0.05); frames++;
  const a=arenaHp(), c=cardHp(), active=W.eval('Combat.active'), vit=W.eval('S.vitals.hp');
  log.push({f:frames, active, arena:a, card:c, vitals:vit});
  if(wasActive && !W.eval('Combat.active')) kills++;
}
console.log('REAL DOM BAR WIDTHS  (arena = middle, card = sidebar)\n');
console.log('  frame  active   arena%   card%    S.vitals.hp   note');
let prev=null;
for(const l of log){
  const chg = !prev || prev.active!==l.active || Math.abs((prev.arena||0)-(l.arena||0))>6 || Math.abs((prev.card||0)-(l.card||0))>6 || (prev.arena!==l.arena && (l.arena>=97||prev.arena>=97));
  if(chg){
    const bug = (l.arena>=97 || l.card>=97) && l.vitals!==null && l.vitals!==undefined ? '  <== reads FULL but vitals are low!' : '';
    console.log(`  ${String(l.f).padStart(5)}  ${String(l.active).padEnd(6)}  ${String(l.arena).padStart(5)}%  ${String(l.card).padStart(5)}%   ${String(l.vitals).padStart(11)}${bug}`);
  }
  prev=l;
}
