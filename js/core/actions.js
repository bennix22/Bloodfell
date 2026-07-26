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
    if (it && it.slot === slot) out.push({ item: it, worn: true });
  }
  for (const it of S.inventory) if (it.slot === slot) out.push({ item: it, worn: false });
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
