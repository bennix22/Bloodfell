const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','data/gems.js','core/sound.js','core/state.js','core/counter.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+'return {getS:()=>S,setS:v=>{S=v},freshSave,migrate,UNIQUES,makeUnique2,uniqueById}')();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
let pass=0,fail=0; const ok=(n,c,d)=>{(c?pass++:fail++);console.log('  '+(c?'PASS':'FAIL')+'  '+n+(d?'  '+d:''));};

G.S=G.freshSave();
const pact = G.makeUnique2(G.UNIQUES.find(u=>u.id==='uq_pact_iron'));

// forge a save exactly like his: the item carries the OLD wording
const stale = JSON.parse(JSON.stringify(pact));
stale.passive = { id:'pact_iron', name:'Blood for Work',
  text:'Spells are paid for in Health instead of mana, at half the cost. Your mana pool becomes irrelevant and your lifesteal becomes essential.' };
stale.stats.str = 999;                       // a distinctive roll, to prove it survives
stale.sockets = ['ruby:cut'];
stale.tempered = 3; stale.ilvl = 51;

const save = G.freshSave();
save.inventory = [stale];
save.equipment.mainhand = JSON.parse(JSON.stringify(stale));
save.bank = [JSON.parse(JSON.stringify(stale))];

const out = G.migrate(save);
const inv = out.inventory[0], worn = out.equipment.mainhand, banked = out.bank[0];

console.log('\n=== the stale wording is replaced everywhere it sits ===');
for (const [where, it] of [['in the bag', inv], ['worn', worn], ['in the bank', banked]]) {
  ok(where + ': name updated', it.passive.name === 'The Iron Tithe', it.passive.name);
  ok(where + ': text updated', /maximum Mana/.test(it.passive.text) && !/Health instead/.test(it.passive.text));
}

console.log('\n=== but the item itself is untouched ===');
ok('rolled stats kept', inv.stats.str === 999, 'str ' + inv.stats.str);
ok('tempering kept', inv.tempered === 3 && inv.ilvl === 51, `ilvl ${inv.ilvl}, tempered ${inv.tempered}`);
ok('socketed gem kept', JSON.stringify(inv.sockets) === '["ruby:cut"]', JSON.stringify(inv.sockets));
ok('it is still the same unique', inv.uniqueId === 'uq_pact_iron');
ok('behaviour was never stale anyway', inv.passive.id === 'pact_iron', 'passive id drives behaviour');

console.log('\n=== every other unique still describes itself correctly ===');
let mismatched = 0;
for (const def of G.UNIQUES) {
  const s2 = G.freshSave(); s2.inventory = [G.makeUnique2(def)];
  const m = G.migrate(s2).inventory[0];
  if (m.passive.text !== def.passive.text || m.passive.name !== def.passive.name) mismatched++;
}
ok('all ' + G.UNIQUES.length + ' uniques match their definition', mismatched === 0, mismatched + ' mismatched');

console.log('\n'+(fail?fail+' FAILURES':'ALL PASSED'));
process.exit(fail?1:0);
