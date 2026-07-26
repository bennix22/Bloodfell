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
        hpMult: 3.8, dmgMult: 1.17,
        unlocks: { realms: ["cinderglass_expanse"] },
        blurb: "Assembled from everyone who came to the last service.",
        drops: [
          { id: "u_bell_chest", name: "Ribcage of the Congregation", slot: "chest", rarity: "epic", ilvl: 22, chance: 0.06, stats: { str: 23, sta: 39, armor: 188, thorns: 6 }, proc: { id: "retort", chance: 13, potency: 1.1 } },
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
        hpMult: 5, dmgMult: 1.04,
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
          { id: "u_twins_shoulders", name: "Skarn's Counterweight", slot: "shoulders", rarity: "epic", ilvl: 34, chance: 0.07, stats: { str: 59, sta: 51, armor: 211, thorns: 10 }, proc: { id: "retort", chance: 14, potency: 1.1 } },
          { id: "u_twins_trinket", name: "Matched Iron Tokens", slot: "trinket", rarity: "epic", ilvl: 34, chance: 0.05, stats: { str: 52, critDmg: 25 }, proc: { id: "execute_proc", chance: 14, potency: 1.1 } },
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
        hpMult: 6.8, dmgMult: 1.61,
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
        hpMult: 6.27, dmgMult: 2.05,
        unlocks: { realms: ["obsidian_spire"] },
        blurb: "Arrives before the fire does, to give it a proper introduction.",
        drops: [
          { id: "u_herald_shoulders", name: "Pauldrons of the Announcement", slot: "shoulders", rarity: "epic", ilvl: 45, chance: 0.07, stats: { int: 70, spi: 44, sta: 48, armor: 128, crit: 9.1 }, proc: { id: "ignite", chance: 15, potency: 1.1 } },
          { id: "u_herald_wand", name: "Cinder-Script Scepter", slot: "mainhand", rarity: "epic", ilvl: 45, chance: 0.06, scalesWith: "int", weapon: { min: 1002, max: 1862, speed: 2.4 }, stats: { int: 71, crit: 9.3, haste: 6.2 }, proc: { id: "ignite", chance: 16, potency: 1.1 } },
          { id: "u_herald_trinket", name: "Ember of the First Word", slot: "trinket", rarity: "epic", ilvl: 45, chance: 0.06, stats: { int: 86, critDmg: 34 }, proc: { id: "execute_proc", chance: 14, potency: 1.1 } },
        ],
      },
      {
        id: "r3b2", name: "Voidspeaker Threnn", title: "", lvl: 45, r: "caster",
        hpMult: 7.31, dmgMult: 2.33,
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
        hpMult: 6, dmgMult: 2.05,
        unlocks: { realms: ["nether_cradle"] },
        blurb: "Crowned by acclamation. The acclaiming was done by his own skeleton.",
        drops: [
          { id: "u_marrow_shield", name: "Aegis of the Bone Crown", slot: "offhand", rarity: "legendary", ilvl: 48, chance: 0.03, stats: { str: 50, sta: 95, armor: 454, block: 13, thorns: 12 }, proc: { id: "bulwark", chance: 18, potency: 1.3 } },
          { id: "u_marrow_legs", name: "Femurplate Legguards", slot: "legs", rarity: "epic", ilvl: 48, chance: 0.07, stats: { str: 154, sta: 161, armor: 423 }, proc: { id: "retort", chance: 15, potency: 1.1 } },
          { id: "u_marrow_waist", name: "Girdle of Interred Kings", slot: "waist", rarity: "epic", ilvl: 48, chance: 0.07, stats: { str: 94, sta: 99, armor: 275, block: 11 }, proc: { id: "bulwark", chance: 14, potency: 1.1 } },
        ],
      },
      {
        id: "r3b4", name: "The Umbral Effigy", title: "", lvl: 48, r: "stalker",
        hpMult: 7.86, dmgMult: 2.73,
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
        hpMult: 9.48, dmgMult: 2.3,
        unlocks: {},
        blurb: "The great work. Unfinished, and extremely opinionated about that.",
        drops: [
          { id: "u_opus_blade", name: "The Unfinished Movement", slot: "mainhand", rarity: "legendary", ilvl: 52, chance: 0.025, scalesWith: "str", weapon: { min: 1791, max: 3325, speed: 2.8 }, stats: { str: 90, sta: 51, crit: 7.7, critDmg: 32 }, proc: { id: "execute_proc", chance: 20, potency: 1.35 } },
          { id: "u_opus_staff", name: "Coda of the Hollow God", slot: "mainhand", rarity: "legendary", ilvl: 52, chance: 0.025, scalesWith: "int", weapon: { min: 1855, max: 3444, speed: 2.9 }, stats: { int: 106, spi: 52, crit: 11.5, haste: 8.6 }, proc: { id: "ignite", chance: 20, potency: 1.35 } },
          { id: "u_opus_chest", name: "Hollow Regalia", slot: "chest", rarity: "legendary", ilvl: 52, chance: 0.03, stats: { str: 83, agi: 83, int: 83, sta: 192, armor: 252 }, proc: { id: "vengeance", chance: 18, potency: 1.3 } },
          { id: "u_opus_trinket", name: "The Last Page", slot: "trinket", rarity: "legendary", ilvl: 52, chance: 0.02, stats: { str: 33, agi: 33, int: 33, spi: 33, sta: 56, critDmg: 19, lifesteal: 6.3 }, proc: { id: "momentum", chance: 100, potency: 1.3 } },
        ],
      },
    ],
  },

  /* ==================== 1.0 EXPANSION — RAID 4 ============================== */
  {
    id: "the_weeping_wound",
    name: "The Weeping Wound",
    desc: "A place that is not so much haunted as infected. It has been bleeding since before there were words for blood.",
    unlock: { type: "boss", value: "r3b5" },
    bosses: [
      {
        id: "r4b1", name: "Gravethirst", title: "the First Wound", lvl: 55, r: "warden",
        hpMult: 6.18, dmgMult: 4.05,
        unlocks: { realms: ["bleeding_wastes"] },
        blurb: "The cut that would not close, grown old enough to stand up and guard itself.",
        drops: [
          { id: "u_gravethirst_shield", name: "Clotguard", slot: "offhand", rarity: "epic", ilvl: 56, chance: 0.06, stats: { str: 73, sta: 174, armor: 504, block: 12.7 }, proc: { id: "bulwark", chance: 15, potency: 1.2 } },
          { id: "u_gravethirst_chest", name: "Scar-Knit Cuirass", slot: "chest", rarity: "epic", ilvl: 56, chance: 0.07, stats: { str: 87, sta: 146, armor: 597, lifesteal: 7 }, proc: { id: "vengeance", chance: 14, potency: 1.2 } },
          { id: "u_gravethirst_ring", name: "Band of the First Wound", slot: "ring", rarity: "rare", ilvl: 56, chance: 0.10, stats: { str: 67, sta: 109, lifesteal: 5.6 } },
        ],
      },
      {
        id: "r4b2", name: "The Pale Physician", title: "", lvl: 58, r: "caster",
        hpMult: 9.08, dmgMult: 3.86,
        unlocks: { realms: ["graven_deep"] },
        blurb: "Still making rounds. The patients are long past treatment; it has not noticed.",
        drops: [
          { id: "u_physician_staff", name: "The Pale Prescription", slot: "mainhand", rarity: "epic", ilvl: 58, chance: 0.06, scalesWith: "int", weapon: { min: 1594, max: 2961, speed: 2.7 }, stats: { int: 153, spi: 79, crit: 12.4 }, proc: { id: "ignite", chance: 15, potency: 1.2 } },
          { id: "u_physician_gloves", name: "Bloodletter's Gloves", slot: "gloves", rarity: "epic", ilvl: 58, chance: 0.07, stats: { int: 96, sta: 131, armor: 149, haste: 12.8 }, proc: { id: "soulsiphon", chance: 100, potency: 1.1 } },
          { id: "u_physician_trinket", name: "Vial of Bad Humours", slot: "trinket", rarity: "epic", ilvl: 58, chance: 0.05, stats: { int: 128, crit: 19.8 }, proc: { id: "ignite", chance: 13, potency: 1.25 } },
        ],
      },
      {
        id: "r4b3", name: "Gutterlord Vhask", title: "", lvl: 61, r: "brute",
        hpMult: 8.46, dmgMult: 4.75,
        unlocks: { realms: ["wailing_expanse"] },
        blurb: "Rules the runoff. His crown is a storm drain and his court is everything that washed down it.",
        drops: [
          { id: "u_vhask_axe", name: "Offal-Cleaver", slot: "mainhand", rarity: "epic", ilvl: 61, chance: 0.06, scalesWith: "str", weapon: { min: 1835, max: 3407, speed: 2.9 }, stats: { str: 127, sta: 102, critDmg: 34 }, proc: { id: "rend", chance: 16, potency: 1.2 } },
          { id: "u_vhask_legs", name: "Sludge-Caked Greaves", slot: "legs", rarity: "epic", ilvl: 61, chance: 0.07, stats: { str: 166, sta: 261, armor: 572, dr: 7 }, proc: { id: "retort", chance: 14, potency: 1.2 } },
          { id: "u_vhask_waist", name: "Girdle of the Gutter", slot: "waist", rarity: "rare", ilvl: 61, chance: 0.10, stats: { str: 95, sta: 149, armor: 345, thorns: 10 } },
        ],
      },
      {
        id: "r4b4", name: "The Red Widow", title: "", lvl: 63, r: "stalker",
        hpMult: 8.28, dmgMult: 5.98,
        unlocks: {},
        blurb: "She has outlived every husband, every heir, and the concept of mercy.",
        drops: [
          { id: "u_widow_daggers", name: "Widowbite", slot: "mainhand", rarity: "epic", ilvl: 63, chance: 0.06, scalesWith: "agi", weapon: { min: 1124, max: 2088, speed: 1.7 }, stats: { agi: 110, crit: 13.8, critDmg: 25 }, proc: { id: "shatter", chance: 18, potency: 1.25 } },
          { id: "u_widow_cape", name: "Shroud of Black Silk", slot: "cape", rarity: "epic", ilvl: 63, chance: 0.07, stats: { agi: 76, sta: 106, armor: 163, haste: 8.8, dodge: 11.4 }, proc: { id: "windfury", chance: 16, potency: 1.2 } },
          { id: "u_widow_ring", name: "The Grieving Band", slot: "ring", rarity: "epic", ilvl: 63, chance: 0.05, stats: { agi: 97, crit: 13.6, lifesteal: 7.5 }, proc: { id: "ambush", chance: 100, potency: 1 } },
        ],
      },
      {
        id: "r4b5", name: "Carrionmaw", title: "the Feast", lvl: 65, r: "warden",
        hpMult: 6.4, dmgMult: 6.26,
        unlocks: { realms: ["ashfall_necropolis"] },
        blurb: "Everything that dies in the Wound eventually arrives here, and it is always still hungry.",
        drops: [
          { id: "u_carrion_maul", name: "The Feast", slot: "mainhand", rarity: "legendary", ilvl: 66, chance: 0.03, scalesWith: "str", weapon: { min: 2658, max: 4936, speed: 3 }, stats: { str: 125, sta: 106, critDmg: 36, lifesteal: 7.2 }, proc: { id: "execute_proc", chance: 20, potency: 1.3 } },
          { id: "u_carrion_helm", name: "Maw of the Feast", slot: "helm", rarity: "epic", ilvl: 66, chance: 0.07, stats: { str: 112, sta: 176, armor: 559, lifesteal: 8.8 }, proc: { id: "vengeance", chance: 16, potency: 1.3 } },
          { id: "u_carrion_trinket", name: "The Endless Appetite", slot: "trinket", rarity: "legendary", ilvl: 66, chance: 0.025, stats: { str: 85, sta: 179, lifesteal: 15.5 }, proc: { id: "soulsiphon", chance: 100, potency: 1.3 } },
        ],
      },
    ],
  },

  /* ==================== 1.0 EXPANSION — RAID 5 (endgame) =================== */
  {
    id: "the_last_dark",
    name: "The Last Dark",
    desc: "The bottom of the descent, given walls and a door. Beyond it there is only the thing that waits in the dark.",
    unlock: { type: "boss", value: "r4b5" },
    bosses: [
      {
        id: "r5b1", name: "The Devourer Below", title: "", lvl: 68, r: "brute",
        hpMult: 10.7, dmgMult: 7.75,
        unlocks: {},
        blurb: "It has eaten the light, the warmth, and the names of everyone who came before you.",
        drops: [
          { id: "u_devourer_chest", name: "Gut of the Devourer", slot: "chest", rarity: "epic", ilvl: 69, chance: 0.07, stats: { str: 107, agi: 107, int: 107, sta: 191, armor: 333 }, proc: { id: "vengeance", chance: 16, potency: 1.35 } },
          { id: "u_devourer_maul", name: "Swallowing Dark", slot: "mainhand", rarity: "epic", ilvl: 69, chance: 0.06, scalesWith: "str", weapon: { min: 2247, max: 4172, speed: 3 }, stats: { str: 155, sta: 132, critDmg: 37 }, proc: { id: "rend", chance: 16, potency: 1.3 } },
          { id: "u_devourer_boots", name: "Treads Into Nothing", slot: "boots", rarity: "rare", ilvl: 69, chance: 0.10, stats: { sta: 383, armor: 446, dr: 12 } },
        ],
      },
      {
        id: "r5b2", name: "Nihiloth", title: "Voice of the Void", lvl: 70, r: "caster",
        hpMult: 13.62, dmgMult: 6.68,
        unlocks: { realms: ["voidmaw"] },
        blurb: "It speaks, and the words are holes. Listening too closely is how the plains outside got their wailing.",
        drops: [
          { id: "u_nihiloth_staff", name: "Utterance of the Void", slot: "mainhand", rarity: "legendary", ilvl: 71, chance: 0.03, scalesWith: "int", weapon: { min: 2839, max: 5273, speed: 2.9 }, stats: { int: 180, spi: 87, crit: 16.4, haste: 12.3 }, proc: { id: "ignite", chance: 20, potency: 1.35 } },
          { id: "u_nihiloth_cape", name: "Mantle of Unspeaking", slot: "cape", rarity: "epic", ilvl: 71, chance: 0.07, stats: { int: 120, spi: 66, sta: 160, armor: 117, haste: 13.3 }, proc: { id: "soulsiphon", chance: 100, potency: 1.25 } },
          { id: "u_nihiloth_trinket", name: "The Hollow Word", slot: "trinket", rarity: "legendary", ilvl: 71, chance: 0.025, stats: { int: 157, crit: 20.6, critDmg: 37 }, proc: { id: "ignite", chance: 14, potency: 1.4 } },
        ],
      },
      {
        id: "r5b3", name: "The Blind Empress", title: "", lvl: 72, r: "stalker",
        hpMult: 11.98, dmgMult: 8.41,
        unlocks: { realms: ["shrouded_abyss"] },
        blurb: "She put out her own eyes so the dark would have no advantage. It did not help you.",
        drops: [
          { id: "u_empress_blades", name: "Sightless Edges", slot: "mainhand", rarity: "legendary", ilvl: 73, chance: 0.03, scalesWith: "agi", weapon: { min: 1729, max: 3211, speed: 1.7 }, stats: { agi: 185, crit: 20.2, critDmg: 38 }, proc: { id: "shatter", chance: 20, potency: 1.35 } },
          { id: "u_empress_gloves", name: "Grasp of the Blind", slot: "gloves", rarity: "epic", ilvl: 73, chance: 0.07, stats: { agi: 104, sta: 132, armor: 323, haste: 12.7, lifesteal: 6.3 }, proc: { id: "windfury", chance: 16, potency: 1.3 } },
          { id: "u_empress_ring", name: "The Empress's Regard", slot: "ring", rarity: "epic", ilvl: 73, chance: 0.05, stats: { agi: 134, crit: 18.4, critDmg: 27 }, proc: { id: "ambush", chance: 100, potency: 1 } },
        ],
      },
      {
        id: "r5b4", name: "Warden of Oblivion", title: "", lvl: 74, r: "warden",
        hpMult: 8.06, dmgMult: 7.31,
        unlocks: {},
        blurb: "The last guard before the last door. It has never once been off duty, and never once let anyone past.",
        drops: [
          { id: "u_oblivion_shield", name: "The Final Door", slot: "offhand", rarity: "legendary", ilvl: 75, chance: 0.03, stats: { str: 138, sta: 361, armor: 801, block: 19.3, dr: 9 }, proc: { id: "bulwark", chance: 16, potency: 1.4 } },
          { id: "u_oblivion_helm", name: "Helm of the Last Watch", slot: "helm", rarity: "epic", ilvl: 75, chance: 0.07, stats: { str: 158, sta: 272, armor: 658, dodge: 11 }, proc: { id: "retort", chance: 15, potency: 1.35 } },
          { id: "u_oblivion_legs", name: "Legplates of Oblivion", slot: "legs", rarity: "epic", ilvl: 75, chance: 0.07, stats: { str: 153, sta: 284, armor: 744, thorns: 15 }, proc: { id: "vengeance", chance: 15, potency: 1.35 } },
        ],
      },
      {
        id: "r5b5", name: "Erebus", title: "the Last Dark", lvl: 75, r: "brute",
        hpMult: 11.5, dmgMult: 9.45,
        unlocks: {},
        blurb: "The thing at the bottom of everything. It was here before the first light and it intends to be here after the last. It has been waiting for you specifically.",
        drops: [
          { id: "u_erebus_blade", name: "Edge of the Last Dark", slot: "mainhand", rarity: "legendary", ilvl: 75, chance: 0.02, scalesWith: "str", weapon: { min: 2955, max: 5488, speed: 2.8 }, stats: { str: 169, sta: 113, crit: 11.5, critDmg: 46 }, proc: { id: "execute_proc", chance: 22, potency: 1.4 } },
          { id: "u_erebus_staff", name: "Scepter of Unmaking", slot: "mainhand", rarity: "legendary", ilvl: 75, chance: 0.02, scalesWith: "int", weapon: { min: 3061, max: 5684, speed: 2.9 }, stats: { int: 198, spi: 96, crit: 17.7, haste: 12.7 }, proc: { id: "ignite", chance: 22, potency: 1.4 } },
          { id: "u_erebus_daggers", name: "Twin Silences", slot: "mainhand", rarity: "legendary", ilvl: 75, chance: 0.02, scalesWith: "agi", weapon: { min: 1689, max: 3136, speed: 1.6 }, stats: { agi: 195, crit: 20.8, critDmg: 39 }, proc: { id: "shatter", chance: 22, potency: 1.4 } },
          { id: "u_erebus_chest", name: "Vestment of the Last Dark", slot: "chest", rarity: "legendary", ilvl: 75, chance: 0.03, stats: { str: 139, agi: 139, int: 139, sta: 304, armor: 401 }, proc: { id: "vengeance", chance: 18, potency: 1.4 } },
          { id: "u_erebus_trinket", name: "The First Night", slot: "trinket", rarity: "legendary", ilvl: 75, chance: 0.015, stats: { str: 52, agi: 52, int: 52, spi: 52, sta: 140, critDmg: 29, lifesteal: 9.1 }, proc: { id: "momentum", chance: 100, potency: 1.4 } },
        ],
      },
    ],
  },
];
