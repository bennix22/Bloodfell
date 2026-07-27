/* ===========================================================================
   GEMS AND ROUGH GEMS
   ---------------------------------------------------------------------------
   Rough gems drop from realms and raids in three colours, one for each gear
   primary:

       RED = Strength        GREEN = Agility        YELLOW = Intellect

   The gemcrafter cuts them into finished stones. Cutting one colour on its own
   gives that primary's gem. Mixing colours gives a secondary colour and a
   secondary stat, and the RATIO matters as much as the colours: red and yellow
   in equal parts makes an orange stone for critical strike, but two reds to one
   yellow deepens it to scarlet for critical damage. All three colours together
   make the black, the pale and the rare.

   Grade is carried by the rough gem and passes through the cut: Coarse rough
   gems make Chipped stones, Clear make Cut, Pure make Flawless. Grade sets
   magnitude, never which stat, so a build's favourite stone stays its favourite
   all game.

   `mods` uses the same keys as talents and set bonuses, so gems flow through
   computeStats with everything else. Two stones carry an `effect` instead: a
   proc from js/data/effects.js, merged with other sources of the same proc.
   =========================================================================== */

/* The three colours that drop. */
const ROUGH_COLOURS = {
  red:    { name: "Red",    stat: "Strength",  colour: "#b0303a" },
  green:  { name: "Green",  stat: "Agility",   colour: "#3aa657" },
  yellow: { name: "Yellow", stat: "Intellect", colour: "#d8b02a" },
};

/* Grades, shared by rough gems and the stones cut from them.
   `cut` is the gold a cut of that grade costs. These are deliberately steep:
   cutting stones is the game's main gold sink, and gold has nowhere else to go
   now that the merchant is closed. Rare stones cost 2.5x on top (see cutCost). */
const GEM_GRADES = {
  chipped:  { name: "Chipped",  rough: "Coarse", mult: 1.0, minIlvl: 1,  cut: 700 },
  cut:      { name: "Cut",      rough: "Clear",  mult: 2.1, minIlvl: 30, cut: 4550 },
  flawless: { name: "Flawless", rough: "Pure",   mult: 3.6, minIlvl: 55, cut: 24500 },
};

/* ---------------------------------------------------------------------------
   THE STONES.
   `mix` is how many rough gems of each colour the cut consumes. Base values are
   for a Chipped stone and are multiplied by the grade.
   --------------------------------------------------------------------------- */
const GEM_TYPES = [
  /* ---- one colour: the primaries ---- */
  { id: "ruby",    name: "Ruby",    stat: "Strength",  colour: "#b0303a", shade: "red",
    mix: { red: 2 },                      mods: { str: 18 } },
  { id: "emerald", name: "Emerald", stat: "Agility",   colour: "#3aa657", shade: "green",
    mix: { green: 2 },                    mods: { agi: 18 } },
  { id: "topaz",   name: "Topaz",   stat: "Intellect", colour: "#d8b02a", shade: "yellow",
    mix: { yellow: 2 },                   mods: { int: 18 } },

  /* ---- two colours, equal parts: the clean secondary colours ---- */
  { id: "carnelian", name: "Carnelian", stat: "Critical strike", colour: "#d2762a", shade: "orange",
    mix: { red: 1, yellow: 1 },           mods: { crit: 2.0 } },
  { id: "amethyst",  name: "Amethyst",  stat: "Lifesteal",       colour: "#8a5fb0", shade: "violet",
    mix: { red: 1, green: 1 },            mods: { lifesteal: 1.4 } },
  { id: "sapphire",  name: "Sapphire",  stat: "Haste",           colour: "#3f7fb8", shade: "azure",
    mix: { green: 1, yellow: 1 },         mods: { haste: 2.0 } },

  /* ---- two colours, two parts to one: deeper shades ---- */
  { id: "garnet",     name: "Garnet",     stat: "Critical damage", colour: "#c0452f", shade: "scarlet",
    mix: { red: 2, yellow: 1 },           mods: { critDmg: 5.0 } },
  { id: "tourmaline", name: "Tourmaline", stat: "Thorns",          colour: "#9c3f6a", shade: "plum",
    mix: { red: 2, green: 1 },            mods: { thorns: 2.2 } },
  { id: "jade",       name: "Jade",       stat: "Armor",           colour: "#2f8f6f", shade: "deep green",
    mix: { green: 2, yellow: 1 },         mods: { armor: 90 } },
  { id: "peridot",    name: "Peridot",    stat: "Block",           colour: "#6fa03a", shade: "olive",
    mix: { green: 2, red: 1 },            mods: { block: 2.2 } },
  { id: "aquamarine", name: "Aquamarine", stat: "Dodge",           colour: "#4fb8a0", shade: "seafoam",
    mix: { yellow: 2, green: 1 },         mods: { dodge: 2.0 } },
  { id: "amber",      name: "Amber",      stat: "Stamina",         colour: "#cf8a2a", shade: "amber",
    mix: { yellow: 2, red: 1 },           mods: { sta: 26 } },

  /* ---- all three colours: the black, the pale, and the rare ---- */
  { id: "obsidian", name: "Obsidian", stat: "Damage reduction", colour: "#2a2430", shade: "black",
    mix: { red: 1, green: 1, yellow: 1 }, mods: { dr: 1.2 } },
  { id: "pearl",    name: "Pearl",    stat: "Spirit",           colour: "#ded6c8", shade: "pale",
    mix: { red: 1, green: 2, yellow: 2 }, mods: { spi: 18 } },
  { id: "opal",     name: "Opal",     stat: "All damage",       colour: "#d8d2c4", shade: "opalescent",
    mix: { red: 2, green: 2, yellow: 2 }, mods: { allDmg: 1.8 } },

  /* Two stones carry a proc rather than a stat line, and cost the most rough
     gems of anything on the bench. */
  { id: "bloodstone", name: "Bloodstone", stat: "Retort", colour: "#7a2a2a", shade: "blooded",
    mix: { red: 3, green: 2, yellow: 1 }, effect: { id: "retort", chance: 4, potency: 0.5 }, rare: true },
  { id: "moonstone",  name: "Moonstone",  stat: "Ambush", colour: "#9fb8d8", shade: "moonlit",
    mix: { yellow: 3, green: 2, red: 1 }, effect: { id: "ambush", chance: 4, potency: 0.5 }, rare: true },
];

