const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const FILES=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/merchant.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+FILES.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+'return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,generateItem,computeStats,freshSave,totalTalentPoints,spendTalent,currentVitals,beginDescent,advanceDescent,takeBoon};')();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
G.setS(G.freshSave()); const S=G.getS(); S.level=50; S.bossKills.r3b5=1;
for(const s of G.SLOTS) S.equipment[s.key]=G.generateItem({ilvl:30,rarity:'common',slot:s.type||s.key,primary:'str'});  // weak: takes real damage
S.talents={}; ['w1','w1','w1','w5','w5','w5'].forEach(t=>G.spendTalent(t));
S.settings.autoGrind=true; G.Combat.pushLog=()=>{};

let pendingNext=0, UIgrind={mode:'descent', id:'descent'};
G.Combat.onUpdate=function(kind,result){
  if(!result) return;
  if(result.boonReady){ return; } // would pause for boon
  if(result.descentEnd){ UIgrind=null; return; }
  if(S.settings.autoGrind && UIgrind){ pendingNext=0.3; }
};
function startNextFight(){
  if(!UIgrind) return;
  if(!S.descent.active){ UIgrind=null; return; }
  if(S.descent.pendingChoices) return;
  G.Combat.start('descent', null);
}
function shownHpPct(){
  if(G.Combat.active) return Math.round(G.Combat.player.hp / G.Combat.stats.maxHp * 100);
  const v=G.currentVitals(); return Math.round(v.hp / v.maxHp * 100);
}
G.beginDescent(); S.descent.floor=20;  // deeper = harder
G.Combat.start('descent', null);
let frames=0, log=[];
function frame(dt){
  frames++;
  if(G.Combat.active){
    G.Combat.advance(dt);
    log.push({f:frames, phase:'active', active:G.Combat.active, shown:shownHpPct(), vitals:S.vitals.hp});
  } else if(pendingNext>0){
    pendingNext-=dt;
    if(pendingNext<=0){ pendingNext=0; startNextFight(); log.push({f:frames, phase:'startNext', active:G.Combat.active, shown:shownHpPct(), vitals:S.vitals.hp}); }
    else log.push({f:frames, phase:'delay', active:G.Combat.active, shown:shownHpPct(), vitals:S.vitals.hp});
  }
  // auto-take boons so the run continues
  if(S.descent.pendingChoices){ G.takeBoon(S.descent.pendingChoices[0]); pendingNext=0.1; }
}
let kills=0;
for(let i=0;i<3000 && kills<3;i++){ const w=G.Combat.active; frame(0.05); if(w && !G.Combat.active) kills++; }
console.log('DESCENT — HEALTH% ACROSS KILL BOUNDARIES\n');
console.log('  frame  phase       active  shownHP%   S.vitals.hp');
let prev=null;
for(const l of log){
  const interesting = !prev || prev.phase!==l.phase || prev.active!==l.active || Math.abs((prev.shown||0)-(l.shown||0))>4;
  if(interesting) console.log(`  ${String(l.f).padStart(5)}  ${l.phase.padEnd(10)}  ${String(l.active).padEnd(6)}  ${String(l.shown).padStart(6)}%   ${String(l.vitals).padStart(11)}${l.shown>=98&&!l.active?'  <== FULL':''}`);
  prev=l;
}
