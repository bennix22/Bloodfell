/* ===========================================================================
   REALMS — the 20 grinding zones.
   ---------------------------------------------------------------------------
   Each enemy is one line: { n: "Name", r: "role" }
   The engine builds HP / damage / armor / xp / gold from the realm's `lvl`
   and the role archetype, so you never hand-tune 120 stat blocks.

   ROLES (multipliers live in js/core/combat.js -> ROLES):
     swarm   weak, very fast          brute   big HP, slow, hits hard
     grunt   the baseline             caster  magic damage, squishy
     stalker fast, high crit          warden  heavy armor, low damage

   `unlock` gates the realm:
     { type: "level", value: 8 }        needs character level 8
     { type: "boss",  value: "r1b2" }   needs that raid boss killed once

   `tier` picks which crafting materials drop (see js/data/crafting.js).
   =========================================================================== */

const REALMS = [
  {
    id: "ashen_hollow", name: "Ashen Hollow", lvl: 1, tier: 1,
    desc: "A woodland that burned a long time ago and never grew back. The ash still falls.",
    unlock: { type: "level", value: 1 },
    enemies: [
      { n: "Ash Crawler", r: "swarm" },
      { n: "Cinder Rat", r: "swarm" },
      { n: "Hollow Husk", r: "grunt" },
      { n: "Soot-Winged Crow", r: "stalker" },
      { n: "Charred Bandit", r: "grunt" },
      { n: "Ashen Brute", r: "brute" },
    ],
  },
  {
    id: "gravemoor_fen", name: "Gravemoor Fen", lvl: 4, tier: 1,
    desc: "Wet ground that gives up its dead every spring, and takes new ones every autumn.",
    unlock: { type: "level", value: 4 },
    enemies: [
      { n: "Bog Leech", r: "swarm" },
      { n: "Drowned Serf", r: "grunt" },
      { n: "Fen Stalker", r: "stalker" },
      { n: "Mire Hulk", r: "brute" },
      { n: "Marsh Wisp", r: "caster" },
      { n: "Rotting Houndmaster", r: "grunt" },
    ],
  },
  {
    id: "weeping_barrows", name: "The Weeping Barrows", lvl: 7, tier: 1,
    desc: "Burial mounds packed shoulder to shoulder. Something in them is still grieving.",
    unlock: { type: "level", value: 7 },
    enemies: [
      { n: "Barrow Rat", r: "swarm" },
      { n: "Grave Ghoul", r: "grunt" },
      { n: "Weeping Shade", r: "caster" },
      { n: "Tomb Warden", r: "warden" },
      { n: "Bone Piler", r: "brute" },
      { n: "Sorrow Wraith", r: "caster" },
      { n: "Barrow Thief", r: "stalker" },
    ],
  },
  {
    id: "emberfall_wastes", name: "Emberfall Wastes", lvl: 10, tier: 1,
    desc: "Open plain under a sky that rains hot cinders. Nothing here has shade.",
    unlock: { type: "level", value: 10 },
    enemies: [
      { n: "Ember Imp", r: "swarm" },
      { n: "Scorched Nomad", r: "grunt" },
      { n: "Cinderback Lizard", r: "brute" },
      { n: "Flame-Touched Zealot", r: "caster" },
      { n: "Ashfang Jackal", r: "stalker" },
      { n: "Slagbound Golem", r: "warden" },
    ],
  },
  {
    id: "thornveil_thicket", name: "Thornveil Thicket", lvl: 13, tier: 2,
    desc: "The forest grew over the road, then over the travellers, then kept growing.",
    unlock: { type: "level", value: 13 },
    enemies: [
      { n: "Thornling", r: "swarm" },
      { n: "Bramble Stalker", r: "stalker" },
      { n: "Veilspider", r: "stalker" },
      { n: "Rootbound Corpse", r: "grunt" },
      { n: "Thorn Matron", r: "caster" },
      { n: "Barkhide Ogre", r: "brute" },
      { n: "Blightleaf Druid", r: "caster" },
    ],
  },
  {
    id: "sablepeak_ridge", name: "Sablepeak Ridge", lvl: 16, tier: 2,
    desc: "Black stone above the snowline. The cold is the second thing that kills you.",
    unlock: { type: "level", value: 16 },
    enemies: [
      { n: "Frost Marmot", r: "swarm" },
      { n: "Sablepeak Raider", r: "grunt" },
      { n: "Ice-Veined Troll", r: "brute" },
      { n: "Rimewing Harpy", r: "stalker" },
      { n: "Glacial Shaman", r: "caster" },
      { n: "Peakguard Sentinel", r: "warden" },
    ],
  },
  {
    id: "rotting_vein", name: "The Rotting Vein", lvl: 19, tier: 2,
    desc: "A cave system with a pulse. The walls are warm and they are not stone.",
    unlock: { type: "boss", value: "r1b1" },
    enemies: [
      { n: "Gut Worm", r: "swarm" },
      { n: "Vein Crawler", r: "grunt" },
      { n: "Flesh Weaver", r: "caster" },
      { n: "Bile Hound", r: "stalker" },
      { n: "Sinew Colossus", r: "brute" },
      { n: "Marrow Priest", r: "caster" },
      { n: "Pustule Warden", r: "warden" },
    ],
  },
  {
    id: "duskmire_hollow", name: "Duskmire Hollow", lvl: 21, tier: 2,
    desc: "A valley the sun quit on. Everything here has learned to see without it.",
    unlock: { type: "boss", value: "r1b2" },
    enemies: [
      { n: "Dusk Moth", r: "swarm" },
      { n: "Mire Revenant", r: "grunt" },
      { n: "Hollow Stag", r: "stalker" },
      { n: "Gloom Ettin", r: "brute" },
      { n: "Whispering Fungus", r: "caster" },
      { n: "Duskmire Witch", r: "caster" },
    ],
  },
  {
    id: "cinderglass_expanse", name: "Cinderglass Expanse", lvl: 24, tier: 3,
    desc: "Sand fused to glass by something that fell here. It still reflects the wrong sky.",
    unlock: { type: "boss", value: "r1b3" },
    enemies: [
      { n: "Glass Skitter", r: "swarm" },
      { n: "Shardback Wanderer", r: "grunt" },
      { n: "Obsidian Nomad", r: "grunt" },
      { n: "Molten Effigy", r: "caster" },
      { n: "Mirrorfiend", r: "stalker" },
      { n: "Slagjaw Behemoth", r: "brute" },
      { n: "Cinderglass Sentinel", r: "warden" },
    ],
  },
  {
    id: "hollow_choir", name: "The Hollow Choir", lvl: 27, tier: 3,
    desc: "A cathedral with no roof and no congregation, and singing every hour on the hour.",
    unlock: { type: "boss", value: "r1b4" },
    enemies: [
      { n: "Chorister Husk", r: "grunt" },
      { n: "Silent Acolyte", r: "caster" },
      { n: "Hymnal Wraith", r: "caster" },
      { n: "Bellringer Brute", r: "brute" },
      { n: "Faceless Cantor", r: "stalker" },
      { n: "Reliquary Guardian", r: "warden" },
    ],
  },
  {
    id: "blackroot_depths", name: "Blackroot Depths", lvl: 30, tier: 3,
    desc: "The root system of a tree nobody has ever found the top of.",
    unlock: { type: "boss", value: "r1b5" },
    enemies: [
      { n: "Rootling", r: "swarm" },
      { n: "Pale Digger", r: "grunt" },
      { n: "Fungal Thrall", r: "grunt" },
      { n: "Blackroot Crawler", r: "stalker" },
      { n: "Spore Cultist", r: "caster" },
      { n: "Heartwood Horror", r: "brute" },
      { n: "Deeproot Warden", r: "warden" },
    ],
  },
  {
    id: "grimhold_ruins", name: "Grimhold Ruins", lvl: 32, tier: 3,
    desc: "The outer works of a fortress that lost its war. The garrison never got the order to stop.",
    unlock: { type: "boss", value: "r2b1" },
    enemies: [
      { n: "Ruin Cur", r: "swarm" },
      { n: "Fallen Legionnaire", r: "grunt" },
      { n: "Grimhold Executioner", r: "brute" },
      { n: "Broken Battlemage", r: "caster" },
      { n: "Rampart Shade", r: "stalker" },
      { n: "Iron Sentry", r: "warden" },
    ],
  },
  {
    id: "marrow_wastes", name: "The Marrow Wastes", lvl: 34, tier: 4,
    desc: "Dunes of bonemeal, ankle deep, going on past the horizon in every direction.",
    unlock: { type: "boss", value: "r2b2" },
    enemies: [
      { n: "Marrow Tick", r: "swarm" },
      { n: "Bonepicker", r: "grunt" },
      { n: "Skull Harvester", r: "grunt" },
      { n: "Ribcage Lurker", r: "stalker" },
      { n: "Calcified Seer", r: "caster" },
      { n: "Ossuary Titan", r: "brute" },
      { n: "Marrowbound Knight", r: "warden" },
    ],
  },
  {
    id: "voidscar_reach", name: "Voidscar Reach", lvl: 36, tier: 4,
    desc: "Where the world was cut. The edges never healed and things come through them.",
    unlock: { type: "boss", value: "r2b3" },
    enemies: [
      { n: "Void Mite", r: "swarm" },
      { n: "Scarred Pilgrim", r: "grunt" },
      { n: "Rift Stalker", r: "stalker" },
      { n: "Voidcaller", r: "caster" },
      { n: "Null Colossus", r: "brute" },
      { n: "Tear-Warden", r: "warden" },
    ],
  },
  {
    id: "pale_sanctum", name: "Pale Sanctum", lvl: 38, tier: 4,
    desc: "White marble, white robes, white eyes. Absolutely spotless, and nobody knows who cleans it.",
    unlock: { type: "boss", value: "r2b4" },
    enemies: [
      { n: "Bleached Hound", r: "swarm" },
      { n: "Pale Supplicant", r: "grunt" },
      { n: "Sanctum Flayer", r: "stalker" },
      { n: "Weeping Saint", r: "caster" },
      { n: "Vestal of Ash", r: "caster" },
      { n: "Chalk-Skinned Ogre", r: "brute" },
      { n: "Alabaster Golem", r: "warden" },
    ],
  },
  {
    id: "screaming_fathoms", name: "The Screaming Fathoms", lvl: 40, tier: 4,
    desc: "Deep water. The pressure is survivable. The noise is the part that breaks people.",
    unlock: { type: "boss", value: "r2b5" },
    enemies: [
      { n: "Fathom Eel", r: "swarm" },
      { n: "Drowned Chorus", r: "caster" },
      { n: "Pressure Wraith", r: "caster" },
      { n: "Abyssal Lurker", r: "stalker" },
      { n: "Leviathan Spawn", r: "brute" },
      { n: "Coralbound Warden", r: "warden" },
    ],
  },
  {
    id: "obsidian_spire", name: "Obsidian Spire", lvl: 43, tier: 5,
    desc: "A tower of black glass built from the inside out. Nobody agrees on how tall it is.",
    unlock: { type: "boss", value: "r3b1" },
    enemies: [
      { n: "Spire Wisp", r: "swarm" },
      { n: "Cindershard Knight", r: "grunt" },
      { n: "Obsidian Adept", r: "caster" },
      { n: "Ashen Archmage", r: "caster" },
      { n: "Glassbone Duelist", r: "stalker" },
      { n: "Spire Colossus", r: "brute" },
      { n: "Volcanic Warden", r: "warden" },
    ],
  },
  {
    id: "ashen_throne", name: "The Ashen Throne", lvl: 45, tier: 5,
    desc: "A seat of government for a kingdom of cinders. The court still keeps office hours.",
    unlock: { type: "boss", value: "r3b2" },
    enemies: [
      { n: "Throne Cinder", r: "swarm" },
      { n: "Crown Reaver", r: "stalker" },
      { n: "Emberlord Vassal", r: "caster" },
      { n: "Herald of Ash", r: "caster" },
      { n: "Molten Behemoth", r: "brute" },
      { n: "Ashen Praetorian", r: "warden" },
    ],
  },
  {
    id: "nether_cradle", name: "Nether Cradle", lvl: 47, tier: 5,
    desc: "Where things are made before they are allowed to exist. Most of them are rejected.",
    unlock: { type: "boss", value: "r3b3" },
    enemies: [
      { n: "Cradle Spawn", r: "swarm" },
      { n: "Hollow-Born", r: "grunt" },
      { n: "Star-Eaten Wretch", r: "stalker" },
      { n: "Umbral Weaver", r: "caster" },
      { n: "Nether Archon", r: "caster" },
      { n: "Nether Grotesque", r: "brute" },
      { n: "Cradle Warden", r: "warden" },
    ],
  },
  {
    id: "final_silence", name: "The Final Silence", lvl: 50, tier: 5,
    desc: "The last room. Everything that ever ended is filed here, and it is very quiet.",
    unlock: { type: "boss", value: "r3b4" },
    enemies: [
      { n: "Silence Mote", r: "swarm" },
      { n: "Unmade Pilgrim", r: "grunt" },
      { n: "The Wordless", r: "caster" },
      { n: "Echo of Opus", r: "caster" },
      { n: "Last Witness", r: "stalker" },
      { n: "Entropy Hulk", r: "brute" },
      { n: "Warden of the End", r: "warden" },
    ],
  },
];
