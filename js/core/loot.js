/* ===========================================================================
   LOOT — generating items, rolling drops, salvaging.
   ---------------------------------------------------------------------------
   Generated gear gets a stat budget from its item level and rarity, then
   spends it: roughly half on the primary stat, a quarter on Stamina, the rest
   on secondaries. Armour slots get flat armour on top, scaled by whether the
   piece is plate (Strength), leather (Agility) or cloth (Intellect).

   The name is assembled from the item's own properties, so it always makes
   sense: an Agility weapon is a Dagger "of the Viper", never a Warhammer.
   =========================================================================== */

/* Armour weight by slot, then by archetype. */
const ARMOR_SLOT_WEIGHT = {
  chest: 1.0, legs: 0.86, helm: 0.76, shoulders: 0.66,
  boots: 0.62, gloves: 0.56, waist: 0.56, wrist: 0.42, cape: 0.34,
};
const ARMOR_CLASS_MULT = { str: 1.45, agi: 1.0, int: 0.62 };

/* Which secondaries suit which archetype, so rolls feel intentional. */
const SECONDARY_AFFINITY = {
  str: { crit: 1.0, haste: 0.9, block: 1.3, critDmg: 1.1, thorns: 1.0, lifesteal: 0.8, dodge: 0.5 },
  agi: { crit: 1.5, haste: 1.4, dodge: 1.3, critDmg: 1.2, lifesteal: 0.9, block: 0.2, thorns: 0.3 },
  int: { crit: 1.4, haste: 1.4, critDmg: 1.1, lifesteal: 0.7, dodge: 0.7, block: 0.2, thorns: 0.4 },
};

/* ---------------------------------------------------------------------------
   POWER CURVES
   Gear is the main source of power, so its curve is what the whole game is
   balanced against. Both of these are super-linear: an item level 50 piece is
   far more than five times an item level 10 piece, which is what makes a new
   tier of gear feel like an event rather than a small percentage.
   Enemy Health in combat.js is fitted to these two curves — change one and you
   must re-check the other.
   --------------------------------------------------------------------------- */
/* A two-hander gives up the entire off-hand slot, so it has to be worth roughly
   a weapon plus a shield. These two constants are what buy that back. */
const TWO_HAND_DPS_BONUS = 1.55;
const TWO_HAND_STAT_BONUS = 1.45;

/* Special properties, and the aspects drawn from them, only start dropping on
   gear at this item level and above. */
const ASPECT_MIN_ILVL = 40;

function itemBudget(ilvl) { return 6 + 0.72 * Math.pow(ilvl, 1.38); }
function weaponDps(ilvl) { return 4 + 1.53 * Math.pow(ilvl, 1.38); }
function armorBase(ilvl) { return 8 + 1.60 * Math.pow(ilvl, 1.30); }

function tierForIlvl(ilvl) {
  if (ilvl <= 13) return 1;
  if (ilvl <= 24) return 2;
  if (ilvl <= 34) return 3;
  if (ilvl <= 43) return 4;
  return 5;
}

/* ---------------------------------------------------------------------------
   generateItem — the workhorse.
   opts: { ilvl, rarity, slot, primary }  (any may be omitted and rolled)
   --------------------------------------------------------------------------- */
