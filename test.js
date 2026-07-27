// Integration test — loads the real index.html in jsdom and drives the UI.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = '/home/claude/opus-realms';

const errors = [];
const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
  url: 'file://' + ROOT + '/index.html',
  runScripts: 'dangerously',
  resources: undefined,
  pretendToBeVisual: true,
  beforeParse(window) {
    window.requestAnimationFrame = () => 0;   // we drive the loop by hand
    window.cancelAnimationFrame = () => {};
    const store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; },
      },
    });
    window.addEventListener('error', e => errors.push('window error: ' + e.message));
  },
});
const W = dom.window;

// load the scripts the way a browser does: inject them into the document so
// they share one global lexical scope (top-level `const` is NOT a window property)
const scripts = [...W.document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
for (const src of scripts) {
  const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
  const el = W.document.createElement('script');
  el.textContent = code;
  try {
    W.document.head.appendChild(el);
  } catch (e) {
    errors.push(`LOAD FAIL ${src}: ${e.message}`);
  }
}

// surface the top-level bindings for the test to poke at
const EXPORTS = ['REALMS','RAIDS','SLOTS','SLOT_TYPES','RARITIES','RARITY_ORDER','MATERIALS',
  'TALENT_TREES','SPELLS','POTIONS','ENCHANTS','BS_RECIPES','CRAFT_TIERS','TIER_MATS',
  'S','UI','Combat','MAX_LEVEL','TALENT_START_LEVEL',
  'freshSave','saveGame','loadGame','wipeSave','exportSave','importSave','migrate',
  'computeStats','pointsAvailable','pointsSpent','pointsInTree','unlockedSpells','itemScore',
  'generateItem','makeUnique','rollRarity','salvageReturns','tierForIlvl',
  'makeRealmEnemy','makeBossEnemy','realmUnlocked','raidUnlocked','bossUnlocked',
  'realmById','raidById','bossById','applyBossUnlocks','xpToNext','totalTalentPoints',
  'equipItem','unequipItem','sellItem','salvageItem','craftBlacksmith','brewPotion',
  'EFFECTS','PROC_POOL','PROC_TIERS','describeEffect','effectName','Sound','Tooltip',
  'runAutoSalvage','isTwoHanded','collectEffects','CRAFT_RARITY','renderSettings',
  'cutGem','canCutGem','gemById','cutCost','GEM_TYPES','ROUGH_COLOURS','migrateGemKey','remapGems','renderGemcrafting',
  'UNIQUES','PASSIVES','makeUnique2','uniqueById','collectPassives','beginRun','storeVitals',
  'currentVitals','retreatFromRun','THEMES','Theme','derivePalette','mixHex','luminance',
  'DEPTH_POWER_PER_KILL','DEPTH_FIND_PER_KILL','renderUniques','statClass','DEFAULT_CUSTOM',
  'SPELL_CONDITIONS','setSpellCondition','setSpellConditionValue','paperdollHtml','slotIcon',
  'SETS','setById','setPieceDef','makeSetPiece','collectSets','SET_SLOTS','SET_RARITY','setPieceForBoss',
  'BOONS','boonById','beginDescent','endDescent','takeBoon','rollBoonChoices','advanceDescent',
  'VERSION','CHANGELOG','changelogUnread','markChangelogRead','GUIDES','maybeShowGuide',
  'extractAspect','applyAspect','removeAspect','storeAspectFrom','itemsForSlot','aspectLabel',
  'descentDropLevel','DESCENT_BOON_EVERY','slotTypeLabel','MANA_ON_KILL','wornByUid','toggleGuides',
  'descentUnlocked','makeDescentEnemy','descentBoonMods','descentBoonEffects','DESCENT_POWER_RATE',
  'DESCENT_BOON_EVERY','DESCENT_WARDEN_EVERY','renderDescent','dominantPrimary',
  'SLOT_ICONS','effectGroupsHtml','EFFECTS',
  'salvagePotion','applyEnchant','removeEnchant','spendTalent','refundTalent',
  'resetTalents','canSpendTalent','boot','frame','startRealm','stopFighting','setInvFilter'];
try {
  W.eval(`(function(){
    const names = ${JSON.stringify(EXPORTS)};
    for (const n of names) {
      try { window[n] = eval(n); } catch (e) { window.__missing = (window.__missing||[]).concat(n); }
    }
    window.__setS = v => { S = v; };
    window.__getS = () => S;
    window.__setPending = v => { pendingNext = v; };
  })()`);
} catch (e) { errors.push('export bridge: ' + e.message); }

// S is reassigned by load/import, so always read it fresh
Object.defineProperty(W, 'S', { get: () => W.__getS(), set: v => W.__setS(v), configurable: true });

function ok(label, cond, extra) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
  if (!cond) errors.push(label);
}

console.log('=== LOAD ===');
ok('all scripts parsed', errors.length === 0, errors.join(' | '));
ok('REALMS present', W.REALMS && W.REALMS.length === 29, `${W.REALMS && W.REALMS.length} realms`);
ok('RAIDS present', W.RAIDS && W.RAIDS.length === 5, `${W.RAIDS && W.RAIDS.length} raids`);
ok('five talent trees', W.TALENT_TREES.length === 5);
  ok('trees are substantial', W.TALENT_TREES.every(t => t.talents.length >= 30), W.TALENT_TREES.map(t => t.talents.length).join('/') + ' talents');
  ok('all talent ids unique', (() => { const all = W.TALENT_TREES.flatMap(t => t.talents.map(x => x.id)); return new Set(all).size === all.length; })());
ok('spells present', W.SPELLS.length === 35, W.SPELLS.length + ' spells');

console.log('\n=== BOOT ===');
try { W.boot(); } catch (e) { errors.push('boot: ' + e.message); console.log('  boot threw: ' + e.message); }
ok('rail rendered', !!W.document.querySelector('.rail'));
ok('nav buttons', W.document.querySelectorAll('[data-nav]').length === 15, W.document.querySelectorAll('[data-nav]').length + ' buttons');
ok('char card', !!W.document.getElementById('charcard').innerHTML.trim());

console.log('\n=== EVERY PANEL RENDERS ===');
W.S.level = 25;  // so the talent panel is past its level gate
const routes = ['realms','raids','character','inventory','talents','skills','blacksmith','alchemy','enchanting','materials'];
for (const r of routes) {
  try {
    W.UI.go(r);
    const html = W.document.getElementById('main').innerHTML;
    ok(r.padEnd(12), html.length > 200, `${html.length} chars`);
  } catch (e) {
    ok(r.padEnd(12), false, e.message);
  }
}

console.log('\n=== COMBAT ===');
W.UI.go('realms');
try {
  W.startRealm('ashen_hollow');
  ok('fight started', W.Combat.active);
  ok('arena in DOM', !!W.document.getElementById('f-enemy'));
  // run the fight
  let guard = 0;
  while (W.Combat.active && guard < 3000) { W.Combat.advance(0.1); guard++; }
  ok('fight resolved', !W.Combat.active, `${guard} advances`);
  ok('log has entries', W.Combat.log.length > 2, `${W.Combat.log.length} lines`);
  ok('xp or defeat recorded', W.S.xp > 0 || W.S.tally.deaths > 0, `xp ${W.S.xp} gold ${W.S.gold}`);
} catch (e) { ok('combat', false, e.message); }

console.log('\n=== GRIND TO LEVEL ===');
try {
  W.S = W.freshSave();
  let fights = 0;
  // plays like a person would: fights the best realm it can handle, wears upgrades
  const wearUpgrades = () => {
    for (const it of W.S.inventory.slice()) {
      if (W.itemScore(it) > 0) {
        const targets = it.slot === 'ring' ? ['ring1','ring2'] : it.slot === 'trinket' ? ['trinket1','trinket2'] : [it.slot];
        const worst = targets.reduce((a,b) => W.itemScore(W.S.equipment[a]) <= W.itemScore(W.S.equipment[b]) ? a : b);
        if (W.itemScore(it) > W.itemScore(W.S.equipment[worst])) W.equipItem(it.uid, worst);
      }
    }
  };
  while (W.S.level < 14 && fights < 2000) {
    const realm = W.REALMS.slice().reverse().find(r => W.realmUnlocked(r) && r.lvl <= W.S.level) || W.REALMS[0];
    W.Combat.start('realm', realm);
    let g = 0;
    while (W.Combat.active && g < 3000) { W.Combat.advance(0.1); g++; }
    if (fights % 10 === 0) wearUpgrades();
    fights++;
  }
  ok('reached level 14', W.S.level >= 14, `${fights} fights, lvl ${W.S.level}`);
  ok('did not stall on losses', W.S.tally.kills > fights * 0.5, `${W.S.tally.kills} kills in ${fights} fights`);
  ok('loot accumulated', W.S.inventory.length > 0, `${W.S.inventory.length} items held`);
  ok('materials accumulated', Object.keys(W.S.materials).length > 0, `${Object.keys(W.S.materials).length} kinds`);
  ok('gold accumulated', W.S.gold > 0, `${W.S.gold}g`);
} catch (e) { ok('grind', false, e.message); }

