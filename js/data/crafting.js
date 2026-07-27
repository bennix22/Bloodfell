/* ===========================================================================
   CRAFTING — materials, blacksmithing, alchemy.
   ---------------------------------------------------------------------------
   Realms drop materials at their own tier (realms.js -> tier). Higher realms
   drop better materials, better materials make better gear. Finished gear also
   drops directly from mobs, but rarely.

   Salvaging gear returns materials of that item's tier plus Arcane Dust, which
   is the only thing enchanting is bought with. Salvaging potions returns herbs.
   =========================================================================== */

const MAT_TIER_NAMES = ["", "Tier I", "Tier II", "Tier III", "Tier IV", "Tier V"];

/* Six material lines, five tiers each. `cls` decides what salvage returns. */
const MATERIALS = {
  // --- metal (blacksmithing backbone)
  m_ore1: { name: "Rust Iron Ore", tier: 1, cls: "metal", value: 3 },
  m_ore2: { name: "Blackened Steel Ore", tier: 2, cls: "metal", value: 11 },
  m_ore3: { name: "Grave Silver Ore", tier: 3, cls: "metal", value: 34 },
  m_ore4: { name: "Voidsteel Ore", tier: 4, cls: "metal", value: 96 },
  m_ore5: { name: "Godbone Shard", tier: 5, cls: "metal", value: 260 },
  m_ore6: { name: "Doomforged Ingot", tier: 6, cls: "metal", value: 640 },

  // --- hide and cloth
  m_hide1: { name: "Tattered Hide", tier: 1, cls: "hide", value: 3 },
  m_hide2: { name: "Cured Hide", tier: 2, cls: "hide", value: 11 },
  m_hide3: { name: "Wraithweave", tier: 3, cls: "hide", value: 34 },
  m_hide4: { name: "Shadowsilk", tier: 4, cls: "hide", value: 96 },
  m_hide5: { name: "Astral Weave", tier: 5, cls: "hide", value: 260 },
  m_hide6: { name: "Gravemourn Silk", tier: 6, cls: "hide", value: 640 },

  // --- wood (hafts, staves, shield frames)
  m_wood1: { name: "Witherwood", tier: 1, cls: "wood", value: 2 },
  m_wood2: { name: "Bloodpine", tier: 2, cls: "wood", value: 8 },
  m_wood3: { name: "Ghostoak", tier: 3, cls: "wood", value: 26 },
  m_wood4: { name: "Soulwood", tier: 4, cls: "wood", value: 74 },
  m_wood5: { name: "Nether Ash", tier: 5, cls: "wood", value: 200 },
  m_wood6: { name: "Doomroot", tier: 6, cls: "wood", value: 500 },

  // --- herbs (alchemy only)
  m_herb1: { name: "Witherleaf", tier: 1, cls: "herb", value: 3 },
  m_herb2: { name: "Gravebloom", tier: 2, cls: "herb", value: 11 },
  m_herb3: { name: "Emberroot", tier: 3, cls: "herb", value: 34 },
  m_herb4: { name: "Palefrond", tier: 4, cls: "herb", value: 96 },
  m_herb5: { name: "Voidblossom", tier: 5, cls: "herb", value: 260 },
  m_herb6: { name: "Corpselily", tier: 6, cls: "herb", value: 640 },

  // --- essence (uncommon drop, gates the good recipes)
  m_ess1: { name: "Dim Essence", tier: 1, cls: "essence", value: 18 },
  m_ess2: { name: "Pale Essence", tier: 2, cls: "essence", value: 60 },
  m_ess3: { name: "Grim Essence", tier: 3, cls: "essence", value: 170 },
  m_ess4: { name: "Void Essence", tier: 4, cls: "essence", value: 460 },
  m_ess5: { name: "Astral Essence", tier: 5, cls: "essence", value: 1200 },
  m_ess6: { name: "Doom Essence", tier: 6, cls: "essence", value: 3000 },

  // --- universal, salvage only
  m_dust: { name: "Arcane Dust", tier: 0, cls: "dust", value: 40 },
};

