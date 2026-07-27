/* ===========================================================================
   CHARACTER — turning gear + talents + buffs into numbers combat can use.
   ---------------------------------------------------------------------------
   Everything funnels through one modifier bag. Item stats, talent ranks,
   enchants, potion buffs and spell buffs all speak the same keys, so adding a
   new source of power never means touching the combat code.

   ORDER OF OPERATIONS
     1. base stats from level
     2. + flat stats from gear, enchants, talents, buffs
     3. x percent multipliers (strPct, hpPct, armorPct ...)
     4. derive Health, Mana, crit, dodge, swing damage
   =========================================================================== */

const PRIMARIES = ["str", "agi", "int", "spi"];
const FIST = { min: 3, max: 6, speed: 2.0, scalesWith: "str" };

/* Reference swing speed. Attack power per swing and normalised spell damage are
   both expressed against this, so weapon speed changes the rhythm of a fight
   without changing its total output. */
const NORM_SPEED = 2.4;

/* Mana recovered per second, as a fraction of the maximum pool. */
const MANA_REGEN_BASE = 0.016;
const MANA_REGEN_SPIRIT_CAP = 0.014;
/* Flat regen floor, so a build with almost no mana pool still recovers enough to
   use its handful of spells. Scales with level, not with the pool. */
const MANA_REGEN_FLOOR = 4;

/* How much Intellect and Spirit count toward spell COSTS versus toward the pool.
   1 would mean costs track the pool exactly, so more Intellect changes nothing
   about how many spells you can afford (the old behaviour). Below 1, extra
   Intellect buys extra casts, with diminishing but never-reversing returns. */
const MANA_COST_STAT_CREDIT = 0.6;

/* Base stats a character has with no gear at all. */
function baseStats(level) {
  return {
    str: 10 + Math.round(level * 1.6),
    agi: 10 + Math.round(level * 1.6),
    int: 10 + Math.round(level * 1.6),
    spi: 10 + Math.round(level * 1.6),
    sta: 12 + Math.round(level * 2.2),
  };
}

function emptyMods() { return {}; }

function addMods(into, from, scale) {
  if (!from) return into;
  const k = scale === undefined ? 1 : scale;
  for (const key in from) into[key] = (into[key] || 0) + from[key] * k;
  return into;
}

/* How many pieces of each set are worn, and which bonus tiers that unlocks. */
function collectSets() {
  const counts = {};
  for (const slot of SLOTS) {
    const item = S.equipment[slot.key];
    if (item && item.setId) counts[item.setId] = (counts[item.setId] || 0) + 1;
  }
  const active = [];
  for (const id in counts) {
    const set = setById(id);
    if (!set) continue;
    const tiers = Object.keys(set.bonuses).map(Number).sort((a, b) => a - b);
    active.push({
      id, set, worn: counts[id],
      tiers: tiers.map(n => ({ need: n, on: counts[id] >= n, ...set.bonuses[n] })),
    });
  }
  return active;
}

/* Every proc currently active, from gear and from talents. Cached onto the stat
   block so combat does not re-walk fifteen slots and forty talents on every hit. */
function collectEffects() {
  /* Two sources of the same proc are merged into one entry rather than rolled
     twice. Merging keeps the character sheet honest — one Windfury line instead
     of three — and makes the maths obvious: chances add, and the strongest
     potency wins. Chance is capped so a heavily stacked proc cannot exceed
     certainty. */
  const merged = {};

  const add = (id, chance, potency) => {
    if (!merged[id]) merged[id] = { id, chance: 0, potency: 0, sources: 0 };
    merged[id].chance += chance;
    merged[id].potency = Math.max(merged[id].potency, potency);
    merged[id].sources++;
  };

  for (const slot of SLOTS) {
    const item = S.equipment[slot.key];
    if (item && item.proc) add(item.proc.id, item.proc.chance, item.proc.potency || 1);
    // a gem may carry a proc of its own, which merges like any other source
    for (const key of (item && item.sockets) || []) {
      const g = key && typeof gemById === "function" ? gemById(key) : null;
      if (g && g.effect) add(g.effect.id, g.effect.chance, g.effect.potency || 1);
    }
  }
  // set bonuses can grant procs too, and merge with everything else
  for (const s of collectSets()) {
    for (const t of s.tiers) {
      if (t.on && t.effect) add(t.effect.id, t.effect.chance, t.effect.potency || 1);
    }
  }
  // and so can Descent boons
  for (const e of descentBoonEffects()) add(e.id, e.chance, e.potency);
  for (const id in S.talents) {
    const rank = S.talents[id];
    if (!rank) continue;
    const t = talentById(id);
    if (!t || !t.effect) continue;
    add(t.effect.id, t.effect.chance * rank, t.effect.potency || 1);
  }

  const out = [];
  for (const id in merged) {
    merged[id].chance = Math.min(100, Math.round(merged[id].chance * 10) / 10);
    out.push(merged[id]);
  }

  /* Grouped by when they fire, then by how often. Without this the list came out
     in whatever order the equipment happened to sit in, which changes every time
     you swap a piece. */
  const order = { open: 0, hit: 1, crit: 2, hurt: 3, kill: 4 };
  out.sort((a, b) => {
    const da = EFFECTS[a.id], db = EFFECTS[b.id];
    const ta = order[da ? da.trigger : "hit"] ?? 9;
    const tb = order[db ? db.trigger : "hit"] ?? 9;
    if (ta !== tb) return ta - tb;
    if (b.chance !== a.chance) return b.chance - a.chance;
    return (da ? da.name : a.id).localeCompare(db ? db.name : b.id);
  });
  return out;
}

