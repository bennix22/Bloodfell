// Boss auto-tuner. Simulates each boss repeatedly and nudges its multipliers
// until win rate and fight length land in the target bands, then writes the
// numbers back into js/data/raids.js.
const fs = require('fs');
const P = '/home/claude/opus-realms/js/';
const FILES = ['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js',
               'data/crafting.js','core/state.js','core/character.js','core/loot.js','core/combat.js','core/actions.js'];

function loadGame() {
  let src = 'var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};'
          + FILES.map(f => fs.readFileSync(P + f, 'utf8')).join('\n');
  const sandbox = {};
  const fn = new Function(src + `
    return { S, SLOTS, RAIDS, Combat, TICK, generateItem, computeStats, makeBossEnemy,
             randInt, totalTalentPoints, POTIONS, freshSave, setS: v => { S = v; } };`);
  return fn();
}

// what a player realistically brings to a boss: mixed gear at the boss's level
function gearFor(G, ilvl) {
  for (const s of G.SLOTS) {
    const r = Math.random() < 0.3 ? 'rare' : (Math.random() < 0.2 ? 'common' : 'uncommon');
    G.S.equipment[s.key] = G.generateItem({
      ilvl: Math.max(1, ilvl + G.randInt(-2, 2)),
      rarity: r, slot: s.type || s.key, primary: 'str',
    });
  }
}
function specFor(G, level) {
  const cap = G.totalTalentPoints(level);
  const order = ['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9',
                 'w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20',
                 'w15','w15','w12','w12','w12','w21','w22','w24','w2','w2','w2','w3'];
  const out = {};
  for (let i = 0; i < Math.min(cap, order.length); i++) out[order[i]] = (out[order[i]] || 0) + 1;
  return out;
}

function simulate(G, boss, n, regear) {
  G.Combat.pushLog = () => {};
  G.Combat.win = function () { this.active = false; };
  G.Combat.lose = function () { this.active = false; };
  let wins = 0, time = 0;
  for (let i = 0; i < n; i++) {
    if (regear) regear();   // a different gear set each fight, not one lucky roll
    G.Combat.mode = 'boss'; G.Combat.boss = boss;
    G.Combat.enemy = G.makeBossEnemy(boss);
    G.Combat.player = { hp:0, mana:0, swingTimer:0.4, cds:{}, buffs:[], hots:[], shield:null, potionCd:0, gcd:0 };
    G.Combat.refreshStats();
    G.Combat.player.hp = G.Combat.stats.maxHp;
    G.Combat.player.mana = G.Combat.stats.maxMana;
    G.Combat.active = true; G.Combat.fightTime = 0;
    let t = 0;
    while (G.Combat.active && t < 400) { G.Combat.step(); t += G.TICK; }
    if (G.Combat.enemy.hp <= 0) wins++;
    time += t;
  }
  return { win: wins / n, time: time / n };
}

// target bands: the last boss of each raid is meant to be a wall, the rest a climb
function targetFor(index, total) {
  return index === total - 1 ? { lo: 0.50, hi: 0.68 } : { lo: 0.72, hi: 0.92 };
}
const TIME_LO = 22, TIME_HI = 50;

const results = [];
for (const raidIdx of [0, 1, 2]) {
  const G0 = loadGame();
  for (let bi = 0; bi < G0.RAIDS[raidIdx].bosses.length; bi++) {
    const G = loadGame();
    const raid = G.RAIDS[raidIdx];
    const boss = raid.bosses[bi];
    const target = targetFor(bi, raid.bosses.length);

    G.S.level = Math.min(50, boss.lvl);
    G.S.talents = specFor(G, G.S.level);
    G.S.potions = {};
    const heal = G.POTIONS.filter(p => p.kind === 'heal' && p.req <= G.S.level).sort((a,b)=>b.pct-a.pct)[0];
    if (heal) G.S.potions[heal.id] = 30;
    G.S.settings.autoPotion = true; G.S.settings.potionThreshold = 45;
    let hp = boss.hpMult, dmg = boss.dmgMult;
    let best = null;
    for (let iter = 0; iter < 26; iter++) {
      boss.hpMult = hp; boss.dmgMult = dmg;
      const r = simulate(G, boss, 70, () => gearFor(G, boss.lvl));
      const inWin = r.win >= target.lo && r.win <= target.hi;
      const inTime = r.time >= TIME_LO && r.time <= TIME_HI;
      if (inWin && inTime) { best = { hp, dmg, ...r }; break; }
      if (!best || Math.abs(r.win - (target.lo+target.hi)/2) < Math.abs(best.win - (target.lo+target.hi)/2)) {
        best = { hp, dmg, ...r };
      }
      // win rate is driven mostly by incoming damage
      if (r.win < target.lo) dmg *= (r.win < target.lo * 0.5) ? 0.82 : 0.93;
      else if (r.win > target.hi) dmg *= (r.win > 0.98) ? 1.15 : 1.06;
      // fight length is driven by health
      if (r.time > TIME_HI) hp *= 0.90;
      else if (r.time < TIME_LO) hp *= 1.12;
      hp = Math.max(2, Math.min(30, hp));
      dmg = Math.max(0.3, Math.min(6, dmg));
    }
    results.push({ id: boss.id, name: boss.name, lvl: boss.lvl,
                   hp: +best.hp.toFixed(2), dmg: +best.dmg.toFixed(2),
                   win: best.win, time: best.time, capstone: bi === raid.bosses.length - 1 });
    process.stderr.write('.');
  }
}
process.stderr.write('\n');

console.log('TUNED BOSSES\n');
for (const r of results) {
  console.log(`  ${r.name.padEnd(27)}lvl${String(r.lvl).padStart(2)}  hp x${String(r.hp).padStart(5)}  dmg x${String(r.dmg).padStart(4)}  ` +
              `${String(Math.round(r.win*100)).padStart(3)}% win  ${r.time.toFixed(0).padStart(2)}s${r.capstone ? '   <- capstone' : ''}`);
}

// write the tuned numbers back into the data file
let raids = fs.readFileSync(P + 'data/raids.js', 'utf8');
for (const r of results) {
  const i = raids.indexOf(`id: "${r.id}"`);
  const j = raids.indexOf('hpMult:', i);
  const k = raids.indexOf('\n', j);
  raids = raids.slice(0, j) + `hpMult: ${r.hp}, dmgMult: ${r.dmg},` + raids.slice(k);
}
fs.writeFileSync(P + 'data/raids.js', raids);
console.log('\nwritten back to js/data/raids.js');
