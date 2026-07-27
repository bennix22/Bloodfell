/* ===========================================================================
   ACTIONS — everything the player can do outside of a fight.
   Each function returns { ok, msg } so the UI can report success or refusal
   without knowing any rules itself.
   =========================================================================== */

const BS_RECIPES = buildBlacksmithRecipes();

/* Which equipment slots an item can go into. */
function slotsForItem(item) {
  if (item.slot === "ring") return ["ring1", "ring2"];
  if (item.slot === "trinket") return ["trinket1", "trinket2"];
  return [item.slot];
}

function isTwoHanded(item) { return !!(item && item.hands === 2); }

// Two Uniques is the ceiling. Their passives multiply together — three or four at
// once is where the immortal / 200k-crit spirals came from.
const MAX_EQUIPPED_UNIQUES = 2;

function equipItem(uidStr, preferredSlot) {
  const idx = S.inventory.findIndex(i => i.uid === uidStr);
  if (idx < 0) return { ok: false, msg: "That item is gone." };
  const item = S.inventory[idx];

  // two of the same Unique would stack a passive with itself, which none of them
  // are written to survive
  if (item.uniqueId) {
    for (const slot of SLOTS) {
      const worn = S.equipment[slot.key];
      if (worn && worn.uniqueId === item.uniqueId) {
        return { ok: false, msg: `You are already wearing ${item.name}.` };
      }
    }
    const wornUniques = SLOTS.filter(s => S.equipment[s.key] && S.equipment[s.key].uniqueId).length;
    if (wornUniques >= MAX_EQUIPPED_UNIQUES) {
      return { ok: false, msg: `You can wear at most ${MAX_EQUIPPED_UNIQUES} Uniques at once. Remove one first.` };
    }
  }

  // an off-hand cannot be worn alongside a two-hander
  if (item.slot === "offhand" && isTwoHanded(S.equipment.mainhand)) {
    return { ok: false, msg: `${S.equipment.mainhand.name} needs both hands.` };
  }

  const targets = slotsForItem(item);
  let slot = preferredSlot && targets.includes(preferredSlot) ? preferredSlot : null;
  if (!slot) slot = targets.find(s => !S.equipment[s]) || targets[0];

  const current = S.equipment[slot];
  S.inventory.splice(idx, 1);
  S.equipment[slot] = item;
  if (current) S.inventory.push(current);

  // putting on a two-hander frees whatever was in the off-hand
  let note = "";
  if (slot === "mainhand" && isTwoHanded(item) && S.equipment.offhand) {
    S.inventory.push(S.equipment.offhand);
    note = ` ${S.equipment.offhand.name} was unequipped.`;
    S.equipment.offhand = null;
  }

  saveGame();
  return { ok: true, msg: `Equipped ${item.name}.${note}` };
}

/* ---------------------------------------------------------------------------
   THE BANK — deliberate storage.
   Items here are out of play: auto-salvage never sees them, they are not
   candidates for equipping or selling, and nothing else in the game touches
   them. Unlimited, because the point is peace of mind, not another puzzle.
   --------------------------------------------------------------------------- */
function bankItem(uidStr) {
  const idx = S.inventory.findIndex(i => i.uid === uidStr);
  if (idx < 0) return { ok: false, msg: "That item is gone." };
  const item = S.inventory.splice(idx, 1)[0];
  S.bank.push(item);
  saveGame();
  return { ok: true, msg: `${item.name} stored in the bank.` };
}

function withdrawItem(uidStr) {
  const idx = S.bank.findIndex(i => i.uid === uidStr);
  if (idx < 0) return { ok: false, msg: "That item is gone." };
  const item = S.bank.splice(idx, 1)[0];
  S.inventory.push(item);
  saveGame();
  return { ok: true, msg: `${item.name} taken from the bank.` };
}

/* Stores everything a filter has narrowed the inventory down to, so tidying up
   is one click rather than fifty. */
function bankAll(uids) {
  let n = 0;
  for (const uid of uids) if (bankItem(uid).ok) n++;
  return { ok: n > 0, msg: n ? `Stored ${n} item${n > 1 ? "s" : ""}.` : "Nothing to store." };
}

function unequipItem(slotKey) {
  const item = S.equipment[slotKey];
  if (!item) return { ok: false, msg: "Nothing there." };
  S.equipment[slotKey] = null;
  S.inventory.push(item);
  saveGame();
  return { ok: true, msg: `Removed ${item.name}.` };
}