/* Every modifier source except transient combat buffs. */
function collectPersistentMods() {
  const mods = emptyMods();

  // gear
  for (const slot of SLOTS) {
    const item = S.equipment[slot.key];
    if (!item) continue;
    addMods(mods, item.stats);
    // socketed gems
    for (const key of item.sockets || []) {
      const g = key && typeof gemById === "function" ? gemById(key) : null;
      if (g) addMods(mods, g.mods);
    }
    if (item.enchant) {
      const e = ENCHANTS.find(x => x.id === item.enchant);
      if (e) addMods(mods, e.mods);
    }
  }

  // set bonuses
  for (const s of collectSets()) {
    for (const t of s.tiers) if (t.on && t.mods) addMods(mods, t.mods);
  }

  // boons chosen during a Descent
  addMods(mods, descentBoonMods());

  // the flask currently holding, if any
  if (S.flask && S.flask.mods) addMods(mods, S.flask.mods);

  // passives that change the character sheet rather than the fight
  addMods(mods, passiveStatMods());

  // talents
  for (const id in S.talents) {
    const rank = S.talents[id];
    if (!rank) continue;
    const t = talentById(id);
    if (t) addMods(mods, t.mods, rank);
  }

  return mods;
}

/* How many points are invested in a given tree. */
function pointsInTree(treeId) {
  const tree = TALENT_TREES.find(t => t.id === treeId);
  if (!tree) return 0;
  let n = 0;
  for (const t of tree.talents) n += S.talents[t.id] || 0;
  return n;
}

function pointsSpent() {
  let n = 0;
  for (const id in S.talents) n += S.talents[id];
  return n;
}

function pointsAvailable() {
  return totalTalentPoints(S.level) - pointsSpent();
}

/* Spells the character currently has access to. */
function unlockedSpells() {
  const out = [];
  for (const tree of TALENT_TREES) {
    const pts = pointsInTree(tree.id);
    for (const sp of SPELLS) {
      if (sp.tree === tree.id && pts >= sp.req) out.push(sp);
    }
  }
  // honour the player's chosen cast order, then append anything new
  const ordered = [];
  for (const id of S.spellOrder) {
    const sp = out.find(s => s.id === id);
    if (sp) ordered.push(sp);
  }
  for (const sp of out) if (!ordered.includes(sp)) ordered.push(sp);
  return ordered;
}

/* ---------------------------------------------------------------------------
   The big one. `extraMods` is where combat passes in active buffs.
   --------------------------------------------------------------------------- */