function generateItem(opts) {
  const o = opts || {};
  const ilvl = Math.max(1, Math.round(o.ilvl || 1));
  const rarity = o.rarity || rollRarity(0);
  const slot = o.slot || pick(SLOT_TYPES);
  const primary = o.primary || pick(["str", "agi", "int"]);
  const R = RARITIES[rarity];
  const tier = tierForIlvl(ilvl);

  const budget = itemBudget(ilvl) * R.budget;
  const stats = {};

  // --- primary stat: about 46% of budget, with a little variance
  const primShare = rand(0.40, 0.52);
  stats[primary] = Math.max(1, Math.round(budget * primShare / 1.0));

  // --- Spirit riders on Intellect gear, so healing builds have something to wear
  if (primary === "int" && Math.random() < 0.45) {
    stats.spi = Math.max(1, Math.round(budget * rand(0.10, 0.18)));
  }

  // --- stamina: about 26%
  stats.sta = Math.max(1, Math.round(budget * rand(0.20, 0.30)));

  // --- secondaries fill what is left
  let remaining = budget * rand(0.20, 0.30);
  const affinity = SECONDARY_AFFINITY[primary];
  const picks = [];
  const pool = SECONDARY_POOL.slice();
  const nSecondary = Math.min(R.stats, 3);
  // a forge can guarantee one chosen secondary; it takes the first slot and the
  // rest fill in randomly as usual
  if (o.forceSecondary) {
    const fi = pool.findIndex(p => p.key === o.forceSecondary);
    if (fi >= 0) { picks.push(pool[fi]); pool.splice(fi, 1); }
  }
  for (let i = picks.length; i < nSecondary && pool.length; i++) {
    const weights = {};
    pool.forEach((p, idx) => { weights[idx] = (affinity[p.key] || 0.5); });
    const idx = parseInt(weightedPick(weights), 10);
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }
  for (const sec of picks) {
    const chunk = remaining / picks.length;
    const val = chunk / sec.cost;
    if (val < 0.1) continue;
    const rounded = sec.key === "critDmg" || sec.key === "thorns"
      ? Math.round(val) : Math.round(val * 10) / 10;
    if (rounded > 0) stats[sec.key] = (stats[sec.key] || 0) + rounded;
  }

  // --- armour on armour slots
  if (ARMOR_SLOTS.includes(slot)) {
    const w = ARMOR_SLOT_WEIGHT[slot] || 0.5;
    stats.armor = Math.round(armorBase(ilvl) * w * (ARMOR_CLASS_MULT[primary] || 1) * (0.9 + R.budget * 0.25));
  }

  // --- base type and, for weapons, damage
  const baseList = (ITEM_BASES[slot] && ITEM_BASES[slot][primary]) || ["Relic"];
  const baseName = pick(baseList);
  const item = {
    uid: uid(),
    name: "",
    base: baseName,
    slot, rarity, ilvl, primary, tier,
    stats,
    enchant: null,
  };

  if (slot === "mainhand") {
    const prof = WEAPON_PROFILES[baseName] || DEFAULT_WEAPON_PROFILE;
    const twoHand = prof.hands === 2;
    const dps = weaponDps(ilvl) * R.budget * (twoHand ? TWO_HAND_DPS_BONUS : 1);
    const avg = dps * prof.speed;
    item.weapon = {
      min: Math.max(1, Math.round(avg * (1 - prof.spread))),
      max: Math.max(2, Math.round(avg * (1 + prof.spread))),
      speed: prof.speed,
    };
    item.scalesWith = primary;
    if (twoHand) {
      item.hands = 2;
      // a two-hander also carries the stat budget the lost off-hand would have held
      for (const k of ["str", "agi", "int", "spi", "sta"]) {
        if (item.stats[k]) item.stats[k] = Math.round(item.stats[k] * TWO_HAND_STAT_BONUS);
      }
    }
  }

  // Epics and Legendaries carry a special property. This is what makes a
  // Legendary feel different rather than simply larger. Procs (and therefore the
  // aspects extracted from them) only begin appearing on late-game gear, so the
  // aspect system is something the endgame opens up rather than a level-1 chore.
  const procTier = PROC_TIERS[rarity];
  if (procTier && ilvl >= ASPECT_MIN_ILVL) {
    const pool = PROC_POOL[primary] || PROC_POOL.str;
    item.proc = {
      id: pick(pool),
      chance: Math.round(rand(procTier.chance[0], procTier.chance[1])),
      potency: Math.round(rand(procTier.potency[0], procTier.potency[1]) * 100) / 100,
    };
  }
  if (slot === "offhand" && primary === "str") {
    stats.block = (stats.block || 0) + Math.round((2 + ilvl * 0.09) * 10) / 10;
    stats.armor = Math.round(armorBase(ilvl) * 1.15 * (0.9 + R.budget * 0.3));
  }

  item.name = nameItem(item);
  item.value = itemGoldValue(item);
  return item;
}

/* Assembles Prefix + Base + Suffix from the item's own properties. */
function nameItem(item) {
  const prefixes = PREFIXES[item.tier] || PREFIXES[1];
  const prefix = pick(prefixes);

  // suffix comes from the highest-magnitude stat that has a suffix list
  let bestKey = item.primary, bestVal = -1;
  for (const k of ["str", "agi", "int", "spi", "sta"]) {
    const v = item.stats[k] || 0;
    if (v > bestVal) { bestVal = v; bestKey = k; }
  }
  const suffix = pick(SUFFIXES[bestKey] || SUFFIXES.str);
  return `${prefix} ${item.base} ${suffix}`;
}

function itemGoldValue(item) {
  const R = RARITIES[item.rarity];
  return Math.max(1, Math.round((4 + Math.pow(item.ilvl, 1.45) * 1.1) * R.budget * R.budget));
}

