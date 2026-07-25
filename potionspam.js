const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const FILES=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/merchant.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+FILES.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+'return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,POTIONS,generateItem,computeStats,freshSave,totalTalentPoints,spendTalent,currentVitals;'.replace(/;$/,'}'))();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
G.setS(G.freshSave()); const S=G.getS(); S.level=30;
for(const s of G.SLOTS) S.equipment[s.key]=G.generateItem({ilvl:24,rarity:'common',slot:s.type||s.key,primary:'str'});  // weak: ends fights low
S.talents={}; ['w1','w1','w1','w5','w5','w5'].forEach(t=>G.spendTalent(t));
// stock a lot of heal potions and turn on auto-potion below 40%
const heal=G.POTIONS.find(p=>p.kind==='heal'); S.potions[heal.id]=999;
S.settings.autoPotion=true; S.settings.potionThreshold=40; S.settings.healPotion=heal.id;
G.Combat.pushLog=()=>{};
const realm=G.REALMS.find(r=>r.lvl===40);  // harder than the character

console.log(`potion: ${heal.name} heals ${heal.pct}% of max HP, 8s cooldown\n`);
console.log('  fight  potionsUsed(cumulative)   HP% at fight start   HP% at fight end');
G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};
let potionsStart=0;
for(let f=0;f<8;f++){
  G.Combat.start('realm', realm);
  const cdAtStart=G.Combat.player.potionCd;
  const hpStart=Math.round(G.Combat.player.hp/G.Combat.stats.maxHp*100);
  let t=0, before=S.potions[heal.id];
  while(G.Combat.active && t<200){ G.Combat.step(); t+=G.TICK; }
  // the real win() stores vitals (incl. the potion cooldown); our stub skips it, so do it here
  S.vitals.hp = Math.max(1, Math.round(G.Combat.player.hp));
  S.vitals.mana = Math.max(0, Math.round(G.Combat.player.mana));
  S.vitals.potionCd = Math.max(0, G.Combat.player.potionCd || 0);
  const used=999-S.potions[heal.id];
  const hpEnd=Math.round((G.currentVitals().hp)/G.Combat.stats.maxHp*100);
  console.log(`  ${String(f+1).padStart(5)}  ${String(used).padStart(10)} total          cd@start ${String(cdAtStart).padStart(2)}   start ${String(hpStart).padStart(3)}%        end ${String(hpEnd).padStart(3)}%`);
}
console.log(`\n  total potions used across 8 short fights: ${999-S.potions[heal.id]}`);
console.log('  (if this is ~1 per fight, the 8s cooldown is being reset every fight)');