/* Which material line each realm tier drops, in id form. */
const TIER_MATS = {
  1: { metal: "m_ore1", hide: "m_hide1", wood: "m_wood1", herb: "m_herb1", essence: "m_ess1" },
  2: { metal: "m_ore2", hide: "m_hide2", wood: "m_wood2", herb: "m_herb2", essence: "m_ess2" },
  3: { metal: "m_ore3", hide: "m_hide3", wood: "m_wood3", herb: "m_herb3", essence: "m_ess3" },
  4: { metal: "m_ore4", hide: "m_hide4", wood: "m_wood4", herb: "m_herb4", essence: "m_ess4" },
  5: { metal: "m_ore5", hide: "m_hide5", wood: "m_wood5", herb: "m_herb5", essence: "m_ess5" },
  6: { metal: "m_ore6", hide: "m_hide6", wood: "m_wood6", herb: "m_herb6", essence: "m_ess6" },
};

/* What a forged item comes out as. Crafting used to guarantee Rare, which made
   it strictly better than farming — you also choose the slot and the stat, so a
   guaranteed Rare beat almost every drop. Rolling the rarity keeps the "forge it
   again for a better one" loop while leaving the best pieces to the realms and
   the raids. The occasional Epic carries a proc, which is the payoff. */
const CRAFT_RARITY = { uncommon: 52, rare: 40, epic: 8 };

/* Item level and character requirement per crafting tier. */
const CRAFT_TIERS = {
  1: { ilvl: 10, req: 1, label: "Tier I" },
  2: { ilvl: 20, req: 13, label: "Tier II" },
  3: { ilvl: 31, req: 24, label: "Tier III" },
  4: { ilvl: 40, req: 34, label: "Tier IV" },
  5: { ilvl: 46, req: 43, label: "Tier V" },
  6: { ilvl: 64, req: 55, label: "Tier VI" },
};

/* ---------------------------------------------------------------------------
   BLACKSMITHING
   Recipes are generated rather than typed out one by one: every tier can make
   every slot, in Strength / Agility / Intellect flavours. Crafted gear always
   rolls Rare, and the stat rolls vary, so crafting the same piece twice can
   give you a better one. To change costs, edit bsCost() below.
   --------------------------------------------------------------------------- */

/* Base material cost per slot — heavier armour costs more metal. */
const BS_SLOT_COST = {
  helm:      { metal: 6, hide: 2, wood: 0 },
  shoulders: { metal: 5, hide: 3, wood: 0 },
  cape:      { metal: 0, hide: 6, wood: 0 },
  chest:     { metal: 9, hide: 4, wood: 0 },
  wrist:     { metal: 3, hide: 2, wood: 0 },
  gloves:    { metal: 4, hide: 3, wood: 0 },
  waist:     { metal: 4, hide: 3, wood: 0 },
  legs:      { metal: 8, hide: 4, wood: 0 },
  boots:     { metal: 5, hide: 4, wood: 0 },
  ring:      { metal: 5, hide: 0, wood: 0 },
  trinket:   { metal: 4, hide: 2, wood: 2 },
  mainhand:  { metal: 10, hide: 2, wood: 5 },
  offhand:   { metal: 7, hide: 3, wood: 4 },
};

/* Which primary flavours make sense in each slot. */
const BS_PRIMARIES = ["str", "agi", "int"];
const PRIMARY_LABEL = { str: "Strength", agi: "Agility", int: "Intellect", spi: "Spirit", sta: "Stamina" };

