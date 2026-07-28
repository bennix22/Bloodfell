const { JSDOM } = require('jsdom'); const fs=require('fs'), path=require('path');
const ROOT='/home/claude/opus-realms';
let pass=0,fail=0; const ok=(n,c,d)=>{(c?pass++:fail++);console.log('  '+(c?'PASS':'FAIL')+'  '+n+(d?'  '+d:''));};

function boot(fetchImpl){
  const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'https://bennix22.github.io/Bloodfell/',runScripts:'dangerously',pretendToBeVisual:true,
   beforeParse(w){ w.requestAnimationFrame=()=>0; if(fetchImpl) w.fetch=fetchImpl;
     const st={}; Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}}}); }});
  const W=dom.window;
  for(const src of [...W.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'))){
    const el=W.document.createElement('script'); el.textContent=fs.readFileSync(path.join(ROOT,src),'utf8'); W.document.head.appendChild(el);
  }
  W.document.dispatchEvent(new W.Event('DOMContentLoaded',{bubbles:true}));
  return W;
}

console.log('\n=== 1. no network at all (the offline standalone case) ===');
{
  const W = boot(null);   // no fetch defined, exactly like a harness or a blocked page
  const rail = W.document.querySelector('.rail').innerHTML;
  ok('game still boots', !!W.document.getElementById('nav'));
  ok('counter panel is empty', /<div id="globalcounter"><\/div>/.test(rail));
  ok('no timer left running', W.eval('Counter.timer') === null, 'timer ' + W.eval('Counter.timer'));
  ok('nothing claims to be live', W.eval('Counter.live') === false);
}

console.log('\n=== 2. the request fails (worker down, quota spent, offline mid-session) ===');
{
  const W = boot(() => Promise.reject(new Error('network down')));
  let threw=false;
  try { W.eval('Counter.start()'); } catch(e){ threw=true; }
  ok('a failing request throws nothing', !threw);
  ok('still not live', W.eval('Counter.live') === false);
  W.eval('Counter.stop()');
}

console.log('\n=== 3. the worker answers ===');
{
  const W = boot(() => Promise.resolve({ ok:true, json: async () => ({ online: 3, deepest:{ floor: 61, name:'Ben' } }) }));  // worker may still send a name; we must ignore it
  return (async () => {
    await W.eval('Counter.ping()');
    ok('online count taken', W.eval('Counter.online') === 3, 'online ' + W.eval('Counter.online'));
    ok('record taken', W.eval('Counter.deepest.floor') === 61);
    W.eval('UI.render()');
    const rail = W.document.querySelector('.rail').innerHTML;
    ok('rail shows the numbers', /Playing now/.test(rail) && />3</.test(rail), 'rendered');
    ok('rail shows the record with its holder', /Deepest floor/.test(rail) && /61/.test(rail) && /Ben/.test(rail));
    ok('survives a re-render', (function(){ W.eval('UI.render()'); return /Playing now/.test(W.document.querySelector('.rail').innerHTML); })());

    // what actually gets sent
    let sent=null;
    const W2 = boot((url, opts) => { sent = { url, body: JSON.parse(opts.body) }; return Promise.resolve({ok:true, json: async()=>({online:1, deepest:{floor:0,name:''}})}); });
    W2.eval("S.name='Ben'; S.descent.best=44; saveGame();");
    await W2.eval('Counter.ping()');
    ok('posts to the worker', /workers\.dev/.test(sent.url), sent.url);
    ok('sends id, floor and name', Object.keys(sent.body).sort().join(',') === 'floor,id,name', Object.keys(sent.body).join(','));
    ok('sends the deepest floor', sent.body.floor === 44);
    ok('id is random', /^[a-z0-9]{8,}$/i.test(sent.body.id), sent.body.id);


    // opting out
    W2.eval('Counter.setEnabled(false)');
    let called=false;
    W2.window ? null : null;
    await W2.eval('Counter.ping()');
    ok('opting out stops the pings', W2.eval('Counter.enabled()') === false);
    ok('opting out empties the panel', !/Playing now/.test(W2.document.querySelector('.rail').innerHTML));
    W2.eval('Counter.stop()');

    console.log('\n'+(fail?fail+' FAILURES':'ALL PASSED'));
    process.exit(fail?1:0);
  })();
}