function sellItem(uidStr) {
  const idx = S.inventory.findIndex(i => i.uid === uidStr);
  if (idx < 0) return { ok: false, msg: "That item is gone." };
  const item = S.inventory[idx];
  S.inventory.splice(idx, 1);
  S.gold += item.value;
  S.tally.goldEarned += item.value;
  saveGame();
  return { ok: true, msg: `Sold ${item.name} for ${fmt(item.value)} gold.` };
}

/* An item's special property, in a form that can live in the aspect collection
   and later be stamped onto another item. Returns null if it has nothing to give.
   A Unique's passive is deliberately NOT extractable — those are meant to be the
   item, not a portable part. */
function extractAspect(item) {
  if (item.proc) {
    const def = EFFECTS[item.proc.id];
    return { kind: "proc", id: item.proc.id, chance: item.proc.chance, potency: item.proc.potency || 1,
             name: def ? def.name : item.proc.id, slot: item.slot };
  }
  return null;
}

function aspectLabel(a) {
  if (a.kind === "proc") return describeEffect({ id: a.id, chance: a.chance, potency: a.potency });
  return a.name;
}
function aspectShort(a) { return a.name; }

/* Salvaging pulls the aspect out before the item is destroyed, filing it under
   the slot it belongs to. */
function storeAspectFrom(item) {
  const a = extractAspect(item);
  if (!a) return null;
  if (!S.aspects[a.slot]) S.aspects[a.slot] = [];
  S.aspects[a.slot].push(a);
  return a;
}

function salvageItem(uidStr) {
  const idx = S.inventory.findIndex(i => i.uid === uidStr);
  if (idx < 0) return { ok: false, msg: "That item is gone." };
  const item = S.inventory[idx];
  const ret = salvageReturns(item);
  const aspect = storeAspectFrom(item);   // draw out its special property first
  S.inventory.splice(idx, 1);
  const parts = [];
  for (const id in ret) { addMaterial(id, ret[id]); parts.push(`${ret[id]} ${MATERIALS[id].name}`); }
  saveGame();
  const matMsg = parts.join(", ") || "nothing usable";
  return { ok: true, aspect, returns: ret,
    msg: aspect ? `Salvaged ${item.name}: ${matMsg}, and drew out its ${aspect.name} aspect.`
                : `Salvaged ${item.name}: ${matMsg}.` };
}

/* Bulk actions on the inventory, filtered by rarity. */
function sellAllOfRarity(rarities) {
  let gold = 0, n = 0;
  S.inventory = S.inventory.filter(item => {
    if (item.uniqueId || item.setId) return true;
    if (rarities.includes(item.rarity)) { gold += item.value; n++; return false; }
    return true;
  });
  S.gold += gold;
  S.tally.goldEarned += gold;
  saveGame();
  return { ok: true, msg: n ? `Sold ${n} items for ${fmt(gold)} gold.` : "Nothing matched." };
}

function salvageAllOfRarity(rarities) {
  const totals = {};
  let n = 0;
  S.inventory = S.inventory.filter(item => {
    if (item.uniqueId || item.setId) return true;
    if (!rarities.includes(item.rarity)) return true;
    const ret = salvageReturns(item);
    for (const id in ret) { addMaterial(id, ret[id]); totals[id] = (totals[id] || 0) + ret[id]; }
    n++;
    return false;
  });
  saveGame();
  const parts = Object.keys(totals).map(id => `${totals[id]} ${MATERIALS[id].name}`);
  return { ok: true, msg: n ? `Salvaged ${n} items: ${parts.join(", ")}.` : "Nothing matched." };
}

function salvagePotion(potionId, qty) {
  const po = potionById(potionId);
  if (!po) return { ok: false, msg: "Unknown potion." };
  const have = S.potions[potionId] || 0;
  const take = Math.min(have, qty || 1);
  if (!take) return { ok: false, msg: "None in stock." };
  takePotion(potionId, take);
  const ret = potionSalvageReturns(po);
  const parts = [];
  for (const id in ret) { addMaterial(id, ret[id] * take); parts.push(`${ret[id] * take} ${MATERIALS[id].name}`); }
  saveGame();
  return { ok: true, msg: `Broke down ${take} x ${po.name}: ${parts.join(", ")}.` };
}

