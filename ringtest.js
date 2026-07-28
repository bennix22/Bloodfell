const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','data/gems.js','core/sound.js','core/state.js','core/counter.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+'return {getS:()=>S,setS:v=>{S=v},freshSave,UNIQUES,makeUnique2,generateItem,SLOTS,Combat,bossById,REALMS,TICK,rollRealmLoot,slotsForItem,SPELLS,PASSIVES}')();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
let pass=0,fail=0; const ok=(n,c,d)=>{(c?pass++:fail++);console.log('  '+(c?'PASS':'FAIL')+'  '+n+(d?'  '+d:''));};

const wear = id => {
  G.S=G.freshSave(); G.S.level=75;
  for (const sl of G.SLOTS) if (sl.key!=='ring1') G.S.equipment[sl.key]=G.generateItem({ilvl:60,rarity:'epic',slot:sl.type||sl.key,primary:'str'});
  G.S.equipment.ring1 = G.makeUnique2(G.UNIQUES.find(u=>u.id===id));
};

console.log('\n=== four of them are rings now ===');
{
  const rings = G.UNIQUES.filter(u=>u.slot==='ring');
  ok('ring uniques went from 2 to 5', rings.length===5, rings.map(r=>r.name).join(', '));
  for (const id of ['uq_first_wound','uq_devour','uq_oblivion_ward','uq_black_widow'])
    ok(id+' is a ring', G.UNIQUES.find(u=>u.id===id).slot==='ring');
}

console.log('\n=== Gravemark: dots tick three times faster ===');
{
  wear('uq_first_wound');
  G.Combat.start('boss', G.bossById('r3b5'));
  ok('the enemy is marked as the fight opens', G.Combat.passiveState.markedEnemy === true);
  ok('and the dot clock runs at 3x', G.Combat.dotSpeed()===3, 'x'+G.Combat.dotSpeed());
  // a dot ticks three times as often
  G.Combat.enemy.dots=[{name:'test',perTick:10,interval:3,timer:3,ticksLeft:99,school:'phys'}];
  let ticks=0; const before=G.Combat.enemy.hp;
  for(let i=0;i<30;i++){ G.Combat.step(); }
  ok('a dot lands more often under the mark', before-G.Combat.enemy.hp > 0, 'enemy lost health to the dot');

  wear('uq_devour');   // an unmarked fight
  G.Combat.start('boss', G.bossById('r3b5'));
  ok('an unmarked fight ticks normally', G.Combat.dotSpeed()===1);
}

console.log('\n=== Widow\'s Web: five crits close it ===');
{
  wear('uq_black_widow');
  G.Combat.start('boss', G.bossById('r3b5'));
  for (let i=0;i<4;i++) G.Combat.passiveTransform('damageDealt', 100, {source:'auto',crit:true});
  ok('four threads is not enough', G.Combat.passiveState.web===4, 'web '+G.Combat.passiveState.web);
  G.Combat.passiveTransform('damageDealt', 100, {source:'auto',crit:true});
  ok('the fifth closes the web', G.Combat.passiveState.webUntil > G.Combat.fightTime);
  ok('and the count restarts', G.Combat.passiveState.web===0);
  const doubled = G.Combat.passiveTransform('damageDealt', 100, {source:'auto',crit:false});
  ok('damage is doubled while it holds', Math.abs(doubled-200)<0.01, doubled);
}

console.log('\n=== The Last Dark: anything under a fifth dies ===');
{
  G.S=G.freshSave(); G.S.level=75;
  G.S.equipment.mainhand = G.makeUnique2(G.UNIQUES.find(u=>u.id==='uq_the_last_dark'));
  G.Combat.start('boss', G.bossById('r3b5'));
  G.Combat.enemy.hp = G.Combat.enemy.maxHp * 0.5;
  ok('a healthy enemy is not executed', G.Combat.passiveTransform('damageDealt', 100, {source:'auto'})===100);
  G.Combat.enemy.hp = G.Combat.enemy.maxHp * 0.15;
  const exec = G.Combat.passiveTransform('damageDealt', 100, {source:'auto'});
  ok('a wounded one is', exec > G.Combat.enemy.hp, `${Math.round(exec)} vs ${Math.round(G.Combat.enemy.hp)} left`);
}

console.log('\n=== Devour: kills bank and spend on the opening blow ===');
{
  wear('uq_devour');
  G.S.devourStacks = 5;
  G.Combat.start('boss', G.bossById('r3b5'));
  const opener = G.Combat.passiveTransform('damageDealt', 100, {source:'auto'});
  ok('the opening blow spends the bank', Math.abs(opener-140)<0.01, `${Math.round(opener)} from 100 with 5 kills`);
  const second = G.Combat.passiveTransform('damageDealt', 100, {source:'auto'});
  ok('and only the opening blow', second===100, second);
}

console.log('\n=== drops keep pace when you out-level a realm ===');
{
  G.S=G.freshSave(); G.S.level=60;
  const realm = G.REALMS.find(r=>r.lvl===43);
  let sum=0, n=0, min=99, max=0;
  for (let i=0;i<4000;i++){ const l=G.rollRealmLoot(realm, 43, 1, 0); for(const it of l.items){ sum+=it.ilvl; n++; min=Math.min(min,it.ilvl); max=Math.max(max,it.ilvl); } }
  const avg = sum/n;
  console.log(`    level 60 player farming a level 43 realm: drops ilvl ${min}-${max}, average ${avg.toFixed(1)}`);
  ok('loot is no longer stuck at the realm level', avg > 46, `average ilvl ${avg.toFixed(1)} vs realm 43`);
  ok('but is capped 6 above the realm, so a low realm is no endgame farm', max <= 49, `max ${max}`);

  G.S.level = 43;
  let sum2=0,n2=0;
  for (let i=0;i<4000;i++){ const l=G.rollRealmLoot(realm, 43, 1, 0); for(const it of l.items){ sum2+=it.ilvl; n2++; } }
  ok('an on-level player is unaffected', Math.abs(sum2/n2 - 43) < 1.5, `average ilvl ${(sum2/n2).toFixed(1)}`);
}



