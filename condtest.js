const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','data/gems.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,generateItem,freshSave,spendTalent,unlockedSpells,beginRun,bossById};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});

/* Hook cast() rather than reading the log: the log is capped and shifts, so
   scanning it by index double-counts. */
const realCast = G.Combat.cast.bind(G.Combat);
let fired = [];
G.Combat.cast = function (sp) {
  fired.push({
    id: sp.id,
    enemyFrac: this.enemy.hp / this.enemy.maxHp,
    selfFrac: this.player.hp / this.stats.maxHp,
    time: this.fightTime,
  });
  return realCast(sp);
};

function setup(cond, spellId){
  G.S=G.freshSave(); G.S.level=30;
  for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl:26,rarity:'rare',slot:s.type||s.key,primary:'str'});
  G.S.talents={}; ['w1','w1','w1','w2','w2','w3','w3','w4','w4','w5'].forEach(t=>G.spendTalent(t));
  if(cond) G.S.spellConditions[spellId]=cond;
  G.beginRun(null);
}
function batch(cond, spellId, n){
  fired=[];
  for(let i=0;i<n;i++){
    setup(cond, spellId);
    G.Combat.start('realm', G.REALMS.filter(r=>r.lvl<=30).pop());
    let t=0; while(G.Combat.active&&t<200){G.Combat.step();t+=G.TICK;}
  }
  return fired.filter(f=>f.id===spellId);
}
G.S=G.freshSave(); G.S.level=30; G.S.talents={};
['w1','w1','w1','w2','w2','w3','w3','w4','w4','w5'].forEach(t=>G.spendTalent(t));
const spell=G.unlockedSpells()[0];
const ok=(l,c,x)=>console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?'  '+x:''}`);

console.log(`CONDITIONS IN A LIVE FIGHT  (watching ${spell.name})\n`);

let f=batch(null, spell.id, 60);
const above=f.filter(x=>x.enemyFrac>0.5).length;
console.log(`  unconditioned:            ${f.length} casts, ${above} above 50% enemy health`);
ok('fires freely with no condition', above>0);

f=batch({type:'enemyBelow',value:50}, spell.id, 60);
const bad=f.filter(x=>x.enemyFrac>0.5).length;
console.log(`  "enemy below 50%":        ${f.length} casts, ${bad} above 50% enemy health`);
ok('never fires above the threshold', bad===0 && f.length>0, `${f.length} casts, all below 50%`);

f=batch({type:'selfBelow',value:60}, spell.id, 60);
const bad2=f.filter(x=>x.selfFrac>0.6).length;
console.log(`  "I am below 60%":         ${f.length} casts, ${bad2} while above 60% own health`);
ok('respects own-health gate', bad2===0);

f=batch({type:'opener',value:3}, spell.id, 60);
const late=f.filter(x=>x.time>3.05).length;
console.log(`  "only first 3 seconds":   ${f.length} casts, ${late} after 3s`);
ok('opener window respected', late===0 && f.length>0);

f=batch({type:'bossOnly'}, spell.id, 40);
console.log(`  "bosses only", in a realm: ${f.length} casts`);
ok('never fires on trash', f.length===0);
