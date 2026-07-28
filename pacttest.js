const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','data/gems.js','core/sound.js','core/state.js','core/counter.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+'return {getS:()=>S,setS:v=>{S=v},freshSave,UNIQUES,makeUnique2,generateItem,SLOTS,Combat,bossById,REALMS,computeStats,SPELLS,PACT_IRON_TITHE,PACT_IRON_BONUS}')();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
let pass=0,fail=0; const ok=(n,c,d)=>{(c?pass++:fail++);console.log('  '+(c?'PASS':'FAIL')+'  '+n+(d?'  '+d:''));};

function geared(withPact){
  G.S=G.freshSave(); G.S.level=60;
  for (const sl of G.SLOTS){ if(sl.key==='mainhand'||sl.key==='offhand') continue;
    G.S.equipment[sl.key]=G.generateItem({ilvl:50,rarity:'epic',slot:sl.type||sl.key,primary:'str'}); }
  G.S.equipment.mainhand = withPact
    ? G.makeUnique2(G.UNIQUES.find(u=>u.id==='uq_pact_iron'))
    : G.generateItem({ilvl:45,rarity:'epic',slot:'weapon',primary:'str'});
}

console.log('\n=== the two uniques are no longer the same item ===');
{
  const bp = G.UNIQUES.find(u=>u.passive.id==='blood_price');
  const pi = G.UNIQUES.find(u=>u.passive.id==='pact_iron');
  ok('Blood Pact still spends health on spells', /health/i.test(bp.passive.text) && /spell/i.test(bp.passive.text));
  ok('Pact Iron now spends mana on swings', /mana/i.test(pi.passive.text) && /swing/i.test(pi.passive.text));
  ok('they no longer share a mechanic', !/no mana|instead of mana/i.test(pi.passive.text), pi.passive.name);
}

console.log('\n=== the tithe: swings spend mana and hit harder ===');
{
  geared(true);
  G.Combat.start('boss', G.bossById('r3b5'));
  const maxMana = G.Combat.stats.maxMana;
  G.Combat.player.mana = maxMana;

  const before = G.Combat.player.mana;
  const boosted = G.Combat.passiveTransform('damageDealt', 1000, { source:'auto', crit:false });
  const spent = before - G.Combat.player.mana;
  ok('a swing costs mana', spent > 0, `${Math.round(spent)} of ${Math.round(maxMana)}`);
  ok('it costs the advertised share', Math.abs(spent - maxMana*G.PACT_IRON_TITHE) < 0.01,
     `${Math.round(spent)} vs ${Math.round(maxMana*G.PACT_IRON_TITHE)}`);
  ok('and the swing hits harder', Math.abs(boosted - 1000*G.PACT_IRON_BONUS) < 0.01, `${Math.round(boosted)} from 1000`);

  const spellDmg = G.Combat.passiveTransform('damageDealt', 1000, { source:'spell', crit:false });
  ok('spells pay no tithe and get no bonus', spellDmg === 1000, `${spellDmg}`);
}

console.log('\n=== running dry ===');
{
  geared(true);
  G.Combat.start('boss', G.bossById('r3b5'));
  G.Combat.player.mana = 0;
  const dry = G.Combat.passiveTransform('damageDealt', 1000, { source:'auto', crit:false });
  ok('no mana means no bonus', dry === 1000, `${dry}`);
  ok('and no debt is accrued', G.Combat.player.mana === 0, `mana ${G.Combat.player.mana}`);

  // the whole point: it must never harm the wearer
  geared(true);
  G.Combat.start('realm', G.REALMS[10]);
  const startHp = G.Combat.player.hp;
  let died=false;
  for (let i=0;i<60 && G.Combat.active;i++){ G.Combat.step(); if (G.Combat.player.hp<=0) died=true; }
  ok('equipping it does not kill you', !died, `hp ${Math.round(G.Combat.player.hp)} / ${Math.round(startHp)}`);
}

console.log('\n=== Blood Pact still works as before ===');
{
  G.S=G.freshSave(); G.S.level=60;
  for (const sl of G.SLOTS) G.S.equipment[sl.key]=G.generateItem({ilvl:50,rarity:'epic',slot:sl.type||sl.key,primary:'int'});
  const bp = G.UNIQUES.find(u=>u.passive.id==='blood_price');
  G.S.equipment.trinket1 = G.makeUnique2(bp);
  G.Combat.start('boss', G.bossById('r3b5'));
  ok('spells cost health', G.Combat.spellsCostHealth());
  const sp = G.SPELLS.find(s=>s.manaPct>0 && s.type==='damage');
  G.Combat.stats.lifesteal = 0;
  const quoted = G.Combat.castHealthCost(sp), before = G.Combat.player.hp;
  G.Combat.cast(sp);
  ok('and spend the quoted amount', Math.abs((before-G.Combat.player.hp) - quoted) < 1,
     `${Math.round(before-G.Combat.player.hp)} vs ${Math.round(quoted)}`);
}

console.log('\n'+(fail?fail+' FAILURES':'ALL PASSED'));
process.exit(fail?1:0);