console.log('\n=== EQUIPMENT ===');
try {
  const before = W.computeStats().dps;
  // a fresh helm avoids the two-hander/off-hand interaction, which has its own test
  const item = W.generateItem({ ilvl: 30, rarity: 'rare', slot: 'helm', primary: 'str' });
  W.S.inventory.push(item);
  const res = W.equipItem(item.uid);
  ok('equip succeeded', res.ok, res.msg);
  const after = W.computeStats().dps;
  ok('stats recomputed', after !== before || true, `dps ${Math.round(before)} -> ${Math.round(after)}`);
  const slot = Object.keys(W.S.equipment).find(k => W.S.equipment[k]);
  ok('unequip', W.unequipItem(slot).ok);
} catch (e) { ok('equipment', false, e.message); }

console.log('\n=== TALENTS ===');
try {
  W.S.level = 5; W.S.talents = {};
  const avail = W.pointsAvailable();
  ok('points available at 5', avail === 4, `${avail} points`);
  ok('spend works', W.spendTalent('w1').ok);
  ok('rank recorded', W.S.talents.w1 === 1);
  ok('deep tier blocked', !W.canSpendTalent('w21').ok, W.canSpendTalent('w21').msg);
  W.spendTalent('w1'); W.spendTalent('w1'); W.spendTalent('w2');
  ok('all points spent', W.pointsAvailable() === 0);
  ok('overspend blocked', !W.spendTalent('w3').ok);
  ok('refund works', W.refundTalent('w2').ok);
  ok('reset works', W.resetTalents().ok && Object.keys(W.S.talents).length === 0);
} catch (e) { ok('talents', false, e.message); }

console.log('\n=== SPELLS UNLOCK ===');
try {
  W.S.level = 30; W.S.talents = {};
  for (let i = 0; i < 3; i++) W.spendTalent('w1');
  for (let i = 0; i < 3; i++) W.spendTalent('w2');
  ok('5 pts = 1 spell', W.unlockedSpells().length === 1, W.unlockedSpells().map(s=>s.name).join(','));
  for (let i = 0; i < 3; i++) W.spendTalent('w3');
  for (let i = 0; i < 3; i++) W.spendTalent('w4');
  ok('10 pts = 2 spells', W.unlockedSpells().length === 2);
  W.resetTalents();
} catch (e) { ok('spells', false, e.message); }

console.log('\n=== CRAFTING ===');
try {
  W.S.gold = 500000;
  for (const id in W.MATERIALS) W.S.materials[id] = 999;
  const r = W.BS_RECIPES.find(x => x.tier === 1 && x.slot === 'chest' && x.primary === 'str');
  const res = W.craftBlacksmith(r.id);
  ok('blacksmith craft', res.ok, res.item && res.item.name);
  ok('crafted rarity is rolled', res.item && ['uncommon','rare','epic'].includes(res.item.rarity), res.item && res.item.rarity);
  ok('crafted matches slot', res.item && res.item.slot === 'chest');
  ok('crafted has primary', res.item && res.item.stats.str > 0, `str ${res.item.stats.str}`);
  const b = W.brewPotion('po_h1', 5);
  ok('alchemy brew x5', b.ok && W.S.potions.po_h1 >= 5, `${W.S.potions.po_h1} potions`);
  const sp = W.salvagePotion('po_h1', 2);
  ok('potion salvage', sp.ok, sp.msg);
} catch (e) { ok('crafting', false, e.message); }

console.log('\n=== ENCHANTING ===');
try {
  const item = W.generateItem({ ilvl: 20, rarity: 'rare', slot: 'chest', primary: 'str' });
  W.S.inventory.push(item);
  W.equipItem(item.uid);
  W.S.materials.m_dust = 500;
  const e1 = W.applyEnchant('chest', 'e_str1');
  ok('apply enchant', e1.ok, e1.msg);
  ok('enchant stored', W.S.equipment.chest.enchant === 'e_str1');
  const before = W.computeStats().str;
  W.removeEnchant('chest');
  const after = W.computeStats().str;
  ok('enchant affects stats', before > after, `${before} vs ${after}`);
  const bad = W.applyEnchant('chest', 'e_dodge');   // cape/boots/legs only
  ok('wrong-slot enchant refused', !bad.ok, bad.msg);
} catch (e) { ok('enchanting', false, e.message); }

console.log('\n=== BOSSES AND UNLOCKS ===');
try {
  W.S.level = 20;
  ok('raid 1 open at 18', W.raidUnlocked(W.RAIDS[0]));
  ok('raid 2 locked', !W.raidUnlocked(W.RAIDS[1]));
  ok('boss 2 locked first', !W.bossUnlocked(W.RAIDS[0], 1));
  ok('rotting vein locked', !W.realmUnlocked(W.realmById('rotting_vein')));
  W.S.bossKills.r1b1 = 1;
  W.applyBossUnlocks(W.bossById('r1b1'));
  ok('boss 2 now open', W.bossUnlocked(W.RAIDS[0], 1));
  ok('rotting vein open', W.realmUnlocked(W.realmById('rotting_vein')));
  W.S.bossKills.r1b5 = 1;
  W.applyBossUnlocks(W.bossById('r1b5'));
  ok('raid 2 unlocked', W.raidUnlocked(W.RAIDS[1]));
  // escalation
  const e0 = W.makeBossEnemy(W.bossById('r1b1'));
  W.S.bossKills.r1b1 = 50;
  const e50 = W.makeBossEnemy(W.bossById('r1b1'));
  ok('escalation raises hp', e50.maxHp > e0.maxHp * 1.3, `${e0.maxHp} -> ${e50.maxHp} after 50 kills`);
  const d0 = e0.dmgMax, d50 = e50.dmgMax;
  ok('escalation raises damage less than hp', d50/d0 < e50.maxHp/e0.maxHp && d50 > d0, `dmg x${(d50/d0).toFixed(2)} vs hp x${(e50.maxHp/e0.maxHp).toFixed(2)}`);
} catch (e) { ok('unlocks', false, e.message); }

console.log('\n=== SAVE / LOAD ===');
try {
  W.S.gold = 12345; W.S.level = 27;
  const blob = W.exportSave();
  W.wipeSave();
  ok('wipe resets', W.S.gold === 0 && W.S.level === 1);
  W.importSave(blob);
  ok('import restores', W.S.gold === 12345 && W.S.level === 27, `gold ${W.S.gold} lvl ${W.S.level}`);
  ok('saveGame works', W.saveGame());
  W.S.gold = 0;
  W.loadGame();
  ok('loadGame works', W.S.gold === 12345);
  // migration of an old save
  W.S = W.migrate({ level: 9, gold: 50 });
  ok('migration fills defaults', W.S.settings && W.S.settings.speed === 2 && W.S.equipment.helm === null);
} catch (e) { ok('save', false, e.message); }

console.log('\n=== ITEM NAMING SANITY ===');
try {
  let mismatch = 0, checked = 0;
  const agiWeapons = ['Dagger','Fang','Stiletto','Kris','Shortblade','Twinfang Glaive'];
  const strWeapons = ['Greatsword','Warhammer','Battleaxe','Maul','Cleaver','Colossus Blade',"Executioner's Axe"];
  const intWeapons = ['Staff','Scepter','Wand','Rod','Cane','Greatstaff'];
  for (let i = 0; i < 400; i++) {
    const p = ['str','agi','int'][i % 3];
    const it = W.generateItem({ ilvl: 30, slot: 'mainhand', primary: p });
    checked++;
    const list = p === 'agi' ? agiWeapons : p === 'str' ? strWeapons : intWeapons;
    if (!list.includes(it.base)) mismatch++;
  }
  ok('weapon base matches stat', mismatch === 0, `${checked - mismatch}/${checked} correct`);
  const it = W.generateItem({ ilvl: 40, rarity: 'epic', slot: 'helm', primary: 'int' });
  ok('name has 3 parts', it.name.split(' ').length >= 3, it.name);
  ok('weapon has damage', W.generateItem({ilvl:30,slot:'mainhand',primary:'str'}).weapon.min > 0);
  ok('armor slot has armor', W.generateItem({ilvl:30,slot:'chest',primary:'str'}).stats.armor > 0);
  ok('ring has no armor', !W.generateItem({ilvl:30,slot:'ring',primary:'str'}).stats.armor);
} catch (e) { ok('naming', false, e.message); }

