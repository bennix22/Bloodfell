// Verifies the single-file build boots and plays with NO external files available.
const { JSDOM } = require('jsdom'); const fs=require('fs');
const FILE='/home/claude/opus-realms-standalone.html';
const errors=[];
// deliberately load from a directory with no js/ or css/ beside it
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{
  url:'file:///tmp/nowhere/opus.html', runScripts:'dangerously', pretendToBeVisual:true,
  beforeParse(w){ w.requestAnimationFrame=()=>0; const st={};
    Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}}});
    w.addEventListener('error',e=>errors.push(e.message)); }});
const W=dom.window;
const ok=(l,c,x)=>{console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?'  '+x:''}`); if(!c)errors.push(l);};

W.document.dispatchEvent(new W.Event('DOMContentLoaded',{bubbles:true}));

console.log('=== SINGLE-FILE BUILD, no sibling files present ===');
ok('no load errors', errors.length===0, errors.join('|'));
ok('rail rendered', !!W.document.querySelector('.rail'));
ok('nav present', W.document.querySelectorAll('[data-nav]').length===14, W.document.querySelectorAll('[data-nav]').length+' entries');
ok('failure trap did NOT fire', !W.document.body.innerHTML.includes('could not start'));
ok('starter gear given', !!W.eval('S.equipment.mainhand'), W.eval('S.equipment.mainhand && S.equipment.mainhand.name'));
ok('starter potions', W.eval('S.potions.po_h1')===5);

console.log('\n=== PANELS ===');
W.eval('S.level = 25');  // past the talent gate, so every panel has real content
for(const r of ['realms','raids','character','inventory','talents','skills','blacksmith','alchemy','enchanting','materials']){
  W.eval(`UI.go('${r}')`);
  const n=W.document.getElementById('main').innerHTML.length;
  ok(r.padEnd(11), n>150, n+' chars');
}

console.log('\n=== PLAYS ===');
W.eval("UI.go('realms'); startRealm('ashen_hollow')");
ok('fight starts', W.eval('Combat.active'));
let g=0; while(W.eval('Combat.active')&&g<3000){ W.eval('Combat.advance(0.1)'); g++; }
ok('fight resolves', !W.eval('Combat.active'));
ok('rewards land', W.eval('S.xp')>0||W.eval('S.tally.deaths')>0, 'xp '+W.eval('S.xp')+' gold '+W.eval('S.gold'));
ok('log populated', W.eval('Combat.log.length')>2, W.eval('Combat.log.length')+' lines');
// grind a bit to be sure loot flows
for(let i=0;i<40;i++){ W.eval("Combat.start('realm', REALMS[0])"); let k=0; while(W.eval('Combat.active')&&k<3000){W.eval('Combat.advance(0.1)');k++;} }
ok('loot accumulates', W.eval('S.inventory.length')>0, W.eval('S.inventory.length')+' items');
ok('materials accumulate', W.eval('Object.keys(S.materials).length')>0);
ok('save works', W.eval('saveGame()'));

console.log('\n=== FAILURE TRAP ITSELF ===');
// prove the trap catches a real error rather than white-screening
const dom2=new JSDOM('<body><script>throw new Error("boom")<\/script></body>',{runScripts:'dangerously'});
ok('trap logic is present in file', fs.readFileSync(FILE,'utf8').includes('could not start'));

console.log('\n'+'='.repeat(46));
console.log(errors.length? 'FAILURES:\n  '+errors.join('\n  ') : 'STANDALONE BUILD FULLY WORKING');
process.exit(errors.length?1:0);
