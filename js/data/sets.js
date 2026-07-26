/* ===========================================================================
   SETS — five-piece raid armour with escalating bonuses.
   ---------------------------------------------------------------------------
   Each raid drops one complete set, one piece per boss, across the five armour
   slots that traditionally carry a tier set: helm, shoulders, chest, gloves and
   legs. Bonuses land at two, three and five pieces.

   The character is classless, so a set cannot be built around a class. Each is
   built around a WAY OF FIGHTING instead, and the bonuses are written so that
   nothing is dead weight: the survival set helps anyone who takes damage, the
   physical set helps anyone who swings a weapon, the arcane set helps anyone who
   casts. A build that ignores a set's theme still gets the raw stats.

   `mods` uses the same keys as talents. `effect` grants a proc from
   js/data/effects.js. Both may appear on the same tier.
   =========================================================================== */

const SETS = [
  {
    id: "vigil",
    name: "Vigil of the Drowned",
    raid: "sunken_cathedral",
    ilvl: 25,
    blurb: "Worn by the order that stayed behind to hold the doors. They are still holding them.",
    /* Survival. Useful to every build, which is what makes it the first set you
       complete — nobody has to change how they fight to benefit. */
    bonuses: {
      2: { mods: { hpPct: 8, armorPct: 10 },
           text: "+8% maximum Health and +10% Armor." },
      3: { mods: { dr: 4, healPct: 12 },
           text: "4% damage reduction and +12% healing received." },
      5: { effect: { id: "bulwark", chance: 22, potency: 1.4 }, mods: { hpPct: 6 },
           text: "+6% Health, and a 22% chance when struck to harden considerably." },
    },
  },

  {
    id: "warplate",
    name: "Grimhold Warplate",
    raid: "grimhold_keep",
    ilvl: 39,
    blurb: "Garrison issue. The garrison has not been relieved and does not expect to be.",
    /* Offence, deliberately school-agnostic. An earlier draft split these into
       physical and magical sets, which meant half the endgame gear was dead
       weight depending on how you had built — the opposite of what a classless
       game should do. Everything here reads the same whether you swing or cast. */
    bonuses: {
      2: { mods: { allDmg: 9, str: 24, agi: 24, int: 24 },
           text: "+9% damage of every school, and +24 to Strength, Agility and Intellect." },
      3: { mods: { crit: 5, critDmg: 18 },
           text: "+5% critical strike and +18% critical damage." },
      5: { effect: { id: "windfury", chance: 18, potency: 1 }, mods: { haste: 7 },
           text: "+7% Haste, and an 18% chance on hit to strike again immediately." },
    },
  },

  {
    id: "regalia",
    name: "Regalia of the Unfinished",
    raid: "obsidian_throne",
    ilvl: 52,
    blurb: "Cut from the same cloth as the great work, and just as short of complete.",
    /* The endgame set. Strongest raw bonuses in the game, and nothing in it
       cares how you deal your damage. */
    bonuses: {
      2: { mods: { allDmg: 12, str: 34, agi: 34, int: 34, spi: 34 },
           text: "+12% damage of every school, and +34 to every primary stat." },
      3: { mods: { lifesteal: 5, cdr: 15 },
           text: "5% lifesteal and 15% shorter spell cooldowns." },
      5: { effect: { id: "execute_proc", chance: 25, potency: 1.6 }, mods: { allDmg: 10, crit: 5 },
           text: "+10% damage, +5% critical strike, and a 25% chance on hit to surge." },
    },
  },
];

/* Which slots a set occupies, in the order pieces are handed out by the raid's
   bosses. Boss one drops the helm, boss two the shoulders, and so on. */
const SET_SLOTS = ["helm", "shoulders", "chest", "gloves", "legs"];

/* Named pieces, so a set does not read as five copies of the same thing. */
const SET_PIECE_NAMES = {
  vigil: ["Drowned Vigil Casque", "Drowned Vigil Pauldrons", "Drowned Vigil Cuirass",
          "Drowned Vigil Gauntlets", "Drowned Vigil Greaves"],
  warplate: ["Grimhold Warhelm", "Grimhold Shoulderplates", "Grimhold Breastplate",
             "Grimhold Handguards", "Grimhold Legplates"],
  regalia: ["Crown of the Unfinished", "Mantle of the Unfinished", "Vestment of the Unfinished",
            "Grips of the Unfinished", "Leggings of the Unfinished"],
};

/* Set pieces are Legendary. They were Epic in an earlier pass, which meant that
   completing a set actively cost you raw stats compared with mismatched
   Legendary drops of the same item level — the bonuses had to claw back a
   deficit before they gave you anything. A tier set should be a reward.
   They drop often, because needing five specific pieces from five specific
   bosses is already the grind. */
const SET_DROP_CHANCE = 0.14;
const SET_RARITY = "set";

function setById(id) { return SETS.find(s => s.id === id) || null; }

/* Boss one of a raid guards the helm, boss two the shoulders, and so on, so a
   complete set means clearing the whole raid rather than farming one encounter. */
function setPieceForBoss(bossId) {
  for (const raid of RAIDS) {
    const idx = raid.bosses.findIndex(b => b.id === bossId);
    if (idx < 0) continue;
    const set = SETS.find(s => s.raid === raid.id);
    if (!set || idx >= SET_SLOTS.length) return null;
    return setPieceDef(set, idx);
  }
  return null;
}

/* The definition for one piece, built from the set and its index. */
function setPieceDef(set, index) {
  const primary = set.id === "regalia" ? "int" : (set.id === "warplate" ? "str" : "str");
  return {
    setId: set.id,
    index,
    slot: SET_SLOTS[index],
    name: SET_PIECE_NAMES[set.id][index],
    ilvl: set.ilvl,
    primary,
  };
}

/* Every piece in the game, flattened — used by the collection page and by the
   boss drop tables. */
function allSetPieces() {
  const out = [];
  for (const set of SETS) {
    for (let i = 0; i < SET_SLOTS.length; i++) out.push(setPieceDef(set, i));
  }
  return out;
}
