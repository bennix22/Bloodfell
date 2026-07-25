/* ===========================================================================
   THE DESCENT — the endgame run.
   ---------------------------------------------------------------------------
   An endless dive unlocked by killing Opus. Enemies gain health and damage far
   faster than in an ordinary realm, and every few floors you choose one of three
   BOONS which last for that run.

   The design rule, and the reason this is not a treadmill: the enemy side scales
   automatically and the player side scales BY CHOICE. Watching a percentage tick
   up in the background feels like nothing. Picking Ruin, then Ruin again, then
   Cruelty, and watching your damage go somewhere absurd feels like a run. Two
   descents with the same character end in different places.

   Every Boon is additive power that suits any build. Nothing here takes an
   ability away, forbids a damage type, or asks a warrior to become a mage — a
   restriction that invalidates a build is a wall, not a challenge.

   Enemy scaling is steep on purpose (see DESCENT_POWER_RATE). It has to
   outrun a good Boon run eventually, otherwise there is no end to find.
   =========================================================================== */

/* Enemy power is EXPONENTIAL, not linear. Boons stack additively — twenty Ruins
   is +280% damage, not 280x — so linear enemy growth never catches up and a run
   simply never ends. Tested at several rates: 4% reaches floor ~90, 8% about 40.
   6% lands a good run around fifty to sixty floors, which is five or six Wardens
   and roughly eighteen boons. */
const DESCENT_POWER_RATE = 1.06;
const DESCENT_BOON_EVERY = 5;           // a choice of three Boons this often
const DESCENT_WARDEN_EVERY = 10;        // a raid boss guards this floor
const DESCENT_XP_PER_FLOOR = 0.06;
const DESCENT_GOLD_PER_FLOOR = 0.09;
const DESCENT_FIND_PER_FLOOR = 6;       // percentage points of magic find
const WARDEN_HP_MULT = 4.0;
const WARDEN_DMG_MULT = 1.25;

/* ---------------------------------------------------------------------------
   BOONS
   Each is written to be worth taking regardless of how you fight. `stacks` is
   how many times it may be offered; several are deliberately repeatable so a
   run can commit hard to one line.
   --------------------------------------------------------------------------- */
const BOONS = [
  // --- raw damage, taken by everyone
  { id: "ruin", name: "Ruin", max: 99, mods: { allDmg: 22 },
    text: "+22% damage of every school." },
  { id: "cruelty", name: "Cruelty", max: 99, mods: { crit: 9, critDmg: 35 },
    text: "+9% critical strike and +35% critical damage." },
  { id: "quickening", name: "Quickening", max: 99, mods: { haste: 16 },
    text: "+16% Haste. Faster swings and shorter gaps between spells." },

  // --- staying alive, which matters more the deeper you are
  { id: "vitality", name: "Vitality", max: 99, mods: { hpPct: 25 },
    text: "+25% maximum Health." },
  { id: "bulwark_boon", name: "Bulwark", max: 6, mods: { dr: 7, armorPct: 30 },
    text: "7% damage reduction and +30% Armor." },
  { id: "hunger", name: "Hunger", max: 8, mods: { lifesteal: 6 },
    text: "Heal for 6% of all damage you deal." },

  // --- resources, so a long run does not simply run out
  { id: "wellspring", name: "Wellspring", max: 6, mods: { manaPct: 30, manaRegen: 50 },
    text: "+30% maximum Mana and +50% mana regeneration." },
  { id: "focus", name: "Focus", max: 5, mods: { cdr: 15 },
    text: "15% shorter spell cooldowns." },
  { id: "alchemy", name: "Alchemist's Gift", max: 4, mods: { healPct: 45 },
    text: "+45% to all healing you receive, potions included." },

  // --- the interesting ones: procs that change the texture of a fight
  { id: "b_windfury", name: "Storm's Favour", max: 3, effect: { id: "windfury", chance: 12, potency: 1 },
    text: "12% chance on hit to strike again immediately." },
  { id: "b_rend", name: "Open Wound", max: 3, effect: { id: "rend", chance: 15, potency: 1.2 },
    text: "15% chance on hit to open a deep bleed." },
  { id: "b_momentum", name: "Bloodhunt", max: 2, effect: { id: "momentum", chance: 100, potency: 1.3 },
    text: "Every kill grants haste and damage for twelve seconds." },
  { id: "b_shatter", name: "Killing Edge", max: 3, effect: { id: "shatter", chance: 25, potency: 1.3 },
    text: "Critical strikes have a 25% chance to shatter for heavy extra damage." },
  { id: "b_vengeance", name: "Spite", max: 3, effect: { id: "vengeance", chance: 20, potency: 1.3 },
    text: "20% chance when struck to gain a lasting damage bonus." },
  { id: "b_ambush", name: "First Blood", max: 1, effect: { id: "ambush", chance: 100, potency: 1.4 },
    text: "Open every fight with a large burst of critical strike and damage." },
  { id: "b_lastbreath", name: "Refusal", max: 1, effect: { id: "lastbreath", chance: 40, potency: 1.4 },
    text: "Below 30% Health, a 40% chance when struck to be pulled back from it." },

  // --- run economy
  { id: "greed", name: "Greed", max: 4, mods: { goldFind: 60, magicFind: 35 },
    text: "+60% gold and +35% magic find for the rest of the run." },
  { id: "insight", name: "Insight", max: 4, mods: { xpBonus: 50 },
    text: "+50% experience for the rest of the run." },
];

