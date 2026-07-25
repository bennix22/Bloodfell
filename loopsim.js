// Faithful replay of main.js frame() across a kill boundary, logging the real
// state each frame so we can SEE where health reads full.
const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const FILES=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/merchant.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+FILES.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+'return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,generateItem,computeStats,freshSave,totalTalentPoints,spendTalent,currentVitals,realmById,realmUnlocked,retreatFromRun};')();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});

// build a warrior in a realm run
G.setS(G.freshSave()); const S=G.getS(); S.level=50;
for(const s of G.SLOTS) S.equipment[s.key]=G.generateItem({ilvl:50,rarity:'rare',slot:s.type||s.key,primary:'str'});
S.talents={}; ['w1','w1','w1','w5','w5','w5'].forEach(t=>G.spendTalent(t));
S.settings.autoGrind=true; S.settings.autoRetreat=90;  // fires after any fight
G.Combat.pushLog=()=>{};

const realm=G.REALMS.filter(r=>r.lvl<=50).pop();
// mimic the UI grind + onUpdate + pendingNext machinery from main.js
let pendingNext=0;
let UIgrind={mode:'realm', id:realm.id};
G.Combat.onUpdate=function(kind,result){
  if(!result) return;
  if(result.won && S.settings.autoRetreat>0 && S.run.realmId){
    const v=G.currentVitals();
    if(v.hp/v.maxHp*100 < S.settings.autoRetreat){ G.retreatFromRun(); }
  }
  if(S.settings.autoGrind && UIgrind){ pendingNext = 0.3; }
};
function startNextFight(){
  if(!UIgrind) return;
  const r=G.realmById(UIgrind.id);
  if(r && G.realmUnlocked(r)) G.Combat.start('realm', r);
}
// what the char card / arena would show for player HP% between fights:
function shownHpPct(){
  if(G.Combat.active) return Math.round(G.Combat.player.hp / G.Combat.stats.maxHp * 100);
  const v=G.currentVitals(); return Math.round(v.hp / v.maxHp * 100);
}
function cvPct(){ const v=G.currentVitals(); return Math.round(v.hp/v.maxHp*100); }

// start the first fight
G.Combat.start('realm', realm);
let frames=0, log=[];
function frame(dt){
  frames++;
  if(G.Combat.active){
    G.Combat.advance(dt);
    // (tickCombat + renderCharCard would run here) -> record what they'd show
    log.push({f:frames, phase:'active', active:G.Combat.active, shown:shownHpPct(), vitals:S.vitals.hp, chp: G.Combat.active?Math.round(G.Combat.player.hp):null});
  } else if(pendingNext>0){
    pendingNext -= dt;
    if(pendingNext<=0){ pendingNext=0; startNextFight(); log.push({f:frames, phase:'startNext', active:G.Combat.active, shown:shownHpPct(), vitals:S.vitals.hp, chp:Math.round(G.Combat.player.hp)}); }
    else log.push({f:frames, phase:'delay', active:G.Combat.active, shown:shownHpPct(), vitals:S.vitals.hp, chp:null});
  }
}
// run frames until we've seen at least 2 kills
let kills=0, lastActive=true;
for(let i=0;i<4000 && kills<2;i++){
  const wasActive=G.Combat.active;
  frame(0.05);
  if(wasActive && !G.Combat.active) kills++;
}
// print the frames around each transition (where active flips or phase changes)
console.log('FRAME-BY-FRAME HEALTH% AROUND THE KILL BOUNDARY\n');
console.log('  frame  phase       active  shownHP%   S.vitals.hp   Combat.player.hp');
let prev=null;
for(const l of log){
  const interesting = !prev || prev.phase!==l.phase || prev.active!==l.active || Math.abs((prev.shown||0)-(l.shown||0))>4;
  if(interesting) console.log(`  ${String(l.f).padStart(5)}  ${l.phase.padEnd(10)}  ${String(l.active).padEnd(6)}  ${String(l.shown).padStart(6)}%   ${String(l.vitals).padStart(11)}   ${l.chp===null?'   -':String(l.chp).padStart(4)}${l.shown>=95&&!l.active?'   <== SHOWS FULL':''}`);
  prev=l;
}