function computeStats(extraMods) {
  const mods = collectPersistentMods();
  if (extraMods) addMods(mods, extraMods);

  const base = baseStats(S.level);
  const st = {};

  for (const p of PRIMARIES) {
    const flat = base[p] + (mods[p] || 0);
    st[p] = Math.round(flat * (1 + (mods[p + "Pct"] || 0) / 100));
  }
  const staFlat = base.sta + (mods.sta || 0);
  st.sta = Math.round(staFlat * (1 + (mods.staPct || 0) / 100));

  // pools
  st.maxHp = Math.round((140 + st.sta * 11 + S.level * 26) * (1 + (mods.hpPct || 0) / 100));
  st.maxMana = Math.round((110 + st.int * 3.4 + st.spi * 2.6 + S.level * 9) * (1 + (mods.manaPct || 0) / 100));

  /* Reference pool used for spell COSTS, separate from the actual pool. It credits
     Intellect and Spirit at a reduced rate (MANA_COST_STAT_CREDIT) instead of in
     full, so investing in those stats genuinely buys more casts rather than raising
     costs in lockstep with the pool. Before this, a spell cost a flat percentage of
     the live pool — which grew with Intellect exactly as fast as the pool did, so
     more Intellect changed a caster's damage per cast but never how many casts they
     could afford. Level is credited in full, so mana stays a real constraint as you
     level; max-mana buffs are excluded entirely, so a +max-mana effect is pure
     casting headroom. Casts from a full pool then range from 1/manaPct with no
     investment up toward 1/(credit*manaPct) as the stat climbs — always rewarding,
     never unbounded. */
  const manaFlat = 110 + S.level * 9;
  const manaFromStats = st.int * 3.4 + st.spi * 2.6;
  st.manaCostPool = Math.round(manaFlat + manaFromStats * MANA_COST_STAT_CREDIT);

  /* Regeneration is a share of the pool per second rather than a flat trickle,
     for the same reason spell costs are: a flat number is meaningless once the
     pool is large. MANA_REGEN_BASE is what a character with no Spirit recovers;
     Spirit roughly doubles it at the high end. Together with percentage-based
     spell costs this leaves a caster draining slowly through a long run and
     forced to rest, drink, or retreat. */
  const spiritShare = Math.min(MANA_REGEN_SPIRIT_CAP, st.spi / (st.spi + 900) * MANA_REGEN_SPIRIT_CAP * 2);
  /* Regen has two parts: a share of the pool (so a big caster pool refills at a
     sensible rate) and a flat floor scaled to level (so a martial build with a
     tiny pool is not left with a trickle). Without the floor, the builds that
     want mana least were the ones that ran dry, because their small pool made
     both their costs and their regen small. */
  const poolPart = st.maxMana * (MANA_REGEN_BASE + spiritShare);
  const floorPart = MANA_REGEN_FLOOR * (1 + S.level * 0.12);
  st.manaRegen = (poolPart + floorPart) * (1 + (mods.manaRegen || 0) / 100);

  // mitigation
  st.armor = Math.round(Math.max(0, (mods.armor || 0)) * (1 + (mods.armorPct || 0) / 100));
  st.dr = clamp(mods.dr || 0, 0, 60);
  st.dodge = clamp(3 + st.agi * 0.010 + (mods.dodge || 0), 0, 50);
  st.block = clamp(mods.block || 0, 0, 55);
  st.thorns = mods.thorns || 0;

  // offence
  st.crit = clamp(4 + st.agi * 0.012 + (mods.crit || 0), 0, 75);
  st.critMult = 1.75 + (mods.critDmg || 0) / 100;
  st.haste = mods.haste || 0;
  st.lifesteal = clamp(mods.lifesteal || 0, 0, 60);
  st.physDmg = mods.physDmg || 0;
  st.magicDmg = mods.magicDmg || 0;
  st.allDmg = mods.allDmg || 0;
  st.healPct = mods.healPct || 0;
  st.execDmg = mods.execDmg || 0;
  st.cdr = clamp(mods.cdr || 0, 0, 60);
  st.goldFind = mods.goldFind || 0;
  st.magicFind = mods.magicFind || 0;
  st.xpBonus = mods.xpBonus || 0;

  // weapon
  const mh = S.equipment.mainhand;
  const w = (mh && mh.weapon) ? mh.weapon : FIST;
  const scaleStat = (mh && mh.scalesWith) ? mh.scalesWith : FIST.scalesWith;
  st.weapon = { min: w.min, max: w.max, speed: w.speed, scalesWith: scaleStat };
  // speed-normalised so a slow weapon hits harder per swing, not per second
  st.apPerSwing = st[scaleStat] * 0.62 * (w.speed / NORM_SPEED);
  st.swingMin = w.min + st.apPerSwing;
  st.swingMax = w.max + st.apPerSwing;
  st.swingTime = w.speed / (1 + st.haste / 100);
  st.dps = ((st.swingMin + st.swingMax) / 2) / st.swingTime;

  /* Normalised swing damage: what this weapon would hit for if it swung at the
     reference speed. Spells that scale off "weapon damage" fire on a fixed
     cooldown, so if they used raw swing damage a slow weapon would make every
     spell hit proportionally harder for free — a 3.5s weapon was landing 2.2x
     the spell damage of a 1.6s weapon of identical dps, which quietly made fast
     weapons a trap and punished Rogues for using daggers. Spells therefore scale
     with weapon DPS, not weapon speed. */
  st.normMin = w.min * (NORM_SPEED / w.speed) + st[scaleStat] * 0.62;
  st.normMax = w.max * (NORM_SPEED / w.speed) + st[scaleStat] * 0.62;

  st.mods = mods;
  st.effects = collectEffects();
  st.passives = collectPassives();
  st.sets = collectSets();
  return st;
}

/* Damage after armour. Mirrors the classic diminishing-returns curve. */
function armorReduction(armor, attackerLevel) {
  const k = armor / (armor + 420 + 52 * attackerLevel);
  return clamp(k, 0, 0.75);
}

/* A single number for "is this item better than that item". Rough on purpose:
   it exists to sort the inventory, not to make decisions for you. */
function itemScore(item) {
  if (!item) return 0;
  let s = 0;
  const st = item.stats || {};
  s += (st.str || 0) + (st.agi || 0) + (st.int || 0) + (st.spi || 0);
  s += (st.sta || 0) * 0.9;
  s += (st.armor || 0) * 0.09;
  s += (st.crit || 0) * 9 + (st.haste || 0) * 9 + (st.dodge || 0) * 8 + (st.block || 0) * 7;
  s += (st.critDmg || 0) * 4 + (st.lifesteal || 0) * 14 + (st.thorns || 0) * 6;
  if (item.weapon) s += ((item.weapon.min + item.weapon.max) / 2) / item.weapon.speed * 6;
  return Math.round(s);
}

function levelUpIfReady() {
  let leveled = false;
  while (S.level < MAX_LEVEL && S.xp >= xpToNext(S.level)) {
    S.xp -= xpToNext(S.level);
    S.level++;
    leveled = true;
  }
  if (S.level >= MAX_LEVEL) S.xp = Math.min(S.xp, xpToNext(MAX_LEVEL));
  return leveled;
}