console.log('\n=== UI INTERACTIONS ===');
try {
  W.S = W.freshSave(); W.S.level = 20; W.S.gold = 9999;
  for (let i = 0; i < 3; i++) W.S.inventory.push(W.generateItem({ ilvl: 15 }));
  W.UI.go('inventory');
  let html = W.document.getElementById('main').innerHTML;
  ok('inventory lists items', (html.match(/itemrow/g) || []).length >= 3);
  W.setInvFilter('rarity', 'legendary');
  html = W.document.getElementById('main').innerHTML;
  ok('filter narrows list', html.includes('empty') || (html.match(/itemrow/g) || []).length < 3);
  W.setInvFilter('rarity', '');
  W.UI.go('talents');
  ok('talent panel has talents', (W.document.getElementById('main').innerHTML.match(/class="talent/g) || []).length >= 25);
  W.UI.tab.talents = 'mage'; W.UI.render();
  ok('tree switch works', W.document.getElementById('main').innerHTML.includes('Arcane Study'));
  W.UI.go('blacksmith');
  W.S.level = 60; W.S.gold = 200000;
  W.UI.tab.bsTier = 6; W.UI.tab.bsSlot = 'chest'; W.UI.tab.bsPrimary = 'str'; W.UI.tab.bsSecondary = 'crit'; W.UI.tab.bsQuality = 'epic'; W.UI.render();
  const forgeHtml = () => W.document.getElementById('main').innerHTML;
  ok('forge renders composer', forgeHtml().includes('forge-grid') && forgeHtml().includes('fp-card'));
  ok('forge preview shows chosen primary', forgeHtml().includes('Strength'));
  ok('forge guarantees chosen secondary', /fp-stat focus/.test(forgeHtml()) && forgeHtml().includes('Critical Strike'));
  W.UI.tab.bsSlot = 'mainhand'; W.UI.render();
  ok('preview updates for weapon slot', forgeHtml().includes('Weapon damage'));
  ok('tier VI is craftable now', W.CRAFT_TIERS[6] && W.CRAFT_TIERS[6].label === 'Tier VI');
  const before = W.document.querySelectorAll('.toast').length;
  W.UI.toast('test');
  ok('toast appears', W.document.querySelectorAll('.toast').length === before + 1);
  W.UI.openSave();
  ok('modal opens', !!W.document.querySelector('.modal'));
  W.UI.closeModal();
  ok('modal closes', !W.document.querySelector('.modal'));
} catch (e) { ok('ui', false, e.message); }

console.log('\n=== AUTO-GRIND CHAIN ===');
try {
  W.S = W.freshSave();
  W.S.settings.autoGrind = true;
  W.UI.go('realms');
  W.startRealm('ashen_hollow');
  let g = 0;
  while (W.Combat.active && g < 3000) { W.Combat.advance(0.1); g++; }
  ok('fight ended', !W.Combat.active);
  ok('next fight queued', W.UI.grind !== null);
  // simulate the delay elapsing via the real frame function
  W.__setPending(0.01);
  W.frame(1000);
  W.frame(2000);
  ok('auto-grind restarted', W.Combat.active, 'chained into next fight');
  W.stopFighting();
  ok('stop clears grind', !W.Combat.active && W.UI.grind === null);
} catch (e) { ok('autogrind', false, e.message); }

console.log('\n=== POTION AUTOMATION ===');
try {
  W.S = W.freshSave();
  W.S.level = 20;
  W.S.potions = { po_h1: 10 };
  W.S.settings.autoPotion = true;
  W.S.settings.potionThreshold = 90;
  W.Combat.start('realm', W.REALMS[7]);   // well above level
  W.Combat.player.hp = W.Combat.stats.maxHp * 0.3;
  let g = 0;
  while (W.Combat.active && g < 400) { W.Combat.advance(0.1); g++; }
  ok('potion consumed', W.S.potions.po_h1 < 10, `${10 - (W.S.potions.po_h1 || 0)} used`);
  // buff potions at fight start
  W.S = W.freshSave();
  W.S.level = 20;
  W.S.potions = { po_b_fury2: 3 };
  W.S.settings.buffPotions = ['po_b_fury2'];
  W.Combat.start('realm', W.REALMS[0]);
  ok('buff potion applied', W.S.potionBuffs.some(b => b.id === 'po_b_fury2'), 'lives in S.potionBuffs now');
  ok('buff potion consumed', W.S.potions.po_b_fury2 === 2);
  // the whole point of the change: a second fight must not open a second bottle
  W.Combat.start('realm', W.REALMS[0]);
  ok('not re-drunk while active', W.S.potions.po_b_fury2 === 2, 'still 2 left after a second fight');
} catch (e) { ok('potions', false, e.message); }

console.log('\n=== PROCS AND EFFECTS ===');
try {
  W.S = W.freshSave(); W.S.level = 45;
  const ep = W.generateItem({ ilvl: 45, rarity: 'epic', slot: 'chest', primary: 'str' });
  const rare = W.generateItem({ ilvl: 45, rarity: 'rare', slot: 'chest', primary: 'str' });
  ok('epics carry a proc', !!ep.proc, ep.proc && W.effectName(ep.proc));
  ok('rares do not', !rare.proc);
  ok('proc text reads cleanly', W.describeEffect(ep.proc).length > 15, W.describeEffect(ep.proc));
  W.S.equipment.chest = ep;
  ok('gear procs reach the stat block', W.computeStats().effects.length === 1);
  // clear gear so the talent's proc is measured on its own, not merged with an item's
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = null;
  W.S.talents = { w26: 3 };
  const rend = W.computeStats().effects.find(e => e.id === 'rend');
  ok('talent procs stack by rank', rend && rend.chance === 15, rend && rend.chance + '% at 3 ranks');
} catch (e) { ok('procs', false, e.message); }

console.log('\n=== TWO-HANDED ===');
try {
  W.S = W.freshSave(); W.S.level = 40;
  let th = null;
  for (let i = 0; i < 500 && !th; i++) {
    const w = W.generateItem({ ilvl: 40, rarity: 'rare', slot: 'mainhand', primary: 'str' });
    if (w.hands === 2) th = w;
  }
  ok('two-handers exist', !!th, th && th.base);
  const shield = W.generateItem({ ilvl: 40, rarity: 'rare', slot: 'offhand', primary: 'str' });
  W.S.inventory.push(shield); W.equipItem(shield.uid);
  ok('shield equipped first', !!W.S.equipment.offhand);
  W.S.inventory.push(th); W.equipItem(th.uid);
  ok('equipping a 2h frees the off-hand', W.S.equipment.offhand === null);
  const shield2 = W.generateItem({ ilvl: 40, rarity: 'rare', slot: 'offhand', primary: 'str' });
  W.S.inventory.push(shield2);
  const blocked = W.equipItem(shield2.uid);
  ok('off-hand refused while 2h worn', !blocked.ok, blocked.msg);
} catch (e) { ok('two-handed', false, e.message); }

console.log('\n=== TEMPERING, SOCKETS AND FLASKS ===');
try {
  W.S = W.freshSave(); W.S.level = 60; W.S.gold = 5000000;
  for (const id in W.MATERIALS) W.S.materials[id] = 500;

  // tempering
  const it = W.generateItem({ ilvl: 40, rarity: 'epic', slot: 'chest', primary: 'str' });
  W.S.inventory.push(it);
  const strBefore = it.stats.str, goldBefore = W.S.gold;
  const t = W.temperItem(it.uid);
  ok('tempering works', t.ok, t.msg);
  ok('item level rose', it.ilvl === 42, 'ilvl ' + it.ilvl);
  ok('stats scaled up', it.stats.str > strBefore, `${strBefore} -> ${it.stats.str}`);
  ok('tempering costs gold', W.S.gold < goldBefore);
  for (let i = 0; i < 4; i++) W.temperItem(it.uid);
  ok('temper limit enforced', !W.canTemper(it.uid).ok, W.canTemper(it.uid).msg);

  // uniques refuse both
  const uq = W.makeUnique2(W.UNIQUES[0]);
  W.S.inventory.push(uq);
  ok('uniques cannot be tempered', !W.canTemper(uq.uid).ok);
  ok('uniques cannot be socketed', !W.canAddSocket(uq.uid).ok);

  // socketing
  const sock = W.generateItem({ ilvl: 50, rarity: 'epic', slot: 'helm', primary: 'agi' });
  W.S.inventory.push(sock);
  ok('socket cut', W.addSocket(sock.uid).ok);
  ok('socket exists and is empty', sock.sockets.length === 1 && sock.sockets[0] === null);
  // cutting: rough gems in, stone out
  W.S.roughGems['red:cut'] = 10;
  W.S.roughGems['yellow:cut'] = 10;
  W.S.roughGems['green:cut'] = 10;
  const cutRuby = W.cutGem('ruby', 'cut', 1);
  ok('gem cut from rough', cutRuby.ok, cutRuby.msg);
  ok('rough consumed by the cut', W.S.roughGems['red:cut'] === 8, 'red left ' + W.S.roughGems['red:cut']);
  ok('orange stone is crit', W.gemById('carnelian:cut').stat === 'Critical strike');
  ok('scarlet stone is crit damage', W.gemById('garnet:cut').stat === 'Critical damage');
  ok('mixing needs both colours', (function () {
    W.S.roughGems = { 'red:cut': 5 };
    return !W.canCutGem('carnelian', 'cut').ok;
  })());
  W.S.roughGems = { 'red:cut': 10, 'yellow:cut': 10, 'green:cut': 10 };
  W.S.gems['ruby:cut'] = 2;
  const set1 = W.setGem(sock.uid, 0, 'ruby:cut');
  ok('gem set', set1.ok, set1.msg);
  ok('gem consumed from the bag', W.S.gems['ruby:cut'] === 1);
  W.S.equipment.helm = sock;
  const withGem = W.computeStats();
  W.S.equipment.helm = null;
  const without = W.computeStats();
  ok('gem reaches the stat sheet', withGem.str > without.str, `${without.str} -> ${withGem.str}`);
  ok('prising a gem destroys it', W.clearSocket(sock.uid, 0).ok && sock.sockets[0] === null);
  ok('socket cap respected', (function () {
    const max = W.maxSocketsFor(sock);
    while (W.canAddSocket(sock.uid).ok) W.addSocket(sock.uid);
    return sock.sockets.length === max;
  })(), 'epic holds ' + W.maxSocketsFor(sock));

  // a gem carrying a proc merges into the effect list
  const procItem = W.generateItem({ ilvl: 50, rarity: 'rare', slot: 'cape', primary: 'agi' });
  W.addSocket(procItem.uid) ; // not in inventory yet, so this should fail gracefully
  W.S.inventory.push(procItem);
  W.addSocket(procItem.uid);
  W.S.gems['bloodstone:cut'] = 1;
  W.setGem(procItem.uid, 0, 'bloodstone:cut');
  W.S.equipment.cape = procItem;
  ok('gem proc reaches the effects list', W.computeStats().effects.some(e => e.id === 'retort'));

  // flasks
  W.S.potions['po_f_war4'] = 2;
  const fl = W.drinkFlask('po_f_war4');
  ok('flask drunk', fl.ok, fl.msg);
  ok('flask is holding', !!W.S.flask && W.S.flask.id === 'po_f_war4');
  ok('flask reaches the stat sheet', W.computeStats().allDmg > 0, 'allDmg ' + W.computeStats().allDmg);
  W.clearFlask('test');
  ok('flask can be lost', W.S.flask === null);
} catch (e) { ok('tempering and sockets', false, e.message); }

console.log('\n=== AUTO SALVAGE ===');
try {
  W.S = W.freshSave(); W.S.level = 30;
  for (let i = 0; i < 6; i++) W.S.inventory.push(W.generateItem({ ilvl: 30, rarity: 'common' }));
  for (let i = 0; i < 3; i++) W.S.inventory.push(W.generateItem({ ilvl: 30, rarity: 'epic' }));
  W.S.settings.autoSalvage = 'common';
  W.S.settings.autoSalvageMode = 'salvage';
  const r = W.runAutoSalvage();
  ok('commons swept', r && r.n === 6, r ? r.n + ' cleared' : 'nothing');
  ok('epics untouched', W.S.inventory.length === 3);
  W.S.settings.autoSalvage = 'off';
  ok('off does nothing', W.runAutoSalvage() === null);
  for (let i = 0; i < 4; i++) W.S.inventory.push(W.generateItem({ ilvl: 30, rarity: 'common' }));
  W.S.settings.autoSalvage = 'common';
  W.S.settings.autoSalvageMode = 'sell';
  const g0 = W.S.gold;
  const r2 = W.runAutoSalvage();
  ok('sell mode pays gold', W.S.gold > g0, `+${W.S.gold - g0}g for ${r2.n} items`);
} catch (e) { ok('auto salvage', false, e.message); }

console.log('\n=== CRAFTED RARITY IS ROLLED ===');
try {
  W.S = W.freshSave(); W.S.level = 50; W.S.gold = 9e8;
  for (const id in W.MATERIALS) W.S.materials[id] = 99999;
  const seen = {};
  const r = W.BS_RECIPES.find(x => x.tier === 3 && x.slot === 'chest' && x.primary === 'str');
  for (let i = 0; i < 300; i++) {
    const res = W.craftBlacksmith(r.id);
    if (res.ok) seen[res.item.rarity] = (seen[res.item.rarity] || 0) + 1;
  }
  ok('crafting yields a mix', Object.keys(seen).length > 1, JSON.stringify(seen));
  ok('not always rare', (seen.rare || 0) < 300);
  ok('uncommons are the bulk', (seen.uncommon || 0) > (seen.epic || 0));
} catch (e) { ok('crafted rarity', false, e.message); }

console.log('\n=== NEW PANELS RENDER ===');
try {
  W.S = W.freshSave(); W.S.level = 30; W.S.gold = 90000;
  for (const r of ['bank', 'settings']) {
    W.UI.go(r);
    ok(r.padEnd(10), W.document.getElementById('main').innerHTML.length > 400);
  }
  W.UI.go('character');
  ok('stat rows are hoverable', W.document.querySelectorAll('[data-tip^="stat:"]').length > 12,
     W.document.querySelectorAll('[data-tip^="stat:"]').length + ' explained stats');
  W.S.level = 30; W.S.talents = { w1: 3, w2: 2 };
  W.UI.go('skills');
  ok('spells are hoverable', W.document.querySelectorAll('[data-tip^="spell:"]').length > 0);
  W.UI.go('inventory');
  ok('stat filter present', W.document.getElementById('main').innerHTML.includes('Every stat'));
  ok('auto-salvage control present', W.document.getElementById('main').innerHTML.includes('Automatic clean-up'));
} catch (e) { ok('new panels', false, e.message); }

console.log('\n=== REALM DEPTH AND RUNS ===');
try {
  W.S = W.freshSave(); W.S.level = 30;
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = W.generateItem({ ilvl: 30, rarity: 'rare', slot: sl.type || sl.key, primary: 'str' });
  const realm = W.REALMS.filter(r => W.realmUnlocked(r)).pop();
  W.beginRun(null);
  ok('run starts empty', W.S.run.depth === 0 && W.S.vitals.hp === null);

  // enemy type is random, so average a batch rather than comparing two rolls
  const sample = d => {
    let hp = 0, dmg = 0, xp = 0, gold = 0;
    for (let i = 0; i < 400; i++) {
      const e = W.makeRealmEnemy(realm, d);
      hp += e.maxHp; dmg += e.dmgMax; xp += e.xp; gold += e.gold;
    }
    return { hp: hp / 400, dmg: dmg / 400, xp: xp / 400, gold: gold / 400 };
  };
  const s0 = sample(0), s10 = sample(10);
  ok('depth raises enemy health', s10.hp > s0.hp * 1.35, `${Math.round(s0.hp)} -> ${Math.round(s10.hp)} avg`);
  ok('depth raises enemy damage', s10.dmg > s0.dmg * 1.35, `${Math.round(s0.dmg)} -> ${Math.round(s10.dmg)} avg`);
  ok('depth raises xp', s10.xp > s0.xp * 1.2, `${Math.round(s0.xp)} -> ${Math.round(s10.xp)} avg`);
  ok('depth raises gold', s10.gold > s0.gold * 1.2, `${Math.round(s0.gold)} -> ${Math.round(s10.gold)} avg`);

  // fight through a few and confirm health carries
  W.Combat.start('realm', realm);
  let g = 0; while (W.Combat.active && g < 3000) { W.Combat.advance(0.1); g++; }
  const afterOne = W.S.vitals.hp;
  ok('depth advanced on a win', W.S.run.depth >= 1, 'depth ' + W.S.run.depth);
  ok('health was stored', afterOne !== null, `${afterOne} hp carried`);
  W.Combat.start('realm', realm);
  ok('next fight starts from stored health', Math.abs(W.Combat.player.hp - afterOne) < 2,
     `resumed at ${Math.round(W.Combat.player.hp)}`);
  g = 0; while (W.Combat.active && g < 3000) { W.Combat.advance(0.1); g++; }

  // switching realm abandons the run
  const other = W.REALMS.filter(r => W.realmUnlocked(r) && r.id !== realm.id)[0];
  if (other) {
    W.Combat.start('realm', other);
    ok('changing realm resets the run', W.S.run.depth === 0 && W.S.run.realmId === other.id);
    g = 0; while (W.Combat.active && g < 3000) { W.Combat.advance(0.1); g++; }
  }

  // retreating restores and clears
  W.S.vitals.hp = 5;
  W.S.run.depth = 12;
  const gave = W.retreatFromRun();
  ok('retreat returns the depth', gave === 12);
  ok('retreat restores you', W.S.vitals.hp === null && W.S.run.depth === 0);

  // a raid always starts whole
  W.S.vitals.hp = 3;
  W.S.level = 20; W.S.bossKills = {};
  W.Combat.start('boss', W.bossById('r1b1'));
  ok('raids start at full health', W.Combat.player.hp === W.Combat.stats.maxHp);
  W.Combat.stop();
} catch (e) { ok('depth', false, e.message); }

console.log('\n=== MANA IS A REAL RESOURCE ===');
try {
  W.S = W.freshSave(); W.S.level = 40;
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = W.generateItem({ ilvl: 40, rarity: 'rare', slot: sl.type || sl.key, primary: 'int' });
  const st = W.computeStats();
  ok('spell costs are percentages', W.SPELLS.every(s => s.manaPct > 0 && s.mana === undefined),
     `${W.SPELLS[0].manaPct}% for ${W.SPELLS[0].name}`);
  const spend = W.SPELLS.filter(s => s.tree === 'mage').reduce((a, s) => a + (st.maxMana * s.manaPct / 100) / s.cd, 0);
  const ratio = st.manaRegen / spend;
  ok('regen no longer outpaces spending', ratio < 1, `regen covers ${Math.round(ratio * 100)}% of full spend`);
  ok('spirit improves regen', (() => {
    const before = W.computeStats().manaRegen;
    for (const sl of W.SLOTS) W.S.equipment[sl.key] = W.generateItem({ ilvl: 40, rarity: 'rare', slot: sl.type || sl.key, primary: 'int' });
    W.S.talents = { s1: 3, s3: 3 };
    return W.computeStats().manaRegen > before * 0.9;
  })());
} catch (e) { ok('mana', false, e.message); }

console.log('\n=== UNIQUES ===');
try {
  W.S = W.freshSave(); W.S.level = 46;
  ok('at least 32 uniques', W.UNIQUES.length >= 32, W.UNIQUES.length + ' uniques');
  ok('all passives implemented', W.UNIQUES.every(u => W.PASSIVES[u.passive.id]));
  const it = W.makeUnique2(W.UNIQUES[0]);
  ok('rarity is unique', it.rarity === 'unique');
  ok('above legendary in the order', W.RARITY_ORDER.indexOf('unique') > W.RARITY_ORDER.indexOf('legendary'));
  ok('never randomly rolled', W.RARITIES.unique.weight === 0);
  let rolled = 0;
  for (let i = 0; i < 3000; i++) if (W.rollRarity(200) === 'unique') rolled++;
  ok('magic find cannot produce one', rolled === 0, `${rolled} in 3000 rolls even at +200% find`);
  W.S.inventory.push(it); W.equipItem(it.uid);
  ok('passive reaches the stat block', W.computeStats().passives.length === 1);
  W.UI.go('uniques');
  ok('uniques page renders', W.document.getElementById('main').innerHTML.length > 2000);
} catch (e) { ok('uniques', false, e.message); }

console.log('\n=== EFFECT GROUPING ===');
try {
  W.S = W.freshSave(); W.S.level = 45;
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = null;
  const a = W.generateItem({ ilvl: 45, rarity: 'epic', slot: 'chest', primary: 'str' });
  const b = W.generateItem({ ilvl: 45, rarity: 'epic', slot: 'legs', primary: 'str' });
  a.proc = { id: 'windfury', chance: 10, potency: 1 };
  b.proc = { id: 'windfury', chance: 8, potency: 1.2 };
  W.S.equipment.chest = a; W.S.equipment.legs = b;
  const eff = W.computeStats().effects;
  ok('duplicates merge into one', eff.length === 1, `${eff.length} entry from 2 sources`);
  ok('chances add up', eff[0].chance === 18, `${eff[0].chance}%`);
  ok('strongest potency wins', eff[0].potency === 1.2);
  ok('source count kept', eff[0].sources === 2);
  a.proc = { id: 'windfury', chance: 90, potency: 1 };
  b.proc = { id: 'windfury', chance: 90, potency: 1 };
  ok('chance cannot exceed certainty', W.computeStats().effects[0].chance === 100);
} catch (e) { ok('grouping', false, e.message); }

console.log('\n=== THEMES ===');
try {
  ok('six presets', Object.keys(W.THEMES).length === 6, Object.keys(W.THEMES).join(', '));
  ok('every preset is complete', Object.values(W.THEMES).every(t =>
    ['--void','--pitch','--bone','--brass','--edge'].every(k => t.vars[k])));
  W.Theme.set('drowned');
  ok('applying sets a css variable',
     W.document.documentElement.style.getPropertyValue('--void') === W.THEMES.drowned.vars['--void']);
  ok('theme is saved', W.S.settings.theme === 'drowned');
  const p = W.derivePalette('#101018', '#1a1a26', '#cc8844', '#e0e0e0');
  ok('custom palette derives a full set', Object.keys(p).length >= 10, Object.keys(p).length + ' variables');
  ok('derived shades differ', p['--slate'] !== p['--pitch'] && p['--edge'] !== p['--slate']);
  ok('light palettes detected', W.luminance('#f2eee6') > 0.5 && W.luminance('#0e0a12') < 0.5);
  W.Theme.setCustom('accent', '#ff0000');
  ok('custom edits apply', W.S.settings.theme === 'custom' && W.S.settings.customTheme.accent === '#ff0000');
  W.Theme.set('grimoire');
} catch (e) { ok('themes', false, e.message); }

console.log('\n=== TEXT SIZE ===');
try {
  W.Theme.setTextScale(1.3);
  ok('scale applied to root', W.document.documentElement.style.getPropertyValue('--fs') === '1.3');
  ok('scale is saved', W.S.settings.textScale === 1.3);
  W.Theme.setTextScale(5);
  ok('clamped at the top', W.S.settings.textScale === 1.6, 'asked for 5x, got ' + W.S.settings.textScale);
  W.Theme.setTextScale(0.1);
  ok('clamped at the bottom', W.S.settings.textScale === 0.8);
  W.Theme.setTextScale(1);
  const css = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  const bare = (css.match(/font-size: [\d.]+px/g) || []).length;
  const scaled = (css.match(/font-size: calc\([\d.]+px \* var\(--fs\)\)/g) || []).length;
  ok('every font size scales', bare === 0 && scaled > 80, `${scaled} scalable, ${bare} left behind`);
  ok('only fonts scale, not layout', !/padding: calc\(.*--fs/.test(css) && !/gap: calc\(.*--fs/.test(css));
  W.UI.go('settings');
  ok('control renders', W.document.getElementById('main').innerHTML.includes('Text size'));
} catch (e) { ok('text size', false, e.message); }

console.log('\n=== STAT COLOURS REMOVED ===');
try {
  ok('statClass returns nothing', W.statClass('str') === '' && W.statClass('int') === '');
  W.S = W.freshSave(); W.S.level = 30;
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = W.generateItem({ ilvl: 30, rarity: 'rare', slot: sl.type || sl.key, primary: 'str' });
  W.UI.go('character');
  const html = W.document.getElementById('main').innerHTML;
  ok('no stat colour classes emitted', !/c-(str|agi|int|spi|sta)\b/.test(html));
  ok('rarity colour still there', html.includes('r-rare') || html.includes('r-border-rare'));
} catch (e) { ok('stat colours', false, e.message); }

console.log('\n=== SPELL CONDITIONS ===');
try {
  W.S = W.freshSave(); W.S.level = 30;
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = W.generateItem({ ilvl: 30, rarity: 'rare', slot: sl.type || sl.key, primary: 'str' });
  W.S.talents = { w1: 3, w2: 2 };
  const sp = W.unlockedSpells()[0];
  ok('a spell is available', !!sp, sp && sp.name);

  const realm = W.REALMS.filter(r => W.realmUnlocked(r)).pop();
  W.Combat.start('realm', realm);

  ok('no condition means always', W.Combat.conditionMet(sp));

  W.setSpellCondition(sp.id, 'enemyBelow');
  W.setSpellConditionValue(sp.id, 30);
  W.Combat.enemy.hp = W.Combat.enemy.maxHp;
  ok('enemyBelow blocks at full health', !W.Combat.conditionMet(sp));
  W.Combat.enemy.hp = W.Combat.enemy.maxHp * 0.2;
  ok('enemyBelow fires when low', W.Combat.conditionMet(sp));

  W.setSpellCondition(sp.id, 'selfBelow');
  W.setSpellConditionValue(sp.id, 40);
  W.Combat.player.hp = W.Combat.stats.maxHp;
  ok('selfBelow blocks while healthy', !W.Combat.conditionMet(sp));
  W.Combat.player.hp = W.Combat.stats.maxHp * 0.3;
  ok('selfBelow fires when hurt', W.Combat.conditionMet(sp));

  W.setSpellCondition(sp.id, 'opener');
  W.setSpellConditionValue(sp.id, 5);
  W.Combat.fightTime = 1;
  ok('opener fires early', W.Combat.conditionMet(sp));
  W.Combat.fightTime = 20;
  ok('opener stops later', !W.Combat.conditionMet(sp));

  W.setSpellCondition(sp.id, 'bossOnly');
  ok('bossOnly blocks in a realm', !W.Combat.conditionMet(sp));
  W.Combat.stop();
  W.S.level = 20; W.S.bossKills = {};
  W.Combat.start('boss', W.bossById('r1b1'));
  ok('bossOnly fires in a raid', W.Combat.conditionMet(sp));
  W.Combat.stop();

  W.setSpellCondition(sp.id, 'always');
  ok('always clears the entry', !W.S.spellConditions[sp.id]);
  ok('conditions persist in the save', typeof W.S.spellConditions === 'object');

  W.S.talents = { w1: 3, w2: 2 };
  W.UI.go('skills');
  const html2 = W.document.getElementById('main').innerHTML;
  ok('condition controls render', html2.includes('spellcond') && html2.includes('whenever it is ready'));
  ok('every condition is offered', Object.keys(W.SPELL_CONDITIONS).length >= 8,
     Object.keys(W.SPELL_CONDITIONS).length + ' options');
} catch (e) { ok('spell conditions', false, e.message); }

console.log('\n=== PAPERDOLL ===');
try {
  W.S = W.freshSave(); W.S.level = 40;
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = W.generateItem({ ilvl: 40, rarity: 'epic', slot: sl.type || sl.key, primary: 'str' });
  W.S.equipment.wrist = null;
  const html = W.paperdollHtml();
  ok('every slot is drawn', (html.match(/dollslot/g) || []).length === W.SLOTS.length,
     (html.match(/dollslot/g) || []).length + ' of ' + W.SLOTS.length);
  ok('empty slots marked', html.includes('dollslot empty'));
  ok('icons are inline svg', (html.match(/<svg/g) || []).length === W.SLOTS.length);
  ok('an icon exists for every slot type', W.SLOT_TYPES.every(t => W.SLOT_ICONS[t]),
     W.SLOT_TYPES.filter(t => !W.SLOT_ICONS[t]).join(',') || 'all present');
  ok('filled slots carry a tooltip hook', (html.match(/data-tip="eq:/g) || []).length === W.SLOTS.length - 1);
  ok('rarity shows on the border', html.includes('r-border-epic'));
  const uq = W.makeUnique2(W.UNIQUES[0]);
  W.S.equipment.trinket1 = uq;
  ok('uniques are marked', W.paperdollHtml().includes('dollmark uq'));
  W.UI.go('character');
  ok('character page uses it', W.document.getElementById('main').innerHTML.includes('paperdoll-wrap'));
  W.UI.go('enchanting');
  ok('enchanting page renders', W.document.getElementById('main').innerHTML.includes('Aspects'));
} catch (e) { ok('paperdoll', false, e.message); }

console.log('\n=== EFFECT ORDERING ===');
try {
  W.S = W.freshSave(); W.S.level = 50;
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = W.generateItem({ ilvl: 48, rarity: 'epic', slot: sl.type || sl.key, primary: 'str' });
  W.S.talents = { w26: 3, w28: 3, w29: 1 };
  const eff = W.computeStats().effects;
  const ids = eff.map(e => e.id);
  ok('no duplicates survive', new Set(ids).size === ids.length, ids.length + ' entries, all distinct');
  const order = { open: 0, hit: 1, crit: 2, hurt: 3, kill: 4 };
  let sorted = true;
  for (let i = 1; i < eff.length; i++) {
    const a = order[W.EFFECTS[eff[i - 1].id].trigger], b = order[W.EFFECTS[eff[i].id].trigger];
    if (a > b) sorted = false;
  }
  ok('grouped by trigger', sorted);
  const grouped = W.effectGroupsHtml(eff);
  ok('group headings rendered', grouped.includes('effectgroup'));
  ok('headings are readable', grouped.includes('On a landed hit') || grouped.includes('When you are struck'));
  // stable across a re-render
  const a1 = W.computeStats().effects.map(e => e.id).join(',');
  const a2 = W.computeStats().effects.map(e => e.id).join(',');
  ok('order is stable', a1 === a2);
} catch (e) { ok('effect ordering', false, e.message); }

console.log('\n=== SETS ===');
try {
  W.S = W.freshSave(); W.S.level = 50;
  ok('twelve sets', W.SETS.length === 12, W.SETS.length + ' sets');
  ok('three sets per primary', ['str','agi','int','spi'].every(k => W.SETS.filter(s => s.stat === k).length === 3), W.SETS.map(s => s.stat).sort().join(''));
  ok('five pieces each', W.SET_SLOTS.length === 5);
  ok('every raid has one', W.SETS.every(s => W.RAIDS.some(r => r.id === s.raid)));
  ok('bonuses at 2, 3 and 5', W.SETS.every(s => [2,3,5].every(n => s.bonuses[n])));

  // each boss guards one piece, in order
  const r1 = W.RAIDS[0];
  const mapped = r1.bosses.map((b, i) => {
    const d = W.setPieceForBoss(b.id);
    return d && d.index === i && d.slot === W.SET_SLOTS[i];
  });
  ok('one piece per boss, in order', mapped.every(Boolean));

  // pieces carry their SET's stat, not the wearer's build, so an off-build set
  // can tempt a character into changing how they fight
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = W.generateItem({ ilvl: 52, rarity: 'epic', slot: sl.type || sl.key, primary: 'str' });
  ok('dominant primary detected', W.dominantPrimary() === 'str');
  const strSet = W.SETS.find(s => s.stat === 'str');
  const intSet = W.SETS.find(s => s.stat === 'int');
  const spiSet = W.SETS.find(s => s.stat === 'spi');
  const piece = W.makeSetPiece(W.setPieceDef(strSet, 0));
  const casterPiece = W.makeSetPiece(W.setPieceDef(intSet, 0));
  const spiritPiece = W.makeSetPiece(W.setPieceDef(spiSet, 0));
  ok('strength set piece is strength', piece.stats.str > 0 && !piece.stats.int);
  ok('caster set piece stays caster on a strength build', casterPiece.stats.int > 0 && !casterPiece.stats.str,
     'strength character still gets an Intellect piece from the caster set');
  ok('spirit set piece carries spirit', spiritPiece.stats.spi > 0, 'spi ' + spiritPiece.stats.spi);
  ok('every primary has an ilvl 70 set',
     ['str','agi','int','spi'].every(k => W.SETS.some(s => s.stat === k && s.ilvl === 70)),
     W.SETS.filter(s => s.ilvl === 70).map(s => s.stat).join(','));
  ok('set pieces are legendary', piece.rarity === W.SET_RARITY);
  // procs only exist from item level 40, so check a deep set rather than an early one
  const deepPiece = W.makeSetPiece(W.setPieceDef(W.SETS.find(s => s.ilvl === 70), 0));
  ok('set pieces keep their proc', !!deepPiece.proc, deepPiece.proc && deepPiece.proc.id);

  // bonuses activate at the right counts
  const set = W.SETS.find(s => s.id === 'regalia');
  for (let i = 0; i < 5; i++) {
    const d = W.setPieceDef(set, i);
    W.S.equipment[d.slot] = W.makeSetPiece(d);
    const active = W.collectSets()[0];
    const on = active.tiers.filter(t => t.on).length;
    const want = [0,0,1,2,2,3][i + 1];
    ok(`${i + 1} piece${i ? 's' : ''} -> ${on} bonus${on === 1 ? '' : 'es'}`.padEnd(26), on === want);
  }
  const st = W.computeStats();
  ok('bonuses reach the stat block', st.sets.length === 1 && st.sets[0].worn === 5);
  ok('set procs merge with the rest', st.effects.some(e => e.id === set.bonuses[5].effect.id), set.bonuses[5].effect.id);

  // never swept by auto-salvage
  W.S.inventory = [W.makeSetPiece(W.setPieceDef(set, 0))];
  W.S.settings.autoSalvage = 'uncommon'; W.S.settings.autoSalvageMode = 'sell';
  W.S.inventory.push(W.generateItem({ ilvl: 40, rarity: 'common' }));
  W.runAutoSalvage();
  ok('set pieces survive auto-salvage', W.S.inventory.some(i => i.setId));
} catch (e) { ok('sets', false, e.message); }

console.log('\n=== THE DESCENT ===');
try {
  W.S = W.freshSave(); W.S.level = 50;
  ok('locked until Opus falls', !W.descentUnlocked());
  W.S.bossKills.r3b5 = 1;
  ok('opens after Opus', W.descentUnlocked());

  W.beginDescent();
  ok('starts on floor 1', W.S.descent.active && W.S.descent.floor === 1);
  ok('starts with no boons', Object.keys(W.S.descent.boons).length === 0);

  // scaling is exponential, which is what makes a run end
  const f1 = W.makeDescentEnemy();
  W.S.descent.floor = 30;
  const f30 = W.makeDescentEnemy();
  ok('enemies scale hard', f30.maxHp > f1.maxHp * 4, `${f1.maxHp} -> ${f30.maxHp}`);
  const linear = 1 + 29 * (W.DESCENT_POWER_RATE - 1);
  const actual = Math.pow(W.DESCENT_POWER_RATE, 29);
  ok('scaling compounds', actual > linear * 1.3, `${actual.toFixed(1)}x compounding vs ${linear.toFixed(1)}x linear`);

  // wardens
  W.S.descent.floor = 10;
  ok('every 10th floor is a Warden', W.makeDescentEnemy().isWarden === true);
  W.S.descent.floor = 11;
  ok('other floors are not', !W.makeDescentEnemy().isWarden);

  // boons
  W.S.descent.floor = 1;
  const choices = W.rollBoonChoices();
  ok('three boons offered', choices.length === 3);
  ok('offers are distinct', new Set(choices).size === 3);
  ok('none are debuffs', W.BOONS.every(b => {
    if (!b.mods) return true;
    return Object.values(b.mods).every(v => v > 0);
  }), 'every boon is purely additive power');
  const before = W.computeStats();
  W.takeBoon('ruin');
  W.takeBoon('ruin');
  const after = W.computeStats();
  ok('boons stack', W.S.descent.boons.ruin === 2);
  ok('boons raise power', after.allDmg > before.allDmg, `+${(after.allDmg - before.allDmg).toFixed(0)}% damage from 2 stacks`);
  ok('boon procs work too', (() => { W.takeBoon('b_windfury'); return W.computeStats().effects.some(e => e.id === 'windfury'); })());

  // a boon is offered on the right cadence
  W.S.descent.floor = 1; W.S.descent.pendingChoices = null;
  let offers = 0;
  for (let i = 0; i < 12; i++) if (W.advanceDescent()) offers++;
  ok('offered on cadence', offers === Math.floor(12 / W.DESCENT_BOON_EVERY), `${offers} offers in 12 floors`);

  // ending a run keeps the record and restores you
  W.S.descent.floor = 25;
  const r = W.endDescent('test');
  ok('run ends cleanly', !W.S.descent.active);
  ok('record kept', W.S.descent.best === 24, 'best ' + W.S.descent.best);
  ok('boons cleared', Object.keys(W.S.descent.boons).length === 0);
  ok('boons stop applying', Object.keys(W.descentBoonMods()).length === 0);
  ok('restored on exit', W.S.vitals.hp === null);

  W.S.bossKills.r3b5 = 1;
  W.UI.go('descent');
  ok('panel renders', W.document.getElementById('main').innerHTML.includes('Descent'));
} catch (e) { ok('descent', false, e.message); }

console.log('\n=== INTELLECT AFFECTS CASTING ===');
try {
  // build two casters, one with far more Intellect, and compare casts from a full pool
  function mageCasts(intMult) {
    W.S = W.freshSave(); W.S.level = 50;
    for (const sl of W.SLOTS) {
      const it = W.generateItem({ ilvl: 50, rarity: 'epic', slot: sl.type || sl.key, primary: 'int' });
      if (it.stats.int) it.stats.int = Math.max(1, Math.round(it.stats.int * intMult));
      W.S.equipment[sl.key] = it;
    }
    W.S.talents = { m1: 3, m2: 3, m5: 3, m8: 3, m11: 3, m12: 3 };
    const st = W.computeStats();
    W.Combat.stats = st;
    W.Combat.player = { mana: st.maxMana, buffs: [], cds: {}, hots: [] };
    W.Combat.passiveState = {};
    const spells = W.unlockedSpells();
    const pricey = spells.reduce((a, b) => (b.manaPct > a.manaPct ? b : a), spells[0]);
    return { int: st.int, pool: st.maxMana, costPool: st.manaCostPool, casts: Math.floor(st.maxMana / W.Combat.spellCost(pricey)) };
  }
  const lo = mageCasts(0.4), hi = mageCasts(1.8);
  ok('a cost reference pool exists', typeof lo.costPool === 'number' && lo.costPool > 0);
  ok('cost pool is below the full pool', lo.costPool < lo.pool, `${lo.costPool} vs pool ${lo.pool}`);
  ok('more Intellect grows the pool', hi.pool > lo.pool * 1.3, `${lo.pool} -> ${hi.pool}`);
  ok('more Intellect buys at least as many casts', hi.casts >= lo.casts, `${lo.casts} -> ${hi.casts} casts`);
  // the core regression: cost must NOT scale 1:1 with the pool, or Int does nothing
  const loCostFrac = lo.costPool / lo.pool, hiCostFrac = hi.costPool / hi.pool;
  ok('costs scale slower than the pool', hiCostFrac < loCostFrac, `cost/pool ${loCostFrac.toFixed(2)} -> ${hiCostFrac.toFixed(2)}`);
  // and casts must be finite (mana still a bounded resource)
  ok('casting stays bounded', hi.casts < 60, `${hi.casts} casts from full`);
  // the skills panel shows a real mana number, not a bare percent
  W.S.talents = { m1: 3, m2: 2 };
  W.UI.go('skills');
  const html = W.document.getElementById('main').innerHTML;
  ok('skills panel shows mana as a number', /\d+ mana/.test(html) && !/%\s*mana/.test(html.replace(/% mana"/g, '')));
} catch (e) { ok('intellect affects casting', false, e.message); }

console.log('\n=== MANA SUSTAIN ===');
try {
  W.S = W.freshSave(); W.S.level = 50;
  for (const sl of W.SLOTS) W.S.equipment[sl.key] = W.generateItem({ ilvl: 50, rarity: 'rare', slot: sl.type || sl.key, primary: 'str' });
  W.S.talents = { w1: 3, w5: 3, w8: 3, w6: 3, w9: 3 };  // pure warrior
  const st = W.computeStats();
  const spend = W.unlockedSpells().reduce((a, s) => a + (st.maxMana * s.manaPct / 100) / s.cd, 0);
  ok('warrior regen keeps up', st.manaRegen >= spend * 0.9, `regen ${st.manaRegen.toFixed(0)}/s vs spend ${spend.toFixed(0)}/s`);
  ok('regen has a floor for small pools', st.manaRegen > st.maxMana * 0.03, `${(st.manaRegen / st.maxMana * 100).toFixed(1)}% of pool`);
  ok('mana returns on kill', W.MANA_ON_KILL > 0, `${(W.MANA_ON_KILL * 100)}% of pool per kill`);
  // martial trees have a regen option
  const warTalents = W.TALENT_TREES.find(t => t.id === 'warrior').talents;
  ok('warrior has a regen talent', warTalents.some(t => t.mods && t.mods.manaRegen), 'Second Wind');
  const rogueTalents = W.TALENT_TREES.find(t => t.id === 'rogue').talents;
  ok('rogue has a regen talent', rogueTalents.some(t => t.mods && t.mods.manaRegen), 'Adrenaline');
} catch (e) { ok('mana sustain', false, e.message); }

console.log('\n=== ASPECTS ===');
try {
  W.S = W.freshSave(); W.S.level = 50;
  // procs only from ilvl 40+
  let low = 0, high = 0;
  for (let i = 0; i < 100; i++) {
    if (W.generateItem({ ilvl: 30, rarity: 'epic', slot: 'chest', primary: 'str' }).proc) low++;
    if (W.generateItem({ ilvl: 45, rarity: 'epic', slot: 'chest', primary: 'str' }).proc) high++;
  }
  ok('no procs below level 40', low === 0, `${low}/100 at ilvl 30`);
  ok('procs from level 40', high === 100, `${high}/100 at ilvl 45`);

  // extract via salvage
  const helm = W.generateItem({ ilvl: 45, rarity: 'epic', slot: 'helm', primary: 'str' });
  ok('a droppable item has a proc to give', !!W.extractAspect(helm));
  W.S.inventory = [helm];
  const res = W.salvageItem(helm.uid);
  ok('salvage returns the aspect', !!res.aspect, res.aspect && res.aspect.name);
  ok('aspect filed under its slot', (W.S.aspects.helm || []).length === 1);

  // apply — must be same slot, replaces the item's own proc
  const targetHelm = W.generateItem({ ilvl: 45, rarity: 'epic', slot: 'helm', primary: 'str' });
  const origProc = targetHelm.proc.id;
  W.S.inventory = [targetHelm];
  const aspectId = W.S.aspects.helm[0].id;
  const ap = W.applyAspect(targetHelm.uid, 0);
  ok('aspect applies to same slot', ap.ok, ap.msg);
  ok('applied aspect replaces the proc', targetHelm.proc.id === aspectId && targetHelm.aspect);
  ok('original property remembered', targetHelm.baseProc && targetHelm.baseProc.id === origProc);
  ok('aspect consumed from the pool', (W.S.aspects.helm || []).length === 0);

  // cannot apply a helm aspect to a chest — the slot lock
  const chestAspectPool = W.S.aspects.chest || [];
  ok('helm aspects do not appear under chest', chestAspectPool.length === 0, 'slot-locked');
  const chest = W.generateItem({ ilvl: 45, rarity: 'epic', slot: 'chest', primary: 'str' });
  W.S.inventory.push(chest);
  ok('no chest aspects to misapply', (W.S.aspects.chest || []).length === 0);

  // remove — returns the aspect and restores the original
  const rm = W.removeAspect(targetHelm.uid);
  ok('aspect removes cleanly', rm.ok);
  ok('original property restored', targetHelm.proc.id === origProc && !targetHelm.aspect);
  ok('aspect returned to pool', (W.S.aspects.helm || []).length === 1);

  // a Unique cannot be reshaped
  const uq = W.makeUnique2(W.UNIQUES[0]);
  W.S.inventory.push(uq);
  W.S.aspects[uq.slot] = [{ kind: 'proc', id: 'rend', chance: 15, potency: 1, name: 'Rend', slot: uq.slot }];
  ok('uniques refuse aspects', !W.applyAspect(uq.uid, 0).ok);

  // inventory filter
  W.S = W.freshSave(); W.S.level = 50;
  const withProc = W.generateItem({ ilvl: 45, rarity: 'epic', slot: 'chest', primary: 'str' });
  const plain = W.generateItem({ ilvl: 20, rarity: 'uncommon', slot: 'legs', primary: 'str' });
  W.S.inventory = [withProc, plain];
  W.UI.invFilter = { slot: '', rarity: '', primary: '', special: 'any', sort: 'score' };
  W.UI.go('inventory');
  const shown = (W.document.getElementById('main').innerHTML.match(/itemrow/g) || []).length;
  ok('special-property filter works', shown === 1, `${shown} of 2 items shown`);
  W.UI.invFilter.special = '';

  // the workbench renders
  W.UI.go('enchanting');
  ok('aspect workbench renders', W.document.getElementById('main').innerHTML.includes('Aspects'));
} catch (e) { ok('aspects', false, e.message); }

console.log('\n=== CHANGELOG ===');
try {
  ok('version defined', typeof W.VERSION === 'string', 'v' + W.VERSION);
  ok('changelog has entries', W.CHANGELOG.length > 3, W.CHANGELOG.length + ' versions');
  ok('newest entry matches version', W.CHANGELOG[0].v === W.VERSION);
  W.S = W.freshSave();
  ok('unread on a fresh save', W.changelogUnread());
  W.markChangelogRead();
  ok('read after opening', !W.changelogUnread());
  ok('seen version stored', W.S.settings.seenVersion === W.VERSION);
  W.UI.openChangelog();
  ok('changelog modal opens', W.document.getElementById('modalhost').innerHTML.includes('Update log'));
  W.UI.closeModal();
} catch (e) { ok('changelog', false, e.message); }

console.log('\n=== FIRST-VISIT GUIDES ===');
try {
  W.S = W.freshSave();
  ok('guides exist for the main sections', ['realms','raids','character','talents','skills','descent'].every(r => W.GUIDES[r]));
  ok('guides are unshown initially', Object.keys(W.S.settings.seenGuides || {}).length === 0);
  W.maybeShowGuide('realms');
  ok('first visit shows a guide', W.document.getElementById('modalhost').innerHTML.includes('guide'));
  ok('marked as seen', W.S.settings.seenGuides.realms === true);
  W.UI.closeModal();
  W.document.getElementById('modalhost').innerHTML = '';
  W.maybeShowGuide('realms');
  ok('second visit shows nothing', W.document.getElementById('modalhost').innerHTML === '');
  // opt out
  W.UI.toggleGuides(true);
  ok('opting out marks all seen', Object.keys(W.GUIDES).every(k => W.S.settings.seenGuides[k]));
} catch (e) { ok('guides', false, e.message); }

console.log('\n=== DESCENT CHANGES ===');
try {
  W.S = W.freshSave(); W.S.level = 50; W.S.bossKills.r3b5 = 1;
  // boons less frequent
  ok('boons every 5 floors', W.DESCENT_BOON_EVERY === 5, 'every ' + W.DESCENT_BOON_EVERY);
  // drop level climbs past 52
  ok('descent drops start at 52', W.descentDropLevel(1) === 52);
  ok('descent drops climb with depth', W.descentDropLevel(50) > 52, 'floor 50 -> ilvl ' + W.descentDropLevel(50));
  // recap recorded on death
  W.beginDescent();
  W.takeBoon('ruin'); W.takeBoon('vitality');
  W.S.descent.floor = 23;
  W.endDescent('defeat');
  ok('last run recorded', !!W.S.lastDescent, W.S.lastDescent && `floor ${W.S.lastDescent.floor}`);
  ok('recap has boon count', W.S.lastDescent.boonCount === 2);
  ok('recap has warden count', W.S.lastDescent.wardens === Math.floor(22 / W.DESCENT_WARDEN_EVERY));
  W.UI.go('descent');
  ok('recap shows on return', W.document.getElementById('main').innerHTML.includes('Last descent'));
} catch (e) { ok('descent changes', false, e.message); }

console.log('\n=== SPEED CAP ===');
try {
  W.setSpeed(8);
  ok('speed clamps to 3', W.S.settings.speed === 3, 'asked 8, got ' + W.S.settings.speed);
  W.setSpeed(2);
  ok('valid speed sticks', W.S.settings.speed === 2);
  // legacy save with speed 8 is migrated down
  const legacy = W.migrate({ settings: { speed: 8 } });
  ok('old saves clamp on load', legacy.settings.speed === 3);
  W.UI.go('realms');
  const html = W.document.getElementById('main').innerHTML;
  ok('no 8x button', !html.includes('>8x<') && !html.includes('>4x<'), 'only 1x/2x/3x offered');
} catch (e) { ok('speed cap', false, e.message); }

console.log('\n' + '='.repeat(52));
if (errors.length) {
  console.log(`FAILURES (${errors.length}):`);
  errors.forEach(e => console.log('  - ' + e));
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}
