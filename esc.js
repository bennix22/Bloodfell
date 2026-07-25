const fs=require('fs'); const P='/home/claude/opus-realms/js/';
const F=['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js','data/crafting.js','data/effects.js','core/sound.js','core/state.js','core/character.js','core/loot.js','core/combat.js','core/actions.js'];
function load(){
  const src='var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'+F.map(f=>fs.readFileSync(P+f,'utf8')).join('\n');
  return new Function(src+`return {S,SLOTS,RAIDS,Combat,TICK,generateItem,makeBossEnemy,randInt,totalTalentPoints,POTIONS,bossById,ESCALATION_HP_PER_KILL,ESCALATION_DMG_PER_KILL};`)();
}
const G=load();
function gear(ilvl){for(const s of G.SLOTS){const r=Math.random()<0.3?'rare':(Math.random()<0.2?'common':'uncommon');
  G.S.equipment[s.key]=G.generateItem({ilvl:Math.max(1,ilvl+G.randInt(-2,2)),rarity:r,slot:s.type||s.key,primary:'str'});}}
function spec(level){const cap=G.totalTalentPoints(level);
  const o=['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9','w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20','w15','w15','w12','w12','w12','w21','w22','w24','w2','w2','w2','w3'];
  const out={};for(let i=0;i<Math.min(cap,o.length);i++)out[o[i]]=(out[o[i]]||0)+1;return out;}
G.Combat.pushLog=()=>{}; G.Combat.win=function(){this.active=false;}; G.Combat.lose=function(){this.active=false;};
function run(boss,n,ilvl){let w=0;for(let i=0;i<n;i++){gear(ilvl);
  G.Combat.mode='boss';G.Combat.boss=boss;G.Combat.enemy=G.makeBossEnemy(boss);
  G.Combat.player={hp:0,mana:0,swingTimer:0.4,cds:{},buffs:[],hots:[],shield:null,potionCd:0,gcd:0};
  G.Combat.refreshStats();G.Combat.player.hp=G.Combat.stats.maxHp;G.Combat.player.mana=G.Combat.stats.maxMana;
  G.Combat.active=true;let t=0;while(G.Combat.active&&t<400){G.Combat.step();t+=G.TICK;}
  if(G.Combat.enemy.hp<=0)w++;}return w/n;}

const boss=G.bossById('r2b5');   // Warlord Kressen
G.S.level=38; G.S.talents=spec(38);
const heal=G.POTIONS.filter(p=>p.kind==='heal'&&p.req<=38).sort((a,b)=>b.pct-a.pct)[0];
G.S.potions={[heal.id]:40}; G.S.settings.autoPotion=true; G.S.settings.potionThreshold=45;

console.log('ESCALATION CURVE — Warlord Kressen, farmed by a player geared to beat him\n');
console.log('  gear      kills:    0     5    10    20    30    40    60    80   100');
for (const ilvl of [38, 42, 46]) {
  const row=[];
  for (const k of [0,5,10,20,30,40,60,80,100]) {
    G.S.bossKills[boss.id]=k;
    row.push(String(Math.round(run(boss,50,ilvl)*100)).padStart(5));
  }
  console.log(`  ilvl ${ilvl}          ` + row.join(' ') + '   (% win)');
}
G.S.bossKills={};
console.log('\n  escalation is now ' + (G.ESCALATION_HP_PER_KILL*100).toFixed(1) + '% health + ' + (G.ESCALATION_DMG_PER_KILL*100).toFixed(1) + '% damage per kill');
console.log('  note: 40 kills is roughly what the drop tables assume for a full unique set');
