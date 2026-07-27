/* ===========================================================================
   GEMS — what goes into a socket.
   ---------------------------------------------------------------------------
   A gem is a small, permanent, MOVEABLE bonus. Sockets are cut by the
   blacksmith; the gem that goes in one is your choice and can be swapped later
   (though prising a gem out destroys it, so the choice has weight).

   Three grades: Chipped, Cut and Flawless. Grade decides magnitude, not effect,
   so a build's favourite gem stays its favourite all game — it just gets
   better. Drops are gated on item level so an early character cannot socket a
   Flawless.

   `mods` uses the same keys as talents and set bonuses, so gems flow through
   computeStats with everything else. A few gems instead carry an `effect`,
   which is a proc from js/data/effects.js and merges with other sources of the
   same proc exactly like a set bonus does.

   LATER: jewelworking will cut these from rough gems. That is why grade is a
   property of the gem rather than a separate item — a rough gem will simply
   become the next grade up of the same stone.
   =========================================================================== */

const GEM_GRADES = {
  chipped:  { name: "Chipped",  mult: 1.0, minIlvl: 1,  colour: "#8c8195" },
  cut:      { name: "Cut",      mult: 2.1, minIlvl: 30, colour: "#cec4b6" },
  flawless: { name: "Flawless", mult: 3.6, minIlvl: 55, colour: "#e0ad63" },
};

/* Base values are for a Chipped stone and are multiplied by the grade. */
const GEM_TYPES = [
  { id: "ruby",     name: "Ruby",     stat: "Strength",        mods: { str: 18 } },
  { id: "emerald",  name: "Emerald",  stat: "Agility",         mods: { agi: 18 } },
  { id: "sapphire", name: "Sapphire", stat: "Intellect",       mods: { int: 18 } },
  { id: "pearl",    name: "Pearl",    stat: "Spirit",          mods: { spi: 18 } },
  { id: "onyx",     name: "Onyx",     stat: "Stamina",         mods: { sta: 26 } },
  { id: "diamond",  name: "Diamond",  stat: "Critical strike", mods: { crit: 2.0 } },
  { id: "citrine",  name: "Citrine",  stat: "Haste",           mods: { haste: 2.0 } },
  { id: "jade",     name: "Jade",     stat: "Armor",           mods: { armor: 90 } },
  { id: "garnet",   name: "Garnet",   stat: "Critical damage", mods: { critDmg: 5.0 } },
  { id: "amethyst", name: "Amethyst", stat: "Lifesteal",       mods: { lifesteal: 1.4 } },
  { id: "obsidian", name: "Obsidian", stat: "Damage reduction", mods: { dr: 1.2 } },
  { id: "opal",     name: "Opal",     stat: "All damage",      mods: { allDmg: 1.8 } },

  /* Two stones carry a proc instead of a stat line. They are rarer, and they
     merge with any other source of the same proc rather than rolling twice. */
  { id: "bloodstone", name: "Bloodstone", stat: "Retort",
    effect: { id: "retort", chance: 4, potency: 0.5 }, rare: true },
  { id: "moonstone",  name: "Moonstone",  stat: "Ambush",
    effect: { id: "ambush", chance: 4, potency: 0.5 }, rare: true },
];

/* A gem in the bag is identified by type + grade, e.g. "ruby:cut". */
function gemKey(typeId, grade) { return `${typeId}:${grade}`; }

function gemTypeById(id) { return GEM_TYPES.find(g => g.id === id) || null; }

/* The full definition of one stone, with its grade already applied. */
function gemById(key) {
  const [typeId, grade] = String(key).split(":");
  const type = gemTypeById(typeId);
  const g = GEM_GRADES[grade];
  if (!type || !g) return null;

  const mods = {};
  for (const k in type.mods || {}) {
    const v = type.mods[k] * g.mult;
    // primaries and armour are whole numbers; percentages keep one decimal
    mods[k] = ["str", "agi", "int", "spi", "sta", "armor"].includes(k)
      ? Math.round(v) : Math.round(v * 10) / 10;
  }

  const out = {
    key, typeId, grade,
    name: `${g.name} ${type.name}`,
    stat: type.stat,
    colour: g.colour,
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

/* Every stone that exists, for the collection view and for drop rolls. */
function allGems() {
  const out = [];
  for (const t of GEM_TYPES) for (const grade in GEM_GRADES) out.push(gemKey(t.id, grade));
  return out;
}

/* What a kill at this item level can produce. Grades are gated so that the
   Flawless stones stay an endgame reward. */
function gemGradeForIlvl(ilvl) {
  if (ilvl >= GEM_GRADES.flawless.minIlvl && Math.random() < 0.35) return "flawless";
  if (ilvl >= GEM_GRADES.cut.minIlvl && Math.random() < 0.55) return "cut";
  return "chipped";
}

function rollGem(ilvl) {
  // the two proc stones are deliberately scarce
  const pool = GEM_TYPES.filter(t => !t.rare || Math.random() < 0.18);
  const type = pool[Math.floor(Math.random() * pool.length)] || GEM_TYPES[0];
  return gemKey(type.id, gemGradeForIlvl(ilvl));
}

/* How often a boss coughs up a stone. Gems are the one thing socketing consumes,
   so they need to arrive steadily rather than as a rare event. */
const GEM_DROP_CHANCE = 0.30;
