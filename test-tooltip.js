const { JSDOM } = require('jsdom'); const fs=require('fs'), path=require('path');
const ROOT='/home/claude/opus-realms';
const errs=[];
const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'file://'+ROOT+'/index.html',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){w.requestAnimationFrame=()=>0;const st={};Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}}});w.addEventListener('error',e=>errs.push(e.message));}});
const W=dom.window;
for(const src of [...W.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))){
  const el=W.document.createElement('script'); el.textContent=fs.readFileSync(path.join(ROOT,src),'utf8'); W.document.head.appendChild(el);
}
const ok=(l,c,x)=>{console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?'  '+x:''}`); if(!c)errs.push(l);};
W.document.dispatchEvent(new W.Event('DOMContentLoaded',{bubbles:true}));

console.log('=== XP PACING ===');
const xp=l=>W.eval(`xpToNext(${l})`);
ok('curve is slower', xp(10) > 10000, `L10 needs ${xp(10)} xp`);
ok('XP_PACE exposed', W.eval('typeof XP_PACE')==='number', 'XP_PACE = '+W.eval('XP_PACE'));
let tot=0; for(let i=1;i<50;i++) tot+=xp(i);
ok('total is ~4x the old curve', tot > 800000, `${tot.toLocaleString()} xp to 50`);
ok('delay scales with speed', W.eval('S.settings.speed=8; nextFightDelay()') < W.eval('S.settings.speed=1; nextFightDelay()'), 'faster gap at 8x');

console.log('\n=== TOOLTIP WIRING ===');
ok('Tooltip initialised', !!W.eval('Tooltip.el'));
ok('tip element in DOM', !!W.document.querySelector('.tip'));
W.eval("S.level=30; S.inventory=[]; for(let i=0;i<3;i++) S.inventory.push(generateItem({ilvl:30,rarity:'epic',slot:'chest',primary:'str'}));");
W.eval("UI.go('inventory')");
const rows=W.document.querySelectorAll('.itemrow[data-tip]');
ok('inventory rows carry data-tip', rows.length===3, rows.length+' rows');
ok('stat grid rendered', W.document.querySelectorAll('.statgrid .s').length > 6,
   W.document.querySelectorAll('.statgrid .s').length+' stat lines');
W.eval("UI.go('character')");
ok('paperdoll carries data-tip', W.document.querySelectorAll('.dollslot[data-tip]').length > 0,
   W.document.querySelectorAll('.dollslot[data-tip]').length+' equipped slots');

console.log('\n=== TOOLTIP CONTENT ===');
W.eval("UI.go('inventory')");
const uid=W.eval('S.inventory[0].uid');
const host=W.document.querySelector(`[data-tip="inv:${uid}"]`);
W.eval(`Tooltip.openFrom(document.querySelector('[data-tip="inv:${uid}"]'), 100, 100)`);
ok('tooltip opens', W.eval("Tooltip.el.style.display")==='block');
let h=W.eval('Tooltip.el.innerHTML');
ok('shows item name', h.includes(W.eval('S.inventory[0].name')));
ok('shows one stat per line', (h.match(/tip-stat/g)||[]).length >= 3, (h.match(/tip-stat/g)||[]).length+' stat rows');
ok('shows sell value', h.includes('sells for'));
ok('hints at shift compare', h.includes('Shift'));

console.log('\n=== SHIFT COMPARISON ===');
W.eval("S.equipment.chest = generateItem({ilvl:20,rarity:'uncommon',slot:'chest',primary:'str'});");
W.eval(`Tooltip.openFrom(document.querySelector('[data-tip="inv:${uid}"]'), 100, 100)`);
W.eval('Tooltip.shiftHeld = true; Tooltip.redraw();');
h=W.eval('Tooltip.el.innerHTML');
ok('compare panel appears', h.includes('tip-compare-row') && h.includes('worn') && h.includes('new'));
ok('shows the worn item too', h.includes(W.eval('S.equipment.chest.name')));
ok('deltas rendered', (h.match(/tip-delta/g)||[]).length > 0, (h.match(/tip-delta/g)||[]).length+' deltas');
ok('upgrade shows green', h.includes('tip-delta up'));
W.eval('Tooltip.shiftHeld = false; Tooltip.redraw();');
ok('releasing shift collapses it', !W.eval('Tooltip.el.innerHTML').includes('currently worn'));

console.log('\n=== EDGE CASES ===');
W.eval("S.equipment.chest = null;");
W.eval(`Tooltip.openFrom(document.querySelector('[data-tip="inv:${uid}"]'), 100, 100); Tooltip.shiftHeld=true; Tooltip.redraw();`);
ok('empty slot compares safely', W.eval("Tooltip.el.style.display")==='block', 'no crash with nothing worn');
W.eval("Tooltip.openFrom({dataset:{tip:'inv:nonexistent'}}, 50, 50)");
ok('missing item hides cleanly', W.eval("Tooltip.el.style.display")==='none');
// ring compares against the worse of the two worn
W.eval(`S.equipment.ring1 = generateItem({ilvl:40,rarity:'epic',slot:'ring',primary:'str'});
        S.equipment.ring2 = generateItem({ilvl:5,rarity:'common',slot:'ring',primary:'str'});
        window.__r = generateItem({ilvl:30,rarity:'rare',slot:'ring',primary:'str'});`);
ok('ring compares vs the worse one', W.eval('bestWornFor(__r).uid') === W.eval('S.equipment.ring2.uid'));
// re-render must not leave a stale tooltip
W.eval(`Tooltip.openFrom(document.querySelector('[data-tip="inv:${uid}"]'), 100, 100)`);
W.eval("UI.render()");
ok('render clears the tooltip', W.eval("Tooltip.el.style.display")==='none');

console.log('\n=== WEAPON TOOLTIP ===');
W.eval("window.__w = generateItem({ilvl:40,rarity:'legendary',slot:'mainhand',primary:'agi'}); S.inventory.push(__w);");
W.eval("UI.go('inventory'); Tooltip.openFrom(document.querySelector('[data-tip=\"inv:'+__w.uid+'\"]'), 100, 100)");
h=W.eval('Tooltip.el.innerHTML');
ok('weapon shows damage range', h.includes('damage'));
ok('weapon shows dps', h.includes('damage per second'));
ok('legendary colour applied', h.includes('r-legendary'));

console.log('\n=== ENCHANT IN TOOLTIP ===');
W.eval("S.equipment.chest = generateItem({ilvl:30,rarity:'rare',slot:'chest',primary:'str'}); S.equipment.chest.enchant='e_str2';");
W.eval("UI.go('character'); Tooltip.openFrom(document.querySelector('[data-tip=\"eq:chest\"]'), 100, 100)");
ok('enchant shown', W.eval('Tooltip.el.innerHTML').includes('Greater Etching of Strength'));

console.log('\n'+'='.repeat(48));
console.log(errs.length? 'FAILURES:\n  '+errs.join('\n  ') : 'TOOLTIP + PACING ALL GOOD');
process.exit(errs.length?1:0);
