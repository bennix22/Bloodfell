const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/merchant.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,generateItem,computeStats,freshSave,totalTalentPoints,spendTalent,POTIONS,beginDescent,endDescent,takeBoon,BOONS,boonById,rollBoonChoices,advanceDescent,DESCENT_POWER_RATE,DESCENT_BOON_EVERY,makeSetPiece,setPieceDef,SETS,collectSets};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
G.Combat.pushLog=function(){};

const SPEC=['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9','w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20','w15','w15','w12','w12','w12','w21','w22','w24','w2','w2','w2','w3'];
function build(ilvl, withSet){
  G.S=G.freshSave(); G.S.level=50;
  for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl,rarity:Math.random()<0.35?'legendary':'epic',slot:s.type||s.key,primary:'str'});
  if(withSet){
    const set=G.SETS.find(x=>x.id===withSet);
    for(let i=0;i<5;i++){ const d=G.setPieceDef(set,i); G.S.equipment[d.slot]=G.makeSetPiece(d); }
  }
  G.S.talents={};
  for(let i=0;i<Math.min(G.totalTalentPoints(50),SPEC.length);i++) G.spendTalent(SPEC[i]);
  const h=G.POTIONS.filter(p=>p.kind==='heal'&&p.req<=50).sort((a,b)=>b.pct-a.pct)[0];
  G.S.potions={[h.id]:99999}; G.S.settings.autoPotion=true; G.S.settings.potionThreshold=50;
}

/* Boon strategies, to see whether choice actually matters. */
const PICKERS={
  greedy: cs => cs[0],                                   // always the first offered
  damage: cs => cs.find(c=>['ruin','cruelty','quickening','b_shatter','b_windfury'].includes(c)) || cs[0],
  tanky:  cs => cs.find(c=>['vitality','bulwark_boon','hunger','alchemy','b_lastbreath'].includes(c)) || cs[0],
  balanced: cs => {
    const want=['hunger','vitality','ruin','cruelty','bulwark_boon','quickening'];
    for(const w of want) if(cs.includes(w)) return w;
    return cs[0];
  },
};

function runDescent(picker, ilvl, withSet){
  build(ilvl, withSet);
  G.beginDescent();
  let guard=0;
  while(G.S.descent.active && guard++ < 400){
    if(G.S.descent.pendingChoices){ G.takeBoon(picker(G.S.descent.pendingChoices)); continue; }
    G.Combat.start('descent', null);
    let t=0; while(G.Combat.active && t<400){ G.Combat.step(); t+=G.TICK; }
    if(!G.S.descent.active) break;
  }
  const floor=G.S.descent.active ? G.S.descent.floor : (G.S.descent.best+1);
  const boons=Object.keys(G.S.descent.boons||{}).length;
  if(G.S.descent.active) G.endDescent('cap');
  return {floor, boons};
}
function avg(picker, ilvl, withSet, n){
  let f=0, b=0;
  for(let i=0;i<n;i++){ const r=runDescent(PICKERS[picker], ilvl, withSet); f+=r.floor; b+=r.boons; }
  return {floor:f/n, boons:b/n};
}

console.log('THE DESCENT — how far does a level 50 character get?\n');
console.log('  gear          strategy      avg floor   distinct boons');
for(const ilvl of [46,52]){
  for(const p of ['greedy','damage','tanky','balanced']){
    const r=avg(p, ilvl, false, 8);
    console.log(`  ilvl ${ilvl}       ${p.padEnd(12)} ${r.floor.toFixed(0).padStart(9)}   ${r.boons.toFixed(1).padStart(8)}`);
  }
}
console.log('\n  does choosing well matter? compare greedy vs balanced above.');

console.log('\n\nDOES A COMPLETED SET HELP?');
const noSet=avg('balanced',52,false,24);
const regalia=avg('balanced',52,'regalia',24);
const warplate=avg('balanced',52,'warplate',24);
console.log(`  no set, all ilvl 52:        floor ${noSet.floor.toFixed(0)}`);
console.log(`  5pc Regalia (ilvl 52):     floor ${regalia.floor.toFixed(0)}   ${regalia.floor>noSet.floor?'+':''}${Math.round((regalia.floor/noSet.floor-1)*100)}%`);
console.log(`  5pc Warplate (ilvl 39):    floor ${warplate.floor.toFixed(0)}   ${Math.round((warplate.floor/noSet.floor-1)*100)}%  (correctly outgrown at level 50)`);

console.log('\n\nSCALING CHECK');
for(const f of [1,10,25,40,55,70]){
  const mult=Math.pow(G.DESCENT_POWER_RATE,f-1);
  console.log(`  floor ${String(f).padStart(3)}: enemies at ${mult.toFixed(1)}x base, ~${Math.floor((f-1)/G.DESCENT_BOON_EVERY)} boons taken`);
}

console.log('\n\nWARDEN CHECK — are the every-10th-floor bosses walls?');
build(52,false); G.beginDescent();
let died=null, wardensBeaten=0, guard=0;
while(G.S.descent.active && guard++<900){
  const D=G.S.descent;
  if(D.pendingChoices){ G.takeBoon(PICKERS.balanced(D.pendingChoices)); continue; }
  const wasWarden = D.floor % 10 === 0;
  const at=D.floor;
  G.Combat.start('descent',null);
  let t=0; while(G.Combat.active&&t<400){G.Combat.step();t+=G.TICK;}
  if(!G.S.descent.active){ died={floor:at,onWarden:wasWarden}; break; }
  if(wasWarden) wardensBeaten++;
}
console.log(`  run ended at floor ${died?died.floor:'(cap)'}${died&&died.onWarden?' \u2014 ON a Warden':''}`);
console.log(`  Wardens defeated: ${wardensBeaten}`);
console.log(`  ${died&&died.onWarden ? 'a Warden ended it, which is the intent' : 'ordinary floors ended it'}`);
