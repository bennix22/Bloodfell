const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const FILES=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/merchant.js','core/descent.js'];
function load(credit){
  let src=FILES.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
  src=src.replace(/const MANA_COST_STAT_CREDIT = [0-9.]+;/, `const MANA_COST_STAT_CREDIT = ${credit};`);
  src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+src;
  return new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,generateItem,computeStats,freshSave,totalTalentPoints,spendTalent,unlockedSpells};`)();
}
const SPECS={
  warrior:['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9','w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20','w15','w15'],
  rogue:['r1','r1','r1','r5','r5','r5','r8','r8','r8','r6','r6','r6','r9','r9','r11','r11','r11','r13','r13','r13','r18','r18','r18','r16','r16','r20','r20','r15','r15','r2'],
  mage:['m1','m1','m1','m2','m2','m2','m5','m5','m5','m6','m6','m6','m8','m8','m8','m11','m11','m11','m12','m12','m12','m16','m16','m16','m17','m17','m19','m19','m15','m15'],
  priest:['s1','s1','s1','s4','s4','s4','s2','s2','s2','s6','s6','s6','s8','s8','s8','s11','s11','s11','s12','s12','s12','s13','s13','s13','s16','s16','s17','s17','s20','s20'],
};
function floor(G, primary, spec){
  G.setS(G.freshSave()); const S=G.getS(); S.level=50;
  for(const s of G.SLOTS) S.equipment[s.key]=G.generateItem({ilvl:50,rarity:'rare',slot:s.type||s.key,primary});
  S.talents={}; for(let i=0;i<Math.min(G.totalTalentPoints(50),spec.length);i++) G.spendTalent(spec[i]);
  G.Combat.pushLog=()=>{}; G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};
  let mins=[];
  for(let f=0;f<25;f++){ G.Combat.start('realm',G.REALMS.filter(r=>r.lvl<=50).pop()); let lo=1,t=0; while(G.Combat.active&&t<200){G.Combat.step();t+=G.TICK; const fr=G.Combat.player.mana/G.Combat.stats.maxMana; if(fr<lo)lo=fr;} mins.push(lo); }
  return Math.round(mins.reduce((a,b)=>a+b,0)/mins.length*100);
}
// casts from full for a mage at a given int-gear multiplier
function casts(G, mult){
  G.setS(G.freshSave()); const S=G.getS(); S.level=50;
  for(const s of G.SLOTS){ const it=G.generateItem({ilvl:50,rarity:'epic',slot:s.type||s.key,primary:'int'}); if(it.stats.int) it.stats.int=Math.max(1,Math.round(it.stats.int*mult)); S.equipment[s.key]=it; }
  S.talents={}; const sp=SPECS.mage; for(let i=0;i<Math.min(G.totalTalentPoints(50),sp.length);i++) G.spendTalent(sp[i]);
  const st=G.computeStats(); G.Combat.stats=st; G.Combat.player={mana:st.maxMana,buffs:[],cds:{},hots:[]}; G.Combat.passiveState={};
  const spells=G.unlockedSpells(); const pricey=spells.reduce((a,b)=>(b.manaPct>a.manaPct?b:a),spells[0]);
  return { int:st.int, pool:st.maxMana, casts:Math.floor(st.maxMana/G.Combat.spellCost(pricey)) };
}

console.log('DOES STACKING INTELLECT NOW HELP A MAGE?  (casts from a full pool)\n');
console.log('  a mage with more int gets a bigger pool AND cheaper-relative casts:');
for(const c of [1.0, 0.55]){
  const G=load(c);
  const lo=casts(G,0.4), mid=casts(G,0.9), hi=casts(G,1.8);
  const label = c===1.0 ? 'BEFORE (credit 1.0, the bug)' : 'AFTER  (credit 0.55)';
  console.log(`  ${label}`);
  console.log(`     low int (${String(lo.int).padStart(4)}):  ${lo.casts} casts`);
  console.log(`     mid int (${String(mid.int).padStart(4)}):  ${mid.casts} casts`);
  console.log(`     high int(${String(hi.int).padStart(4)}):  ${hi.casts} casts   ${c===1.0?'<- all identical: int is wasted on mana':'<- more int, more casts'}`);
}

console.log('\n\nMANA FLOOR ACROSS ALL BUILDS AT credit 0.55  (must stay a real resource)\n');
const G=load(0.55);
console.log('  warrior: '+floor(G,'str',SPECS.warrior)+'%   rogue: '+floor(G,'agi',SPECS.rogue)+'%   mage: '+floor(G,'int',SPECS.mage)+'%   priest: '+floor(G,'int',SPECS.priest)+'%');