/* Runs after every won fight. Keeps the inventory from filling with vendor
   trash without ever touching anything the player might actually want. */
const AUTO_SALVAGE_SETS = {
  off: [],
  common: ["common"],
  uncommon: ["common", "uncommon"],
  rare: ["common", "uncommon", "rare"],
  epic: ["common", "uncommon", "rare", "epic"],
  all: ["common", "uncommon", "rare", "epic", "legendary"],
};

function runAutoSalvage() {
  const set = AUTO_SALVAGE_SETS[S.settings.autoSalvage] || [];
  if (!set.length) return null;

  const sell = S.settings.autoSalvageMode === "sell";
  let n = 0, gold = 0;
  const mats = {};

  S.inventory = S.inventory.filter(item => {
    if (item.uniqueId || item.setId) return true;   // never sweep a Unique or a set piece
    if (!set.includes(item.rarity)) return true;
    n++;
    if (sell) {
      gold += item.value;
    } else {
      const ret = salvageReturns(item);
      for (const id in ret) { addMaterial(id, ret[id]); mats[id] = (mats[id] || 0) + ret[id]; }
      storeAspectFrom(item);
    }
    return false;
  });

  if (!n) return null;
  if (sell) { S.gold += gold; S.tally.goldEarned += gold; }
  return { n, gold, mats, sell };
}

/* Stamp a stored aspect onto an item. The aspect must have come from the same
   slot, and it REPLACES whatever special property the item currently has rather
   than adding to it — this is a tool for shaping a build, not inflating one. The
   item's original property, if it had one, is remembered so it can be restored. */
function applyAspect(uidStr, aspectIndex) {
  const item = S.inventory.find(i => i.uid === uidStr) || wornByUid(uidStr);
  if (!item) return { ok: false, msg: "That item is gone." };
  if (item.uniqueId) return { ok: false, msg: "A Unique cannot be reshaped." };

  const pool = S.aspects[item.slot] || [];
  const a = pool[aspectIndex];
  if (!a) return { ok: false, msg: "That aspect is no longer available." };

  // remember what was here so removing the aspect can put it back
  if (!item.baseProc && item.proc) item.baseProc = item.proc;
  item.proc = { id: a.id, chance: a.chance, potency: a.potency };
  item.aspect = { id: a.id, chance: a.chance, potency: a.potency, name: a.name };

  pool.splice(aspectIndex, 1);          // an aspect is consumed when applied
  saveGame();
  return { ok: true, msg: `Etched ${a.name} onto ${item.name}.` };
}

/* Remove an applied aspect. The aspect is returned to your collection and the
   item's original property, if any, comes back. */
function removeAspect(uidStr) {
  const item = S.inventory.find(i => i.uid === uidStr) || wornByUid(uidStr);
  if (!item || !item.aspect) return { ok: false, msg: "Nothing to remove." };

  if (!S.aspects[item.slot]) S.aspects[item.slot] = [];
  S.aspects[item.slot].push({ ...item.aspect, slot: item.slot });

  item.proc = item.baseProc || null;
  delete item.baseProc;
  delete item.aspect;
  saveGame();
  return { ok: true, msg: `Drew the aspect back out of ${item.name}.` };
}

function wornByUid(uid) {
  for (const slot of SLOTS) {
    const it = S.equipment[slot.key];
    if (it && it.uid === uid) return it;
  }
  return null;
}

/* Every item the player could stamp an aspect onto, worn or carried. */
function itemsForSlot(slot) {
  const out = [];
  for (const s of SLOTS) {
    const it = S.equipment[s.key];
    if (it && it.slot === slot && !it.uniqueId) out.push({ item: it, worn: true });
  }
  for (const it of S.inventory) if (it.slot === slot && !it.uniqueId) out.push({ item: it, worn: false });
  return out;
}

/* --------------------------------------------------------------------------
   Crafting
   -------------------------------------------------------------------------- */
function canCraft(recipe) {
  if (S.level < recipe.req) return { ok: false, msg: `Requires level ${recipe.req}` };
  if (S.gold < recipe.gold) return { ok: false, msg: "Not enough gold" };
  if (!hasMaterials(recipe.mats)) return { ok: false, msg: "Missing materials" };
  return { ok: true };
}

