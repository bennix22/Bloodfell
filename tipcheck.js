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

// spell tooltip shows a mana NUMBER, not a percentage
const tip = W.eval(`
S.level=50;
for(const s of SLOTS) S.equipment[s.key]=generateItem({ilvl:50,rarity:'epic',slot:s.type||s.key,primary:'int'});
S.talents={m1:3,m2:2};
spellCard(unlockedSpells()[0].id)`);
ok('spell tooltip shows mana as a number', /class="tip-val">\d+<\/span><span class="tip-key">mana/.test(tip),
   (tip.match(/tip-val">[^<]*<\/span><span class="tip-key">mana/)||['(not found)'])[0]);
ok('spell tooltip no longer shows "% of your mana"', !/of your mana/.test(tip));

// the Blood Pact unique tooltip shows its passive
const uqTip = W.eval(`
const uq = makeUnique2(UNIQUES.find(u=>u.id==='uq_blood_pact'));
S.inventory=[uq];
UI.go('inventory');
tipCard(uq)`);
ok('Blood Pact tooltip shows its passive', /Blood Price/.test(uqTip) && /health instead/.test(uqTip));
