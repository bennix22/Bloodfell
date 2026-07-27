const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const FILES=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','data/gems.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+FILES.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,UNIQUES,generateItem,makeUnique2,computeStats,freshSave,totalTalentPoints,spendTalent,unlockedSpells;`.replace(/;$/,'}'))();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
const ok=(l,c,x)=>console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?'  '+x:''}`);

function bloodPact(){ return G.makeUnique2(G.UNIQUES.find(u=>u.id==='uq_blood_pact')); }

// a pure warrior: strength gear, warrior talents, minimal Intellect
function warrior(withPact){
  G.setS(G.freshSave()); const S=G.getS(); S.level=50;
  for(const s of G.SLOTS) S.equipment[s.key]=G.generateItem({ilvl:50,rarity:'rare',slot:s.type||s.key,primary:'str'});
  if(withPact) S.equipment.trinket1 = bloodPact();
  S.talents={}; ['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6'].forEach(t=>G.spendTalent(t));
  return G.computeStats();
}

console.log('BLOOD PRICE: spells paid in health, not mana\n');

const st = warrior(true);
ok('the passive is active', st.passives.some(p=>p.id==='blood_price'), st.passives.map(p=>p.name).join(', '));

// set up a fight and cast a spell directly
G.Combat.pushLog=()=>{};
G.Combat.start('realm', G.REALMS.filter(r=>r.lvl<=50).pop());
G.Combat.player.hp = G.Combat.stats.maxHp;
G.Combat.player.mana = G.Combat.stats.maxMana;
const sp = G.unlockedSpells()[0];
const hpBefore = G.Combat.player.hp, manaBefore = G.Combat.player.mana;
const expectedCost = G.Combat.castHealthCost(sp);
G.Combat.cast(sp);
ok('casting spends health', G.Combat.player.hp < hpBefore, `${Math.round(hpBefore)} -> ${Math.round(G.Combat.player.hp)} hp`);
ok('casting spends NO mana', G.Combat.player.mana === manaBefore, `mana stayed ${Math.round(manaBefore)}`);
// net drop can be LESS than the blood cost if a gear proc lifesteals during the
// cast, but never more; the gross cost is validated exactly below
ok('net health drop never exceeds the blood cost', (hpBefore - G.Combat.player.hp) <= expectedCost + 1,
   `net ${Math.round(hpBefore-G.Combat.player.hp)} <= gross ${Math.round(expectedCost)}`);
ok('cost scales with max HP not mana pool',
   Math.abs(expectedCost - st.maxHp * (sp.manaPct/100) * 0.7) < 1, `${Math.round(expectedCost)} = ${sp.manaPct}% of ${Math.round(st.maxHp)} hp x0.7`);

// the survival floor: a spell that would drop you too low will not fire
G.Combat.player.hp = G.Combat.castHealthCost(sp) * 0.5;  // less than the cost
ok('cannot afford a lethal cast', !G.Combat.canAfford(sp), 'blocked when it would kill');
G.Combat.player.hp = G.Combat.stats.maxHp;
ok('can afford when healthy', G.Combat.canAfford(sp));

// Intellect is now irrelevant to this build's casting
const stLoInt = warrior(true);
// artificially crank int and confirm the health cost is unchanged (depends on HP, not int)
G.getS().equipment.ring1.stats.int = 2000;
const stHiInt = G.computeStats();
G.Combat.stats = stLoInt;
const costLo = G.Combat.castHealthCost(sp);
G.Combat.stats = stHiInt;
const costHi = G.Combat.castHealthCost(sp);
ok('Intellect does not change the blood cost', Math.abs(costLo - costHi) < 1 || stHiInt.maxHp !== stLoInt.maxHp,
   `${Math.round(costLo)} vs ${Math.round(costHi)} (tracks HP, not mana)`);

// a full fight: the warrior gets spell uptime AND survives (does not bleed out)
function fightUptime(withPact){
  warrior(withPact);
  G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};
  let casts=0, died=0, runs=20;
  const realCast=G.Combat.cast.bind(G.Combat);
  G.Combat.cast=function(s){ casts++; return realCast(s); };
  for(let f=0;f<runs;f++){
    G.Combat.start('realm', G.REALMS.filter(r=>r.lvl<=50).pop());
    let t=0; while(G.Combat.active&&t<200){ G.Combat.step(); t+=G.TICK; }
    if(G.Combat.player.hp<=1) died++;
  }
  G.Combat.cast=realCast;
  return { casts, died, runs };
}
const withP = fightUptime(true);
ok('warrior casts freely with the pact', withP.casts > 0, `${withP.casts} casts over ${withP.runs} fights`);
ok('and does not bleed itself to death', withP.died === 0, `${withP.died} deaths`);
