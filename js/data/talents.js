/* ===========================================================================
   TALENTS — 5 trees, 25 talents each, 5 tiers of 5.
   ---------------------------------------------------------------------------
   Tier N unlocks once you have spent 5 * (N-1) points IN THAT TREE.
   Talents unlock at character level 10. You get 1 point per level after that,
   so a level 50 character has exactly 40 points. Resetting is free, always.

   40 points buys you the full depth of one tree (tier 5 needs 20 in-tree) plus
   a solid dip into a second. Filling a whole tree costs ~57 points, so you can
   never have everything.

   Every talent is just a bag of modifiers. To add your own, copy a line and
   change the numbers — no engine code needs to change.

   MODIFIER KEYS
     str agi int spi sta ............ flat primary stats
     strPct agiPct intPct spiPct .... percent primary stats
     staPct hpPct manaPct ........... percent pools
     crit haste dodge block ......... flat percentage points
     critDmg ........................ percent added to crit multiplier
     armor armorPct ................. armor
     physDmg magicDmg allDmg ........ percent damage by school
     healPct ........................ percent healing done
     dr ............................. flat percent damage reduction
     lifesteal thorns ............... percent
     manaRegen ...................... percent
     cdr ............................ percent spell cooldown reduction
     execDmg ........................ percent bonus vs targets under 30% HP
     goldFind xpBonus magicFind ..... percent to gold / xp / drop rates
     lowHpDmg ....................... percent bonus damage below 35% own health
     highHpDmg ...................... percent bonus damage above 70% own health
     rampDmg ........................ percent added per swing, resets each fight

   A talent may also carry `effect: { id, chance, potency }`, which grants one of
   the procs defined in js/data/effects.js. Ranks multiply `chance`, so three
   ranks of a 5% proc is 15%. Those talents carry `mods: {}`.
   =========================================================================== */

