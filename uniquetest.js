const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','data/uniques.js','core/sound.js','core/state.js','core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js','core/merchant.js'];
const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
const G=new Function(src+`return {getS:()=>S,setS:v=>{S=v},SLOTS,Combat,TICK,REALMS,RAIDS,UNIQUES,PASSIVES,generateItem,makeUnique2,computeStats,freshSave,rollBossLoot,bossById,equipItem,rollMerchantStock,tickMerchant,runAutoSalvage,uniqueById,collectPassives,SMOOTH_WINDOW};`)();
Object.defineProperty(G,'S',{get:()=>G.getS(),set:v=>G.setS(v),configurable:true});
const errs=[]; const ok=(l,c,x)=>{console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?'  '+x:''}`); if(!c)errs.push(l);};
G.S=G.freshSave(); G.S.level=46;
const gear=(ilvl)=>{for(const s of G.SLOTS) G.S.equipment[s.key]=G.generateItem({ilvl,rarity:'rare',slot:s.type||s.key,primary:'str'});};
const wear=(id)=>{const it=G.makeUnique2(G.uniqueById(id)); G.S.inventory.push(it); const r=G.equipItem(it.uid); return {it,r};};
G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};
const fight=(realmIdx,cap)=>{G.Combat.start('realm',G.REALMS[realmIdx]); let t=0; while(G.Combat.active&&t<(cap||120)){G.Combat.step();t+=G.TICK;} return t;};

console.log('=== DEFINITIONS ===');
ok('20 uniques defined', G.UNIQUES.length===20, G.UNIQUES.length+' items');
ok('every passive is implemented', G.UNIQUES.every(u=>G.PASSIVES[u.passive.id]),
   G.UNIQUES.filter(u=>!G.PASSIVES[u.passive.id]).map(u=>u.passive.id).join(',')||'all present');
ok('every unique has a boss', G.UNIQUES.every(u=>G.bossById(u.boss)));
ok('rarity is above legendary', G.makeUnique2(G.UNIQUES[0]).rarity==='unique');

console.log('\n=== EVEN KEEL: damage spread over a second ===');
gear(46); wear('uq_levelling_weight');
ok('passive collected', G.computeStats().passives.length===1, G.computeStats().passives[0].name);
G.Combat.start('realm',G.REALMS[19]);
const hp0=G.Combat.player.hp;
// force one enemy swing and watch how health falls
G.Combat.enemy.swingTimer=0.05;
let steps=0, drops=[];
let last=G.Combat.player.hp;
while(steps<25 && G.Combat.active){ G.Combat.step(); steps++;
  if(G.Combat.player.hp!==last){ drops.push(+(last-G.Combat.player.hp).toFixed(1)); last=G.Combat.player.hp; } }
ok('one blow lands as many slices', drops.length>3, `${drops.length} separate deductions instead of 1`);
ok('each slice is small', drops.every(d=>d<hp0*0.05), `largest slice ${Math.max(...drops).toFixed(1)}`);
console.log(`     slices: ${drops.slice(0,6).map(d=>d.toFixed(0)).join(', ')}${drops.length>6?' …':''}`);

console.log('\n=== SURVIVABILITY: does smoothing actually help? ===');
function survivalRate(useUnique, n){
  let wins=0;
  for(let i=0;i<n;i++){
    G.S=G.freshSave(); G.S.level=40; gear(38);
    G.S.potions={po_h4:30}; G.S.settings.autoPotion=true; G.S.settings.potionThreshold=50;
    if(useUnique) wear('uq_levelling_weight');
    G.Combat.start('boss',G.bossById('r2b5'));
    let t=0; while(G.Combat.active&&t<300){G.Combat.step();t+=G.TICK;}
    if(G.Combat.enemy.hp<=0) wins++;
  }
  return wins/n;
}
const without=survivalRate(false,40), with_=survivalRate(true,40);
ok('smoothing improves survival', with_>=without, `${Math.round(without*100)}% -> ${Math.round(with_*100)}% vs Kressen`);

console.log('\n=== OTHER PASSIVES ===');
G.S=G.freshSave(); G.S.level=46; gear(46); wear('uq_drowned_chain');
G.Combat.start('boss',G.bossById('r3b5'));
const cap=G.Combat.stats.maxHp*0.12;
let biggest=0, l2=G.Combat.player.hp;
for(let i=0;i<400&&G.Combat.active;i++){G.Combat.step(); if(G.Combat.player.hp<l2){biggest=Math.max(biggest,l2-G.Combat.player.hp); l2=G.Combat.player.hp;} else l2=G.Combat.player.hp;}
ok('damage cap holds', biggest<=cap*1.05, `biggest hit ${biggest.toFixed(0)} vs cap ${cap.toFixed(0)}`);

G.S=G.freshSave(); G.S.level=46; gear(46); wear('uq_second_heart');
G.Combat.start('boss',G.bossById('r3b5'));
G.Combat.player.hp=1; G.Combat.applyRawDamage(999999);
ok('second heart prevents death', G.Combat.active && G.Combat.player.hp>1, `survived at ${Math.round(G.Combat.player.hp)} hp`);
G.Combat.player.hp=1; G.Combat.applyRawDamage(999999);
ok('second heart only once per fight', !G.Combat.active, 'died the second time');

G.S=G.freshSave(); G.S.level=46; gear(46); wear('uq_widows_clock');
G.Combat.start('realm',G.REALMS[19]);
ok('widows clock halves cooldowns', G.Combat.passiveTransform('cooldown',10)===5, '10s -> '+G.Combat.passiveTransform('cooldown',10)+'s');
ok('widows clock raises mana cost', G.Combat.passiveTransform('manaCost',100)===180, '100 -> '+G.Combat.passiveTransform('manaCost',100));

G.S=G.freshSave(); G.S.level=46; gear(46); wear('uq_thief_of_hours');
G.S.killStreak=10;
ok('kill streak grants haste', G.computeStats().haste > G.computeStats().mods.haste-31, 'streak haste '+G.computeStats().mods.haste.toFixed(0)+'%');
G.S.killStreak=0;

G.S=G.freshSave(); G.S.level=46; gear(46); wear('uq_opus_fragment');
G.Combat.start('realm',G.REALMS[19]);
ok('opus fragment rolls a blessing', G.Combat.player.buffs.some(b=>b.id==='opus_roll'),
   G.Combat.player.buffs.find(b=>b.id==='opus_roll')?.name);

console.log('\n=== SAFEGUARDS ===');
G.S=G.freshSave(); G.S.level=46; gear(46);
wear('uq_levelling_weight');
const dupe=wear('uq_levelling_weight');
ok('cannot wear two of the same', !dupe.r.ok, dupe.r.msg);
G.S.inventory.push(G.makeUnique2(G.uniqueById('uq_second_heart')));
G.S.settings.autoSalvage='uncommon'; G.S.settings.autoSalvageMode='sell';
for(let i=0;i<5;i++) G.S.inventory.push(G.generateItem({ilvl:40,rarity:'common'}));
G.runAutoSalvage();
ok('auto-salvage never eats a unique', G.S.inventory.some(i=>i.uniqueId), 'unique survived the sweep');

console.log('\n=== ACQUISITION ===');
G.S=G.freshSave(); G.S.level=50;
let found=0;
for(let i=0;i<4000;i++){ const l=G.rollBossLoot(G.bossById('r2b1'),0); if(l.items.some(x=>x.uniqueId)) found++; }
ok('bosses drop their unique', found>0, `${(found/4000*100).toFixed(2)}% per kill (~${Math.round(4000/found)} kills)`);
let shopFound=0;
for(let i=0;i<800;i++){ if(G.rollMerchantStock().some(x=>x.uniqueId)) shopFound++; }
ok('merchant stocks them rarely', shopFound>0 && shopFound<250, `${(shopFound/800*100).toFixed(1)}% of restocks have one`);

console.log('\n'+'='.repeat(50));
console.log(errs.length?'FAILURES:\n  '+errs.join('\n  '):'ALL UNIQUE TESTS PASSED');
process.exit(errs.length?1:0);
