const { JSDOM } = require('jsdom'); const fs=require('fs'), path=require('path');
const ROOT='/home/claude/opus-realms';
const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'file://'+ROOT+'/index.html',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){w.requestAnimationFrame=()=>0;const st={};Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}}});}});
const W=dom.window;
for(const src of [...W.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))){
  const el=W.document.createElement('script'); el.textContent=fs.readFileSync(path.join(ROOT,src),'utf8'); W.document.head.appendChild(el);
}
W.document.dispatchEvent(new W.Event('DOMContentLoaded',{bubbles:true}));
let pass=0,fail=0; const ok=(n,c,d)=>{(c?pass++:fail++);console.log('  '+(c?'PASS':'FAIL')+'  '+n+(d?'  '+d:''));};

// one unique banked, one carried, one worn
W.eval(`
  S.level=75;
  const banked = makeUnique2(UNIQUES[0]);
  const carried = makeUnique2(UNIQUES[1]);
  const worn = makeUnique2(UNIQUES[2]);
  S.bank.push(banked);
  S.inventory.push(carried);
  S.equipment[slotsForItem(worn)[0]] = worn;
  UI.go('uniques');
`);
const html = W.eval("document.getElementById('main').innerHTML");
const found = (html.match(/class="uniquecard owned"/g)||[]).length;
ok('all three counted as found', found === 3, found + ' marked owned');
ok('banked one says where it is', html.includes('in your bank'));
ok('carried one says where it is', html.includes('in your bags'));
ok('worn one says where it is', html.includes('>worn<'));
const counter = (html.match(/(\d+) of \d+ found/)||[])[1];
ok('header counts the banked one', counter === '3', counter + ' of ' + W.eval('UNIQUES.length'));

// set pieces in the bank register as held on the tooltip
W.eval(`
  S = freshSave(); S.level=75;
  const def = setPieceForBoss('r5b1');
  const piece = makeSetPiece(def);
  S.bank.push(piece);
  UI.tab.setPeek = piece.setId;
`);
const setTip = W.eval("setTooltipBlock(S.bank[0].setId)");
ok('banked set piece counts as held', /tip-setpiece held/.test(setTip), setTip ? 'rendered' : 'no renderer found');

console.log('\n'+(fail?fail+' FAILURES':'ALL PASSED'));
process.exit(fail?1:0);