/* Build a real item from a boss's handcrafted drop definition. */
function makeUnique(def) {
  const item = {
    uid: uid(),
    name: def.name,
    base: def.name,
    slot: def.slot,
    rarity: def.rarity,
    ilvl: def.ilvl,
    primary: def.stats.int ? "int" : (def.stats.agi ? "agi" : "str"),
    tier: tierForIlvl(def.ilvl),
    stats: Object.assign({}, def.stats),
    enchant: null,
    unique: def.id,
  };
  if (def.weapon) {
    item.weapon = Object.assign({}, def.weapon);
    item.scalesWith = def.scalesWith || item.primary;
    if (def.hands === 2) item.hands = 2;
  }
  if (def.proc) item.proc = Object.assign({}, def.proc);
  item.value = itemGoldValue(item) * 3;
  return item;
}

/* Turns a hand-written Unique definition into a real item. */
function makeUnique2(def) {
  const primary = def.stats.int ? "int" : (def.stats.agi ? "agi" : "str");
  const item = {
    uid: uid(),
    name: def.name,
    base: def.name,
    slot: def.slot,
    rarity: "unique",
    ilvl: def.ilvl,
    primary,
    tier: tierForIlvl(def.ilvl),
    stats: Object.assign({}, def.stats),
    enchant: null,
    uniqueId: def.id,
    flavour: def.flavour,
    passive: { id: def.passive.id, name: def.passive.name, text: def.passive.text },
  };
  if (def.weapon) {
    item.weapon = Object.assign({}, def.weapon);
    item.scalesWith = def.scalesWith || primary;
    if (def.hands === 2) item.hands = 2;
  }
  item.value = Math.round(itemGoldValue(item) * 5);
  return item;
}

/* Whichever primary stat the character is actually built around, judged by what
   they are wearing. Used so a set piece never arrives carrying the wrong stat. */
function dominantPrimary() {
  const totals = { str: 0, agi: 0, int: 0 };
  for (const slot of SLOTS) {
    const it = S.equipment[slot.key];
    if (!it || !it.stats) continue;
    for (const k in totals) totals[k] += it.stats[k] || 0;
  }
  const mh = S.equipment.mainhand;
  if (mh && mh.scalesWith && totals[mh.scalesWith] !== undefined) totals[mh.scalesWith] += 60;
  let best = "str";
  for (const k in totals) if (totals[k] > totals[best]) best = k;
  return best;
}

/* A set piece. Built through the ordinary generator so its stats sit on the same
   curve as everything else, then stamped with the set identity.

   The primary stat follows the CHARACTER, not the set. A set that hardcoded its
   own stat handed Intellect gear to a Strength build, which in a classless game
   makes half the endgame sets unwearable through no fault of the player. The set
   bonuses are already written to be school-agnostic; this makes the raw stats
   agree with them. */
/* A set piece carries the stat its SET is built around, not the stat the wearer
   happens to favour. That is the point of a set: finding four fifths of a
   Strength set on an Intellect character should be a real temptation to change
   how you fight, which it cannot be if the pieces quietly rewrite themselves to
   whatever you are already wearing.
   Spirit is not a gear primary, so a Spirit set is Intellect gear with the Spirit
   rider guaranteed instead of left to a 45% roll. */
const SET_ITEM_PRIMARY = { str: "str", agi: "agi", int: "int", spi: "int" };

function makeSetPiece(def) {
  const item = generateItem({
    ilvl: def.ilvl,
    rarity: SET_RARITY,
    slot: def.slot,
    primary: SET_ITEM_PRIMARY[def.primary] || "str",
  });
  if (def.primary === "spi") {
    const rider = Math.round(itemBudget(def.ilvl) * RARITIES[SET_RARITY].budget * 0.16);
    item.stats.spi = Math.max(item.stats.spi || 0, rider);
  }
  item.name = def.name;
  item.base = def.name;
  item.setId = def.setId;
  item.setIndex = def.index;
  /* Set pieces keep the proc their rarity earns them. Stripping it — which an
     earlier pass did, reasoning that the set bonus was the special property —
     meant a five-piece set traded away five Legendary procs for three set
     bonuses and came out behind. The set bonus is meant to be on top. */
  item.value = Math.round(item.value * 1.5);
  return item;
}

/* Rarity roll. `bonus` is magic find as a percentage; it shifts weight upward. */
function rollRarity(bonus) {
  const b = 1 + (bonus || 0) / 100;
  const weights = {};
  for (const key of RARITY_ORDER) {
    const r = RARITIES[key];
    const upshift = key === "common" ? 1 / b : (key === "uncommon" ? 1 : Math.pow(b, 1.6));
    weights[key] = r.weight * upshift;
  }
  return weightedPick(weights);
}

