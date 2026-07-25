const { JSDOM } = require('jsdom'); const fs=require('fs'), path=require('path');
const ROOT='/home/claude/opus-realms';
const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'file://'+ROOT+'/index.html',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){w.requestAnimationFrame=()=>0;const st={};Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}}});}});
const W=dom.window;
for(const src of [...W.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))){
  const el=W.document.createElement('script'); el.textContent=fs.readFileSync(path.join(ROOT,src),'utf8'); W.document.head.appendChild(el);
}
W.eval(`window.__x={S:()=>S,setS:v=>{S=v},Combat,REALMS,RAIDS,freshSave,giveStarterKit,realmUnlocked,raidUnlocked,bossUnlocked,bossById,equipItem,itemScore,computeStats,SLOTS,spendTalent,pointsAvailable,unlockedSpells,BS_RECIPES,craftBlacksmith,canCraft,brewPotion,POTIONS,salvageAllOfRarity,MATERIALS};`);
const X=W.__x; const S=()=>X.S();

X.setS(X.freshSave()); X.giveStarterKit();
S().settings.autoPotion=true; S().settings.potionThreshold=45;

const SPEC=['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9','w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20','w15','w15','w12','w12','w12','w21','w22','w24','w2','w2','w2','w3'];
const wear=()=>{for(const it of S().inventory.slice()){
  const t=it.slot==='ring'?['ring1','ring2']:it.slot==='trinket'?['trinket1','trinket2']:[it.slot];
  const worst=t.reduce((a,b)=>X.itemScore(S().equipment[a])<=X.itemScore(S().equipment[b])?a:b);
  if(X.itemScore(it)>X.itemScore(S().equipment[worst])) X.equipItem(it.uid,worst);}};
const talents=()=>{let i=0;while(X.pointsAvailable()>0&&i<SPEC.length){X.spendTalent(SPEC[i]);i++;}};
const craft=()=>{ // craft anything affordable that beats what we wear
  for(const r of X.BS_RECIPES){ if(r.primary!=='str')continue; if(!X.canCraft(r).ok)continue;
    const cur=S().equipment[r.slot==='ring'?'ring1':r.slot==='trinket'?'trinket1':r.slot];
    if(cur && cur.ilvl>=r.ilvl) continue;
    X.craftBlacksmith(r.id); } wear(); };
const brew=()=>{for(const p of X.POTIONS){ if(p.kind!=='heal')continue; if(S().level<p.req)continue;
  if((S().potions[p.id]||0)<10) X.brewPotion(p.id,5); }};
const fight=(mode,target)=>{X.Combat.start(mode,target);let g=0;while(X.Combat.active&&g<6000){X.Combat.advance(0.1);g++;}
  return X.Combat.lastResult&&X.Combat.lastResult.won;};

const log=[]; let total=0; const hist=[];
const bestRealm=()=>{const recent=hist.slice(-12);const losing=recent.length===12&&recent.filter(Boolean).length<5;
  let pool=X.REALMS.filter(r=>X.realmUnlocked(r));if(losing&&pool.length>1)pool=pool.slice(0,pool.length-1);return pool[pool.length-1];};

let guard=0;
while(guard++ < 400){
  // try every boss we can reach; a kill opens new ground
  let killedSomething=false;
  for(const raid of X.RAIDS){ if(!X.raidUnlocked(raid))continue;
    for(let i=0;i<raid.bosses.length;i++){ const b=raid.bosses[i];
      if(!X.bossUnlocked(raid,i))continue; if(S().bossKills[b.id])continue;
      // three attempts, then go gear up
      for(let a=0;a<3;a++){ total++; if(fight('boss',b)){ killedSomething=true;
        log.push(`  killed ${b.name.padEnd(26)} at level ${String(S().level).padStart(2)}, ${total} fights in`); break; } }
      wear();
    } }
  if(S().level>=50 && S().bossKills['r3b5']) break;
  // grind a while
  for(let i=0;i<120;i++){ const r=bestRealm(); if(!r)break; total++;
    const won=fight('realm',r); hist.push(!!won); if(hist.length>12)hist.shift(); }
  wear(); talents(); craft(); brew();
  X.salvageAllOfRarity(['common']);
}

console.log('INTENDED PATH — grind, raid, craft, repeat\n');
log.forEach(l=>console.log(l));
const st=X.computeStats();
console.log(`\ntotal fights: ${total}`);
console.log(`final level ${S().level}  dps ${Math.round(st.dps)}  hp ${Math.round(st.maxHp)}  spells ${X.unlockedSpells().length}`);
console.log(`gear ilvl: ${X.SLOTS.map(s=>S().equipment[s.key]?S().equipment[s.key].ilvl:'-').join(' ')}`);
console.log(`realms open: ${X.REALMS.filter(X.realmUnlocked).length}/20   bosses down: ${Object.keys(S().bossKills).length}/15`);
console.log(`gold ${S().gold}  items held ${S().inventory.length}`);

// did unique boss drops actually land?
const uniques = S().inventory.filter(i=>i.unique).concat(X.SLOTS.map(s=>S().equipment[s.key]).filter(i=>i&&i.unique));
console.log(`\nunique boss items acquired: ${uniques.length}`);
const byRarity={};for(const u of uniques)byRarity[u.rarity]=(byRarity[u.rarity]||0)+1;
console.log(' ', JSON.stringify(byRarity));
console.log('  examples:', uniques.slice(0,4).map(u=>u.name).join(' | ') || 'none');
