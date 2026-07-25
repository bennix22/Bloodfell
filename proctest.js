const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {S,SLOTS,Combat,TICK,REALMS,generateItem,computeStats,freshSave,EFFECTS,describeEffect,getS:()=>S,getS:()=>S,setS:v=>{S=v},itemScore,WEAPON_PROFILES};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
const ok=(l,c,x)=>console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?'  '+x:''}`);
G.setS(G.freshSave()); G.S.level=40;

console.log('=== EPIC+ PROCS ===');
let withProc=0, withoutProc=0;
for(let i=0;i<200;i++){
  if(G.generateItem({ilvl:40,rarity:'epic',slot:'chest',primary:'str'}).proc) withProc++;
  if(G.generateItem({ilvl:40,rarity:'rare',slot:'chest',primary:'str'}).proc) withoutProc++;
}
ok('every epic has a proc', withProc===200, withProc+'/200');
ok('rares have none', withoutProc===0, withoutProc+'/200');
const leg=G.generateItem({ilvl:50,rarity:'legendary',slot:'mainhand',primary:'agi'});
ok('legendary proc reads well', !!G.describeEffect(leg.proc), G.describeEffect(leg.proc));
let mismatched=0;
for(let i=0;i<300;i++){
  const it=G.generateItem({ilvl:40,rarity:'epic',slot:'chest',primary:'int'});
  if(!['ignite','frostbite','leech','soulsiphon','execute_proc','vengeance','ambush','momentum'].includes(it.proc.id)) mismatched++;
}
ok('procs suit the archetype', mismatched===0, `${300-mismatched}/300 int items got int-appropriate procs`);

console.log('\n=== TWO-HANDED WEAPONS ===');
let th=null, oh=null;
for(let i=0;i<400 && (!th||!oh);i++){
  const w=G.generateItem({ilvl:40,rarity:'rare',slot:'mainhand',primary:'str'});
  if(w.hands===2 && !th) th=w; if(!w.hands && !oh) oh=w;
}
ok('two-handers generate', !!th, th && `${th.base} ${th.weapon.min}-${th.weapon.max} @ ${th.weapon.speed}s`);
const thDps=(th.weapon.min+th.weapon.max)/2/th.weapon.speed, ohDps=(oh.weapon.min+oh.weapon.max)/2/oh.weapon.speed;
ok('2h out-damages 1h', thDps>ohDps*1.3, `${thDps.toFixed(0)} vs ${ohDps.toFixed(0)} dps`);
ok('2h carries more stats', th.stats.str>oh.stats.str, `str ${th.stats.str} vs ${oh.stats.str}`);

console.log('\n=== PROCS ACTUALLY FIRE IN COMBAT ===');
for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl:40,rarity:'rare',slot:s.type||s.key,primary:'str'});
G.S.equipment.mainhand=G.generateItem({ilvl:40,rarity:'legendary',slot:'mainhand',primary:'str'});
G.S.equipment.mainhand.proc={id:'rend',chance:100,potency:1};
G.S.talents={};
G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};
G.Combat.start('realm',G.REALMS[10]);
let t=0; while(G.Combat.active&&t<60){G.Combat.step();t+=G.TICK;}
const procLines=G.Combat.log.filter(l=>l.c==='proc'||l.t.includes('Rend'));
ok('rend procced and logged', procLines.length>0, procLines.length+' proc lines');

console.log('\n=== CONDITIONAL TALENTS ===');
G.S.talents={w27:3};   // Wrath of the Cornered, +27% below 35% hp
G.Combat.start('realm',G.REALMS[10]);
G.Combat.player.hp=G.Combat.stats.maxHp*0.9;
const high=G.Combat.situationalMultiplier();
G.Combat.player.hp=G.Combat.stats.maxHp*0.2;
const low=G.Combat.situationalMultiplier();
ok('low-health talent activates', low>high, `x${high.toFixed(2)} healthy -> x${low.toFixed(2)} cornered`);
G.S.talents={w30:1};   // Unstoppable, ramping
G.Combat.start('realm',G.REALMS[10]);
G.Combat.rampStacks=0; const r0=G.Combat.situationalMultiplier();
G.Combat.rampStacks=12; const r12=G.Combat.situationalMultiplier();
ok('ramp builds over a fight', r12>r0, `x${r0.toFixed(2)} -> x${r12.toFixed(2)} at 12 stacks`);
ok('ramp is capped', G.Combat.rampStacks=99 && G.Combat.situationalMultiplier()===r12, 'capped at 12 stacks');