/* ---------------------------------------------------------------------------
   rollRealmLoot — everything a single realm kill can give you.
   `lootMod` is 1 for a normal mob, higher for elites.
   --------------------------------------------------------------------------- */
function rollRealmLoot(realm, enemyLevel, lootMod, magicFind) {
  const t = TIER_MATS[realm.tier];
  const out = { materials: {}, items: [], gold: 0 };
  const mod = lootMod || 1;

  // materials — most kills give something
  const matRolls = [
    { id: t.metal, chance: 0.42, qty: [1, 3] },
    { id: t.hide, chance: 0.38, qty: [1, 3] },
    { id: t.wood, chance: 0.30, qty: [1, 2] },
    { id: t.herb, chance: 0.34, qty: [1, 3] },
    { id: t.essence, chance: 0.055, qty: [1, 1] },
  ];
  for (const roll of matRolls) {
    if (Math.random() < roll.chance * mod) {
      const q = Math.max(1, Math.round(randInt(roll.qty[0], roll.qty[1]) * mod));
      out.materials[roll.id] = (out.materials[roll.id] || 0) + q;
    }
  }

  // Finished gear. There is no auction house and no trading, so this is the only
  // way slots get filled other than crafting — it has to be generous enough that
  // fifteen slots fill up in a reasonable number of kills.
  const gearChance = 0.17 * mod * (1 + (magicFind || 0) / 100);
  if (Math.random() < gearChance) {
    out.items.push(generateItem({
      ilvl: Math.max(1, enemyLevel + randInt(-2, 2)),
      rarity: rollRarity((magicFind || 0) + (mod - 1) * 40),
    }));
  }

  return out;
}

/* Boss drops: roll every entry in the table independently. */
function rollBossLoot(boss, magicFind) {
  const out = { items: [], gold: 0 };
  const mf = 1 + (magicFind || 0) / 100;
  for (const def of boss.drops) {
    if (Math.random() < def.chance * mf) out.items.push(makeUnique(def));
  }
  // and the Unique this boss guards, if it has one
  for (const uq of uniquesForBoss(boss.id)) {
    if (Math.random() < uq.chance * mf) out.items.push(makeUnique2(uq));
  }
  // each boss in a raid guards one piece of that raid's sets, in order
  const setDef = setPieceForBoss(boss.id);
  const setOdds = Math.min(SET_DROP_CHANCE * setPoolSizeForBoss(boss.id), 0.45);
  if (setDef && Math.random() < setOdds * mf) out.items.push(makeSetPiece(setDef));
  // a stone for the socket, sometimes
  if (typeof rollGem === "function" && Math.random() < GEM_DROP_CHANCE * mf) {
    out.gems = out.gems || [];
    out.gems.push(rollGem(boss.lvl));
  }
  // bosses also always cough up a piece of ordinary gear
  out.items.push(generateItem({
    ilvl: boss.lvl + randInt(0, 2),
    rarity: rollRarity(35 + (magicFind || 0)),
  }));
  return out;
}

/* ---------------------------------------------------------------------------
   Salvage — gear back into materials, potions back into herbs.
   --------------------------------------------------------------------------- */
function salvageReturns(item) {
  const R = RARITIES[item.rarity];
  const t = TIER_MATS[item.tier] || TIER_MATS[1];
  const out = {};
  const base = R.salvage;

  if (["mainhand", "offhand", "ring", "trinket"].includes(item.slot) || item.primary === "str") {
    out[t.metal] = Math.max(1, Math.round(base * rand(0.7, 1.3)));
  }
  if (item.primary === "agi" || item.primary === "int") {
    out[t.hide] = Math.max(1, Math.round(base * rand(0.7, 1.3)));
  }
  if (item.slot === "mainhand" || item.slot === "offhand") {
    out[t.wood] = Math.max(1, Math.round(base * 0.6));
  }
  if (item.rarity === "rare" || item.rarity === "epic" || item.rarity === "legendary") {
    out[t.essence] = Math.max(1, Math.round(base * 0.25));
  }
  // arcane dust is the enchanting currency and only comes from here
  const dustChance = { common: 0.15, uncommon: 0.4, rare: 1, epic: 1, legendary: 1 }[item.rarity];
  if (Math.random() < dustChance) {
    out.m_dust = Math.max(1, Math.round(base * 0.5 * rand(0.8, 1.4)));
  }
  return out;
}

function potionSalvageReturns(potion) {
  const t = TIER_MATS[potion.tier] || TIER_MATS[1];
  return { [t.herb]: 1 };
}
