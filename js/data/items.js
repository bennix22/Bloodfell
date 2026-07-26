/* ===========================================================================
   ITEMS — slots, rarities, base types, affixes, enchants.
   ---------------------------------------------------------------------------
   Gear is generated procedurally (js/core/loot.js) from three pieces:
       PREFIX  +  BASE  +  SUFFIX
       "Blackened"  "Warhammer"  "of Brutality"
   The base type is chosen to match the item's primary stat, so a Strength
   item is never called a dagger and an Intellect item is never plate. The
   suffix is chosen from the item's highest stat, so the name tells you what
   it does before you read the numbers.
   =========================================================================== */

/* Equipment slots. `key` is the save-file key, `n` is how many you can wear. */
const SLOTS = [
  { key: "helm", name: "Helm" },
  { key: "shoulders", name: "Shoulders" },
  { key: "cape", name: "Cape" },
  { key: "chest", name: "Chestplate" },
  { key: "wrist", name: "Wrist" },
  { key: "gloves", name: "Gloves" },
  { key: "waist", name: "Waist" },
  { key: "legs", name: "Pants" },
  { key: "boots", name: "Boots" },
  { key: "ring1", name: "Ring", type: "ring" },
  { key: "ring2", name: "Ring", type: "ring" },
  { key: "trinket1", name: "Trinket", type: "trinket" },
  { key: "trinket2", name: "Trinket", type: "trinket" },
  { key: "mainhand", name: "Weapon", type: "mainhand" },
  { key: "offhand", name: "Off-hand", type: "offhand" },
];

/* Slot types used by generated/unique items (ring1 and ring2 both take "ring"). */
const SLOT_TYPES = ["helm", "shoulders", "cape", "chest", "wrist", "gloves",
  "waist", "legs", "boots", "ring", "trinket", "mainhand", "offhand"];

/* Armour slots contribute base armour; jewellery and weapons do not. */
const ARMOR_SLOTS = ["helm", "shoulders", "cape", "chest", "wrist", "gloves", "waist", "legs", "boots"];

const RARITIES = {
  common:    { name: "Common",    color: "#8e8778", budget: 0.70, stats: 1, salvage: 1, weight: 52 },
  uncommon:  { name: "Uncommon",  color: "#5f9b5b", budget: 1.00, stats: 2, salvage: 2, weight: 30 },
  rare:      { name: "Rare",      color: "#4a7fb5", budget: 1.35, stats: 3, salvage: 4, weight: 13 },
  epic:      { name: "Epic",      color: "#8a5fb0", budget: 1.75, stats: 4, salvage: 8, weight: 4.2 },
  legendary: { name: "Legendary", color: "#c8873a", budget: 2.20, stats: 5, salvage: 16, weight: 0.8 },
  /* Set pieces carry a set bonus, so they get their own rarity and colour. Same
     power budget as a Legendary; never randomly rolled (weight 0) \u2014 they only
     drop from the bosses that grant them. */
  set:       { name: "Set",       color: "#46c07a", budget: 2.20, stats: 5, salvage: 16, weight: 0 },
  /* Uniques are never rolled — weight 0 keeps them out of every random table.
     They exist only as the hand-written entries in js/data/uniques.js. */
  unique:    { name: "Unique",    color: "#d2536b", budget: 2.55, stats: 5, salvage: 30, weight: 0 },
};
const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "unique"];

/* ---------------------------------------------------------------------------
   BASE TYPES — keyed by slot, then by the item's primary stat.
   Spirit items borrow the Intellect (cloth) frames.
   --------------------------------------------------------------------------- */
