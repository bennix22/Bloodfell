const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','data/gems.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},RAIDS,UNIQUES,RARITIES,generateItem,makeUnique,makeUnique2,itemScore,itemBudget,weaponDps,SLOTS,freshSave};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
G.S=G.freshSave(); G.S.level=50;

/* What the procedural generator produces at a given ilvl and rarity, averaged
   so a single lucky roll does not skew the comparison. */
function reference(ilvl, rarity, slot, primary){
  let score=0, dps=0, n=40;
  for(let i=0;i<n;i++){
    const it=G.generateItem({ilvl,rarity,slot,primary});
    score+=G.itemScore(it);
    if(it.weapon) dps+=(it.weapon.min+it.weapon.max)/2/it.weapon.speed;
  }
  return {score:score/n, dps:dps/n};
}

/* Run as a test: fails if any hand-written item has drifted away from the curves
   the generator uses. This is the bug that made a raid legendary eight times
   worse than an ordinary epic — the formulas were rewritten twice and the
   hardcoded numbers never followed. Nothing errored; the items were just quietly
   terrible. Band is deliberately wide: these are meant to be a little better
   than a random roll, not identical to one. */
const LOW = 0.75, HIGH = 1.75;
const failures = [];

console.log('HANDCRAFTED BOSS DROPS vs WHAT THE GENERATOR MAKES AT THE SAME LEVEL\n');
console.log('  item                                 ilvl rarity      hand   should be   ratio');
const bad=[];
for(const raid of G.RAIDS){
  for(const boss of raid.bosses){
    for(const def of boss.drops){
      const it=G.makeUnique(def);
      const prim = def.stats.int?'int':(def.stats.agi?'agi':'str');
      const ref=reference(def.ilvl, def.rarity, def.slot, prim);
      const have=G.itemScore(it);
      const ratio=have/ref.score;
      if(ratio<LOW || ratio>HIGH) { bad.push({name:def.name, ratio, id:def.id}); failures.push(`${def.name} at ${ratio.toFixed(2)}x`); }
      const flag = ratio<0.6?'  <<< badly under':(ratio<0.85?'  << under':(ratio>1.3?'  >> over':''));
      console.log(`  ${def.name.slice(0,34).padEnd(35)} ${String(def.ilvl).padStart(3)} ${def.rarity.padEnd(10)} ${String(Math.round(have)).padStart(5)} ${String(Math.round(ref.score)).padStart(11)}   ${ratio.toFixed(2)}${flag}`);
    }
  }
}
console.log(`\n${bad.length} of ${G.RAIDS.reduce((a,r)=>a+r.bosses.reduce((b,x)=>b+x.drops.length,0),0)} handcrafted drops are below 75% of an equivalent random drop`);

console.log('\n\nWEAPON DAMAGE SPECIFICALLY');
console.log('  weapon                               ilvl   hand dps   should be   ratio');
for(const raid of G.RAIDS){
  for(const boss of raid.bosses){
    for(const def of boss.drops){
      if(!def.weapon) continue;
      const dps=(def.weapon.min+def.weapon.max)/2/def.weapon.speed;
      const prim = def.stats.int?'int':(def.stats.agi?'agi':'str');
      const ref=reference(def.ilvl, def.rarity, 'mainhand', prim);
      console.log(`  ${def.name.slice(0,34).padEnd(35)} ${String(def.ilvl).padStart(3)} ${dps.toFixed(0).padStart(9)} ${ref.dps.toFixed(0).padStart(11)}   ${(dps/ref.dps).toFixed(2)}`);
    }
  }
}

console.log('\n\nTHE 20 UNIQUES (written later, after the curves changed)');
console.log('  item                                 ilvl      hand   should be   ratio');
for(const u of G.UNIQUES){
  const it=G.makeUnique2(u);
  const prim = u.stats.int?'int':(u.stats.agi?'agi':'str');
  const ref=reference(u.ilvl,'legendary',u.slot==='ring'?'ring':u.slot,prim);
  const have=G.itemScore(it);
  const ur = have/ref.score;
  // two-handers legitimately sit high against a one-handed reference
  const cap = (u.hands === 2) ? 2.2 : HIGH;
  if (ur < LOW || ur > cap) failures.push(`${u.name} at ${ur.toFixed(2)}x`);
  console.log(`  ${u.name.slice(0,34).padEnd(35)} ${String(u.ilvl).padStart(3)} ${String(Math.round(have)).padStart(9)} ${String(Math.round(ref.score)).padStart(11)}   ${ur.toFixed(2)}`);
}

console.log('\n\nDO HANDCRAFTED DROPS EVEN GET A PROC?');
let withProc=0, total=0;
for(const raid of G.RAIDS) for(const boss of raid.bosses) for(const def of boss.drops){
  total++; if(G.makeUnique(def).proc) withProc++;
}
console.log(`  ${withProc} of ${total} handcrafted boss drops carry a special effect`);
let missingProc = 0;
for(const raid of G.RAIDS) for(const boss of raid.bosses) for(const def of boss.drops){
  if(def.rarity !== 'rare' && !G.makeUnique(def).proc){ missingProc++; failures.push(`${def.name} has no proc`); }
}
console.log(`  ${missingProc} epic-or-better drops are missing one (a random Epic always has one)`);

console.log('\n' + '='.repeat(60));
if(failures.length){
  console.log(`FAILURES (${failures.length}):`);
  failures.slice(0,12).forEach(f=>console.log('  - '+f));
  process.exit(1);
} else {
  console.log('EVERY HANDCRAFTED ITEM IS ON CURVE');
}
