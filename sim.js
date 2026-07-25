// Balance harness — loads the game files and runs headless fights.
const fs = require('fs');
const path = '/home/claude/opus-realms/js/';
const files = [
  'data/realms.js', 'data/raids.js', 'data/items.js', 'data/talents.js',
  'data/spells.js', 'data/crafting.js','data/effects.js',
  'core/sound.js','core/state.js', 'core/character.js', 'core/loot.js', 'core/combat.js', 'core/actions.js',
];
let src = files.map(f => fs.readFileSync(path + f, 'utf8')).join('\n');
// stub browser APIs
src = 'var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};' + src;
src += fs.readFileSync('/home/claude/simbody.js','utf8');
eval(src);
