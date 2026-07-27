/* Guards against a class being emitted by the markup with no rule behind it.
   This is a silent failure mode — the element simply renders unstyled — and it
   is exactly how the rarity colours vanished when a CSS block was rewritten. */
const { JSDOM } = require('jsdom'); const fs=require('fs'), path=require('path');
const ROOT='/home/claude/opus-realms';
const css=fs.readFileSync(ROOT+'/css/style.css','utf8');
const errs=[]; const ok=(l,c,x)=>{console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?'  '+x:''}`); if(!c)errs.push(l);};

const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'file://'+ROOT+'/index.html',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){w.requestAnimationFrame=()=>0;const st={};Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}}});}});
const W=dom.window;
for(const src of [...W.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))){
  const el=W.document.createElement('script'); el.textContent=fs.readFileSync(path.join(ROOT,src),'utf8'); W.document.head.appendChild(el);
}
W.document.dispatchEvent(new W.Event('DOMContentLoaded',{bubbles:true}));

function esc(x){ return x.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'); }
function hasRule(cls){ return new RegExp('\\.' + esc(cls) + '(?![a-zA-Z0-9_-])').test(css); }

console.log('=== EVERY RARITY CLASS HAS A RULE ===');
const RAR=['common','uncommon','rare','epic','legendary','unique'];
for(const fam of ['r-','b-','r-border-']){
  const missing=RAR.filter(r=>!hasRule(fam+r));
  ok(`${fam}*`.padEnd(12), missing.length===0, missing.length?('missing '+missing.join(', ')):'all six present');
}

console.log('\n=== CLASSES ACTUALLY RENDERED BY EACH PANEL ===');
// build a character carrying one of every rarity so every class gets emitted
W.eval(`
S.level=50; S.gold=999999;
const rar=['common','uncommon','rare','epic','legendary'];
SLOTS.forEach((s,i)=>{ S.equipment[s.key]=generateItem({ilvl:50,rarity:rar[i%5],slot:s.type||s.key,primary:'str'}); });
S.equipment.trinket1=makeUnique2(UNIQUES[0]);
rar.forEach(r=>S.inventory.push(generateItem({ilvl:50,rarity:r})));
S.inventory.push(makeUnique2(UNIQUES[1]));
S.talents={w26:3,w28:3};
`);

const seen=new Set();
for(const route of ['realms','raids','character','inventory','talents','skills','blacksmith','gemcrafting','alchemy','enchanting','materials','uniques','bank','settings']){
  W.eval(`UI.go('${route}')`);
  const html=W.document.getElementById('main').innerHTML;
  for(const m of html.matchAll(/class="([^"]+)"/g))
    for(const c of m[1].split(/\s+/)) if(c) seen.add(c);
}
// tooltips too
W.eval(`UI.go('inventory'); Tooltip.openFrom(document.querySelector('[data-tip^="inv:"]'),100,100); Tooltip.shiftHeld=true; Tooltip.redraw();`);
for(const m of W.eval('Tooltip.el.innerHTML').matchAll(/class="([^"]+)"/g))
  for(const c of m[1].split(/\s+/)) if(c) seen.add(c);

const IGNORE=new Set(['on','active','filled','empty','locked','picked','muted','hi','done','sell','up','down','same','wpn','ench','crit','dmg','taken','heal','shield','cast','miss','potion','win','lose','loot','level','header','proc','line','uq','pr','good','bad','primary','danger','sm','wide','red','gold','ready','cooling','poor','owned','maxed','invested','blocked','open','zero','s','v','k','tn','td','th','nm','sub','sn','sd','sm','cw','main','acts','meta','desc','foot','order','rank','tcur','flav','have','src','pname','ptext','tb']);
const styled=[...seen].filter(c=>!IGNORE.has(c));
const orphans=styled.filter(c=>!hasRule(c));
ok('no orphaned classes', orphans.length===0, orphans.length?('unstyled: '+orphans.slice(0,12).join(', ')):`${styled.length} classes checked, all styled`);

console.log('\n=== RARITY ACTUALLY REACHES THE MARKUP ===');
W.eval(`
S.inventory=[];
['common','uncommon','rare','epic','legendary'].forEach(r=>S.inventory.push(generateItem({ilvl:50,rarity:r})));
S.inventory.push(makeUnique2(UNIQUES[0]));
UI.go('inventory');`);
const invHtml=W.document.getElementById('main').innerHTML;
for(const r of RAR) ok(`inventory shows r-${r}`.padEnd(28), invHtml.includes('r-'+r));
W.eval(`UI.go('character')`);
const charHtml=W.document.getElementById('main').innerHTML;
ok('paperdoll outlines by rarity', /r-border-(common|uncommon|rare|epic|legendary|unique)/.test(charHtml));
ok('paperdoll names by rarity', /class="dolllabel r-(common|uncommon|rare|epic|legendary|unique)"/.test(charHtml));

console.log('\n=== THEME VARIABLES ALL RESOLVE ===');
const used=[...new Set([...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map(m=>m[1]))];
const declared=new Set([...css.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(m=>m[1]));
const themes = W.eval('THEMES');
for(const t of Object.keys(themes)) for(const k in themes[t].vars) declared.add(k);
const undeclared=used.filter(v=>!declared.has(v));
ok('every var is declared', undeclared.length===0, undeclared.length?undeclared.join(', '):`${used.length} variables, all defined`);

console.log('\n'+'='.repeat(46));
console.log(errs.length?'FAILURES:\n  '+errs.join('\n  '):'STYLING INTACT');
process.exit(errs.length?1:0);