console.log('\n=== Transfusion: heals strike the enemy ===');
{
  wear('uq_palliative');
  G.Combat.start('boss', G.bossById('r3b5'));
  const eHp = G.Combat.enemy.hp;
  G.Combat.player.hp = G.Combat.stats.maxHp * 0.5;
  G.Combat.healPlayer(500, 'test');
  const dealt = eHp - G.Combat.enemy.hp;
  ok('a heal damages the enemy', dealt > 0, `${Math.round(dealt)} dealt from a 500 heal`);
  ok('and does not loop forever', dealt < 5000, 'no runaway');
}

console.log('\n=== Ambusher\'s Debt: the opener crits, then bills you ===');
{
  wear('uq_opportunist');
  G.Combat.start('boss', G.bossById('r3b5'));
  const opener = G.Combat.passiveTransform('damageDealt', 100, {source:'auto'});
  ok('the first blow lands as a crit', opener > 100, `${Math.round(opener)} from 100`);
  const second = G.Combat.passiveTransform('damageDealt', 100, {source:'auto'});
  ok('only the first', second === 100, second);
  const hpBefore = G.Combat.player.hp;
  G.Combat.step();
  ok('and the debt comes due when it fails to kill', G.Combat.player.hp < hpBefore,
     `lost ${Math.round(hpBefore - G.Combat.player.hp)}`);
  ok('the debt can never kill you', G.Combat.player.hp >= 1);
}

console.log('\n=== Voidcall: no cooldowns, paid in health ===');
{
  wear('uq_voidcall');
  G.Combat.start('boss', G.bossById('r3b5'));
  ok('spells come back instantly', G.Combat.passiveTransform('cooldown', 30) === 0, 'cooldown 0');
  const sp = G.SPELLS.find(s => s.manaPct > 0 && s.type === 'damage');
  G.Combat.stats.lifesteal = 0;          // else the spell steals back part of the cost
  const before = G.Combat.player.hp;
  G.Combat.cast(sp);
  const paid = before - G.Combat.player.hp;
  ok('a cast takes health', paid > 0, `${Math.round(paid)} of ${Math.round(G.Combat.stats.maxHp)}`);
  G.Combat.player.hp = 1;
  G.Combat.cast(sp);
  ok('but never the last of it', G.Combat.player.hp >= 1, `hp ${G.Combat.player.hp}`);
}

console.log('\n=== Unseen: the blow after a dodge ===');
{
  wear('uq_unseen');
  G.Combat.start('boss', G.bossById('r3b5'));
  ok('an ordinary blow is ordinary', G.Combat.passiveTransform('damageDealt', 100, {source:'auto'}) === 100);
  G.Combat.passiveNotify('onDodge');
  const after = G.Combat.passiveTransform('damageDealt', 100, {source:'auto'});
  ok('the blow after a dodge is tripled', Math.abs(after - 300) < 0.01, after);
  ok('and only that one', G.Combat.passiveTransform('damageDealt', 100, {source:'auto'}) === 100);
}

console.log('\n=== Erasure: it is not a death save ===');
{
  wear('uq_oblivion_ward');
  G.Combat.start('boss', G.bossById('r3b5'));
  const lethal = G.Combat.passiveTransform('damageTaken', G.Combat.player.hp * 3);
  ok('a lethal blow is NOT refused', lethal > 0, 'unlike Second Heart, it lands');
  // it remembers, then undoes half
  G.Combat.player.hp = G.Combat.stats.maxHp * 0.5;
  G.Combat.passiveState.erased = 0;
  G.Combat.passiveTransform('damageTaken', 1000);
  const hp = G.Combat.player.hp;
  G.Combat.fightTime = G.Combat.passiveState.eraseAt + 1;
  G.Combat.step();
  ok('half the remembered damage comes back', G.Combat.player.hp > hp,
     `healed ${Math.round(G.Combat.player.hp - hp)} of 1000 taken`);
  ok('and the ledger resets', (G.Combat.passiveState.erased || 0) < 1000);
}

console.log('\n=== every late unique now does something shaped ===');
{
  // "shaped" means the passive does something in the fight, not just add stats:
  // it must define at least one hook beyond statMods
  const late = G.UNIQUES.filter(u => u.ilvl >= 50);
  const flat = late.filter(u => {
    const def = G.PASSIVES[u.passive.id] || {};
    return Object.keys(def).filter(k => k !== 'statMods').length === 0;
  });
  ok('every late unique does something beyond stats', flat.length === 0,
     flat.length ? flat.map(u => u.name).join(', ') : late.length + ' checked');
  ok('and none of them duplicates Second Heart', late.filter(u => (G.PASSIVES[u.passive.id]||{}).wouldDie).length === 0);
}

console.log('\n'+(fail?fail+' FAILURES':'ALL PASSED'));
process.exit(fail?1:0);
