const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','data/sets.js','data/gems.js','core/sound.js','core/state.js','core/counter.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/descent.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+'return {getS:()=>S,setS:v=>{S=v},freshSave,SLOTS,SLOT_TYPES,generateItem,computeStats,applyAspect,removeAspect,collectEffects,salvageItem}')();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
let pass=0,fail=0; const ok=(n,c,d)=>{(c?pass++:fail++);console.log('  '+(c?'PASS':'FAIL')+'  '+n+(d?'  '+d:''));};
G.S=G.freshSave(); G.S.level=75;

console.log('\n=== drops now follow worn slots ===');
{
  const N=60000, t={};
  for (const s of G.SLOT_TYPES) t[s]=0;
  for (let i=0;i<N;i++) t[G.generateItem({ilvl:60}).slot]++;
  const worn={}; for (const s of G.SLOTS){ const k=s.type||s.key; worn[k]=(worn[k]||0)+1; }
  const per = k => (t[k]/N*100)/worn[k];
  console.log('    ring '+(t.ring/N*100).toFixed(2)+'% over 2 slots = '+per('ring').toFixed(2)+'% each');
  console.log('    helm '+(t.helm/N*100).toFixed(2)+'% over 1 slot  = '+per('helm').toFixed(2)+'% each');
  ok('a ring slot is now as well supplied as a helm', Math.abs(per('ring')-per('helm')) < 0.6,
     `${per('ring').toFixed(2)}% vs ${per('helm').toFixed(2)}%`);
  ok('same for trinkets', Math.abs(per('trinket')-per('helm')) < 0.6, `${per('trinket').toFixed(2)}%`);
  ok('rings drop about twice as often overall now', t.ring/N*100 > 11, (t.ring/N*100).toFixed(2)+'%');
  ok('single slots are unchanged in per-slot terms', Math.abs(per('cape')-per('helm')) < 0.6, `cape ${per('cape').toFixed(2)}%`);
}

console.log('\n=== trinkets carry a bound second property ===');
{
  let withBound=0, both=0, sameId=0, N=400;
  for (let i=0;i<N;i++){
    const t=G.generateItem({ilvl:60,rarity:'epic',slot:'trinket'});
    if (t.boundProc) withBound++;
    if (t.boundProc && t.proc) { both++; if (t.boundProc.id===t.proc.id) sameId++; }
  }
  ok('every high-level trinket has one', withBound===N, `${withBound}/${N}`);
  ok('and it is a second property, not a replacement', both===N, `${both}/${N} have both`);
  ok('the two are never the same effect', sameId===0, `${sameId} duplicates`);

  const other=G.generateItem({ilvl:60,rarity:'epic',slot:'cape'});
  ok('other slots do not get one', !other.boundProc);
  const lowlevel=G.generateItem({ilvl:10,rarity:'epic',slot:'trinket'});
  ok('and it starts at the same level as ordinary properties', !lowlevel.boundProc, 'ilvl 10 has none');
}

console.log('\n=== it cannot be etched over, removed, or extracted ===');
{
  const t=G.generateItem({ilvl:60,rarity:'epic',slot:'trinket'});
  G.S.inventory=[t];
  const boundBefore=JSON.stringify(t.boundProc);
  G.S.aspects.trinket=[{id:'ignite',name:'Ignite',chance:20,potency:1.2}];
  const r=G.applyAspect(t.uid,0);
  ok('etching succeeds on the normal property', r.ok, r.msg);
  ok('the rolled property was replaced', t.proc.id==='ignite');
  ok('the bound property is untouched', JSON.stringify(t.boundProc)===boundBefore);
  G.removeAspect(t.uid);
  ok('and survives removing the aspect too', JSON.stringify(t.boundProc)===boundBefore);
}

console.log('\n=== and it actually works in combat ===');
{
  const t=G.generateItem({ilvl:60,rarity:'epic',slot:'trinket'});
  t.proc=null;                                   // isolate the bound one
  G.S=G.freshSave(); G.S.level=75;
  G.S.equipment.trinket1=t;
  const fx=G.collectEffects();
  ok('the bound property reaches the effect list', fx.some(e=>e.id===t.boundProc.id),
     t.boundProc.id+' at '+t.boundProc.chance+'%');
}

console.log('\n'+(fail?fail+' FAILURES':'ALL PASSED'));
process.exit(fail?1:0);