const TALENT_TREES = [
  /* ===================================================================== WARRIOR */
  {
    id: "warrior", name: "Warrior", primary: "str",
    blurb: "Hit it until the problem resolves. Survive the part in between.",
    talents: [
      // --- Tier 1
      { id: "w1", name: "Brutal Strength", tier: 1, max: 3, mods: { strPct: 2 }, desc: "+2% Strength per rank." },
      { id: "w2", name: "Iron Hide", tier: 1, max: 3, mods: { armorPct: 4 }, desc: "+4% Armor per rank." },
      { id: "w3", name: "Bloodlust", tier: 1, max: 3, mods: { haste: 1.5 }, desc: "+1.5% Haste per rank." },
      { id: "w4", name: "Toughness", tier: 1, max: 3, mods: { hpPct: 2 }, desc: "+2% maximum Health per rank." },
      { id: "w5", name: "Cleaving Blows", tier: 1, max: 3, mods: { physDmg: 2 }, desc: "+2% physical damage per rank." },
      // --- Tier 2
      { id: "w6", name: "Deep Wounds", tier: 2, max: 3, mods: { critDmg: 5 }, desc: "+5% critical strike damage per rank." },
      { id: "w7", name: "Battle Scars", tier: 2, max: 3, mods: { dr: 1.5 }, desc: "Take 1.5% less damage per rank." },
      { id: "w8", name: "Weapon Mastery", tier: 2, max: 3, mods: { physDmg: 3 }, desc: "+3% physical damage per rank." },
      { id: "w9", name: "Rage Unbound", tier: 2, max: 3, mods: { crit: 1 }, desc: "+1% critical strike chance per rank." },
      { id: "w31", name: "Second Wind", tier: 2, max: 3, mods: { manaRegen: 25, manaOnHit: 0.6 }, desc: "+25% mana regeneration per rank, and restore mana when you land a hit." },
      { id: "w10", name: "Second Wind", tier: 2, max: 2, mods: { lifesteal: 1.5 }, desc: "Heal for 1.5% of damage dealt per rank." },
      // --- Tier 3
      { id: "w11", name: "Titan's Grip", tier: 3, max: 3, mods: { strPct: 3 }, desc: "+3% Strength per rank." },
      { id: "w12", name: "Unyielding", tier: 3, max: 3, mods: { hpPct: 2.5, sta: 6 }, desc: "+2.5% max Health and +6 Stamina per rank." },
      { id: "w13", name: "Reckless Fury", tier: 3, max: 3, mods: { physDmg: 4, armorPct: -2 }, desc: "+4% physical damage, -2% Armor per rank." },
      { id: "w14", name: "Shield Wall", tier: 3, max: 3, mods: { block: 2 }, desc: "+2% Block chance per rank." },
      { id: "w15", name: "Executioner", tier: 3, max: 2, mods: { execDmg: 8 }, desc: "+8% damage to enemies below 30% Health per rank." },
      { id: "w26", name: "Rending Strikes", tier: 3, max: 3, effect: { id: "rend", chance: 5, potency: 1 }, mods: {}, desc: "5% chance per rank that a hit opens a bleeding wound." },
      // --- Tier 4
      { id: "w16", name: "Warbringer", tier: 4, max: 2, mods: { allDmg: 4 }, desc: "+4% damage of all schools per rank." },
      { id: "w17", name: "Spiked Armor", tier: 4, max: 3, mods: { thorns: 3 }, desc: "Reflect 3% of damage taken per rank." },
      { id: "w18", name: "Blood Frenzy", tier: 4, max: 3, mods: { haste: 2 }, desc: "+2% Haste per rank." },
      { id: "w19", name: "Immovable", tier: 4, max: 2, mods: { dodge: 2, dr: 1 }, desc: "+2% Dodge and 1% damage reduction per rank." },
      { id: "w20", name: "Savage Precision", tier: 4, max: 2, mods: { crit: 2 }, desc: "+2% critical strike chance per rank." },
      { id: "w27", name: "Wrath of the Cornered", tier: 4, max: 3, mods: { lowHpDmg: 9 }, desc: "+9% damage per rank while you are below 35% Health." },
      { id: "w28", name: "Answering Blow", tier: 4, max: 3, effect: { id: "retort", chance: 6, potency: 1 }, mods: {}, desc: "6% chance per rank to strike back when you are hit." },
      // --- Tier 5
      { id: "w21", name: "Avatar of War", tier: 5, max: 1, mods: { strPct: 10 }, desc: "+10% Strength." },
      { id: "w22", name: "Endless Rage", tier: 5, max: 1, mods: { physDmg: 12 }, desc: "+12% physical damage." },
      { id: "w23", name: "Juggernaut", tier: 5, max: 1, mods: { hpPct: 12, armorPct: 8 }, desc: "+12% max Health, +8% Armor." },
      { id: "w24", name: "Deathblow", tier: 5, max: 1, mods: { critDmg: 25 }, desc: "+25% critical strike damage." },
      { id: "w25", name: "Undying Wrath", tier: 5, max: 1, mods: { lifesteal: 5, allDmg: 5 }, desc: "+5% lifesteal and +5% damage." },
      { id: "w29", name: "Bloodscent", tier: 5, max: 1, effect: { id: "execute_proc", chance: 18, potency: 1.2 }, mods: {}, desc: "18% chance on hit to gain 22% damage for 6 seconds." },
      { id: "w30", name: "Unstoppable", tier: 5, max: 1, mods: { rampDmg: 2.5 }, desc: "Every swing in a fight adds 2.5% damage, up to 30%. Resets each fight." },
      { id: "w40", name: "Titan's Grip", tier: 6, max: 1, mods: { strPct: 12 }, desc: "+12% Strength." },
      { id: "w41", name: "Gorewrought", tier: 6, max: 1, mods: { lifesteal: 4, critDmg: 15 }, desc: "+4% lifesteal and +15% critical strike damage." },
      { id: "w42", name: "Worldender", tier: 7, max: 1, mods: { physDmg: 16, allDmg: 4 }, desc: "+16% physical damage and +4% damage of all schools." },
      { id: "w43", name: "Deathless", tier: 7, max: 1, mods: { hpPct: 16, dr: 5 }, desc: "+16% max Health and 5% damage reduction." },
    ],
  },

  /* ===================================================================== PALADIN */
  {
    id: "paladin", name: "Paladin", primary: "str",
    blurb: "Armour, conviction, and a very literal reading of the oath.",
    talents: [
      { id: "p1", name: "Devotion", tier: 1, max: 3, mods: { armorPct: 5 }, desc: "+5% Armor per rank." },
      { id: "p2", name: "Righteous Vigor", tier: 1, max: 3, mods: { strPct: 1.5, spi: 5 }, desc: "+1.5% Strength and +5 Spirit per rank." },
      { id: "p3", name: "Shield Discipline", tier: 1, max: 3, mods: { block: 2 }, desc: "+2% Block chance per rank." },
      { id: "p4", name: "Blessed Constitution", tier: 1, max: 3, mods: { hpPct: 2 }, desc: "+2% maximum Health per rank." },
      { id: "p5", name: "Consecrated Strikes", tier: 1, max: 3, mods: { magicDmg: 3 }, desc: "+3% holy and magical damage per rank." },

      { id: "p6", name: "Mercy", tier: 2, max: 3, mods: { healPct: 5 }, desc: "+5% healing done per rank." },
      { id: "p7", name: "Sanctified Plate", tier: 2, max: 3, mods: { dr: 1.5 }, desc: "Take 1.5% less damage per rank." },
      { id: "p8", name: "Zeal", tier: 2, max: 3, mods: { crit: 1, haste: 1 }, desc: "+1% critical strike and +1% Haste per rank." },
      { id: "p9", name: "Retribution Aura", tier: 2, max: 3, mods: { thorns: 3 }, desc: "Reflect 3% of damage taken per rank." },
      { id: "p10", name: "Lay Hands", tier: 2, max: 2, mods: { lifesteal: 2 }, desc: "Heal for 2% of damage dealt per rank." },

      { id: "p11", name: "Guarded Heart", tier: 3, max: 3, mods: { hpPct: 3, spi: 8 }, desc: "+3% max Health and +8 Spirit per rank." },
      { id: "p12", name: "Hammer and Anvil", tier: 3, max: 3, mods: { physDmg: 3.5 }, desc: "+3.5% physical damage per rank." },
      { id: "p13", name: "Unbreakable Faith", tier: 3, max: 3, mods: { armorPct: 5, block: 1 }, desc: "+5% Armor and +1% Block per rank." },
      { id: "p14", name: "Radiance", tier: 3, max: 3, mods: { healPct: 6, spiPct: 3 }, desc: "+6% healing and +3% Spirit per rank." },
      { id: "p15", name: "Judgement", tier: 3, max: 2, mods: { magicDmg: 5, critDmg: 5 }, desc: "+5% magic damage and +5% crit damage per rank." },
      { id: "p26", name: "Shield of the Faithful", tier: 3, max: 3, effect: { id: "bulwark", chance: 6, potency: 1 }, mods: {}, desc: "6% chance per rank to harden when struck." },

      { id: "p16", name: "Aegis", tier: 4, max: 3, mods: { dr: 2 }, desc: "Take 2% less damage per rank." },
      { id: "p17", name: "Crusade", tier: 4, max: 2, mods: { allDmg: 4 }, desc: "+4% damage of all schools per rank." },
      { id: "p18", name: "Divine Reserve", tier: 4, max: 3, mods: { manaPct: 8, manaRegen: 10 }, desc: "+8% max Mana and +10% Mana regeneration per rank." },
      { id: "p19", name: "Bulwark Mastery", tier: 4, max: 2, mods: { block: 3, armorPct: 4 }, desc: "+3% Block and +4% Armor per rank." },
      { id: "p20", name: "Fervor", tier: 4, max: 2, mods: { haste: 2, cdr: 4 }, desc: "+2% Haste and 4% shorter spell cooldowns per rank." },
      { id: "p27", name: "Steadfast", tier: 4, max: 3, mods: { highHpDmg: 7 }, desc: "+7% damage per rank while above 70% Health." },
      { id: "p28", name: "Sanctified Wrath", tier: 4, max: 2, effect: { id: "vengeance", chance: 8, potency: 1 }, mods: {}, desc: "8% chance per rank to gain damage when struck." },

      { id: "p21", name: "Avenging Light", tier: 5, max: 1, mods: { magicDmg: 14 }, desc: "+14% holy and magical damage." },
      { id: "p22", name: "Guardian of the Fallen", tier: 5, max: 1, mods: { hpPct: 10, dr: 4 }, desc: "+10% max Health and 4% damage reduction." },
      { id: "p23", name: "Hand of the Dawn", tier: 5, max: 1, mods: { healPct: 25, spiPct: 8 }, desc: "+25% healing done and +8% Spirit." },
      { id: "p24", name: "Unyielding Oath", tier: 5, max: 1, mods: { block: 8, thorns: 8 }, desc: "+8% Block and reflect 8% of damage taken." },
      { id: "p25", name: "Zealot's Ascension", tier: 5, max: 1, mods: { strPct: 8, allDmg: 5, lifesteal: 3 }, desc: "+8% Strength, +5% damage, +3% lifesteal." },
      { id: "p29", name: "Second Life", tier: 5, max: 1, effect: { id: "lastbreath", chance: 30, potency: 1 }, mods: {}, desc: "Below 30% Health, a 30% chance when struck to recover far more than the blow took." },
      { id: "p30", name: "Endless Crusade", tier: 5, max: 1, effect: { id: "momentum", chance: 100, potency: 1 }, mods: {}, desc: "Every kill grants 20% Haste and 10% damage for 12 seconds." },
      { id: "p40", name: "Aegis Eternal", tier: 6, max: 1, mods: { hpPct: 12, block: 6 }, desc: "+12% max Health and +6% Block." },
      { id: "p41", name: "Radiant Wrath", tier: 6, max: 1, mods: { magicDmg: 12, healPct: 15 }, desc: "+12% holy and magical damage and +15% healing done." },
      { id: "p42", name: "Lightbringer", tier: 7, max: 1, mods: { strPct: 10, magicDmg: 10, dr: 4 }, desc: "+10% Strength, +10% holy damage, 4% damage reduction." },
      { id: "p43", name: "Undying Devotion", tier: 7, max: 1, mods: { hpPct: 14, lifesteal: 4, thorns: 6 }, desc: "+14% max Health, +4% lifesteal, reflect 6% of damage taken." },
    ],
  },

  /* ======================================================================== MAGE */
  {
    id: "mage", name: "Mage", primary: "int",
    blurb: "Enormous damage from a body made of expensive fabric.",
    talents: [
      { id: "m1", name: "Arcane Study", tier: 1, max: 3, mods: { intPct: 2 }, desc: "+2% Intellect per rank." },
      { id: "m2", name: "Kindling", tier: 1, max: 3, mods: { magicDmg: 2.5 }, desc: "+2.5% magic damage per rank." },
      { id: "m3", name: "Quick Casting", tier: 1, max: 3, mods: { haste: 1.5 }, desc: "+1.5% Haste per rank." },
      { id: "m4", name: "Mana Well", tier: 1, max: 3, mods: { manaPct: 8, manaRegen: 8 }, desc: "+8% max Mana and Mana regeneration per rank." },
      { id: "m5", name: "Focused Mind", tier: 1, max: 3, mods: { crit: 1 }, desc: "+1% critical strike chance per rank." },

      { id: "m6", name: "Incineration", tier: 2, max: 3, mods: { magicDmg: 3 }, desc: "+3% magic damage per rank." },
      { id: "m7", name: "Frost Armor", tier: 2, max: 3, mods: { armorPct: 6, dr: 0.5 }, desc: "+6% Armor and 0.5% damage reduction per rank." },
      { id: "m8", name: "Critical Mass", tier: 2, max: 3, mods: { critDmg: 6 }, desc: "+6% critical strike damage per rank." },
      { id: "m9", name: "Blink", tier: 2, max: 3, mods: { dodge: 1.5 }, desc: "+1.5% Dodge per rank." },
      { id: "m10", name: "Arcane Recovery", tier: 2, max: 2, mods: { cdr: 4 }, desc: "4% shorter spell cooldowns per rank." },

      { id: "m11", name: "Greater Intellect", tier: 3, max: 3, mods: { intPct: 3 }, desc: "+3% Intellect per rank." },
      { id: "m12", name: "Conflagrate", tier: 3, max: 3, mods: { magicDmg: 4 }, desc: "+4% magic damage per rank." },
      { id: "m13", name: "Ice Barrier", tier: 3, max: 3, mods: { hpPct: 3, dr: 1 }, desc: "+3% max Health and 1% damage reduction per rank." },
      { id: "m14", name: "Piercing Cold", tier: 3, max: 3, mods: { crit: 1.5 }, desc: "+1.5% critical strike chance per rank." },
      { id: "m15", name: "Burnout", tier: 3, max: 2, mods: { execDmg: 9 }, desc: "+9% damage to enemies below 30% Health per rank." },
      { id: "m26", name: "Living Bomb", tier: 3, max: 3, effect: { id: "ignite", chance: 5, potency: 1 }, mods: {}, desc: "5% chance per rank that a hit sets the target burning." },

      { id: "m16", name: "Spell Weaving", tier: 4, max: 3, mods: { haste: 2.5 }, desc: "+2.5% Haste per rank." },
      { id: "m17", name: "Arcane Power", tier: 4, max: 2, mods: { allDmg: 5 }, desc: "+5% damage of all schools per rank." },
      { id: "m18", name: "Siphon Life", tier: 4, max: 3, mods: { lifesteal: 2 }, desc: "Heal for 2% of damage dealt per rank." },
      { id: "m19", name: "Empowered Runes", tier: 4, max: 2, mods: { critDmg: 10 }, desc: "+10% critical strike damage per rank." },
      { id: "m20", name: "Deep Reserves", tier: 4, max: 2, mods: { manaPct: 12, cdr: 3 }, desc: "+12% max Mana, 3% shorter cooldowns per rank." },
      { id: "m27", name: "Permafrost", tier: 4, max: 3, effect: { id: "frostbite", chance: 7, potency: 1 }, mods: {}, desc: "7% chance per rank to slow the target's attacks." },
      { id: "m28", name: "Rising Power", tier: 4, max: 3, mods: { rampDmg: 1.8 }, desc: "Each swing adds 1.8% damage per rank, resetting every fight." },

      { id: "m21", name: "Archmage", tier: 5, max: 1, mods: { intPct: 12 }, desc: "+12% Intellect." },
      { id: "m22", name: "Cataclysm", tier: 5, max: 1, mods: { magicDmg: 16 }, desc: "+16% magic damage." },
      { id: "m23", name: "Time Warp", tier: 5, max: 1, mods: { haste: 8, cdr: 10 }, desc: "+8% Haste and 10% shorter spell cooldowns." },
      { id: "m24", name: "Combustion", tier: 5, max: 1, mods: { crit: 6, critDmg: 20 }, desc: "+6% critical strike and +20% critical damage." },
      { id: "m25", name: "Mana Shield", tier: 5, max: 1, mods: { hpPct: 10, dr: 5, manaPct: 20 }, desc: "+10% Health, 5% damage reduction, +20% Mana." },
      { id: "m29", name: "Arcane Feast", tier: 5, max: 1, effect: { id: "soulsiphon", chance: 100, potency: 1.5 }, mods: {}, desc: "Every kill restores 30% of your Mana." },
      { id: "m30", name: "First Strike", tier: 5, max: 1, effect: { id: "ambush", chance: 100, potency: 1 }, mods: {}, desc: "Open every fight with 25% critical strike and 15% damage for 8 seconds." },
      { id: "m40", name: "Transcendence", tier: 6, max: 1, mods: { intPct: 12 }, desc: "+12% Intellect." },
      { id: "m41", name: "Pyroclasm", tier: 6, max: 1, mods: { magicDmg: 14, crit: 5 }, desc: "+14% magic damage and +5% critical strike." },
      { id: "m42", name: "Archon", tier: 7, max: 1, mods: { magicDmg: 16, critDmg: 22 }, desc: "+16% magic damage and +22% critical strike damage." },
      { id: "m43", name: "Eternity", tier: 7, max: 1, mods: { haste: 8, cdr: 12, manaPct: 20 }, desc: "+8% Haste, 12% shorter cooldowns, +20% Mana." },
    ],
  },

  /* ======================================================================= ROGUE */
  {
    id: "rogue", name: "Rogue", primary: "agi",
    blurb: "Speed, precision, and a firm policy against being hit.",
    talents: [
      { id: "r1", name: "Lithe", tier: 1, max: 3, mods: { agiPct: 2 }, desc: "+2% Agility per rank." },
      { id: "r2", name: "Keen Edge", tier: 1, max: 3, mods: { crit: 1.2 }, desc: "+1.2% critical strike chance per rank." },
      { id: "r3", name: "Fleet Footed", tier: 1, max: 3, mods: { haste: 1.8 }, desc: "+1.8% Haste per rank." },
      { id: "r4", name: "Evasion", tier: 1, max: 3, mods: { dodge: 1.5 }, desc: "+1.5% Dodge per rank." },
      { id: "r5", name: "Opportunist", tier: 1, max: 3, mods: { physDmg: 2.5 }, desc: "+2.5% physical damage per rank." },

      { id: "r6", name: "Lethality", tier: 2, max: 3, mods: { critDmg: 6 }, desc: "+6% critical strike damage per rank." },
      { id: "r7", name: "Bleed Out", tier: 2, max: 3, mods: { physDmg: 3 }, desc: "+3% physical damage per rank." },
      { id: "r8", name: "Vitality", tier: 2, max: 3, mods: { hpPct: 2, agi: 6 }, desc: "+2% max Health and +6 Agility per rank." },
      { id: "r9", name: "Nightstalker", tier: 2, max: 3, mods: { crit: 1.2 }, desc: "+1.2% critical strike chance per rank." },
      { id: "r31", name: "Adrenaline", tier: 2, max: 3, mods: { manaRegen: 25, manaOnHit: 0.6 }, desc: "+25% mana regeneration per rank, and restore mana when you land a hit." },
      { id: "r10", name: "Bloodthirst", tier: 2, max: 2, mods: { lifesteal: 2 }, desc: "Heal for 2% of damage dealt per rank." },

      { id: "r11", name: "Deft Hands", tier: 3, max: 3, mods: { agiPct: 3 }, desc: "+3% Agility per rank." },
      { id: "r12", name: "Adrenaline", tier: 3, max: 3, mods: { haste: 2.5 }, desc: "+2.5% Haste per rank." },
      { id: "r13", name: "Cheat Death", tier: 3, max: 3, mods: { dr: 1.5, dodge: 1 }, desc: "Take 1.5% less damage and +1% Dodge per rank." },
      { id: "r14", name: "Serrated Blades", tier: 3, max: 3, mods: { physDmg: 4 }, desc: "+4% physical damage per rank." },
      { id: "r15", name: "Finishing Move", tier: 3, max: 2, mods: { execDmg: 10 }, desc: "+10% damage to enemies below 30% Health per rank." },
      { id: "r26", name: "Rupture", tier: 3, max: 3, effect: { id: "rend", chance: 6, potency: 1.1 }, mods: {}, desc: "6% chance per rank that a hit opens a deep bleed." },

      { id: "r16", name: "Vendetta", tier: 4, max: 2, mods: { allDmg: 4.5 }, desc: "+4.5% damage of all schools per rank." },
      { id: "r17", name: "Cold Blood", tier: 4, max: 2, mods: { crit: 2.5 }, desc: "+2.5% critical strike chance per rank." },
      { id: "r18", name: "Ruthlessness", tier: 4, max: 3, mods: { critDmg: 8 }, desc: "+8% critical strike damage per rank." },
      { id: "r19", name: "Shadow Step", tier: 4, max: 2, mods: { dodge: 2.5, haste: 1 }, desc: "+2.5% Dodge and +1% Haste per rank." },
      { id: "r20", name: "Find Weakness", tier: 4, max: 3, mods: { physDmg: 3, goldFind: 5 }, desc: "+3% physical damage and +5% gold found per rank." },
      { id: "r27", name: "Opening Act", tier: 4, max: 2, effect: { id: "ambush", chance: 100, potency: 0.5 }, mods: {}, desc: "Begin each fight with bonus critical strike and damage." },
      { id: "r28", name: "Relentless", tier: 4, max: 3, effect: { id: "windfury", chance: 4, potency: 1 }, mods: {}, desc: "4% chance per rank that a hit strikes again immediately." },

      { id: "r21", name: "Master Assassin", tier: 5, max: 1, mods: { agiPct: 12 }, desc: "+12% Agility." },
      { id: "r22", name: "Killing Spree", tier: 5, max: 1, mods: { physDmg: 14 }, desc: "+14% physical damage." },
      { id: "r23", name: "Blade Flurry", tier: 5, max: 1, mods: { haste: 10 }, desc: "+10% Haste." },
      { id: "r24", name: "Perfect Strike", tier: 5, max: 1, mods: { crit: 7, critDmg: 18 }, desc: "+7% critical strike and +18% critical damage." },
      { id: "r25", name: "Ghost in the Dark", tier: 5, max: 1, mods: { dodge: 8, lifesteal: 4 }, desc: "+8% Dodge and +4% lifesteal." },
      { id: "r29", name: "Shatterpoint", tier: 5, max: 1, effect: { id: "shatter", chance: 30, potency: 1.2 }, mods: {}, desc: "Critical strikes have a 30% chance to shatter for heavy extra damage." },
      { id: "r30", name: "Bloodhunt", tier: 5, max: 1, effect: { id: "momentum", chance: 100, potency: 1.2 }, mods: {}, desc: "Each kill grants 24% Haste and 12% damage for 12 seconds." },
      { id: "r40", name: "Apex Predator", tier: 6, max: 1, mods: { agiPct: 12 }, desc: "+12% Agility." },
      { id: "r41", name: "Exsanguinate", tier: 6, max: 1, mods: { physDmg: 12, lifesteal: 4 }, desc: "+12% physical damage and +4% lifesteal." },
      { id: "r42", name: "Death Incarnate", tier: 7, max: 1, mods: { crit: 8, critDmg: 25 }, desc: "+8% critical strike and +25% critical strike damage." },
      { id: "r43", name: "Untouchable", tier: 7, max: 1, mods: { dodge: 10, haste: 8 }, desc: "+10% Dodge and +8% Haste." },
    ],
  },

  /* ====================================================================== PRIEST */
  {
    id: "priest", name: "Priest", primary: "spi",
    blurb: "Outlast it. Everything dies eventually, including the thing hitting you.",
    talents: [
      { id: "s1", name: "Meditation", tier: 1, max: 3, mods: { spiPct: 2.5 }, desc: "+2.5% Spirit per rank." },
      { id: "s2", name: "Inner Light", tier: 1, max: 3, mods: { healPct: 5 }, desc: "+5% healing done per rank." },
      { id: "s3", name: "Spirit Tap", tier: 1, max: 3, mods: { manaRegen: 12, manaPct: 5 }, desc: "+12% Mana regeneration and +5% max Mana per rank." },
      { id: "s4", name: "Shadow Affinity", tier: 1, max: 3, mods: { magicDmg: 2.5 }, desc: "+2.5% magic damage per rank." },
      { id: "s5", name: "Fortitude", tier: 1, max: 3, mods: { hpPct: 2.5 }, desc: "+2.5% maximum Health per rank." },

      { id: "s6", name: "Divine Grace", tier: 2, max: 3, mods: { healPct: 6, spi: 6 }, desc: "+6% healing and +6 Spirit per rank." },
      { id: "s7", name: "Shielding", tier: 2, max: 3, mods: { dr: 1.5 }, desc: "Take 1.5% less damage per rank." },
      { id: "s8", name: "Twisted Faith", tier: 2, max: 3, mods: { magicDmg: 3, int: 6 }, desc: "+3% magic damage and +6 Intellect per rank." },
      { id: "s9", name: "Enduring Will", tier: 2, max: 3, mods: { hpPct: 2, armorPct: 4 }, desc: "+2% max Health and +4% Armor per rank." },
      { id: "s10", name: "Vampiric Embrace", tier: 2, max: 2, mods: { lifesteal: 2.5 }, desc: "Heal for 2.5% of damage dealt per rank." },

      { id: "s11", name: "Greater Spirit", tier: 3, max: 3, mods: { spiPct: 3.5 }, desc: "+3.5% Spirit per rank." },
      { id: "s12", name: "Mind Flay", tier: 3, max: 3, mods: { magicDmg: 4 }, desc: "+4% magic damage per rank." },
      { id: "s13", name: "Renewed Hope", tier: 3, max: 3, mods: { healPct: 7 }, desc: "+7% healing done per rank." },
      { id: "s14", name: "Spirit of Redemption", tier: 3, max: 3, mods: { hpPct: 3, spi: 8 }, desc: "+3% max Health and +8 Spirit per rank." },
      { id: "s15", name: "Focused Will", tier: 3, max: 2, mods: { crit: 1.5, cdr: 3 }, desc: "+1.5% critical strike and 3% shorter cooldowns per rank." },
      { id: "s26", name: "Leeching Shadows", tier: 3, max: 3, effect: { id: "leech", chance: 6, potency: 1 }, mods: {}, desc: "6% chance per rank that a hit drains health." },

      { id: "s16", name: "Power Infusion", tier: 4, max: 2, mods: { allDmg: 4 }, desc: "+4% damage of all schools per rank." },
      { id: "s17", name: "Serenity", tier: 4, max: 3, mods: { healPct: 8, manaRegen: 10 }, desc: "+8% healing and +10% Mana regeneration per rank." },
      { id: "s18", name: "Pain Suppression", tier: 4, max: 3, mods: { dr: 2 }, desc: "Take 2% less damage per rank." },
      { id: "s19", name: "Devouring Plague", tier: 4, max: 3, mods: { magicDmg: 3.5, lifesteal: 1 }, desc: "+3.5% magic damage and +1% lifesteal per rank." },
      { id: "s20", name: "Borrowed Time", tier: 4, max: 2, mods: { haste: 3 }, desc: "+3% Haste per rank." },
      { id: "s27", name: "Martyrdom", tier: 4, max: 3, mods: { lowHpDmg: 10 }, desc: "+10% damage per rank while below 35% Health." },
      { id: "s28", name: "Inner Fire", tier: 4, max: 2, effect: { id: "bulwark", chance: 9, potency: 1.1 }, mods: {}, desc: "9% chance per rank to harden when struck." },

      { id: "s21", name: "Voice of the Choir", tier: 5, max: 1, mods: { spiPct: 12, healPct: 20 }, desc: "+12% Spirit and +20% healing done." },
      { id: "s22", name: "Shadowform", tier: 5, max: 1, mods: { magicDmg: 15, lifesteal: 3 }, desc: "+15% magic damage and +3% lifesteal." },
      { id: "s23", name: "Guardian Spirit", tier: 5, max: 1, mods: { hpPct: 14, dr: 4 }, desc: "+14% max Health and 4% damage reduction." },
      { id: "s24", name: "Divine Aegis", tier: 5, max: 1, mods: { dr: 6, thorns: 6 }, desc: "6% damage reduction and reflect 6% of damage taken." },
      { id: "s25", name: "Eternal Vigil", tier: 5, max: 1, mods: { manaPct: 25, manaRegen: 40, cdr: 8 }, desc: "+25% Mana, +40% regeneration, 8% shorter cooldowns." },
      { id: "s29", name: "Refuse the Dark", tier: 5, max: 1, effect: { id: "lastbreath", chance: 35, potency: 1.2 }, mods: {}, desc: "Below 30% Health, a 35% chance when struck to be pulled back from it." },
      { id: "s30", name: "Feast of Souls", tier: 5, max: 1, effect: { id: "soulsiphon", chance: 100, potency: 1.25 }, mods: {}, desc: "Every kill restores 25% of your Mana." },
      { id: "s40", name: "Ascended", tier: 6, max: 1, mods: { spiPct: 12, healPct: 18 }, desc: "+12% Spirit and +18% healing done." },
      { id: "s41", name: "Void Communion", tier: 6, max: 1, mods: { magicDmg: 14, lifesteal: 3 }, desc: "+14% shadow and magical damage and +3% lifesteal." },
      { id: "s42", name: "Divine Ascension", tier: 7, max: 1, mods: { hpPct: 14, dr: 6 }, desc: "+14% max Health and 6% damage reduction." },
      { id: "s43", name: "Everlasting", tier: 7, max: 1, mods: { manaPct: 25, manaRegen: 45, cdr: 10 }, desc: "+25% Mana, +45% regeneration, 10% shorter cooldowns." },
    ],
  },
];
