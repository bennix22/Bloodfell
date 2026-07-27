const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const FILES=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','data/gems.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+FILES.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+'return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,POTIONS,generateItem,computeStats,freshSave,spendTalent,currentVitals;'.replace(/;$/,'}'))();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
const ok=(l,c,x)=>console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?'  '+x:''}`);

G.setS(G.freshSave()); const S=G.getS(); S.level=40;
for(const s of G.SLOTS) S.equipment[s.key]=G.generateItem({ilvl:26,rarity:'uncommon',slot:s.type||s.key,primary:'str'});
S.talents={}; ['w1','w1','w1','w5','w5','w5'].forEach(t=>G.spendTalent(t));
const heal=G.POTIONS.find(p=>p.kind==='heal'); S.potions[heal.id]=999;
S.settings.autoPotion=true; S.settings.potionThreshold=40; S.settings.healPotion=heal.id;
G.Combat.pushLog=()=>{};
const realm=G.REALMS.find(r=>r.lvl===40);

console.log('POTION COOLDOWN PERSISTS ACROSS FIGHTS\n');
G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};
function store(){ const s=G.getS(); s.vitals.hp=Math.max(1,Math.round(G.Combat.player.hp)); s.vitals.mana=Math.max(0,Math.round(G.Combat.player.mana)); s.vitals.potionCd=Math.max(0,G.Combat.player.potionCd||0); }

// fight once, drink a potion, confirm the cooldown is stored
G.Combat.start('realm', realm); G.Combat.player.hp=G.Combat.stats.maxHp*0.2;  // below threshold
let drank=false;
for(let t=0;t<3 && G.Combat.active;t+=G.TICK){ const before=S.potions[heal.id]; G.Combat.step(); if(S.potions[heal.id]<before) drank=true; }
ok('a potion is drunk when low', drank);
const cdAfterDrink=G.Combat.player.potionCd;
ok('drinking sets a cooldown', cdAfterDrink > 0, `${cdAfterDrink}s`);
store();
ok('the cooldown is saved to vitals', S.vitals.potionCd > 0, `${S.vitals.potionCd}s stored`);

// next fight should START with the cooldown still active (not reset to 0)
G.Combat.start('realm', realm);
ok('the next fight starts with the cooldown still ticking', G.Combat.player.potionCd > 0,
   `cd = ${G.Combat.player.potionCd}s (was reset to 0 before the fix)`);

// over many short fights, potions are NOT drunk every fight
G.setS(G.freshSave()); const S2=G.getS(); S2.level=50;
for(const s of G.SLOTS) S2.equipment[s.key]=G.generateItem({ilvl:52,rarity:'epic',slot:s.type||s.key,primary:'str'});
S2.talents={}; ['w1','w1','w1','w5','w5','w5'].forEach(t=>G.spendTalent(t));
S2.potions[heal.id]=999; S2.settings.autoPotion=true; S2.settings.potionThreshold=90; S2.settings.healPotion=heal.id;
const easy=G.REALMS.find(r=>r.lvl===10);  // trivial: fights end in a second or two, shorter than the cooldown
let used=0, fights=12;
for(let f=0;f<fights;f++){
  G.Combat.start('realm', easy); G.Combat.player.hp=G.Combat.stats.maxHp*0.5; // below threshold at the start of each fight
  let t=0; const before=S2.potions[heal.id];
  while(G.Combat.active && t<60){ G.Combat.step(); t+=G.TICK; }
  store();
  used += before - S2.potions[heal.id];
}
// with a 12s cooldown and ~1-2s fights, 12 fights span far less than 12*cooldown, so far fewer than one drink per fight
ok('the cooldown gates drinking (not one per fight)', used < fights, `${used} potions over ${fights} short fights (would be ${fights} before the fix)`);
ok('but potions are still drunk sometimes', used > 0, `${used} used`);
