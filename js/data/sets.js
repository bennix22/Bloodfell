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
  /* Twelve sets: three built around each primary stat, so no matter how you have
     built there is an early, a middle and a late set aimed at you. A raid hosts
     two or three of them; which one drops follows how you actually fight (see
     setPieceForBoss), and the raw stats on a piece follow your build regardless,
     so an off-theme drop is never dead weight. */

  /* ---- STRENGTH ---------------------------------------------------------- */
  {
    id: "vigil", stat: "str",
    name: "Vigil of the Drowned",
    raid: "sunken_cathedral", ilvl: 25,
    blurb: "Worn by the order that stayed behind to hold the doors. They are still holding them.",
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
    id: "warplate", stat: "str",
    name: "Grimhold Warplate",
    raid: "grimhold_keep", ilvl: 39,
    blurb: "Garrison issue. The garrison has not been relieved and does not expect to be.",
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
    id: "lastbulwark", stat: "str",
    name: "Bulwark of the Last Dark",
    raid: "the_last_dark", ilvl: 70,
    blurb: "Plate beaten out of the bottom of everything. Nothing has dented it yet.",
    bonuses: {
      2: { mods: { hpPct: 12, armorPct: 16 },
           text: "+12% maximum Health and +16% Armor." },
      3: { mods: { dr: 7, physDmg: 14 },
           text: "7% damage reduction and +14% physical damage." },
      5: { effect: { id: "vengeance", chance: 24, potency: 1.6 }, mods: { str: 48, thorns: 10 },
           text: "+48 Strength, +10% Thorns, and a 24% chance when struck to answer in kind." },
    },
  },

  /* ---- AGILITY ----------------------------------------------------------- */
  {
    id: "keepwatch", stat: "agi",
    name: "Keepwatch Leathers",
    raid: "grimhold_keep", ilvl: 39,
    blurb: "Cut for the scouts who went over the wall instead of standing on it.",
    bonuses: {
      2: { mods: { crit: 6, haste: 6 },
           text: "+6% critical strike and +6% Haste." },
      3: { mods: { critDmg: 20, dodge: 6 },
           text: "+20% critical damage and +6% dodge." },
      5: { effect: { id: "ambush", chance: 20, potency: 1.2 }, mods: { agi: 26 },
           text: "+26 Agility, and a 20% chance on hit to strike from nowhere." },
    },
  },
  {
    id: "weeping", stat: "agi",
    name: "The Weeping Raiment",
    raid: "the_weeping_wound", ilvl: 58,
    blurb: "It never dried. It never will. The wound weeps for whoever wears it.",
    bonuses: {
      2: { mods: { crit: 8, haste: 8 },
           text: "+8% critical strike and +8% Haste." },
      3: { mods: { critDmg: 26, allDmg: 8 },
           text: "+26% critical damage and +8% damage of every school." },
      5: { effect: { id: "windfury", chance: 20, potency: 1.2 }, mods: { agi: 42, haste: 6 },
           text: "+42 Agility, +6% Haste, and a 20% chance on hit to strike a second time." },
    },
  },
  {
    id: "lastshadow", stat: "agi",
    name: "Shadows of the Last Dark",
    raid: "the_last_dark", ilvl: 70,
    blurb: "Not cloth. The dark itself, persuaded to hold a shape.",
    bonuses: {
      2: { mods: { crit: 9, haste: 9 },
           text: "+9% critical strike and +9% Haste." },
      3: { mods: { critDmg: 30, dodge: 8 },
           text: "+30% critical damage and +8% dodge." },
      5: { effect: { id: "momentum", chance: 24, potency: 1.6 }, mods: { agi: 48, crit: 4 },
           text: "+48 Agility, +4% critical strike, and a 24% chance on hit to gather pace." },
    },
  },

  /* ---- INTELLECT --------------------------------------------------------- */
  {
    id: "choir", stat: "int",
    name: "Raiment of the Drowned Choir",
    raid: "sunken_cathedral", ilvl: 25,
    blurb: "The choir sang until the water reached the gallery, and then a while after.",
    bonuses: {
      2: { mods: { magicDmg: 9, manaPct: 12 },
           text: "+9% magical damage and +12% maximum Mana." },
      3: { mods: { cdr: 8, int: 20 },
           text: "8% shorter spell cooldowns and +20 Intellect." },
      5: { effect: { id: "ignite", chance: 20, potency: 1.2 }, mods: { magicDmg: 6 },
           text: "+6% magical damage, and a 20% chance on hit to set the enemy alight." },
    },
  },
  {
    id: "regalia", stat: "int",
    name: "Regalia of the Unfinished",
    raid: "obsidian_throne", ilvl: 52,
    blurb: "Cut from the same cloth as the great work, and just as short of complete.",
    bonuses: {
      2: { mods: { allDmg: 12, str: 34, agi: 34, int: 34, spi: 34 },
           text: "+12% damage of every school, and +34 to every primary stat." },
      3: { mods: { lifesteal: 5, cdr: 15 },
           text: "5% lifesteal and 15% shorter spell cooldowns." },
      5: { effect: { id: "execute_proc", chance: 25, potency: 1.6 }, mods: { allDmg: 10, crit: 5 },
           text: "+10% damage, +5% critical strike, and a 25% chance on hit to surge." },
    },
  },
  {
    id: "sigil", stat: "int",
    name: "Weeping Sigil Regalia",
    raid: "the_weeping_wound", ilvl: 58,
    blurb: "Every sigil on it is the same word, written smaller and smaller.",
    bonuses: {
      2: { mods: { magicDmg: 13, manaPct: 16 },
           text: "+13% magical damage and +16% maximum Mana." },
      3: { mods: { cdr: 16, int: 40 },
           text: "16% shorter spell cooldowns and +40 Intellect." },
      5: { effect: { id: "frostbite", chance: 22, potency: 1.5 }, mods: { magicDmg: 8 },
           text: "+8% magical damage, and a 22% chance on hit to freeze the wound shut." },
    },
  },

  /* ---- SPIRIT ------------------------------------------------------------ */
  {
    id: "longwatch", stat: "spi",
    name: "Vestments of the Long Watch",
    raid: "grimhold_keep", ilvl: 39,
    blurb: "Someone has to stay awake, and someone has to keep the ones who do alive.",
    bonuses: {
      2: { mods: { spi: 26, healPct: 14 },
           text: "+26 Spirit and +14% healing received." },
      3: { mods: { lifesteal: 4, dr: 4 },
           text: "4% lifesteal and 4% damage reduction." },
      5: { effect: { id: "leech", chance: 20, potency: 1.3 }, mods: { spi: 20 },
           text: "+20 Spirit, and a 20% chance on hit to draw life across." },
    },
  },
  {
    id: "litany", stat: "spi",
    name: "Litany of the Unfinished",
    raid: "obsidian_throne", ilvl: 52,
    blurb: "A prayer with no last line. Saying it is the point; finishing it is not.",
    bonuses: {
      2: { mods: { spi: 34, healPct: 16 },
           text: "+34 Spirit and +16% healing received." },
      3: { mods: { lifesteal: 5, cdr: 12 },
           text: "5% lifesteal and 12% shorter spell cooldowns." },
      5: { effect: { id: "soulsiphon", chance: 22, potency: 1.4 }, mods: { spi: 26, dr: 4 },
           text: "+26 Spirit, 4% damage reduction, and a 22% chance on hit to siphon." },
    },
  },
  {
    id: "nightfall", stat: "spi",
    name: "Vestments of the Last Dark",
    raid: "the_last_dark", ilvl: 70,
    blurb: "The dark at the bottom of everything, cut and hemmed to fit a mortal frame.",
    bonuses: {
      2: { mods: { spi: 46, int: 46, healPct: 12 },
           text: "+46 Spirit and Intellect, and +12% healing received." },
      3: { mods: { magicDmg: 12, cdr: 16 },
           text: "+12% magical damage and 16% shorter spell cooldowns." },
      5: { effect: { id: "execute_proc", chance: 24, potency: 1.7 }, mods: { allDmg: 12, spi: 32 },
           text: "+12% damage, +32 Spirit, and a 24% chance on hit to surge with the deep." },
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
  lastbulwark: ["Bulwark Helm of the Last Dark", "Bulwark Pauldrons of the Last Dark",
                "Bulwark Cuirass of the Last Dark", "Bulwark Gauntlets of the Last Dark",
                "Bulwark Greaves of the Last Dark"],
  keepwatch: ["Keepwatch Hood", "Keepwatch Spaulders", "Keepwatch Jerkin",
              "Keepwatch Gloves", "Keepwatch Boots"],
  weeping: ["Weeping Cowl", "Weeping Shoulderguards", "Weeping Shroud",
            "Weeping Handwraps", "Weeping Legwraps"],
  lastshadow: ["Shadowed Hood of the Last Dark", "Shadowed Mantle of the Last Dark",
               "Shadowed Jerkin of the Last Dark", "Shadowed Grips of the Last Dark",
               "Shadowed Treads of the Last Dark"],
  choir: ["Drowned Choir Mitre", "Drowned Choir Mantle", "Drowned Choir Cassock",
          "Drowned Choir Wraps", "Drowned Choir Slippers"],
  regalia: ["Crown of the Unfinished", "Mantle of the Unfinished", "Vestment of the Unfinished",
            "Grips of the Unfinished", "Leggings of the Unfinished"],
  sigil: ["Weeping Sigil Crown", "Weeping Sigil Mantle", "Weeping Sigil Robe",
          "Weeping Sigil Handwraps", "Weeping Sigil Leggings"],
  longwatch: ["Longwatch Hood", "Longwatch Shoulderwraps", "Longwatch Robe",
              "Longwatch Handwraps", "Longwatch Sandals"],
  litany: ["Litany Circlet", "Litany Mantle", "Litany Vestment",
           "Litany Gloves", "Litany Leggings"],
  nightfall: ["Crown of the Last Dark", "Mantle of the Last Dark", "Shroud of the Last Dark",
              "Gloves of the Last Dark", "Leggings of the Last Dark"],
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
   complete set means clearing the whole raid rather than farming one encounter.
   A raid hosts two or three sets; the one that drops is the set built around how
   this character actually fights, so you are steered toward the set you want.
   If the raid hosts nothing for your stat, any of its sets can turn up — the raw
   stats on the piece still follow your build, so it is never wasted. */
function setPieceForBoss(bossId) {
  for (const raid of RAIDS) {
    const idx = raid.bosses.findIndex(b => b.id === bossId);
    if (idx < 0) continue;
    const pool = SETS.filter(s => s.raid === raid.id);
    if (!pool.length || idx >= SET_SLOTS.length) return null;
    const want = typeof dominantPrimary === "function" ? dominantPrimary() : null;
    const set = pool.find(s => s.stat === want)
      || pool[Math.floor(Math.random() * pool.length)];
    return setPieceDef(set, idx);
  }
  return null;
}

/* The definition for one piece, built from the set and its index. */
function setPieceDef(set, index) {
  return {
    setId: set.id,
    index,
    slot: SET_SLOTS[index],
    name: SET_PIECE_NAMES[set.id][index],
    ilvl: set.ilvl,
    // the set's theme; makeSetPiece rolls the wearer's own primary onto the piece
    primary: set.stat,
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
