const { JSDOM } = require('jsdom'); const fs=require('fs'), path=require('path');
const ROOT='/home/claude/opus-realms';
const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'file://'+ROOT+'/index.html',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){w.requestAnimationFrame=()=>0;const st={};Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}}});}});
const W=dom.window;
for(const src of [...W.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))){
  const el=W.document.createElement('script'); el.textContent=fs.readFileSync(path.join(ROOT,src),'utf8'); W.document.head.appendChild(el);
}
W.document.dispatchEvent(new W.Event('DOMContentLoaded',{bubbles:true}));
const ok=(l,c,x)=>console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?'  '+x:''}`);

W.eval(`
window.__barWidth = function(html){ const m=html.match(/class="bar hp"><i style="width:([\\d.]+)%/); return m?parseFloat(m[1]):null; };
S.level=40;
for(const s of SLOTS) S.equipment[s.key]=generateItem({ilvl:40,rarity:'rare',slot:s.type||s.key,primary:'str'});
const realm = REALMS.filter(r=>r.lvl<=40).pop();
UI.grind = { mode:'realm', id: realm.id };
Combat.start('realm', realm);
Combat.player.hp = Combat.stats.maxHp * 0.5;
document.getElementById('main').innerHTML =
  '<div id="f-player"></div><div id="f-enemy"></div><div id="chronicle"></div><div id="spellbar"></div>';
`);

console.log('HEALTH BAR ACROSS THE KILL BOUNDARY\n');
const during = W.eval(`UI.tickCombat(true); __barWidth(document.getElementById('f-player').innerHTML)`);
ok('during fight the bar shows the real HP', during !== null && Math.abs(during-50)<3, `${during}% (expected ~50%)`);

const stored = W.eval(`Combat.enemy.hp=0; Combat.win(); Math.round(S.vitals.hp / computeStats().maxHp * 100)`);
ok('carried HP is stored correctly', Math.abs(stored-50)<3, `${stored}% saved`);

const between = W.eval(`UI.tickCombat(true); __barWidth(document.getElementById('f-player').innerHTML)`);
ok('between fights the bar shows carried HP (not 100%)', between !== null && between < 60,
   `bar shows ${between}%  ${between>=95?'<-- BUG: flashed to full':''}`);

console.log('\nEDGE CASES\n');
// mana should carry too, not flash to full
const manaBetween = W.eval(`
Combat.player.mana = Combat.stats.maxMana * 0.4;  // (already between fights; set a low carried mana)
S.vitals.mana = Math.round(Combat.stats.maxMana * 0.4);
UI.tickCombat(true);
const m = document.getElementById('f-player').innerHTML.match(/class="bar mana"[^>]*><i style="width:([\\d.]+)%/);
m?parseFloat(m[1]):null`);
ok('mana bar also shows carried value', manaBetween !== null && manaBetween < 55, `${manaBetween}% (expected ~40%)`);

// a fresh character not in any run should still show FULL (currentVitals returns max when vitals are null)
const idleFull = W.eval(`
S.vitals.hp = null; S.vitals.mana = null;   // no run in progress
Combat.active = false;
UI.tickCombat(true);
__barWidth(document.getElementById('f-player').innerHTML)`);
ok('idle character (no run) shows full HP', Math.abs(idleFull-100)<1, `${idleFull}% (expected 100%)`);

// during an active fight the live value still wins
const liveValue = W.eval(`
const realm = REALMS.filter(r=>r.lvl<=40).pop();
Combat.start('realm', realm);
Combat.player.hp = Combat.stats.maxHp * 0.7;
UI.tickCombat(true);
__barWidth(document.getElementById('f-player').innerHTML)`);
ok('active fight still shows the live HP', Math.abs(liveValue-70)<3, `${liveValue}% (expected ~70%)`);
