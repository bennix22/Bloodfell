const { JSDOM } = require('jsdom'); const fs=require('fs'), path=require('path');
const ROOT='/home/claude/opus-realms';
const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'file://'+ROOT+'/index.html',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){w.requestAnimationFrame=()=>0;const st={};Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}}});}});
const W=dom.window;
for(const src of [...W.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))){
  const el=W.document.createElement('script'); el.textContent=fs.readFileSync(path.join(ROOT,src),'utf8'); W.document.head.appendChild(el);
}
W.document.dispatchEvent(new W.Event('DOMContentLoaded',{bubbles:true}));
let pass=0, fail=0;
const ok=(n,c,d)=>{ (c?pass++:fail++); console.log('  '+(c?'PASS':'FAIL')+'  '+n+(d?'  '+d:'')); };

ok('startBoss exists', typeof W.startBoss === 'function');

// unlock the first raid and actually click the button in the DOM
W.eval("S.level=75; S.unlockedRaids=RAIDS.map(r=>r.id); for(const r of RAIDS) for(const b of r.bosses) S.bossKills[b.id]=1; UI.go('raids');");
const btn=[...W.document.querySelectorAll('button')].find(b=>/Challenge/.test(b.textContent));
ok('challenge button rendered', !!btn);
try { btn.click(); ok('clicking Challenge does not throw', true); }
catch(e){ ok('clicking Challenge does not throw', false, e.message); }
ok('a boss fight started', W.eval('Combat.active && Combat.mode==="boss"'), 'mode ' + W.eval('Combat.mode'));
ok('grind mode is boss', W.eval('UI.grind && UI.grind.mode==="boss"'), W.eval('JSON.stringify(UI.grind)'));

// run it to a kill so the retry path in main.js is exercised
const ticks = W.eval('(function(){let n=0; while(Combat.active && n++ < 8000) Combat.step(); return n;})()');
ok('fight resolves', !W.eval('Combat.active'), ticks+' ticks');
ok('retry path works after a kill', (function(){ try { W.eval('startBoss("r1b1")'); return W.eval('Combat.active'); } catch(e){ return false; } })());

// every onclick handler in every panel must resolve to a real function
const routes=['realms','raids','descent','character','inventory','bank','talents','skills','blacksmith','gemcrafting','alchemy','enchanting','materials','uniques','settings'];
const missing=new Set();
for(const r of routes){
  W.eval('UI.go("'+r+'")');
  const html=W.document.getElementById('main').innerHTML;
  for(const m of html.matchAll(/onclick="([a-zA-Z_][a-zA-Z0-9_]*)\(/g)){
    if (typeof W[m[1]] !== 'function' && m[1] !== 'if') missing.add(r+':'+m[1]);
  }
}
ok('no dead onclick handlers on any page', missing.size===0, missing.size? [...missing].join(', ') : 'all 15 pages clean');

console.log('\n'+(fail? fail+' FAILURES' : 'ALL PASSED'));
process.exit(fail?1:0);