function buildBlacksmithRecipes() {
  const out = [];
  for (let tier = 1; tier <= 6; tier++) {
    const t = TIER_MATS[tier];
    const ct = CRAFT_TIERS[tier];
    const mult = 1 + (tier - 1) * 0.35;
    for (const slot of SLOT_TYPES) {
      const base = BS_SLOT_COST[slot];
      for (const primary of BS_PRIMARIES) {
        const mats = {};
        if (base.metal) mats[t.metal] = Math.round(base.metal * mult);
        if (base.hide) mats[t.hide] = Math.round(base.hide * mult);
        if (base.wood) mats[t.wood] = Math.round(base.wood * mult);
        mats[t.essence] = tier === 1 ? 1 : Math.round(tier * 0.8);
        out.push({
          id: `bs_t${tier}_${slot}_${primary}`,
          prof: "bs", tier, slot, primary,
          ilvl: ct.ilvl, req: ct.req,
          rarity: null,           // rolled at craft time, see CRAFT_RARITY
          gold: Math.round(85 * Math.pow(2.8, tier - 1)),
          mats,
        });
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   ALCHEMY
   Potions are consumed automatically in combat when their condition is met.
   Health potions fire below the threshold you set in the Combat panel; combat
   buffs fire on the opening tick of a fight.
   --------------------------------------------------------------------------- */
const POTIONS = [
  // --- health, restores a percentage of max Health
  { id: "po_h1", name: "Thin Red Draught", tier: 1, kind: "heal", pct: 30, req: 1, gold: 20, mats: { m_herb1: 3 } },
  { id: "po_h2", name: "Clotted Red Draught", tier: 2, kind: "heal", pct: 40, req: 13, gold: 90, mats: { m_herb2: 3, m_ess2: 1 } },
  { id: "po_h3", name: "Gravebloom Tonic", tier: 3, kind: "heal", pct: 50, req: 24, gold: 300, mats: { m_herb3: 3, m_ess3: 1 } },
  { id: "po_h4", name: "Palefrond Restorative", tier: 4, kind: "heal", pct: 62, req: 34, gold: 900, mats: { m_herb4: 3, m_ess4: 1 } },
  { id: "po_h6", name: "Corpselily Elixir", tier: 6, kind: "heal", pct: 74, req: 58, gold: 2600, mats: { m_herb6: 3, m_ess6: 1 } },
  { id: "po_h5", name: "Voidblossom Elixir", tier: 5, kind: "heal", pct: 75, req: 43, gold: 2600, mats: { m_herb5: 3, m_ess5: 1 } },

  // --- mana
  { id: "po_m1", name: "Bitter Blue Draught", tier: 1, kind: "mana", pct: 35, req: 1, gold: 20, mats: { m_herb1: 3 } },
  { id: "po_m3", name: "Emberroot Infusion", tier: 3, kind: "mana", pct: 55, req: 24, gold: 300, mats: { m_herb3: 3, m_ess3: 1 } },
  { id: "po_m5", name: "Astral Infusion", tier: 5, kind: "mana", pct: 80, req: 43, gold: 2600, mats: { m_herb5: 3, m_ess5: 1 } },

  // --- combat buffs, applied at the start of a fight
  { id: "po_b_fury2", name: "Draught of Fury", tier: 2, kind: "buff", req: 13, gold: 140, duration: 30,
    mods: { allDmg: 12 }, mats: { m_herb2: 4, m_ess2: 1 } },
  { id: "po_b_fury4", name: "Greater Draught of Fury", tier: 4, kind: "buff", req: 34, gold: 1100, duration: 30,
    mods: { allDmg: 25 }, mats: { m_herb4: 4, m_ess4: 2 } },
  { id: "po_b_stone2", name: "Draught of Stone", tier: 2, kind: "buff", req: 13, gold: 140, duration: 30,
    mods: { armorPct: 20, dr: 5 }, mats: { m_herb2: 4, m_ess2: 1 } },
  { id: "po_b_stone4", name: "Greater Draught of Stone", tier: 4, kind: "buff", req: 34, gold: 1100, duration: 30,
    mods: { armorPct: 35, dr: 10 }, mats: { m_herb4: 4, m_ess4: 2 } },
  { id: "po_b_swift3", name: "Elixir of Swiftness", tier: 3, kind: "buff", req: 24, gold: 420, duration: 30,
    mods: { haste: 15, crit: 5 }, mats: { m_herb3: 4, m_ess3: 1 } },
  { id: "po_b_swift5", name: "Greater Elixir of Swiftness", tier: 5, kind: "buff", req: 43, gold: 3200, duration: 30,
    mods: { haste: 25, crit: 9 }, mats: { m_herb5: 4, m_ess5: 2 } },
  { id: "po_b_luck3", name: "Prospector's Tincture", tier: 3, kind: "buff", req: 24, gold: 500, duration: 30,
    mods: { goldFind: 30, magicFind: 15 }, mats: { m_herb3: 5, m_ess3: 2 } },

  /* ---- COMBAT ELIXIRS ----------------------------------------------------
     An elixir gives more than a draught of the same tier and takes something
     back. They fire at the start of a fight exactly like a buff potion, so an
     elixir is a standing decision about how you want to fight rather than a
     button to press. The downside is real: read it before brewing fifty. */
  { id: "po_e_reckless3", name: "Reckless Elixir", tier: 3, kind: "elixir", req: 24, gold: 600, duration: 30,
    mods: { allDmg: 30, healPct: -25 }, mats: { m_herb3: 5, m_ess3: 2 },
    note: "Everything you hit, harder \u2014 but every heal is weaker." },
  { id: "po_e_glass4", name: "Glassblood Elixir", tier: 4, kind: "elixir", req: 34, gold: 1400, duration: 30,
    mods: { crit: 18, critDmg: 35, dr: -12 }, mats: { m_herb4: 5, m_ess4: 2 },
    note: "You strike like a razor and take blows like glass." },
  { id: "po_e_leech4", name: "Elixir of the Leech", tier: 4, kind: "elixir", req: 34, gold: 1400, duration: 30,
    mods: { lifesteal: 12, allDmg: -10 }, mats: { m_herb4: 5, m_ess4: 2 },
    note: "Feed on what you kill, at the cost of how hard you kill it." },
  { id: "po_e_bulwark5", name: "Elixir of the Bulwark", tier: 5, kind: "elixir", req: 43, gold: 3600, duration: 30,
    mods: { dr: 18, armorPct: 40, haste: -20 }, mats: { m_herb5: 5, m_ess5: 2 },
    note: "Immovable, and slow with it." },
  { id: "po_e_hunger6", name: "Elixir of Hunger", tier: 6, kind: "elixir", req: 55, gold: 9000, duration: 30,
    mods: { allDmg: 45, hpPct: -25 }, mats: { m_herb6: 6, m_ess6: 3 },
    note: "A quarter of your health, traded for ruin." },

  /* ---- FLASKS ------------------------------------------------------------
     A flask is not drunk for a fight; it is drunk for a RUN. It holds until you
     die or leave, through as many fights as you can string together, which
     makes a Descent something you prepare for rather than something you start.
     One at a time: drinking a second replaces the first. */
  { id: "po_f_iron3", name: "Flask of Iron Hours", tier: 3, kind: "flask", req: 24, gold: 900,
    mods: { hpPct: 12, armorPct: 20 }, mats: { m_herb3: 6, m_ess3: 3 },
    note: "Holds for the whole run." },
  { id: "po_f_war4", name: "Flask of the Long War", tier: 4, kind: "flask", req: 34, gold: 2200,
    mods: { allDmg: 18, crit: 6 }, mats: { m_herb4: 6, m_ess4: 3 },
    note: "Holds for the whole run." },
  { id: "po_f_tide5", name: "Flask of the Turning Tide", tier: 5, kind: "flask", req: 43, gold: 5200,
    mods: { haste: 18, lifesteal: 6 }, mats: { m_herb5: 6, m_ess5: 3 },
    note: "Holds for the whole run." },
  { id: "po_f_deep6", name: "Flask of the Deep", tier: 6, kind: "flask", req: 55, gold: 12000,
    mods: { allDmg: 22, dr: 10, hpPct: 15 }, mats: { m_herb6: 8, m_ess6: 4 },
    note: "Holds for the whole run." },
];