/* A rough gem in the bag is keyed "colour:grade", a cut stone "type:grade". */
function roughKey(colour, grade) { return `${colour}:${grade}`; }
function gemKey(typeId, grade) { return `${typeId}:${grade}`; }

function gemTypeById(id) { return GEM_TYPES.find(g => g.id === id) || null; }

function roughName(key) {
  const [colour, grade] = String(key).split(":");
  const c = ROUGH_COLOURS[colour], g = GEM_GRADES[grade];
  if (!c || !g) return key;
  return `${g.rough} ${c.name} Gem`;
}

/* The full definition of one cut stone, with its grade already applied. */
function gemById(key) {
  const [typeId, grade] = String(key).split(":");
  const type = gemTypeById(typeId);
  const g = GEM_GRADES[grade];
  if (!type || !g) return null;

  const mods = {};
  for (const k in type.mods || {}) {
    const v = type.mods[k] * g.mult;
    mods[k] = ["str", "agi", "int", "spi", "sta", "armor"].includes(k)
      ? Math.round(v) : Math.round(v * 10) / 10;
  }

  const out = {
    key, typeId, grade,
    name: `${g.name} ${type.name}`,
    stat: type.stat,
    colour: type.colour,
    shade: type.shade,
    mix: type.mix,
    mods,
    rare: !!type.rare,
  };
  if (type.effect) {
    out.effect = {
      id: type.effect.id,
      chance: Math.round(type.effect.chance * g.mult * 10) / 10,
      potency: Math.round(type.effect.potency * g.mult * 100) / 100,
    };
    out.mods = {};
  }
  return out;
}

/* What one cut costs: the rough gems of its mix, at that grade, plus gold. */
function cutCost(typeId, grade) {
  const type = gemTypeById(typeId);
  const g = GEM_GRADES[grade];
  if (!type || !g) return null;
  const rough = {};
  for (const colour in type.mix) rough[roughKey(colour, grade)] = type.mix[colour];
  return { rough, gold: Math.round(g.cut * (type.rare ? 2.5 : 1)) };
}

/* Every stone that exists, for the bench and the collection view. */
function allGems() {
  const out = [];
  for (const t of GEM_TYPES) for (const grade in GEM_GRADES) out.push(gemKey(t.id, grade));
  return out;
}

/* ---------------------------------------------------------------------------
   DROPS. Rough gems come out of realms and raids; nothing drops already cut,
   because cutting is the whole point of the gemcrafter.
   --------------------------------------------------------------------------- */
function roughGradeForIlvl(ilvl) {
  if (ilvl >= GEM_GRADES.flawless.minIlvl && Math.random() < 0.35) return "flawless";
  if (ilvl >= GEM_GRADES.cut.minIlvl && Math.random() < 0.55) return "cut";
  return "chipped";
}

function rollRoughGem(ilvl) {
  const colours = Object.keys(ROUGH_COLOURS);
  const colour = colours[Math.floor(Math.random() * colours.length)];
  return roughKey(colour, roughGradeForIlvl(ilvl));
}

/* A trickle from ordinary kills and a reliable prize from bosses, because a
   single stone can want six rough gems. */
const ROUGH_DROP_CHANCE_REALM = 0.10;
const ROUGH_DROP_CHANCE_BOSS = 0.85;

/* ---------------------------------------------------------------------------
   MIGRATION. The stones were reorganised around colour when the gemcrafter
   opened: Intellect moved to topaz so sapphire could take the azure slot for
   Haste, and so on. Saved gems are remapped by the STAT they were collected
   for, so nothing is lost or silently turned into something else.
   --------------------------------------------------------------------------- */
const GEM_REMAP = {
  sapphire: "topaz",      // was Intellect; Intellect is topaz now
  diamond: "carnelian",   // was Critical strike
  citrine: "sapphire",    // was Haste; sapphire holds Haste now
  onyx: "amber",          // was Stamina
};

/* Remaps one saved gem key, leaving anything already current untouched. */
function migrateGemKey(key) {
  if (!key) return key;
  const [typeId, grade] = String(key).split(":");
  const to = GEM_REMAP[typeId];
  return to ? gemKey(to, grade) : key;
}