const ITEM_BASES = {
  helm:      { str: ["Plated Helm", "Great Helm", "Barbute", "Warhelm"], agi: ["Hide Cowl", "Leather Cap", "Hunter's Hood", "Masked Hood"], int: ["Silk Hood", "Woven Circlet", "Runecap", "Diadem"] },
  shoulders: { str: ["Pauldrons", "Spaulders", "Shoulderplates"], agi: ["Hide Mantle", "Leather Shoulderguards", "Fur Mantle"], int: ["Silk Mantle", "Woven Amice", "Shadowdrape"] },
  cape:      { str: ["Warcloak", "Heavy Drape"], agi: ["Shadowcloak", "Traveller's Cape", "Hunter's Drape"], int: ["Silk Shroud", "Runewoven Cape", "Veil"] },
  chest:     { str: ["Breastplate", "Cuirass", "Battleplate"], agi: ["Leather Jerkin", "Hide Vest", "Studded Harness"], int: ["Woven Robe", "Silk Vestment", "Ritual Robe"] },
  wrist:     { str: ["Vambraces", "Ironbands"], agi: ["Leather Bracers", "Hide Wraps"], int: ["Silk Cuffs", "Runebands"] },
  gloves:    { str: ["Gauntlets", "Handguards", "Ironfists"], agi: ["Leather Grips", "Hide Gloves", "Clawed Gloves"], int: ["Silk Handwraps", "Ritual Gloves", "Runegloves"] },
  waist:     { str: ["Warbelt", "Girdle", "Plated Belt"], agi: ["Leather Belt", "Hide Cinch", "Bandolier"], int: ["Silk Sash", "Woven Cord", "Ritual Sash"] },
  legs:      { str: ["Legplates", "Greaves", "Warpants"], agi: ["Leather Leggings", "Hide Breeches"], int: ["Silk Trousers", "Woven Leggings", "Ritual Skirt"] },
  boots:     { str: ["Sabatons", "Warboots", "Ironshod Boots"], agi: ["Leather Boots", "Softstep Boots", "Hide Treads"], int: ["Silk Slippers", "Runewalkers", "Ritual Sandals"] },
  ring:      { str: ["Heavy Band", "Iron Signet", "Warring"], agi: ["Twisted Band", "Serpent Ring", "Thief's Signet"], int: ["Runed Band", "Arcane Signet", "Loop of Whispers"] },
  trinket:   { str: ["Battle Standard", "Bloodied Token", "Warlord's Seal"], agi: ["Poisoner's Vial", "Clipped Talon", "Shadowed Charm"], int: ["Arcane Focus", "Bound Grimoire", "Whispering Idol"] },
  mainhand:  { str: ["Greatsword", "Warhammer", "Battleaxe", "Maul", "Cleaver", "Colossus Blade", "Executioner's Axe"],
               agi: ["Dagger", "Fang", "Stiletto", "Kris", "Shortblade", "Twinfang Glaive"],
               int: ["Staff", "Scepter", "Wand", "Rod", "Cane", "Greatstaff"] },
  offhand:   { str: ["Bulwark", "Kite Shield", "Tower Shield"], agi: ["Parrying Blade", "Off-hand Dirk", "Throwing Wedge"], int: ["Tome", "Orb", "Idol"] },
};

/* Weapon speed and damage spread per base word. Slower = bigger hits. */
/* `hands: 2` means the weapon occupies the off-hand slot as well. Two-handers
   trade an entire equipment slot for raw damage, so their dps carries
   TWO_HAND_DPS_BONUS to compensate — see js/core/loot.js. */
const WEAPON_PROFILES = {
  Greatsword: { speed: 2.9, spread: 0.36 }, Warhammer: { speed: 3.3, spread: 0.42 },
  Battleaxe: { speed: 3.1, spread: 0.44 }, Maul: { speed: 3.5, spread: 0.48 },
  Cleaver: { speed: 2.7, spread: 0.38 },
  "Colossus Blade": { speed: 3.6, spread: 0.40, hands: 2 },
  "Executioner's Axe": { speed: 3.8, spread: 0.46, hands: 2 },
  "Twinfang Glaive": { speed: 2.6, spread: 0.30, hands: 2 },
  Greatstaff: { speed: 3.4, spread: 0.36, hands: 2 },
  Dagger: { speed: 1.7, spread: 0.22 }, Fang: { speed: 1.6, spread: 0.20 },
  Stiletto: { speed: 1.8, spread: 0.24 }, Kris: { speed: 1.9, spread: 0.26 },
  Shortblade: { speed: 2.0, spread: 0.28 },
  Staff: { speed: 2.8, spread: 0.34 }, Scepter: { speed: 2.4, spread: 0.30 },
  Wand: { speed: 2.1, spread: 0.26 }, Rod: { speed: 2.5, spread: 0.32 }, Cane: { speed: 2.6, spread: 0.30 },
};
const DEFAULT_WEAPON_PROFILE = { speed: 2.4, spread: 0.30 };

/* Prefixes by material tier — realm flavour bleeds into the loot. */
const PREFIXES = {
  1: ["Ashen", "Rusted", "Charred", "Weathered", "Bog-Stained", "Pitted", "Cracked", "Soot-Marked"],
  2: ["Blackened", "Frostbitten", "Thornbound", "Sinew-Wrapped", "Grave-Cut", "Bramblesteel", "Duskforged"],
  3: ["Cinderglass", "Hollowed", "Rootbound", "Choir-Blessed", "Grimhold", "Obsidian-Chased", "Slagborn"],
  4: ["Marrowcarved", "Voidscarred", "Alabaster", "Fathom-Pressed", "Palewrought", "Rift-Touched"],
  5: ["Godbone", "Nethercast", "Sundered", "Silent", "Star-Eaten", "Unmade", "Throneforged"],
};

