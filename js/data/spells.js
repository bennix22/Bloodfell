/* ===========================================================================
   SPELLS — 5 per tree, 25 total.
   ---------------------------------------------------------------------------
   Unlocked purely by points spent in a tree: 5, 10, 15, 20, 25.
   Put 25 in Warrior and 15 in Priest and you have all 5 Warrior spells and the
   first 3 Priest spells. Nothing else gates them.

   Spells fire automatically. There is no rotation editor and no conditions to
   configure — the engine casts whatever is off cooldown and affordable, in the
   order the spellbook lists them (drag to reorder in the Skills panel).
   The single exception: heals and shields hold until you are below 90% Health,
   otherwise they would be wasted on the opening tick of every fight.

   TYPES
     damage  one hit, right now
     dot     damage spread over `ticks` ticks across `duration` seconds
     heal    one heal
     hot     healing over time
     shield  absorbs damage until spent or expired
     buff    temporary modifiers, same keys as talents

   MANA
     `manaPct` is a percentage of your maximum mana, not a flat number. Flat
     costs were the reason mana never mattered: the pool grows every level while
     a fixed cost does not, so by level 40 regeneration covered 243% of the most
     you could possibly spend and no build could run dry. A percentage keeps the
     pressure identical at level 1 and level 50.

   SCALING
     scale: "weapon"  -> coef is a multiplier on a normal weapon swing
     scale: "str" | "agi" | "int" | "spi" -> coef is a multiplier on that stat
   =========================================================================== */