function craftBlacksmith(recipeId) {
  const r = BS_RECIPES.find(x => x.id === recipeId);
  if (!r) return { ok: false, msg: "Unknown recipe." };
  const chk = canCraft(r);
  if (!chk.ok) return { ok: false, msg: chk.msg + "." };

  S.gold -= r.gold;
  for (const id in r.mats) takeMaterial(id, r.mats[id]);

  const rarity = r.rarity || weightedPick(CRAFT_RARITY);
  const item = generateItem({ ilvl: r.ilvl, rarity, slot: r.slot, primary: r.primary });
  S.inventory.push(item);
  S.tally.items++;
  saveGame();
  return { ok: true, msg: `Forged ${item.name}.`, item };
}

/* ---------------------------------------------------------------------------
   THE FORGE — the reworked blacksmith. Instead of picking one of dozens of
   fixed recipes, you compose a piece: its slot, its primary stat, one secondary
   stat you want guaranteed, and a quality. Rare is the baseline; Epic costs
   extra essence and gold but rolls a bigger budget and an extra affix. The stat
   magnitudes still roll within a range, so forging the same piece again can give
   a better one — you control the shape, luck controls the size.
   --------------------------------------------------------------------------- */

/* The material and gold cost of a forge, before checking whether you can pay. */
function forgeCost(tier, slot, primary, quality) {
  const base = BS_RECIPES.find(r => r.tier === tier && r.slot === slot && r.primary === primary);
  if (!base) return null;
  const mats = {};
  for (const id in base.mats) mats[id] = base.mats[id];
  let gold = base.gold;
  if (quality === "epic") {
    // Epic is a real investment: more of everything, and a heavy essence premium
    for (const id in mats) mats[id] = Math.ceil(mats[id] * 1.6);
    const essId = TIER_MATS[tier].essence;
    mats[essId] = (mats[essId] || 0) + Math.ceil(tier * 1.5 + 1);
    gold = Math.round(gold * 2.4);
  }
  return { mats, gold, req: base.req, ilvl: base.ilvl };
}

function canForge(tier, slot, primary, quality) {
  const c = forgeCost(tier, slot, primary, quality);
  if (!c) return { ok: false, msg: "No such recipe" };
  if (S.level < c.req) return { ok: false, msg: `Requires level ${c.req}` };
  if (S.gold < c.gold) return { ok: false, msg: "Not enough gold" };
  if (!hasMaterials(c.mats)) return { ok: false, msg: "Missing materials" };
  return { ok: true };
}

function craftForge(tier, slot, primary, secondary, quality) {
  const c = forgeCost(tier, slot, primary, quality);
  if (!c) return { ok: false, msg: "Unknown recipe." };
  const chk = canForge(tier, slot, primary, quality);
  if (!chk.ok) return { ok: false, msg: chk.msg + "." };

  S.gold -= c.gold;
  for (const id in c.mats) takeMaterial(id, c.mats[id]);

  const rarity = quality === "epic" ? "epic" : "rare";
  const item = generateItem({
    ilvl: c.ilvl, rarity, slot, primary,
    forceSecondary: secondary && secondary !== "any" ? secondary : null,
  });
  S.inventory.push(item);
  S.tally.items++;
  saveGame();
  return { ok: true, msg: `Forged ${item.name}.`, item };
}

function brewPotion(potionId, qty) {
  const po = potionById(potionId);
  if (!po) return { ok: false, msg: "Unknown recipe." };
  const n = Math.max(1, qty || 1);
  if (S.level < po.req) return { ok: false, msg: `Requires level ${po.req}.` };
  if (S.gold < po.gold * n) return { ok: false, msg: "Not enough gold." };
  for (const id in po.mats) {
    if ((S.materials[id] || 0) < po.mats[id] * n) return { ok: false, msg: "Missing herbs." };
  }
  S.gold -= po.gold * n;
  for (const id in po.mats) takeMaterial(id, po.mats[id] * n);
  addPotion(po.id, n);
  saveGame();
  return { ok: true, msg: `Brewed ${n} x ${po.name}.` };
}

/* --------------------------------------------------------------------------
   Enchanting
   -------------------------------------------------------------------------- */
