const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=["'data/realms.js'","'data/raids.js'","'data/items.js'","'data/talents.js'","'data/spells.js'","'data/crafting.js'","'data/effects.js'","'data/uniques.js'","'data/sets.js'","'core/sound.js'","'core/state.js'","'core/passives.js'","'core/character.js'","'core/loot.js'","'core/combat.js'","'core/actions.js'","'core/merchant.js'","'core/descent.js'"].map(f=>f.replace(/'/g,''));
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,generateItem,computeStats,freshSave,totalTalentPoints,spendTalent,unlockedSpells,SPELLS};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
G.Combat.pushLog=function(){};

// pure warrior — no int, no spi, no priest/mage talents
const WAR=['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9','w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20','w15','w15','w12','w12','w12','w21','w22','w24','w2','w2','w2','w3'];
function build(lv){
  G.S=G.freshSave(); G.S.level=lv;
  for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl:lv,rarity:'rare',slot:s.type||s.key,primary:'str'});
  G.S.talents={};
  for(let i=0;i<Math.min(G.totalTalentPoints(lv),WAR.length);i++) G.spendTalent(WAR[i]);
}
// scenario B: a warrior who grabbed spells from a second tree and casts on cooldown
function buildHybrid(lv){
  G.S=G.freshSave(); G.S.level=lv;
  for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl:lv,rarity:'rare',slot:s.type||s.key,primary:'str'});
  G.S.talents={};
  const mix=['w1','w1','w1','w5','w5','w5','w8','w8','w8','r1','r1','r1','r5','r5','r5','w11','w11','w11','w13','w13','w13','r8','r8','r8','w6','w6','w9','w9','r11','r11','w16','w16','w18','w20','r13','r15','w2','w2','w3','w4'];
  for(let i=0;i<Math.min(G.totalTalentPoints(lv),mix.length);i++) G.spendTalent(mix[i]);
}
build(50);
const st=G.computeStats();
const spells=G.unlockedSpells();
console.log('PURE WARRIOR AT LEVEL 50 (str gear, warrior talents only)\n');
console.log(`  max mana: ${Math.round(st.maxMana)}`);
console.log(`  regen: ${st.manaRegen.toFixed(1)}/s  (${(st.manaRegen/st.maxMana*100).toFixed(1)}% of pool per second)`);
console.log(`  unlocked spells: ${spells.length}`);
console.log('');
console.log('  spell costs (% of pool -> actual mana):');
for(const sp of spells){
  const cost=st.maxMana*sp.manaPct/100;
  console.log(`    ${sp.name.padEnd(18)} ${sp.manaPct}%  = ${Math.round(cost).toString().padStart(5)} mana,  cooldown ${sp.cd}s  -> ${(cost/sp.cd).toFixed(1)} mana/s if spammed`);
}
const spendRate=spells.reduce((a,s)=>a+(st.maxMana*s.manaPct/100)/s.cd,0);
console.log(`\n  total spend if every spell on cooldown: ${spendRate.toFixed(1)} mana/s`);
console.log(`  regen: ${st.manaRegen.toFixed(1)} mana/s`);
console.log(`  net: ${(st.manaRegen-spendRate).toFixed(1)} mana/s  ${st.manaRegen<spendRate?'(DRAINING — warrior cannot keep up)':'(sustainable)'}`);

// simulate a long run and see where mana sits
build(50);
G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};
let minima=[];
for(let f=0;f<15;f++){
  G.Combat.start('realm', G.REALMS.filter(r=>r.lvl<=50).pop());
  let lowest=1, t=0;
  while(G.Combat.active&&t<200){ G.Combat.step(); t+=G.TICK; const frac=G.Combat.player.mana/G.Combat.stats.maxMana; if(frac<lowest)lowest=frac; }
  minima.push(lowest);
}
console.log(`\n  across 15 fights, lowest mana each: ${minima.map(m=>Math.round(m*100)+'%').join(' ')}`);
console.log(`  average floor: ${Math.round(minima.reduce((a,b)=>a+b,0)/minima.length*100)}%`);