/* Suffixes chosen from the item's highest stat. Reads like WoW's "of the ..." */
const SUFFIXES = {
  str: ["of Brutality", "of the Bear", "of the Warlord", "of Ruin", "of the Bloodied Hand"],
  agi: ["of the Viper", "of Shadows", "of the Hawk", "of Swift Ends", "of the Quiet Knife"],
  int: ["of the Magi", "of Sorcery", "of the Deep Rune", "of Cinders", "of the Third Eye"],
  spi: ["of the Wisp", "of Restoration", "of the Saint", "of Quiet Hours", "of the Kept Vigil"],
  sta: ["of the Boar", "of Endurance", "of the Long Wake", "of Stone", "of the Unbroken"],
};

/* Which secondary stats can roll, and how expensive each point is in budget. */
const SECONDARY_POOL = [
  { key: "crit", cost: 14.0, label: "Critical Strike" },
  { key: "haste", cost: 14.0, label: "Haste" },
  { key: "dodge", cost: 13.0, label: "Dodge" },
  { key: "block", cost: 11.0, label: "Block" },
  { key: "critDmg", cost: 6.0, label: "Critical Damage" },
  { key: "lifesteal", cost: 22.0, label: "Lifesteal" },
  { key: "thorns", cost: 9.0, label: "Thorns" },
];

/* ---------------------------------------------------------------------------
   ENCHANTS — a permanent bonus applied to one equipped item.
   Cost is gold + Arcane Dust, which comes from salvaging gear.
   Applying a new enchant to an occupied slot replaces the old one.
   --------------------------------------------------------------------------- */
const ENCHANTS = [
  { id: "e_str1", name: "Minor Etching of Strength", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 1, gold: 400, dust: 4, mods: { str: 8 } },
  { id: "e_agi1", name: "Minor Etching of Agility", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 1, gold: 400, dust: 4, mods: { agi: 8 } },
  { id: "e_int1", name: "Minor Etching of Intellect", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 1, gold: 400, dust: 4, mods: { int: 8 } },
  { id: "e_spi1", name: "Minor Etching of Spirit", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 1, gold: 400, dust: 4, mods: { spi: 8 } },
  { id: "e_sta1", name: "Minor Etching of Stamina", slots: ARMOR_SLOTS.concat(["ring", "trinket"]), tier: 1, gold: 400, dust: 4, mods: { sta: 10 } },

  { id: "e_str2", name: "Greater Etching of Strength", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 2, gold: 2200, dust: 14, mods: { str: 22 } },
  { id: "e_agi2", name: "Greater Etching of Agility", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 2, gold: 2200, dust: 14, mods: { agi: 22 } },
  { id: "e_int2", name: "Greater Etching of Intellect", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 2, gold: 2200, dust: 14, mods: { int: 22 } },
  { id: "e_spi2", name: "Greater Etching of Spirit", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 2, gold: 2200, dust: 14, mods: { spi: 22 } },
  { id: "e_sta2", name: "Greater Etching of Stamina", slots: ARMOR_SLOTS.concat(["ring", "trinket"]), tier: 2, gold: 2200, dust: 14, mods: { sta: 28 } },

  { id: "e_crit", name: "Rune of Precision", slots: ["gloves", "helm", "ring", "mainhand"], tier: 2, gold: 3000, dust: 20, mods: { crit: 3 } },
  { id: "e_haste", name: "Rune of Quickening", slots: ["gloves", "boots", "ring", "mainhand"], tier: 2, gold: 3000, dust: 20, mods: { haste: 3 } },
  { id: "e_armor", name: "Rune of Warding", slots: ARMOR_SLOTS, tier: 2, gold: 2600, dust: 16, mods: { armor: 120 } },
  { id: "e_dodge", name: "Rune of Evasion", slots: ["cape", "boots", "legs"], tier: 2, gold: 3000, dust: 20, mods: { dodge: 3 } },

  { id: "e_str3", name: "Godbone Sigil of Strength", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 3, gold: 9000, dust: 45, mods: { str: 48 } },
  { id: "e_agi3", name: "Godbone Sigil of Agility", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 3, gold: 9000, dust: 45, mods: { agi: 48 } },
  { id: "e_int3", name: "Godbone Sigil of Intellect", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 3, gold: 9000, dust: 45, mods: { int: 48 } },
  { id: "e_spi3", name: "Godbone Sigil of Spirit", slots: ARMOR_SLOTS.concat(["ring", "mainhand"]), tier: 3, gold: 9000, dust: 45, mods: { spi: 48 } },
  { id: "e_sta3", name: "Godbone Sigil of Stamina", slots: ARMOR_SLOTS.concat(["ring", "trinket"]), tier: 3, gold: 9000, dust: 45, mods: { sta: 60 } },
  { id: "e_ls3", name: "Sigil of the Leech", slots: ["mainhand", "ring", "trinket"], tier: 3, gold: 14000, dust: 70, mods: { lifesteal: 3 } },
  { id: "e_cd3", name: "Sigil of Cruelty", slots: ["mainhand", "gloves", "ring"], tier: 3, gold: 14000, dust: 70, mods: { critDmg: 20 } },
];