function applyEnchant(slotKey, enchantId) {
  const item = S.equipment[slotKey];
  if (!item) return { ok: false, msg: "Nothing equipped in that slot." };
  const e = ENCHANTS.find(x => x.id === enchantId);
  if (!e) return { ok: false, msg: "Unknown enchant." };

  const slotType = item.slot;
  if (!e.slots.includes(slotType)) return { ok: false, msg: `${e.name} cannot go on that slot.` };
  if (S.gold < e.gold) return { ok: false, msg: "Not enough gold." };
  if ((S.materials.m_dust || 0) < e.dust) return { ok: false, msg: "Not enough Arcane Dust." };

  S.gold -= e.gold;
  takeMaterial("m_dust", e.dust);
  const replaced = item.enchant;
  item.enchant = e.id;
  saveGame();
  return { ok: true, msg: replaced ? `Replaced the old enchant with ${e.name}.` : `Applied ${e.name}.` };
}

function removeEnchant(slotKey) {
  const item = S.equipment[slotKey];
  if (!item || !item.enchant) return { ok: false, msg: "No enchant to remove." };
  item.enchant = null;
  saveGame();
  return { ok: true, msg: "Enchant scoured off." };
}

/* --------------------------------------------------------------------------
   Talents
   -------------------------------------------------------------------------- */
function tierUnlocked(treeId, tier) {
  return pointsInTree(treeId) >= (tier - 1) * 5;
}

// The deepest tiers are meant to be a sharp, defining pick rather than a broad
// spread: you may invest in at most this many different talents per tier. Tiers
// below V are unlimited. (You can still max the ranks of the ones you do choose.)
const TIER_CHOICE_LIMIT = { 5: 2, 6: 1, 7: 1 };

function talentsChosenInTier(tree, tier) {
  return tree.talents.filter(x => x.tier === tier && (S.talents[x.id] || 0) > 0).length;
}

function canSpendTalent(talentId) {
  const t = talentById(talentId);
  if (!t) return { ok: false, msg: "Unknown talent." };
  if (S.level < TALENT_START_LEVEL) return { ok: false, msg: `Talents unlock at level ${TALENT_START_LEVEL}.` };
  if (pointsAvailable() <= 0) return { ok: false, msg: "No points available." };
  const tree = treeOfTalent(talentId);
  if ((S.talents[talentId] || 0) >= t.max) return { ok: false, msg: "Already at maximum rank." };
  if (!tierUnlocked(tree.id, t.tier)) {
    return { ok: false, msg: `Requires ${(t.tier - 1) * 5} points in ${tree.name}.` };
  }
  // deep tiers cap how many different talents you may invest in
  const limit = TIER_CHOICE_LIMIT[t.tier];
  if (limit && (S.talents[talentId] || 0) === 0 && talentsChosenInTier(tree, t.tier) >= limit) {
    return { ok: false, msg: `This tier allows only ${limit} talent${limit > 1 ? "s" : ""}. Refund one first.` };
  }
  return { ok: true };
}

function spendTalent(talentId) {
  const chk = canSpendTalent(talentId);
  if (!chk.ok) return chk;
  S.talents[talentId] = (S.talents[talentId] || 0) + 1;
  saveGame();
  return { ok: true };
}

/* Removing a point is blocked if it would strand a deeper tier. */
function refundTalent(talentId) {
  const cur = S.talents[talentId] || 0;
  if (!cur) return { ok: false, msg: "No points there." };
  const tree = treeOfTalent(talentId);
  const t = talentById(talentId);

  const after = pointsInTree(tree.id) - 1;
  for (const other of tree.talents) {
    if (other.id === talentId) continue;
    if ((S.talents[other.id] || 0) > 0 && after < (other.tier - 1) * 5) {
      return { ok: false, msg: `Remove points from ${other.name} first.` };
    }
  }
  if (after < (t.tier - 1) * 5 && cur - 1 > 0) {
    return { ok: false, msg: "That would break its own tier requirement." };
  }

  S.talents[talentId] = cur - 1;
  if (!S.talents[talentId]) delete S.talents[talentId];
  saveGame();
  return { ok: true };
}

function resetTalents() {
  S.talents = {};
  saveGame();
  return { ok: true, msg: "All talent points refunded." };
}

/* ===========================================================================
   TEMPERING — raising an item's level a little at a time.
   ---------------------------------------------------------------------------
   Each temper adds TEMPER_STEP item levels and rescales the item's stats onto
   the new budget, so a piece you like can keep pace instead of being retired.
   Costs climb steeply with each step, which is the point: this is where gold
   goes once you have everything you want.

   Uniques cannot be tempered. Their stats are hand written to a specific power
   level and rescaling them by budget would quietly undo that balance.
   =========================================================================== */
