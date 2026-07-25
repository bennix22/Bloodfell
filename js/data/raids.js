/* ===========================================================================
   RAIDS — 3 raids, 5 bosses each.
   ---------------------------------------------------------------------------
   Bosses gate realm access. Killing one permanently opens whatever is listed
   in `unlocks`, and also stacks escalation on that boss (js/core/combat.js ->
   ESCALATION_HP_PER_KILL and ESCALATION_DMG_PER_KILL). Forty kills leaves it
   with roughly +32% health and +12% damage, so a boss you once beat comfortably
   eventually forces you elsewhere for better gear.

   hpMult and dmgMult are machine-tuned by tune-bosses.js, which simulates each
   fight against a level-appropriate character until the win rate lands in band.
   Edit them by hand freely, but re-run that script if you want them balanced.

   `drops` are handcrafted uniques — fixed stats, not procedurally rolled.
   `chance` is the drop rate per kill. Boss 5 uniques are deliberately rare.

   Stat keys: str agi int spi sta crit haste armor dodge block
              lifesteal thorns critDmg  (percent values where it reads as %)
   =========================================================================== */

const RAIDS = [
  /* ------------------------------------------------------------------ RAID 1 */
  {
    id: "sunken_cathedral",
    name: "The Sunken Cathedral",
    desc: "It was consecrated, then it was flooded, and the order of those two events is disputed.",
    unlock: { type: "level", value: 18 },
    bosses: [
      {
        id: "r1b1", name: "Warden Malgrith", title: "the Drowned", lvl: 19, r: "warden",
        hpMult: 3.6, dmgMult: 0.93,
        unlocks: { realms: ["rotting_vein"] },
        blurb: "Still guarding a door that dissolved two centuries ago.",
        drops: [
          { id: "u_malgrith_shield", name: "Tidewrack Bulwark", slot: "offhand", rarity: "epic", ilvl: 20, chance: 0.06, stats: { str: 13, sta: 30, armor: 142, block: 5.4 }, proc: { id: "bulwark", chance: 14, potency: 1 } },
          { id: "u_malgrith_helm", name: "Drowned Warden's Casque", slot: "helm", rarity: "epic", ilvl: 20, chance: 0.07, stats: { str: 22, sta: 33, armor: 128, dodge: 3.7 }, proc: { id: "retort", chance: 12, potency: 1 } },
          { id: "u_malgrith_ring", name: "Silt-Choked Signet", slot: "ring", rarity: "rare", ilvl: 20, chance: 0.10, stats: { spi: 32, sta: 47 } },
        ],
      },
      {
        id: "r1b2", name: "Choirmaster Vess", title: "Keeper of the Ninth Hymn", lvl: 20, r: "caster",
        hpMult: 3.81, dmgMult: 1.26,
        unlocks: { realms: ["duskmire_hollow"] },
        blurb: "Conducts an orchestra of eleven, none of whom have lungs.",
        drops: [
          { id: "u_vess_staff", name: "Baton of the Ninth Hymn", slot: "mainhand", rarity: "epic", ilvl: 21, chance: 0.06, scalesWith: "int", weapon: { min: 389, max: 722, speed: 2.6 }, stats: { int: 33, spi: 17, crit: 4.2 }, proc: { id: "ignite", chance: 14, potency: 1 } },
          { id: "u_vess_cape", name: "Mantle of Silent Verses", slot: "cape", rarity: "epic", ilvl: 21, chance: 0.07, stats: { int: 21, spi: 19, sta: 13, armor: 26, haste: 4 }, proc: { id: "vengeance", chance: 12, potency: 1 } },
          { id: "u_vess_trinket", name: "Tuning Fork of the Deep", slot: "trinket", rarity: "epic", ilvl: 21, chance: 0.05, stats: { int: 26, crit: 5.9 }, proc: { id: "ignite", chance: 12, potency: 1.1 } },
        ],
      },
      {
        id: "r1b3", name: "The Bell-Tolled Abomination", title: "", lvl: 21, r: "brute",
        hpMult: 3.8, dmgMult: 1.26,
        unlocks: { realms: ["cinderglass_expanse"] },
        blurb: "Assembled from everyone who came to the last service.",
        drops: [
          { id: "u_bell_chest", name: "Ribcage of the Congregation", slot: "chest", rarity: "epic", ilvl: 22, chance: 0.06, stats: { str: 23, sta: 40, armor: 188, thorns: 6 }, proc: { id: "retort", chance: 13, potency: 1.1 } },
          { id: "u_bell_mace", name: "Clapper of the Great Bell", slot: "mainhand", rarity: "epic", ilvl: 22, chance: 0.05, scalesWith: "str", weapon: { min: 509, max: 946, speed: 3.2 }, stats: { str: 70, sta: 45 }, proc: { id: "shatter", chance: 14, potency: 1 } },
          { id: "u_bell_waist", name: "Bellrope Cinch", slot: "waist", rarity: "rare", ilvl: 22, chance: 0.10, stats: { str: 44, sta: 44, armor: 97 } },
        ],
      },
      {
        id: "r1b4", name: "Sister Ilyra", title: "the Pale Nun", lvl: 22, r: "stalker",
        hpMult: 3.5, dmgMult: 1.31,
        unlocks: { realms: ["hollow_choir"] },
        blurb: "Took a vow of silence. Has kept every other vow considerably less well.",
        drops: [
          { id: "u_ilyra_dagger", name: "Ilyra's Confession", slot: "mainhand", rarity: "epic", ilvl: 23, chance: 0.06, scalesWith: "agi", weapon: { min: 287, max: 533, speed: 1.7 }, stats: { agi: 21, crit: 4.5, haste: 2.7 }, proc: { id: "rend", chance: 15, potency: 1 } },
          { id: "u_ilyra_gloves", name: "Habit-Wrapped Grips", slot: "gloves", rarity: "epic", ilvl: 23, chance: 0.07, stats: { agi: 25, sta: 17, armor: 77, haste: 5.7 }, proc: { id: "windfury", chance: 11, potency: 1 } },
          { id: "u_ilyra_boots", name: "Sandals of Quiet Passage", slot: "boots", rarity: "rare", ilvl: 23, chance: 0.10, stats: { agi: 21, sta: 15, armor: 78, dodge: 4.5 } },
        ],
      },
      {
        id: "r1b5", name: "Archbishop Vorlanth", title: "Voice of the Deep", lvl: 24, r: "caster",
        hpMult: 5, dmgMult: 1.05,
        unlocks: { realms: ["blackroot_depths"], raids: ["grimhold_keep"] },
        blurb: "He did not drown with the cathedral. He invited it down.",
        drops: [
          { id: "u_vorlanth_crown", name: "Mitre of the Drowned See", slot: "helm", rarity: "legendary", ilvl: 25, chance: 0.03, stats: { int: 31, spi: 21, sta: 17, armor: 77, crit: 4.1, haste: 3.1 }, proc: { id: "soulsiphon", chance: 100, potency: 1 } },
          { id: "u_vorlanth_trinket", name: "Vorlanth's Sunken Censer", slot: "trinket", rarity: "legendary", ilvl: 25, chance: 0.03, stats: { int: 28, spi: 38, lifesteal: 4.7 }, proc: { id: "leech", chance: 16, potency: 1.2 } },
          { id: "u_vorlanth_chest", name: "Vestments of the Voice", slot: "chest", rarity: "epic", ilvl: 25, chance: 0.06, stats: { int: 57, spi: 39, sta: 39, armor: 94 }, proc: { id: "bulwark", chance: 14, potency: 1.1 } },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ RAID 2 */
  {
    id: "grimhold_keep",
    name: "Grimhold Keep",
    desc: "The inner fortress. The war ended, the siege did not, and the garrison stopped counting years.",
    unlock: { type: "boss", value: "r1b5" },
    bosses: [
      {
        id: "r2b1", name: "Gatekeeper Harrow", title: "", lvl: 32, r: "warden",
        hpMult: 4.2, dmgMult: 1.19,
        unlocks: { realms: ["grimhold_ruins"] },
        blurb: "Has not opened the gate for anyone. Will not make an exception.",
        drops: [
          { id: "u_harrow_shield", name: "Harrow's Refusal", slot: "offhand", rarity: "epic", ilvl: 33, chance: 0.06, stats: { str: 31, sta: 61, armor: 260, block: 9.2 }, proc: { id: "bulwark", chance: 16, potency: 1.1 } },
          { id: "u_harrow_legs", name: "Portcullis Greaves", slot: "legs", rarity: "epic", ilvl: 33, chance: 0.07, stats: { str: 76, sta: 117, armor: 265 }, proc: { id: "retort", chance: 13, potency: 1 } },
          { id: "u_harrow_ring", name: "Keyward Band", slot: "ring", rarity: "epic", ilvl: 33, chance: 0.08, stats: { str: 45, sta: 56, block: 8.4 }, proc: { id: "vengeance", chance: 13, potency: 1 } },
        ],
      },
      {
        id: "r2b2", name: "Skarn and Mord", title: "the Iron Twins", lvl: 33, r: "brute",
        hpMult: 4.8, dmgMult: 1.34,
        unlocks: { realms: ["marrow_wastes"] },
        blurb: "One swings. One counts. Neither has ever reached a number they liked.",
        drops: [
          { id: "u_twins_axe", name: "Mord's Half of the Argument", slot: "mainhand", rarity: "epic", ilvl: 34, chance: 0.06, scalesWith: "str", weapon: { min: 857, max: 1591, speed: 3 }, stats: { str: 71, sta: 42, crit: 6.3 }, proc: { id: "shatter", chance: 16, potency: 1.1 } },
          { id: "u_twins_shoulders", name: "Skarn's Counterweight", slot: "shoulders", rarity: "epic", ilvl: 34, chance: 0.07, stats: { str: 58, sta: 50, armor: 211, thorns: 10 }, proc: { id: "retort", chance: 14, potency: 1.1 } },
          { id: "u_twins_trinket", name: "Matched Iron Tokens", slot: "trinket", rarity: "epic", ilvl: 34, chance: 0.05, stats: { str: 53, critDmg: 25 }, proc: { id: "execute_proc", chance: 14, potency: 1.1 } },
        ],
      },
      {
        id: "r2b3", name: "Executioner Balgor", title: "", lvl: 35, r: "stalker",
        hpMult: 4.93, dmgMult: 1.91,
        unlocks: { realms: ["voidscar_reach"] },
        blurb: "Paid by the head. Has not been paid in three hundred years and keeps working.",
        drops: [
          { id: "u_balgor_blade", name: "Balgor's Second Opinion", slot: "mainhand", rarity: "legendary", ilvl: 36, chance: 0.035, scalesWith: "agi", weapon: { min: 737, max: 1368, speed: 1.9 }, stats: { agi: 48, crit: 8.3, critDmg: 18 }, proc: { id: "shatter", chance: 18, potency: 1.2 } },
          { id: "u_balgor_hood", name: "Hood of the Long Drop", slot: "helm", rarity: "epic", ilvl: 36, chance: 0.07, stats: { agi: 60, sta: 44, armor: 180, crit: 8 }, proc: { id: "ambush", chance: 100, potency: 0.8 } },
          { id: "u_balgor_gloves", name: "Bloodletter's Wraps", slot: "gloves", rarity: "epic", ilvl: 36, chance: 0.07, stats: { agi: 36, sta: 22, armor: 132, haste: 6.9, lifesteal: 2.8 }, proc: { id: "windfury", chance: 13, potency: 1.1 } },
        ],
      },
      {
        id: "r2b4", name: "Lady Nyx", title: "of the Black Veil", lvl: 36, r: "caster",
        hpMult: 5.77, dmgMult: 1.75,
        unlocks: { realms: ["pale_sanctum"] },
        blurb: "Married into the house. Outlived the house. Kept the house.",
        drops: [
          { id: "u_nyx_staff", name: "Spindle of the Black Veil", slot: "mainhand", rarity: "legendary", ilvl: 37, chance: 0.035, scalesWith: "int", weapon: { min: 1087, max: 2018, speed: 2.7 }, stats: { int: 84, spi: 38, crit: 11.4 }, proc: { id: "ignite", chance: 17, potency: 1.2 } },
          { id: "u_nyx_cape", name: "Widow's Second Shadow", slot: "cape", rarity: "epic", ilvl: 37, chance: 0.07, stats: { int: 53, spi: 38, sta: 34, armor: 52, dodge: 7.6 }, proc: { id: "frostbite", chance: 14, potency: 1.1 } },
          { id: "u_nyx_ring", name: "Veiled Promise", slot: "ring", rarity: "epic", ilvl: 37, chance: 0.08, stats: { int: 56, spi: 37, haste: 9.3 }, proc: { id: "ignite", chance: 13, potency: 1 } },
        ],
      },
      {
        id: "r2b5", name: "Warlord Kressen", title: "the Undying", lvl: 38, r: "brute",
        hpMult: 6.8, dmgMult: 1.66,
        unlocks: { realms: ["screaming_fathoms"], raids: ["obsidian_throne"] },
        blurb: "Died at the siege. Was informed of this. Declined.",
        drops: [
          { id: "u_kressen_chest", name: "Cuirass of the Refused Death", slot: "chest", rarity: "legendary", ilvl: 39, chance: 0.03, stats: { str: 73, sta: 76, armor: 411, lifesteal: 6.9 }, proc: { id: "vengeance", chance: 17, potency: 1.2 } },
          { id: "u_kressen_blade", name: "Kressen's Standing Order", slot: "mainhand", rarity: "legendary", ilvl: 39, chance: 0.03, scalesWith: "str", weapon: { min: 1254, max: 2328, speed: 2.9 }, stats: { str: 77, sta: 43, critDmg: 30 }, proc: { id: "execute_proc", chance: 16, potency: 1.2 } },
          { id: "u_kressen_trinket", name: "The Undying Oath", slot: "trinket", rarity: "epic", ilvl: 39, chance: 0.06, stats: { str: 44, sta: 74, lifesteal: 5.5 }, proc: { id: "bulwark", chance: 15, potency: 1.2 } },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ RAID 3 */
  {
    id: "obsidian_throne",
    name: "The Obsidian Throne",
    desc: "Not a place so much as a decision that hardened. Everything here is the last of its kind.",
    unlock: { type: "boss", value: "r2b5" },
    bosses: [
      {
        id: "r3b1", name: "Herald of Cinders", title: "", lvl: 44, r: "caster",
        hpMult: 5.6, dmgMult: 2.24,
        unlocks: { realms: ["obsidian_spire"] },
        blurb: "Arrives before the fire does, to give it a proper introduction.",
        drops: [
          { id: "u_herald_shoulders", name: "Pauldrons of the Announcement", slot: "shoulders", rarity: "epic", ilvl: 45, chance: 0.07, stats: { int: 70, spi: 44, sta: 48, armor: 128, crit: 9.1 }, proc: { id: "ignite", chance: 15, potency: 1.1 } },
          { id: "u_herald_wand", name: "Cinder-Script Scepter", slot: "mainhand", rarity: "epic", ilvl: 45, chance: 0.06, scalesWith: "int", weapon: { min: 1002, max: 1862, speed: 2.4 }, stats: { int: 71, crit: 9.3, haste: 6.2 }, proc: { id: "ignite", chance: 16, potency: 1.1 } },
          { id: "u_herald_trinket", name: "Ember of the First Word", slot: "trinket", rarity: "epic", ilvl: 45, chance: 0.06, stats: { int: 87, critDmg: 34 }, proc: { id: "execute_proc", chance: 14, potency: 1.1 } },
        ],
      },
      {
        id: "r3b2", name: "Voidspeaker Threnn", title: "", lvl: 45, r: "caster",
        hpMult: 7.31, dmgMult: 1.94,
        unlocks: { realms: ["ashen_throne"] },
        blurb: "Speaks on behalf of the space between things. The space did not ask for this.",
        drops: [
          { id: "u_threnn_helm", name: "Circlet of the Unspoken", slot: "helm", rarity: "legendary", ilvl: 46, chance: 0.03, stats: { int: 73, spi: 45, sta: 42, armor: 164, crit: 8.4, haste: 7 }, proc: { id: "frostbite", chance: 18, potency: 1.2 } },
          { id: "u_threnn_cape", name: "Shroud of Absent Sound", slot: "cape", rarity: "epic", ilvl: 46, chance: 0.07, stats: { int: 81, spi: 62, armor: 68, dodge: 11.9 }, proc: { id: "vengeance", chance: 14, potency: 1.1 } },
          { id: "u_threnn_ring", name: "Band of the Long Pause", slot: "ring", rarity: "epic", ilvl: 46, chance: 0.08, stats: { int: 78, spi: 49, haste: 12.2 }, proc: { id: "soulsiphon", chance: 100, potency: 1.2 } },
        ],
      },
      {
        id: "r3b3", name: "The Marrow King", title: "", lvl: 47, r: "warden",
        hpMult: 6, dmgMult: 1.58,
        unlocks: { realms: ["nether_cradle"] },
        blurb: "Crowned by acclamation. The acclaiming was done by his own skeleton.",
        drops: [
          { id: "u_marrow_shield", name: "Aegis of the Bone Crown", slot: "offhand", rarity: "legendary", ilvl: 48, chance: 0.03, stats: { str: 50, sta: 96, armor: 454, block: 13.1, thorns: 12 }, proc: { id: "bulwark", chance: 18, potency: 1.3 } },
          { id: "u_marrow_legs", name: "Femurplate Legguards", slot: "legs", rarity: "epic", ilvl: 48, chance: 0.07, stats: { str: 154, sta: 161, armor: 423 }, proc: { id: "retort", chance: 15, potency: 1.1 } },
          { id: "u_marrow_waist", name: "Girdle of Interred Kings", slot: "waist", rarity: "epic", ilvl: 48, chance: 0.07, stats: { str: 94, sta: 99, armor: 275, block: 11 }, proc: { id: "bulwark", chance: 14, potency: 1.1 } },
        ],
      },
      {
        id: "r3b4", name: "The Umbral Effigy", title: "", lvl: 48, r: "stalker",
        hpMult: 5.6, dmgMult: 2.59,
        unlocks: { realms: ["final_silence"] },
        blurb: "A statue of someone nobody remembers, doing something nobody survived.",
        drops: [
          { id: "u_effigy_dagger", name: "Likeness of the Killing Stroke", slot: "mainhand", rarity: "legendary", ilvl: 49, chance: 0.03, scalesWith: "agi", weapon: { min: 1061, max: 1971, speed: 1.8 }, stats: { agi: 78, crit: 12, critDmg: 27 }, proc: { id: "shatter", chance: 20, potency: 1.3 } },
          { id: "u_effigy_gloves", name: "Sculptor's Ruined Hands", slot: "gloves", rarity: "epic", ilvl: 49, chance: 0.07, stats: { agi: 59, sta: 42, armor: 195, haste: 8.9, lifesteal: 4.5 }, proc: { id: "windfury", chance: 15, potency: 1.2 } },
          { id: "u_effigy_boots", name: "Treads of the Unmodelled", slot: "boots", rarity: "epic", ilvl: 49, chance: 0.07, stats: { agi: 81, sta: 67, armor: 216, dodge: 13.5 }, proc: { id: "ambush", chance: 100, potency: 1 } },
        ],
      },
      {
        id: "r3b5", name: "Opus", title: "the Hollow God", lvl: 50, r: "brute",
        hpMult: 9.48, dmgMult: 1.8,
        unlocks: {},
        blurb: "The great work. Unfinished, and extremely opinionated about that.",
        drops: [
          { id: "u_opus_blade", name: "The Unfinished Movement", slot: "mainhand", rarity: "legendary", ilvl: 52, chance: 0.025, scalesWith: "str", weapon: { min: 1791, max: 3325, speed: 2.8 }, stats: { str: 90, sta: 51, crit: 7.7, critDmg: 32 }, proc: { id: "execute_proc", chance: 20, potency: 1.35 } },
          { id: "u_opus_staff", name: "Coda of the Hollow God", slot: "mainhand", rarity: "legendary", ilvl: 52, chance: 0.025, scalesWith: "int", weapon: { min: 1855, max: 3444, speed: 2.9 }, stats: { int: 106, spi: 52, crit: 11.5, haste: 8.6 }, proc: { id: "ignite", chance: 20, potency: 1.35 } },
          { id: "u_opus_chest", name: "Hollow Regalia", slot: "chest", rarity: "legendary", ilvl: 52, chance: 0.03, stats: { str: 83, agi: 83, int: 83, sta: 193, armor: 252 }, proc: { id: "vengeance", chance: 18, potency: 1.3 } },
          { id: "u_opus_trinket", name: "The Last Page", slot: "trinket", rarity: "legendary", ilvl: 52, chance: 0.02, stats: { str: 33, agi: 33, int: 33, spi: 33, sta: 56, critDmg: 19, lifesteal: 6.3 }, proc: { id: "momentum", chance: 100, potency: 1.3 } },
        ],
      },
    ],
  },
];
