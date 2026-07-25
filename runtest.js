const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,generateItem,computeStats,freshSave,totalTalentPoints,spendTalent,POTIONS,beginRun,DEPTH_POWER_PER_KILL,currentVitals};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
G.Combat.pushLog=function(){};   // quiet, but keep the real win/lose so depth and vitals persist
const SPECS={warrior:['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9','w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20','w15','w15'],
             mage:['m1','m1','m1','m2','m2','m2','m5','m5','m5','m6','m6','m6','m8','m8','m8','m11','m11','m11','m12','m12','m12','m16','m16','m16','m17','m17','m19','m19','m15','m15']};
function build(spec,level,primary,potions){
  G.S=G.freshSave(); G.S.level=level;
  for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl:level,rarity:'rare',slot:s.type||s.key,primary});
  G.S.talents={};
  const cap=G.totalTalentPoints(level); const o=SPECS[spec];
  for(let i=0;i<Math.min(cap,o.length);i++) G.spendTalent(o[i]);
  G.S.potions={};
  if(potions){
    const h=G.POTIONS.filter(p=>p.kind==='heal'&&p.req<=level).sort((a,b)=>b.pct-a.pct)[0];
    const m=G.POTIONS.filter(p=>p.kind==='mana'&&p.req<=level).sort((a,b)=>b.pct-a.pct)[0];
    if(h) G.S.potions[h.id]=999; if(m) G.S.potions[m.id]=999;
    G.S.settings.autoPotion=true; G.S.settings.potionThreshold=45;
  }
}
function doRun(realmIdx){
  G.beginRun(null);
  let minMana=1, oomAt=null, minHp=1, lastDepth=0;
  for(let i=0;i<500;i++){
    const startDepth=G.S.run.depth;
    G.Combat.start('realm',G.REALMS[realmIdx]);
    let t=0;
    while(G.Combat.active&&t<300){
      G.Combat.step(); t+=G.TICK;
      const mf=G.Combat.player.mana/G.Combat.stats.maxMana;
      const hf=G.Combat.player.hp/G.Combat.stats.maxHp;
      if(mf<minMana) minMana=mf;
      if(hf<minHp) minHp=hf;
      if(mf<0.05 && oomAt===null) oomAt=startDepth;
    }
    if(G.S.run.depth===startDepth) break;   // lost; the run is over
    lastDepth=G.S.run.depth;
  }
  return {depth:lastDepth, minMana, oomAt, minHp};
}
function avg(spec,primary,level,realmIdx,potions,n){
  let d=0,mm=0,oom=0,oomD=0;
  for(let i=0;i<n;i++){ build(spec,level,primary,potions); const r=doRun(realmIdx); d+=r.depth; mm+=r.minMana; if(r.oomAt!==null){oom++;oomD+=r.oomAt;} }
  return {depth:d/n, minMana:mm/n, oomRate:oom/n, oomDepth:oom?oomD/oom:0};
}
console.log('RUN DEPTH — how far before the realm wins\n');
console.log('  build    lvl  potions   avg depth   lowest mana   ran dry');
for(const [spec,primary] of [['warrior','str'],['mage','int']]){
  for(const lv of [20,40]){
    const idx=G.REALMS.map((r,i)=>[r,i]).filter(([r])=>r.lvl<=lv).pop()[1];
    for(const pots of [false,true]){
      const r=avg(spec,primary,lv,idx,pots,12);
      console.log(`  ${spec.padEnd(8)} ${String(lv).padStart(3)}  ${(pots?'yes':'no ').padStart(7)}   ${r.depth.toFixed(1).padStart(9)}   ${(r.minMana*100).toFixed(0).padStart(11)}%   ${r.oomRate?`${Math.round(r.oomRate*100)}% at depth ${r.oomDepth.toFixed(0)}`:'never'}`);
    }
  }
}
console.log('\nreward at depth (level 40 realm):');
for(const d of [0,10,20,30,50]){
  console.log(`  depth ${String(d).padStart(2)}: enemies +${Math.round(d*G.DEPTH_POWER_PER_KILL*100)}% power, +${d*4}% magic find, +${Math.round(d*3.5)}% xp, +${d*5}% gold`);
}