const TEMPER_STEP = 2;
const TEMPER_MAX_STEPS = 5;      // +10 item levels over an item's lifetime
const TEMPER_ILVL_CAP = 75;      // never past the level cap's gear

function findAnyItem(uidStr) {
  const inv = S.inventory.find(i => i.uid === uidStr);
  if (inv) return { item: inv, where: "inventory" };
  for (const s of SLOTS) {
    const it = S.equipment[s.key];
    if (it && it.uid === uidStr) return { item: it, where: "equipped" };
  }
  const bank = (S.bank || []).find(i => i.uid === uidStr);
  if (bank) return { item: bank, where: "bank" };
  return null;
}

function temperSteps(item) { return item.tempered || 0; }

function temperCost(item) {
  const step = temperSteps(item) + 1;
  const tier = tierForIlvl(item.ilvl);
  const gold = Math.round(40 * item.ilvl * Math.pow(step, 1.7));
  const mats = {};
  mats["m_ore" + Math.min(6, Math.max(1, tier))] = 4 + step * 2;
  mats["m_ess" + Math.min(6, Math.max(1, tier))] = step;
  return { gold, mats };
}

function canTemper(uidStr) {
  const found = findAnyItem(uidStr);
  if (!found) return { ok: false, msg: "That item is gone." };
  const item = found.item;
  if (item.uniqueId) return { ok: false, msg: "A Unique cannot be tempered." };
  if (temperSteps(item) >= TEMPER_MAX_STEPS) {
    return { ok: false, msg: `${item.name} has been tempered as far as it will go.` };
  }
  if (item.ilvl + TEMPER_STEP > TEMPER_ILVL_CAP) {
    return { ok: false, msg: `Nothing can be tempered past item level ${TEMPER_ILVL_CAP}.` };
  }
  const cost = temperCost(item);
  if (S.gold < cost.gold) return { ok: false, msg: "Not enough gold." };
  for (const id in cost.mats) {
    if ((S.materials[id] || 0) < cost.mats[id]) return { ok: false, msg: "Not enough materials." };
  }
  return { ok: true };
}

function temperItem(uidStr) {
  const check = canTemper(uidStr);
  if (!check.ok) return check;
  const { item } = findAnyItem(uidStr);
  const cost = temperCost(item);

  S.gold -= cost.gold;
  for (const id in cost.mats) takeMaterial(id, cost.mats[id]);

  const from = item.ilvl;
  const to = from + TEMPER_STEP;
  const ratio = itemBudget(to) / itemBudget(from);

  for (const k in item.stats) {
    const v = item.stats[k] * ratio;
    // primaries, stamina and armour are whole; percentages keep one decimal
    item.stats[k] = ["str", "agi", "int", "spi", "sta", "armor"].includes(k)
      ? Math.round(v) : Math.round(v * 10) / 10;
  }
  if (item.weapon) {
    item.weapon.min = Math.round(item.weapon.min * ratio);
    item.weapon.max = Math.round(item.weapon.max * ratio);
  }
  item.ilvl = to;
  item.tier = tierForIlvl(to);
  item.tempered = temperSteps(item) + 1;
  item.value = Math.round((item.value || 0) * ratio);

  saveGame();
  return { ok: true, msg: `${item.name} tempered to item level ${to}.` };
}

/* ===========================================================================
   SOCKETING — cutting a socket, and what goes in it.
   ---------------------------------------------------------------------------
   Sockets are cut one at a time and cost gold and metal. A gem dropped into a
   socket can be swapped whenever you like, but prising the old one out breaks
   it, so it is a real decision rather than free experimentation.
   =========================================================================== */
const MAX_SOCKETS = { common: 0, uncommon: 1, rare: 2, epic: 2, legendary: 3, set: 3, unique: 0 };
const SOCKET_MIN_ILVL = 15;

function socketsOn(item) { return item.sockets || []; }
function maxSocketsFor(item) { return MAX_SOCKETS[item.rarity] !== undefined ? MAX_SOCKETS[item.rarity] : 0; }

