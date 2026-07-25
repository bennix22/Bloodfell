const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,generateItem,computeStats,freshSave,collectEffects,describeEffect,effectName,spendTalent,TALENT_TREES};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
G.S=G.freshSave(); G.S.level=50;
// a realistic late-game character: lots of epics, several talent procs
for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl:48,rarity:'epic',slot:s.type||s.key,primary:'str'});
G.S.talents={w26:3,w28:3,w29:1,r28:3};
const eff=G.computeStats().effects;
console.log(`collectEffects returned ${eff.length} entries from 15 epic items + 4 proc talents\n`);
for(const e of eff) console.log(`  ${G.effectName(e).padEnd(14)} chance ${String(e.chance).padStart(5)}%  potency ${e.potency}  sources ${e.sources}`);
const ids=eff.map(e=>e.id);
const dupes=ids.filter((v,i)=>ids.indexOf(v)!==i);
console.log(`\nduplicate ids in the list: ${dupes.length?dupes.join(', '):'none'}`);
console.log(`merging is ${dupes.length?'BROKEN':'working'}`);
