const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/uniques.js','core/sound.js','core/state.js','core/passives.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,generateItem,computeStats,freshSave,unlockedSpells,SPELLS,totalTalentPoints,spendTalent};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};

const SPECS={
  warrior:['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9','w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20','w15','w15'],
  mage:['m1','m1','m1','m2','m2','m2','m5','m5','m5','m6','m6','m6','m8','m8','m8','m11','m11','m11','m12','m12','m12','m16','m16','m16','m17','m17','m19','m19','m15','m15'],
  priest:['s1','s1','s1','s4','s4','s4','s2','s2','s2','s6','s6','s6','s8','s8','s8','s11','s11','s11','s12','s12','s12','s13','s13','s13','s16','s16','s17','s17','s20','s20'],
};
function build(spec,level,primary){
  G.S=G.freshSave(); G.S.level=level;
  for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl:level,rarity:'rare',slot:s.type||s.key,primary});
  G.S.talents={};
  const cap=G.totalTalentPoints(level); const order=SPECS[spec];
  for(let i=0;i<Math.min(cap,order.length);i++) G.spendTalent(order[i]);
}
function measure(realmIdx,fights){
  let lowest=1, totalCasts=0, oom=0, totalTime=0;
  for(let f=0;f<fights;f++){
    G.Combat.start('realm',G.REALMS[realmIdx]);
    let t=0, casts=0, wasOom=false;
    const before=G.Combat.player.mana;
    while(G.Combat.active&&t<200){
      const m0=G.Combat.player.mana;
      G.Combat.step(); t+=G.TICK;
      if(G.Combat.player.mana<m0-1) casts++;
      const frac=G.Combat.player.mana/G.Combat.stats.maxMana;
      if(frac<lowest) lowest=frac;
      if(frac<0.05) wasOom=true;
    }
    if(wasOom) oom++;
    totalCasts+=casts; totalTime+=t;
  }
  return {lowest, oom:oom/fights, castsPerFight:totalCasts/fights, avgTime:totalTime/fights};
}
console.log('MANA PRESSURE — how close does each build come to running dry?\n');
console.log('  build    lvl   realm                  spells  lowest mana   fights hitting empty');
for(const [spec,primary] of [['warrior','str'],['mage','int'],['priest','int']]){
  for(const lv of [20,40]){
    build(spec,lv,primary);
    const realmIdx=G.REALMS.map((r,i)=>[r,i]).filter(([r])=>r.lvl<=lv).pop()[1];
    const spells=G.unlockedSpells().length;
    const m=measure(realmIdx,40);
    console.log(`  ${spec.padEnd(8)} ${String(lv).padStart(3)}   ${G.REALMS[realmIdx].name.padEnd(22)} ${String(spells).padStart(3)}    ${(m.lowest*100).toFixed(0).padStart(5)}%        ${(m.oom*100).toFixed(0).padStart(3)}%`);
  }
}
console.log('\nregen vs cost at level 40:');
build('mage',40,'int');
const st=G.computeStats();
console.log(`  max mana ${Math.round(st.maxMana)}, regen ${st.manaRegen.toFixed(1)}/s  -> full pool refills in ${(st.maxMana/st.manaRegen).toFixed(0)}s`);
const spells=G.unlockedSpells();
const costPerSec=spells.reduce((a,s)=>a+(st.maxMana*s.manaPct/100)/s.cd,0);
console.log(`  spells available cost ${costPerSec.toFixed(1)} mana/s if all cast on cooldown`);
console.log(`  => regen covers ${(st.manaRegen/costPerSec*100).toFixed(0)}% of maximum spend`);