function socketCost(item) {
  const n = socketsOn(item).length + 1;
  const tier = tierForIlvl(item.ilvl);
  const gold = Math.round(120 * item.ilvl * Math.pow(n, 1.5));
  const mats = {};
  mats["m_ore" + Math.min(6, Math.max(1, tier))] = 6 + n * 4;
  return { gold, mats };
}

function canAddSocket(uidStr) {
  const found = findAnyItem(uidStr);
  if (!found) return { ok: false, msg: "That item is gone." };
  const item = found.item;
  if (item.uniqueId) return { ok: false, msg: "A Unique will not take a socket." };
  if (item.ilvl < SOCKET_MIN_ILVL) {
    return { ok: false, msg: `Sockets need item level ${SOCKET_MIN_ILVL} or better.` };
  }
  const max = maxSocketsFor(item);
  if (!max) return { ok: false, msg: `${RARITIES[item.rarity].name} items will not hold a socket.` };
  if (socketsOn(item).length >= max) {
    return { ok: false, msg: `${item.name} already has all ${max} of its sockets.` };
  }
  const cost = socketCost(item);
  if (S.gold < cost.gold) return { ok: false, msg: "Not enough gold." };
  for (const id in cost.mats) {
    if ((S.materials[id] || 0) < cost.mats[id]) return { ok: false, msg: "Not enough materials." };
  }
  return { ok: true };
}

function addSocket(uidStr) {
  const check = canAddSocket(uidStr);
  if (!check.ok) return check;
  const { item } = findAnyItem(uidStr);
  const cost = socketCost(item);
  S.gold -= cost.gold;
  for (const id in cost.mats) takeMaterial(id, cost.mats[id]);
  item.sockets = socketsOn(item).slice();
  item.sockets.push(null);
  saveGame();
  return { ok: true, msg: `A socket is cut into ${item.name}.` };
}

function setGem(uidStr, index, gemKeyStr) {
  const found = findAnyItem(uidStr);
  if (!found) return { ok: false, msg: "That item is gone." };
  const item = found.item;
  const sockets = socketsOn(item);
  if (index < 0 || index >= sockets.length) return { ok: false, msg: "No such socket." };
  if (!(S.gems[gemKeyStr] > 0)) return { ok: false, msg: "You have none of that gem." };
  const gem = gemById(gemKeyStr);
  if (!gem) return { ok: false, msg: "That gem does not exist." };

  const old = sockets[index];
  if (!takeGem(gemKeyStr, 1)) return { ok: false, msg: "You have none of that gem." };
  item.sockets = sockets.slice();
  item.sockets[index] = gemKeyStr;
  saveGame();
  const oldName = old ? gemById(old) : null;
  return {
    ok: true,
    msg: oldName ? `${gem.name} set; the ${oldName.name} broke coming out.`
                 : `${gem.name} set into ${item.name}.`,
  };
}

function clearSocket(uidStr, index) {
  const found = findAnyItem(uidStr);
  if (!found) return { ok: false, msg: "That item is gone." };
  const item = found.item;
  const sockets = socketsOn(item);
  if (!sockets[index]) return { ok: false, msg: "That socket is already empty." };
  const gem = gemById(sockets[index]);
  item.sockets = sockets.slice();
  item.sockets[index] = null;
  saveGame();
  return { ok: true, msg: `The ${gem ? gem.name : "gem"} is prised out and breaks.` };
}

/* ---------------------------------------------------------------------------
   FLASKS — one at a time, and it lasts the run rather than the fight.
   Drinking a second flask replaces the first; dying spills it (handled in the
   defeat path), as does withdrawing from a realm or the Descent.
   --------------------------------------------------------------------------- */
function drinkFlask(id) {
  const po = potionById(id);
  if (!po || po.kind !== "flask") return { ok: false, msg: "That is not a flask." };
  if ((S.potions[id] || 0) < 1) return { ok: false, msg: "You have none of those." };
  const had = S.flask;
  if (!takePotion(id, 1)) return { ok: false, msg: "You have none of those." };
  S.flask = { id: po.id, name: po.name, mods: po.mods };
  saveGame();
  return {
    ok: true,
    msg: had && had.id !== po.id
      ? `${po.name} drunk; it displaces your ${had.name}.`
      : `${po.name} drunk. It will hold until you fall or withdraw.`,
  };
}

function clearFlask(reason) {
  if (!S.flask) return null;
  const name = S.flask.name;
  S.flask = null;
  saveGame();
  return name;
}
