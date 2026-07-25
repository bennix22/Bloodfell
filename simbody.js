function gearUp(ilvl, primary, rarity) {
  for (const s of SLOTS) {
    S.equipment[s.key] = generateItem({ ilvl, rarity: rarity || 'uncommon', slot: s.type || s.key, primary });
  }
}
function gearMixed(ilvl, primary) {
  for (const s of SLOTS) {
    const r = Math.random() < 0.25 ? 'rare' : (Math.random() < 0.2 ? 'common' : 'uncommon');
    S.equipment[s.key] = generateItem({ ilvl: Math.max(1, ilvl + randInt(-3, 1)), rarity: r, slot: s.type || s.key, primary });
  }
}

Combat.pushLog = function () {};
Combat.win = function () { this.active = false; };
Combat.lose = function () { this.active = false; };

// a real player shows up with potions
function stockPotions(level) {
  S.potions = {};
  const best = POTIONS.filter(p => p.kind === 'heal' && p.req <= level).sort((a,b)=>b.pct-a.pct)[0];
  if (best) S.potions[best.id] = 20;
  S.settings.autoPotion = true; S.settings.potionThreshold = 45; S.settings.healPotion = null;
}

function simFight(factory, cap) {
  Combat.mode = 'realm'; Combat.realm = REALMS[0];
  Combat.enemy = factory();
  Combat.player = { hp: 0, mana: 0, swingTimer: 0.4, cds: {}, buffs: [], hots: [], shield: null, potionCd: 0, gcd: 0 };
  Combat.refreshStats();
  Combat.player.hp = Combat.stats.maxHp;
  Combat.player.mana = Combat.stats.maxMana;
  Combat.active = true; Combat.log = []; Combat.fightTime = 0;
  let t = 0; const lim = cap || 180;
  while (Combat.active && t < lim) { Combat.step(); t += TICK; }
  return { won: Combat.enemy.hp <= 0, time: t, hpLeft: Math.max(0, Combat.player.hp) / Combat.stats.maxHp };
}
function batch(factory, n, cap, regear) {
  let w = 0, tt = 0, hp = 0;
  for (let i = 0; i < n; i++) {
    if (regear) regear();   // gear variance must be averaged over, not sampled once
    const r = simFight(factory, cap); if (r.won) w++; tt += r.time; hp += r.hpLeft;
  }
  return { win: w / n, time: tt / n, hp: hp / n };
}

function specFor(level) {
  const cap = totalTalentPoints(level);
  const order = ['w1','w1','w1','w5','w5','w5','w8','w8','w8','w6','w6','w6','w9','w9','w9','w11','w11','w11','w13','w13','w13','w18','w18','w18','w16','w16','w20','w20','w15','w15','w12','w3','w21','w22','w24','w2','w2','w2','w4','w4'];
  const out = {};
  for (let i = 0; i < Math.min(cap, order.length); i++) out[order[i]] = (out[order[i]] || 0) + 1;
  return out;
}
const warriorDps = { w1: 3, w5: 3, w6: 3, w8: 3, w9: 3, w11: 3, w13: 3, w18: 3, w16: 2, w20: 2, w21: 1, w22: 1, w24: 1, w3: 3, w15: 2, w12: 1 };

console.log('=== NORMAL MOBS: level-appropriate, mixed gear ===');
S.talents = {};
for (const lv of [1, 10, 20, 30, 40, 50]) {
  S.level = lv;
  S.talents = specFor(lv);
  const realm = REALMS.slice().reverse().find(r => r.lvl <= lv) || REALMS[0];
  gearMixed(lv, 'str'); stockPotions(lv);
  const b = batch(() => makeRealmEnemy(realm), 60, 180, () => gearMixed(lv, 'str'));
  console.log(`  L${String(lv).padStart(2)} ${realm.name.padEnd(23)} win ${String(Math.round(b.win * 100)).padStart(3)}%  ${b.time.toFixed(1).padStart(5)}s  hp left ${String(Math.round(b.hp * 100)).padStart(3)}%`);
}

console.log('\n=== PUSHING AHEAD (realm ~5 levels above you) ===');
for (const lv of [12, 24, 36, 46]) {
  S.level = lv; S.talents = specFor(lv);
  const realm = REALMS.slice().reverse().find(r => r.lvl <= lv + 5) || REALMS[0];
  gearMixed(lv, 'str'); stockPotions(lv);
  const b = batch(() => makeRealmEnemy(realm), 60, 180, () => gearMixed(lv, 'str'));
  console.log(`  L${lv} vs ${realm.name.padEnd(23)}(${realm.lvl}) win ${String(Math.round(b.win * 100)).padStart(3)}%  ${b.time.toFixed(1).padStart(5)}s  hp left ${String(Math.round(b.hp * 100)).padStart(3)}%`);
}

console.log('\n=== BOSSES ===');
for (const raid of RAIDS) {
  for (const boss of raid.bosses) {
    S.level = Math.min(50, boss.lvl);
    S.talents = specFor(S.level);
    gearMixed(boss.lvl, 'str'); stockPotions(S.level);
    const b = batch(() => makeBossEnemy(boss), 80, 400, () => gearMixed(boss.lvl, 'str'));
    console.log(`  ${boss.name.padEnd(27)}lvl${String(boss.lvl).padStart(2)}  win ${String(Math.round(b.win * 100)).padStart(3)}%  ${b.time.toFixed(0).padStart(3)}s  hp left ${String(Math.round(b.hp * 100)).padStart(3)}%`);
  }
}

console.log('\n=== ESCALATION: Warlord Kressen after N kills ===');
S.level = 38; S.talents = specFor(38); gearMixed(38, 'str'); stockPotions(38);
for (const k of [0, 10, 25, 50, 100]) {
  S.bossKills.r2b5 = k;
  const b = batch(() => makeBossEnemy(bossById('r2b5')), 40, 400, () => gearMixed(38, 'str'));
  console.log(`  ${String(k).padStart(3)} kills (+${k}%): win ${String(Math.round(b.win * 100)).padStart(3)}%  ${b.time.toFixed(0).padStart(3)}s  hp left ${Math.round(b.hp * 100)}%`);
}
S.bossKills = {};

console.log('\n=== TALENT WEIGHT at ilvl 50 rare gear ===');
S.level = 50; gearUp(50, 'str', 'rare');
S.talents = {}; const a = computeStats();
S.talents = specFor(50); const c = computeStats();
console.log(`   0 pts: DPS ${fmt(a.dps).padStart(6)}  HP ${fmt(a.maxHp).padStart(7)}  crit ${a.crit.toFixed(1)}%`);
console.log(`  40 pts: DPS ${fmt(c.dps).padStart(6)}  HP ${fmt(c.maxHp).padStart(7)}  crit ${c.crit.toFixed(1)}%   +${Math.round((c.dps / a.dps - 1) * 100)}% white dps`);

console.log('\n=== KILLS PER LEVEL ===');
for (const lv of [1, 10, 20, 30, 40, 49]) {
  const realm = REALMS.slice().reverse().find(r => r.lvl <= lv) || REALMS[0];
  console.log(`  L${String(lv).padStart(2)}: ${String(Math.round(xpToNext(lv) / (enemyXp(realm.lvl) * 1.1))).padStart(4)} kills in ${realm.name}`);
}
let cum = 0; for (let i = 1; i < 50; i++) cum += xpToNext(i);
console.log(`  total 1->50: ${cum.toLocaleString()} xp`);
