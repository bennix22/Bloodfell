// Inlines every stylesheet and script into one self-contained HTML file.
// Run: node build-standalone.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Pull the load order straight from index.html so the two can never drift apart.
const scriptSrcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const cssHref = (html.match(/<link rel="stylesheet" href="([^"]+)">/) || [])[1];

const css = fs.readFileSync(path.join(ROOT, cssHref), 'utf8');
const js = scriptSrcs.map(src => {
  const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
  return `/* ======== ${src} ======== */\n${code}`;
}).join('\n\n');

let out = html
  .replace(/<link rel="stylesheet" href="[^"]+">/, `<style>\n${css}\n</style>`)
  .replace(/<!-- content -->[\s\S]*?<script src="js\/main\.js"><\/script>/,
           `<script>\n${js}\n</script>`);

// the failure trap's advice about a single-file build is moot in the single file
out = out.replace(
  /Most often this means the browser[\s\S]*?The single-file build avoids it\./,
  'This build carries everything inside one file, so it is unlikely to be a loading ' +
  'problem. Please send this message along and it can be fixed.');

out = out.replace('<title>Bloodfell</title>',
                  '<title>Bloodfell</title>\n<!-- Single-file build. Everything is inlined. -->');

const dest = path.join(ROOT, '..', 'bloodfell-standalone.html');
fs.writeFileSync(dest, out);

const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log(`built ${dest}`);
console.log(`  ${scriptSrcs.length} scripts + 1 stylesheet inlined, ${kb} KB`);
console.log(`  script order: ${scriptSrcs.join(' -> ')}`);