const SPELLS = [
  /* ------------------------------------------------------------------ WARRIOR */
  { id: "sp_w1", tree: "warrior", req: 5, name: "Sundering Blow", type: "damage", school: "phys",
    scale: "weapon", coef: 1.04, cd: 6, manaPct: 4,
    desc: "A heavy overhead swing. 190% weapon damage." },

  { id: "sp_w2", tree: "warrior", req: 10, name: "Gaping Wound", type: "dot", school: "phys",
    scale: "weapon", coef: 0.88, cd: 12, manaPct: 5, duration: 8, ticks: 4,
    desc: "Opens a wound that will not close. 160% weapon damage over 8 seconds." },

  { id: "sp_w3", tree: "warrior", req: 15, name: "Bulwark Crash", type: "damage", school: "phys",
    scale: "weapon", coef: 0.83, cd: 10, manaPct: 5.5, buff: { mods: { block: 15, dr: 8 }, duration: 8 },
    desc: "Slam with everything you are carrying. 150% weapon damage, then +15% Block and 8% damage reduction for 8s." },

  { id: "sp_w4", tree: "warrior", req: 20, name: "Whirling Ruin", type: "damage", school: "phys",
    scale: "weapon", coef: 1.76, cd: 18, manaPct: 8.5,
    desc: "Everything within reach, several times. 320% weapon damage." },

  { id: "sp_w5", tree: "warrior", req: 25, name: "Wrath Ascendant", type: "buff", school: "phys",
    cd: 60, manaPct: 11, buff: { mods: { allDmg: 35, haste: 20, lifesteal: 5 }, duration: 15 },
    desc: "+35% damage, +20% Haste and 5% lifesteal for 15 seconds." },

  { id: "sp_w6", tree: "warrior", req: 30, name: "Ruinous Cleave", type: "damage", school: "phys",
    scale: "weapon", coef: 2.4, cd: 20, manaPct: 9,
    desc: "A single, ruinous arc. 440% weapon damage." },

  { id: "sp_w7", tree: "warrior", req: 35, name: "Cataclysmic Slam", type: "damage", school: "phys",
    scale: "weapon", coef: 3.6, cd: 30, manaPct: 12, execBonus: 1.5,
    desc: "The ground splits. 650% weapon damage, half again as much to the wounded." },

  /* ------------------------------------------------------------------ PALADIN */
  { id: "sp_p1", tree: "paladin", req: 5, name: "Verdict", type: "damage", school: "magic",
    scale: "str", coef: 1.32, cd: 7, manaPct: 4.5,
    desc: "Holy damage scaling with Strength." },

  { id: "sp_p2", tree: "paladin", req: 10, name: "Radiant Mend", type: "heal",
    scale: "spi", coef: 4.2, cd: 10, manaPct: 7,
    desc: "A burst of healing scaling with Spirit." },

  { id: "sp_p3", tree: "paladin", req: 15, name: "Hallowed Ground", type: "dot", school: "magic",
    scale: "str", coef: 1.65, cd: 14, manaPct: 7.5, duration: 10, ticks: 5,
    desc: "Consecrates the ground underfoot. Holy damage over 10 seconds." },

  { id: "sp_p4", tree: "paladin", req: 20, name: "Aegis of Dawn", type: "shield",
    scale: "spi", coef: 5.5, cd: 25, manaPct: 10, duration: 12,
    desc: "Absorbs damage for up to 12 seconds. Scales with Spirit." },

  { id: "sp_p5", tree: "paladin", req: 25, name: "Zealot's Fury", type: "buff",
    cd: 70, manaPct: 12, buff: { mods: { magicDmg: 30, crit: 15, healPct: 25 }, duration: 16 },
    desc: "+30% magic damage, +15% critical strike and +25% healing for 16 seconds." },

  { id: "sp_p6", tree: "paladin", req: 30, name: "Divine Storm", type: "damage", school: "magic",
    scale: "str", coef: 2.1, cd: 18, manaPct: 9,
    desc: "A whirl of holy fire scaling with Strength." },

  { id: "sp_p7", tree: "paladin", req: 35, name: "Wrath of the Heavens", type: "damage", school: "magic",
    scale: "str", coef: 3.2, cd: 32, manaPct: 12,
    desc: "Calls the sky down. Enormous holy damage scaling with Strength." },

  /* --------------------------------------------------------------------- MAGE */
  { id: "sp_m1", tree: "mage", req: 5, name: "Rimeshard", type: "damage", school: "magic",
    scale: "int", coef: 1.21, cd: 5, manaPct: 4.5,
    desc: "A splinter of black ice. Frost damage scaling with Intellect." },

  { id: "sp_m2", tree: "mage", req: 10, name: "Emberlance", type: "damage", school: "magic",
    scale: "int", coef: 1.87, cd: 9, manaPct: 6.5,
    desc: "A spear of fire through the middle. Heavy Intellect scaling." },

  { id: "sp_m3", tree: "mage", req: 15, name: "Arcane Cascade", type: "damage", school: "magic",
    scale: "int", coef: 0.94, cd: 4, manaPct: 5,
    desc: "Small, fast, relentless. Low cooldown Intellect damage." },

  { id: "sp_m4", tree: "mage", req: 20, name: "Cinderbrand", type: "dot", school: "magic",
    scale: "int", coef: 2.48, cd: 15, manaPct: 8.5, duration: 12, ticks: 6,
    desc: "Sets a mark that keeps burning. Fire damage over 12 seconds." },

  { id: "sp_m5", tree: "mage", req: 25, name: "Cataclysm", type: "damage", school: "magic",
    scale: "int", coef: 4.4, cd: 30, manaPct: 14,
    desc: "One very large problem for the target. Enormous Intellect scaling." },

  { id: "sp_m6", tree: "mage", req: 30, name: "Meteor", type: "damage", school: "magic",
    scale: "int", coef: 5.6, cd: 20, manaPct: 11,
    desc: "A falling rock the size of a house. Massive Intellect scaling." },

  { id: "sp_m7", tree: "mage", req: 35, name: "Supernova", type: "damage", school: "magic",
    scale: "int", coef: 8.2, cd: 34, manaPct: 15,
    desc: "A star, ended, at the target's feet. Colossal Intellect scaling." },

  /* -------------------------------------------------------------------- ROGUE */
  { id: "sp_r1", tree: "rogue", req: 5, name: "Vile Cut", type: "damage", school: "phys",
    scale: "weapon", coef: 0.94, cd: 5, manaPct: 3.5,
    desc: "Fast and unkind. 170% weapon damage." },

  { id: "sp_r2", tree: "rogue", req: 10, name: "Hemorrhage", type: "dot", school: "phys",
    scale: "weapon", coef: 1.1, cd: 12, manaPct: 5.5, duration: 10, ticks: 5,
    desc: "They will keep bleeding while you work. 200% weapon damage over 10 seconds." },

  { id: "sp_r3", tree: "rogue", req: 15, name: "Throatrend", type: "damage", school: "phys",
    scale: "weapon", coef: 1.43, cd: 11, manaPct: 6.5, execBonus: 1.6,
    desc: "260% weapon damage, and 60% more against targets below 30% Health." },

  { id: "sp_r4", tree: "rogue", req: 20, name: "Frenzy Draught", type: "buff",
    cd: 45, manaPct: 8, buff: { mods: { haste: 40, crit: 8 }, duration: 12 },
    desc: "+40% Haste and +8% critical strike for 12 seconds." },

  { id: "sp_r5", tree: "rogue", req: 25, name: "Veilstep", type: "buff",
    cd: 65, manaPct: 11, buff: { mods: { critDmg: 60, dodge: 20, physDmg: 20 }, duration: 14 },
    desc: "+60% critical damage, +20% Dodge and +20% physical damage for 14 seconds." },

  { id: "sp_r6", tree: "rogue", req: 30, name: "Death Mark", type: "damage", school: "phys",
    scale: "weapon", coef: 2.4, cd: 18, manaPct: 9, execBonus: 1.6,
    desc: "A killing blow to a marked throat. 440% weapon damage, more to the wounded." },

  { id: "sp_r7", tree: "rogue", req: 35, name: "Thousand Cuts", type: "dot", school: "phys",
    scale: "weapon", coef: 3.9, cd: 28, manaPct: 12, duration: 10, ticks: 5,
    desc: "Too many wounds to count. 710% weapon damage over 10 seconds." },

  /* ------------------------------------------------------------------- PRIEST */
  { id: "sp_s1", tree: "priest", req: 5, name: "Censure", type: "damage", school: "magic",
    scale: "spi", coef: 1.26, cd: 6, manaPct: 4,
    desc: "Shadow damage scaling with Spirit." },

  { id: "sp_s2", tree: "priest", req: 10, name: "Mending Word", type: "hot",
    scale: "spi", coef: 5.0, cd: 12, manaPct: 6.5, duration: 12, ticks: 6,
    desc: "Healing over 12 seconds, scaling with Spirit." },

  { id: "sp_s3", tree: "priest", req: 15, name: "Sanctuary Ward", type: "shield",
    scale: "spi", coef: 4.8, cd: 20, manaPct: 8.5, duration: 14,
    desc: "Absorbs damage for up to 14 seconds. Scales with Spirit." },

  { id: "sp_s4", tree: "priest", req: 20, name: "Whisper of Agony", type: "dot", school: "magic",
    scale: "spi", coef: 2.86, cd: 16, manaPct: 9, duration: 12, ticks: 6,
    desc: "A single suggestion, repeated. Shadow damage over 12 seconds." },

  { id: "sp_s5", tree: "priest", req: 25, name: "Choir of the Fallen", type: "heal",
    scale: "spi", coef: 9.0, cd: 50, manaPct: 13, buff: { mods: { magicDmg: 25, dr: 10 }, duration: 15 },
    desc: "A large heal, plus +25% magic damage and 10% damage reduction for 15 seconds." },

  { id: "sp_s6", tree: "priest", req: 30, name: "Shadow Word: Ruin", type: "dot", school: "magic",
    scale: "spi", coef: 4.4, cd: 16, manaPct: 9, duration: 12, ticks: 6,
    desc: "A word that unmakes. Shadow damage over 12 seconds, scaling with Spirit." },

  { id: "sp_s7", tree: "priest", req: 35, name: "Apotheosis", type: "buff",
    cd: 60, manaPct: 13, buff: { mods: { magicDmg: 35, haste: 15, lifesteal: 5, healPct: 20 }, duration: 16 },
    desc: "+35% shadow damage, +15% Haste, +5% lifesteal and +20% healing for 16 seconds." },
];
