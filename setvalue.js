const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/merchant.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,generateItem,computeStats,freshSave,totalTalentPoints,spendTalent,SETS,setPieceDef,makeSetPiece,collectSets,DESCENT_POWER_RATE};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
const SPEC=['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9','w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20','w15','w15','w12','w12','w12','w21','w22','w24','w2','w2','w2','w3'];

function measure(setId, n){
  let dps=0, ehp=0, eff=0;
  for(let i=0;i<n;i++){
    G.S=G.freshSave(); G.S.level=50;
    for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl:52,rarity:Math.random()<0.35?'legendary':'epic',slot:s.type||s.key,primary:'str'});
    if(setId){ const set=G.SETS.find(x=>x.id===setId); for(let j=0;j<5;j++){ const d=G.setPieceDef(set,j); G.S.equipment[d.slot]=G.makeSetPiece(d); } }
    G.S.talents={};
    for(let k=0;k<Math.min(G.totalTalentPoints(50),SPEC.length);k++) G.spendTalent(SPEC[k]);
    const st=G.computeStats();
    dps+=st.dps*(1+(st.physDmg+st.allDmg)/100)*(1+st.crit/100*(st.critMult-1));
    ehp+=st.maxHp/(1-st.dr/100)*(1+st.armor/(st.armor+4000));
    eff+=st.effects.reduce((a,e)=>a+e.chance,0);
  }
  return {dps:dps/n, ehp:ehp/n, procChance:eff/n};
}
const base=measure(null,60);
const reg=measure('regalia',60);
console.log('WHAT A FIVE-PIECE SET IS ACTUALLY WORTH  (level 50, ilvl 52 gear, warrior spec)\n');
console.log(`  no set:      effective dps ${Math.round(base.dps).toLocaleString().padStart(9)}   effective hp ${Math.round(base.ehp).toLocaleString().padStart(9)}   proc chance ${base.procChance.toFixed(0)}%`);
console.log(`  5pc Regalia: effective dps ${Math.round(reg.dps).toLocaleString().padStart(9)}   effective hp ${Math.round(reg.ehp).toLocaleString().padStart(9)}   proc chance ${reg.procChance.toFixed(0)}%`);
const dpsGain=(reg.dps/base.dps-1)*100, ehpGain=(reg.ehp/base.ehp-1)*100;
console.log(`\n  gain: ${dpsGain>0?'+':''}${dpsGain.toFixed(0)}% damage, ${ehpGain>0?'+':''}${ehpGain.toFixed(0)}% survivability`);
const combined=Math.sqrt((reg.dps/base.dps)*(reg.ehp/base.ehp));
console.log(`  combined power multiplier: ${combined.toFixed(2)}x`);
console.log(`  which in Descent floors is worth about +${(Math.log(combined)/Math.log(G.DESCENT_POWER_RATE)).toFixed(0)} floors`);
console.log(`  (floors are logarithmic in power, so a small floor gain is a large power gain)`);
