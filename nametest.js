const { JSDOM } = require('jsdom'); const fs=require('fs'), path=require('path');
const ROOT='/home/claude/opus-realms';
let pass=0,fail=0; const ok=(n,c,d)=>{(c?pass++:fail++);console.log('  '+(c?'PASS':'FAIL')+'  '+n+(d?'  '+d:''));};

/* Boot with a pre-existing save already in localStorage, exactly like one of
   his friends opening the new build on top of an old character. */
function bootWith(saveObj, fetchImpl){
  const store = {};
  if (saveObj) store['opus_realms_save_v1'] = JSON.stringify(saveObj);
  const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'https://x/',runScripts:'dangerously',pretendToBeVisual:true,
   beforeParse(w){ w.requestAnimationFrame=()=>0; if(fetchImpl) w.fetch=fetchImpl;
     Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}}}); }});
  const W=dom.window;
  for(const src of [...W.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))){
    const el=W.document.createElement('script'); el.textContent=fs.readFileSync(path.join(ROOT,src),'utf8'); W.document.head.appendChild(el);
  }
  W.document.dispatchEvent(new W.Event('DOMContentLoaded',{bubbles:true}));
  return W;
}

console.log('\n=== an existing, unnamed character opens the new build ===');
{
  // build a realistic old save first
  const seed = bootWith(null, null);
  seed.eval(`
    S.level = 52; S.gold = 128000; S.descent.best = 61;
    S.bossKills = { r1b1: 4, r2b3: 2 };
    S.inventory.push(generateItem({ilvl:58,rarity:'legendary',slot:'chest',primary:'str'}));
    S.materials.m_ore4 = 77; S.talents = { w1: 3 };
    delete S.name;              // a save from before names existed
    saveGame();
  `);
  const old = JSON.parse(seed.eval("localStorage.getItem('opus_realms_save_v1')"));
  ok('seed save has no name', old.name === undefined);

  const W = bootWith(old, null);
  ok('naming prompt appears', !!W.document.getElementById('nameprompt'));
  ok('prompt has no way to dismiss it', !/closeModal/.test(W.document.getElementById('modalhost').innerHTML));

  // refusing an empty name
  W.eval("document.getElementById('nameprompt').value = '   '; UI.submitName();");
  ok('empty name is refused', !!W.document.getElementById('nameprompt'), 'prompt still open');

  // naming for real
  W.eval("document.getElementById('nameprompt').value = 'Bennix'; UI.submitName();");
  ok('name accepted', W.eval('S.name') === 'Bennix', W.eval('S.name'));
  ok('prompt closes', !W.document.getElementById('nameprompt'));

  console.log('\n  --- progression must be untouched ---');
  ok('level kept', W.eval('S.level') === 52, 'level ' + W.eval('S.level'));
  ok('gold kept', W.eval('S.gold') === 128000);
  ok('deepest floor kept', W.eval('S.descent.best') === 61);
  ok('boss kills kept', W.eval('S.bossKills.r1b1') === 4 && W.eval('S.bossKills.r2b3') === 2);
  ok('inventory kept', W.eval('S.inventory.length') === 1);
  ok('materials kept', W.eval('S.materials.m_ore4') === 77);
  ok('talents kept', W.eval('S.talents.w1') === 3);

  const saved = JSON.parse(W.eval("localStorage.getItem('opus_realms_save_v1')"));
  ok('written to disk with everything intact', saved.name === 'Bennix' && saved.level === 52 && saved.descent.best === 61);

  console.log('\n  --- and it does not ask twice ---');
  const W2 = bootWith(saved, null);
  ok('no prompt for a named character', !W2.document.getElementById('nameprompt'));
}

console.log('\n=== the name reaches the counter, and the record shows it ===');
{
  let sent = null;
  const W = bootWith(null, (url, opts) => { sent = JSON.parse(opts.body);
    return Promise.resolve({ ok:true, json: async () => ({ online: 2, deepest: { floor: 61, name: 'Bennix' } }) }); });
  return (async () => {
    W.eval("S.name='Bennix'; S.descent.best=61; saveGame();");
    await W.eval('Counter.ping()');
    ok('name is sent', sent && sent.name === 'Bennix', sent ? JSON.stringify(sent) : 'nothing');
    ok('payload is id, floor, name', Object.keys(sent).sort().join(',') === 'floor,id,name');
    W.eval('UI.render()');
    const rail = W.document.querySelector('.rail').innerHTML;
    ok('record shows the name', /Deepest floor/.test(rail) && /61/.test(rail) && /Bennix/.test(rail));

    console.log('\n  --- placement ---');
    const brandAt = rail.indexOf('brand');
    const counterAt = rail.indexOf('globalcounter');
    const cardAt = rail.indexOf('charcard');
    ok('counter sits under the logo', brandAt < counterAt && counterAt < cardAt,
       `brand ${brandAt} < counter ${counterAt} < charcard ${cardAt}`);

    // a name with markup in it
    W.eval("setPlayerName('<b>hax</b>\"');");
    ok('name is sanitised', W.eval('S.name') === 'bhax/b', W.eval('S.name'));
    W.eval('Counter.stop()');
    console.log('\n'+(fail?fail+' FAILURES':'ALL PASSED'));
    process.exit(fail?1:0);
  })();
}
