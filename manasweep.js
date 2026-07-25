const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const FILES=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/merchant.js','core/descent.js'];
function load(credit){
  let src=FILES.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
  src=src.replace(/const MANA_COST_STAT_CREDIT = [0-9.]+;/, `const MANA_COST_STAT_CREDIT = ${credit};`);
  src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+src;
  return new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,generateItem,computeStats,freshSave,totalTalentPoints,spendTalent,unlockedSpells};`)();
}
const MAGE=['m1','m1','m1','m2','m2','m2','m5','m5','m5','m6','m6','m6','m8','m8','m8','m11','m11','m11','m12','m12','m12','m16','m16','m16','m17','m17','m19','m19','m15','m15'];

// how many casts of the priciest unlocked spell a caster gets from a FULL pool,
// with LOW int gear vs HIGH int gear — this is the number the user cares about
function castsFromFull(G, intMult){
  G.setS(G.freshSave()); const S=G.getS(); S.level=50;
  for(const s of G.SLOTS){
    const it=G.generateItem({ilvl:50,rarity:'epic',slot:s.type||s.key,primary:'int'});
    // scale the int on the gear to simulate more/less int investment
    if(it.stats.int) it.stats.int=Math.round(it.stats.int*intMult);
    S.equipment[s.key]=it;
  }
  S.talents={}; for(let i=0;i<Math.min(G.totalTalentPoints(50),MAGE.length);i++) G.spendTalent(MAGE[i]);
  const st=G.computeStats();
  G.Combat.stats=st; G.Combat.player={mana:st.maxMana,buffs:[],cds:{},hots:[]};
  G.Combat.passiveState={};
  const spells=G.unlockedSpells();
  const pricey=spells.reduce((a,b)=>(b.manaPct>a.manaPct?b:a),spells[0]);
  const cost=G.Combat.spellCost(pricey);
  return { int:st.int, pool:st.maxMana, costPool:st.manaCostPool, spell:pricey.name, cost:Math.round(cost), casts:Math.floor(st.maxMana/cost) };
}

// sustained mana floor across a run, to confirm mana is still a real constraint
function floor(G, primary, spec){
  G.setS(G.freshSave()); const S=G.getS(); S.level=50;
  for(const s of G.SLOTS) S.equipment[s.key]=G.generateItem({ilvl:50,rarity:'rare',slot:s.type||s.key,primary});
  S.talents={}; for(let i=0;i<Math.min(G.totalTalentPoints(50),spec.length);i++) G.spendTalent(spec[i]);
  G.Combat.pushLog=()=>{}; G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};
  let mins=[];
  for(let f=0;f<25;f++){ G.Combat.start('realm',G.REALMS.filter(r=>r.lvl<=50).pop()); let lo=1,t=0; while(G.Combat.active&&t<200){G.Combat.step();t+=G.TICK; const fr=G.Combat.player.mana/G.Combat.stats.maxMana; if(fr<lo)lo=fr;} mins.push(lo); }
  return Math.round(mins.reduce((a,b)=>a+b,0)/mins.length*100);
}

console.log('EFFECT OF STACKING INTELLECT ON CASTS-FROM-FULL  (by credit factor)\n');
console.log('  credit   low-int mage           high-int mage          Int benefit   mage mana floor');
for(const c of [1.0, 0.7, 0.6, 0.55, 0.5, 0.4]){
  const G=load(c);
  const lo=castsFromFull(G, 0.5);   // half int
  const hi=castsFromFull(G, 1.6);   // lots of int
  const fl=floor(G, 'int', MAGE);
  const benefit = hi.casts - lo.casts;
  const tag = c===1.0 ? '  (current: Int does nothing)' : '';
  console.log(`  ${c.toFixed(2)}     ${String(lo.casts).padStart(3)} casts (${lo.int} int)      ${String(hi.casts).padStart(3)} casts (${hi.int} int)      +${String(benefit).padStart(3)} casts     ${fl}%${tag}`);
}