function boonById(id) { return BOONS.find(b => b.id === id) || null; }

/* Three to choose from, never one you have already maxed, never a duplicate
   within the same offer. */
function rollBoonChoices() {
  const taken = S.descent.boons || {};
  const pool = BOONS.filter(b => (taken[b.id] || 0) < b.max);
  const out = [];
  const copy = pool.slice();
  for (let i = 0; i < 3 && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy[idx].id);
    copy.splice(idx, 1);
  }
  return out;
}

function takeBoon(id) {
  const b = boonById(id);
  if (!b) return { ok: false, msg: "Unknown boon." };
  S.descent.boons[id] = (S.descent.boons[id] || 0) + 1;
  S.descent.pendingChoices = null;
  saveGame();
  return { ok: true, msg: `${b.name} taken.` };
}

/* Everything the chosen Boons currently contribute. Read by computeStats. */
function descentBoonMods() {
  const mods = {};
  if (!S.descent || !S.descent.active) return mods;
  for (const id in S.descent.boons) {
    const b = boonById(id);
    if (b && b.mods) addMods(mods, b.mods, S.descent.boons[id]);
  }
  return mods;
}

function descentBoonEffects() {
  const out = [];
  if (!S.descent || !S.descent.active) return out;
  for (const id in S.descent.boons) {
    const b = boonById(id);
    if (b && b.effect) {
      out.push({ id: b.effect.id, chance: b.effect.chance * S.descent.boons[id], potency: b.effect.potency || 1 });
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Run lifecycle
   --------------------------------------------------------------------------- */
function descentUnlocked() { return (S.bossKills.r3b5 || 0) > 0; }

function beginDescent() {
  S.descent = {
    active: true,
    floor: 1,
    boons: {},
    pendingChoices: null,
    best: S.descent ? (S.descent.best || 0) : 0,
    startedAt: Date.now(),
  };
  S.vitals.hp = null;
  S.vitals.mana = null;
  S.run.realmId = null;
  S.run.depth = 0;
  saveGame();
}

function endDescent(reason) {
  const floor = S.descent.floor;
  const best = Math.max(S.descent.best || 0, floor - 1);
  // a snapshot of the run just ended, for the recap shown next time you open the page
  S.lastDescent = {
    floor: floor - 1,
    boons: { ...(S.descent.boons || {}) },
    boonCount: Object.values(S.descent.boons || {}).reduce((a, b) => a + b, 0),
    wardens: Math.floor((floor - 1) / DESCENT_WARDEN_EVERY),
    reason,
    at: Date.now(),
  };
  S.descent = { active: false, floor: 0, boons: {}, pendingChoices: null, best };
  S.vitals.hp = null;
  S.vitals.mana = null;
  saveGame();
  return { floor: floor - 1, best, reason };
}

/* Which enemy the current floor throws at you. Every tenth floor is a Warden —
   one of the fifteen raid bosses, scaled to the floor rather than its own level. */
function makeDescentEnemy() {
  const floor = S.descent.floor;
  const power = Math.pow(DESCENT_POWER_RATE, floor - 1);
  const isWarden = floor % DESCENT_WARDEN_EVERY === 0;

  let e;
  if (isWarden) {
    const all = [];
    for (const raid of RAIDS) for (const b of raid.bosses) all.push(b);
    const boss = all[Math.floor((floor / DESCENT_WARDEN_EVERY - 1) % all.length)];
    e = makeBossEnemy(boss);
    e.name = `${boss.name}, Warden of the Descent`;
    e.isWarden = true;
    // a Warden is scaled to the floor, not to the level it normally sits at
    /* A Warden is a spike, not a wall. Its health multiplier is modest because
       the floor scaling is already doing the work, and its damage is held back
       further so a Warden kills you slowly enough to be fought rather than
       deleting you on arrival. */
    const ref = enemyBaseHp(50) * WARDEN_HP_MULT * power;
    const refDmg = enemyBaseDmg(50) * WARDEN_DMG_MULT * power;
    e.maxHp = Math.round(ref); e.hp = e.maxHp;
    e.dmgMin = refDmg * 0.9; e.dmgMax = refDmg * 1.1;
    e.xp = Math.round(enemyXp(50) * 14);
    e.gold = Math.round(enemyGold(50) * 18);
  } else {
    // anything from anywhere in the world, scaled to the floor
    const realm = pick(REALMS);
    e = makeRealmEnemy(realm, 0);
    e.descentILvl = descentDropLevel(floor);
    e.level = 50;
    e.maxHp = Math.round(enemyBaseHp(50) * (ROLES[e.role] || ROLES.grunt).hp * power);
    e.hp = e.maxHp;
    const d = enemyBaseDmg(50) * (ROLES[e.role] || ROLES.grunt).dmg * (ROLES[e.role] || ROLES.grunt).speed * power;
    e.dmgMin = d * 0.88; e.dmgMax = d * 1.12;
    e.armor = enemyBaseArmor(50) * (ROLES[e.role] || ROLES.grunt).armor;
    e.xp = Math.round(enemyXp(50) * (1 + (floor - 1) * DESCENT_XP_PER_FLOOR));
    e.gold = Math.round(enemyGold(50) * (1 + (floor - 1) * DESCENT_GOLD_PER_FLOOR));
  }
  e.descentFloor = floor;
  e.descentILvl = descentDropLevel(floor);
  return e;
}

/* Called after a Descent victory. Returns true when a Boon choice is waiting. */
function advanceDescent() {
  S.descent.floor++;
  if ((S.descent.floor - 1) % DESCENT_BOON_EVERY === 0) {
    S.descent.pendingChoices = rollBoonChoices();
    return true;
  }
  return false;
}

/* The item level of gear a Descent enemy drops. Starts at the cap of 52 and
   climbs from there, so the deeper you are the stronger the loot — the reward
   for pushing, and the only place in the game that drops above item level 52. */
const DESCENT_ILVL_BASE = 52;
const DESCENT_ILVL_PER_WARDEN = 2;
function descentDropLevel(floor) {
  return DESCENT_ILVL_BASE + Math.floor(floor / DESCENT_WARDEN_EVERY) * DESCENT_ILVL_PER_WARDEN;
}

function descentMagicFind() {
  if (!S.descent || !S.descent.active) return 0;
  return (S.descent.floor - 1) * DESCENT_FIND_PER_FLOOR;
}
