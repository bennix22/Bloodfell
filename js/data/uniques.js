/* ===========================================================================
   UNIQUES — the tier above Legendary.
   ---------------------------------------------------------------------------
   These are never generated randomly. Each one is written by hand, exists in
   exactly one form, and carries a passive that changes a RULE of combat rather
   than adding another percentage. That is the whole point of the tier: a
   Legendary makes your numbers bigger, a Unique makes the fight work
   differently.

   The passive is implemented in js/core/passives.js, keyed by `passive.id`.
   The `text` here is what the player reads; keep the two in step.

   ACQUISITION
     Each is tied to one raid boss at a low rate. Boss escalation means a boss
     you farm gets steadily harder, so a 2.5% drop is roughly the same forty
     kills the rest of the drop tables assume.

   BALANCE NOTE
     Several of these are deliberately double-edged. A Unique should be a build
     decision, not a strict upgrade — otherwise the tier is just "Legendary but
     more" and the interesting part is lost.
   =========================================================================== */

const UNIQUES = [
  {
    id: "uq_blood_pact",
    name: "The Blood Pact",
    flavour: "Signed in the only ink that was ever binding.",
    slot: "trinket", ilvl: 44, boss: "r2b3", chance: 0.028,
    stats: { str: 44, agi: 44, sta: 213 },
    passive: {
      id: "blood_price",
      name: "Blood Price",
      text: "Your spells cost no mana. Each one is paid for in health instead \u2014 so mana and Intellect stop mattering, and what you can cast is limited only by what you can afford to bleed. You will not spend yourself to death: a spell you could not survive simply will not fire.",
    },
  },
  {
    id: "uq_levelling_weight",
    name: "The Levelling Weight",
    flavour: "A pendulum that refuses to let anything happen all at once.",
    slot: "trinket", ilvl: 44, boss: "r2b1", chance: 0.030,
    stats: { str: 92, sta: 211 },
    passive: {
      id: "smooth_damage",
      name: "Even Keel",
      text: "Damage you take is spread evenly across the following second instead of landing at once. Spikes become bleeds, and a heal has time to answer them.",
    },
  },
  {
    id: "uq_second_heart",
    name: "Second Heart",
    flavour: "It is not yours. It does not mind.",
    slot: "trinket", ilvl: 46, boss: "r2b5", chance: 0.025,
    stats: { str: 78, spi: 65, sta: 177 },
    passive: {
      id: "second_heart",
      name: "One More Beat",
      text: "The first blow that would kill you each fight leaves you at 1 Health instead, and returns a quarter of your Health a moment later.",
    },
  },
  {
    id: "uq_gamblers_coin",
    name: "The Gambler's Coin",
    flavour: "Two faces, and the wrong one comes up exactly as often.",
    slot: "trinket", ilvl: 42, boss: "r1b4", chance: 0.030,
    stats: { agi: 63, crit: 9.4, haste: 6.3 },
    passive: {
      id: "gamble",
      name: "Odds and Ends",
      text: "Every weapon swing has a 14% chance to land for four times the damage, and a 14% chance to miss entirely.",
    },
  },
  {
    id: "uq_cowards_bargain",
    name: "The Coward's Bargain",
    flavour: "Signed in a hurry, by someone who intended to run.",
    slot: "cape", ilvl: 43, boss: "r2b3", chance: 0.030,
    stats: { agi: 71, sta: 84, armor: 98, dodge: 10.5 },
    passive: {
      id: "cowards_bargain",
      name: "Terms of Flight",
      text: "You take 35% less damage while above 60% Health, and 25% more below it. Stay ahead and you are untouchable; fall behind and it collects.",
    },
  },
  {
    id: "uq_long_grudge",
    name: "The Long Grudge",
    flavour: "Patient. Extremely patient.",
    slot: "mainhand", ilvl: 45, boss: "r2b2", chance: 0.025,
    scalesWith: "str", hands: 2,
    weapon: { min: 2789, max: 5180, speed: 3.4 },
    stats: { str: 197, sta: 114 },
    passive: {
      id: "long_grudge",
      name: "Nursed Resentment",
      text: "Your damage climbs by 5% for every second the fight has lasted, without limit. Short fights waste it. Long ones do not.",
    },
  },
  {
    id: "uq_ashglass_heart",
    name: "Ashglass Heart",
    flavour: "Transparent, and audibly cracked.",
    slot: "chest", ilvl: 45, boss: "r3b1", chance: 0.028,
    stats: { str: 116, agi: 116, sta: 79, armor: 305 },
    passive: {
      id: "ashglass",
      name: "Nothing Given Freely",
      text: "Healing you receive is halved, but you drain 14% of all damage you deal as Health. Potions become a poor answer and your weapon becomes a good one.",
    },
  },
  {
    id: "uq_widows_clock",
    name: "The Widow's Clock",
    flavour: "Still keeping an appointment that was cancelled.",
    slot: "trinket", ilvl: 46, boss: "r3b2", chance: 0.025,
    stats: { int: 107, spi: 58, haste: 11.1 },
    passive: {
      id: "widows_clock",
      name: "Hurried Hours",
      text: "Spell cooldowns are halved, and spells cost 80% more mana. A deep mana pool turns this into a different game.",
    },
  },
  {
    id: "uq_first_flame",
    name: "Ember of the First Flame",
    flavour: "The one they lit before they understood what fire was.",
    slot: "mainhand", ilvl: 46, boss: "r3b4", chance: 0.025,
    scalesWith: "int",
    weapon: { min: 1363, max: 2532, speed: 2.5 },
    stats: { int: 113, spi: 49, crit: 11.3 },
    passive: {
      id: "fourth_strike",
      name: "Every Fourth Coal",
      text: "Every fourth weapon swing lands for triple damage. Haste makes it come round faster.",
    },
  },
  {
    id: "uq_thief_of_hours",
    name: "Thief of Hours",
    flavour: "Worn smooth by a great deal of somewhere else to be.",
    slot: "boots", ilvl: 43, boss: "r1b2", chance: 0.030,
    stats: { agi: 57, sta: 42, armor: 178, haste: 8, dodge: 6.4 },
    passive: {
      id: "thief_of_hours",
      name: "Stolen Minutes",
      text: "Each kill without being defeated grants 3% Haste, stacking to 30%. A single defeat gives all of it back.",
    },
  },
  {
    id: "uq_unspoken_name",
    name: "The Unspoken Name",
    flavour: "Everyone who could pronounce it is dead, which is considered related.",
    slot: "helm", ilvl: 45, boss: "r3b3", chance: 0.028,
    stats: { int: 85, spi: 44, sta: 52, armor: 144, crit: 9.3 },
    passive: {
      id: "unspoken",
      name: "First Impression",
      text: "You deal 30% more damage to anything still at full Health. Opening burst matters; grinding does not benefit.",
    },
  },
  {
    id: "uq_drowned_chain",
    name: "Chain of the Drowned",
    flavour: "Long enough to reach the bottom. It has been measured.",
    slot: "waist", ilvl: 44, boss: "r1b1", chance: 0.030,
    stats: { str: 66, sta: 123, armor: 241, block: 10.3 },
    passive: {
      id: "damage_cap",
      name: "Undertow",
      text: "You take 30% less damage from every source. The deep drags part of each blow away \u2014 but a heavy enough hit still reaches you.",
    },
  },
  {
    id: "uq_opus_fragment",
    name: "Fragment of the Opus",
    flavour: "A page torn from something that was never finished, and resents it.",
    slot: "trinket", ilvl: 52, boss: "r3b5", chance: 0.020,
    stats: { str: 71, agi: 71, int: 71, spi: 71, sta: 94 },
    passive: {
      id: "opus_fragment",
      name: "Unwritten",
      text: "Each fight opens by rolling one of five large blessings at random \u2014 damage, critical strike, haste, lifesteal or absorption. You never know which until it lands.",
    },
  },
  {
    id: "uq_hollow_lantern",
    name: "The Hollow Lantern",
    flavour: "It sheds no light. It shows you things anyway.",
    slot: "offhand", ilvl: 44, boss: "r1b3", chance: 0.030,
    stats: { int: 128, spi: 94, sta: 81 },
    passive: {
      id: "hollow_lantern",
      name: "Borrowed Light",
      text: "Spells cost no mana while you are below a quarter of your Health. The worse things get, the more you can do about it.",
    },
  },
  {
    id: "uq_pact_iron",
    name: "Pact Iron",
    flavour: "Forged from an agreement nobody has been able to break.",
    slot: "mainhand", ilvl: 45, boss: "r2b4", chance: 0.025,
    scalesWith: "str",
    weapon: { min: 1376, max: 2556, speed: 2.6 },
    stats: { str: 179, sta: 133 },
    passive: {
      id: "pact_iron",
      name: "Blood for Work",
      text: "Spells are paid for in Health instead of mana, at half the cost. Your mana pool becomes irrelevant and your lifesteal becomes essential.",
    },
  },
  {
    id: "uq_slow_hours",
    name: "Vestments of the Slow Hour",
    flavour: "Worn by someone who was never in a hurry, and outlived everyone who was.",
    slot: "chest", ilvl: 45, boss: "r3b2", chance: 0.028,
    stats: { int: 64, spi: 127, sta: 121, armor: 190 },
    passive: {
      id: "slow_hours",
      name: "Unhurried",
      text: "You attack 25% more slowly, and every attack lands for 55% more. Slower, heavier, and considerably harder to interrupt.",
    },
  },
  {
    id: "uq_tithe",
    name: "The Tithe",
    flavour: "Everything takes its cut. This one is simply honest about it.",
    slot: "waist", ilvl: 44, boss: "r2b2", chance: 0.030,
    stats: { agi: 77, sta: 73, armor: 167, crit: 10.8 },
    passive: {
      id: "tithe",
      name: "A Tenth of Everything",
      text: "A tenth of all damage you deal is stored, and released as a single blow when the fight has run twelve seconds.",
    },
  },
  {
    id: "uq_glass_crown",
    name: "The Glass Crown",
    flavour: "It fits perfectly. That is the worrying part.",
    slot: "helm", ilvl: 46, boss: "r2b5", chance: 0.022,
    stats: { str: 51, agi: 51, int: 51, armor: 148, crit: 12 },
    passive: {
      id: "glass_crown",
      name: "Brilliant and Brittle",
      text: "You deal 55% more damage and your maximum Health is cut by a third. Nothing about this is subtle.",
    },
  },
  {
    id: "uq_kept_promise",
    name: "The Kept Promise",
    flavour: "Made to someone who did not survive to collect on it.",
    slot: "ring", ilvl: 45, boss: "r3b3", chance: 0.028,
    stats: { str: 101, spi: 101, sta: 108 },
    passive: {
      id: "kept_promise",
      name: "Owed",
      text: "Every point of overhealing is stored, up to a third of your Health, and becomes a shield the moment you next take damage.",
    },
  },
  {
    id: "uq_quiet_knife",
    name: "The Quiet Knife",
    flavour: "It has never been drawn in front of a witness.",
    slot: "mainhand", ilvl: 46, boss: "r3b1", chance: 0.025,
    scalesWith: "agi",
    weapon: { min: 927, max: 1722, speed: 1.7 },
    stats: { agi: 76, crit: 10.2, haste: 7.3 },
    passive: {
      id: "quiet_knife",
      name: "One Clean Cut",
      text: "Your first attack of each fight always critically strikes and deals triple damage. Everything after it is ordinary.",
    },
  },
  {
    id: "uq_weight_of_years",
    name: "The Weight of Years",
    flavour: "Heavier every time it is picked up. Nobody has put it down.",
    slot: "shoulders", ilvl: 46, boss: "r3b5", chance: 0.022,
    stats: { str: 88, sta: 110, armor: 300, thorns: 13.6 },
    passive: {
      id: "weight_of_years",
      name: "Accumulated",
      text: "Every step of realm depth grants 2% damage reduction and 3% damage, without limit. Worthless at the surface, formidable far down.",
    },
  },

  /* ---- one Unique per remaining raid boss (added 1.3.0) ------------------- */
  {
    id: "uq_deepvoice", name: "The Drowned Chorus",
    flavour: "Vorlanth still preaches. You can feel the sermon in your teeth.",
    slot: "offhand", ilvl: 24, boss: "r1b5", chance: 0.028,
    stats: { int: 42, sta: 97, block: 6.8 },
    passive: { id: "deepvoice", name: "Deepvoice",
      text: "Every spell costs 20% less mana. The Voice carries part of the word for you." },
  },
  {
    id: "uq_first_wound", name: "Gravethirst's Mercy",
    flavour: "The first cut is always the one it takes for itself.",
    slot: "chest", ilvl: 55, boss: "r4b1", chance: 0.026,
    stats: { str: 124, sta: 285, armor: 476 },
    passive: { id: "first_wound", name: "First Wound",
      text: "The first blow you take in each fight is reduced by 60%. Everything after lands in full." },
  },
  {
    id: "uq_palliative", name: "The Pale Hands",
    flavour: "They only ever meant to help. That was the trouble.",
    slot: "gloves", ilvl: 58, boss: "r4b2", chance: 0.026,
    stats: { int: 133, sta: 306, armor: 272 },
    passive: { id: "palliative", name: "Palliative",
      text: "Every point of healing you receive is 35% stronger \u2014 but your own blows land 10% softer. A physician, not a killer." },
  },
  {
    id: "uq_opportunist", name: "Gutter Tread",
    flavour: "Vhask never fought fair. Neither should you.",
    slot: "boots", ilvl: 61, boss: "r4b3", chance: 0.025,
    stats: { agi: 142, sta: 326, armor: 289 },
    passive: { id: "opportunist", name: "Opportunist",
      text: "You deal 35% more damage to enemies below 35% Health. Finish what is already dying." },
  },
  {
    id: "uq_black_widow", name: "The Red Widow's Band",
    flavour: "She wore it to every wedding. Hers were brief.",
    slot: "ring", ilvl: 63, boss: "r4b4", chance: 0.024,
    stats: { agi: 149, sta: 246, crit: 1.7 },
    passive: { id: "black_widow", name: "Black Widow",
      text: "+25% critical strike, but you take 12% more damage. Strike first, or not at all." },
  },
  {
    id: "uq_the_feast", name: "Carrionmaw's Gift",
    flavour: "It is still hungry. It will always be hungry.",
    slot: "trinket", ilvl: 65, boss: "r4b5", chance: 0.024,
    stats: { str: 78, agi: 78, sta: 357, lifesteal: 2.6 },
    passive: { id: "the_feast", name: "The Feast",
      text: "You heal for 10% of all damage you deal. The maw eats through you." },
  },
  {
    id: "uq_devour", name: "The Devouring Yoke",
    flavour: "What it takes from below, it gives to the arm that wears it.",
    slot: "shoulders", ilvl: 68, boss: "r5b1", chance: 0.023,
    stats: { str: 167, sta: 383, armor: 408 },
    passive: { id: "devour", name: "Devour",
      text: "Your critical strikes deal 30% more damage." },
  },
  {
    id: "uq_voidcall", name: "The Hollow Crown",
    flavour: "Nihiloth's last word, worn where a thought used to be.",
    slot: "helm", ilvl: 70, boss: "r5b2", chance: 0.023,
    stats: { int: 174, sta: 400, armor: 366 },
    passive: { id: "voidcall", name: "Voidcall",
      text: "Spells deal 25% more damage; weapon swings deal 20% less. Commit to the word and forsake the blade." },
  },
  {
    id: "uq_unseen", name: "The Empress's Veil",
    flavour: "She never saw the throne she took. She did not need to.",
    slot: "cape", ilvl: 72, boss: "r5b3", chance: 0.022,
    stats: { agi: 182, sta: 255, armor: 255 },
    passive: { id: "unseen", name: "Unseen",
      text: "+18% dodge and +12% critical strike. What cannot find you cannot answer you." },
  },
  {
    id: "uq_oblivion_ward", name: "The Oblivion Girdle",
    flavour: "It guards you best while there is still much of you left to guard.",
    slot: "waist", ilvl: 74, boss: "r5b4", chance: 0.022,
    stats: { int: 185, sta: 425, armor: 425 },
    passive: { id: "oblivion_ward", name: "Oblivion Ward",
      text: "While above 60% Health you take 35% less damage. Below it, the ward is spent and you take blows in full." },
  },
  {
    id: "uq_the_last_dark", name: "Erebus, the Last Edge",
    flavour: "The final dark, honed to a point and handed back.",
    slot: "mainhand", ilvl: 75, boss: "r5b5", chance: 0.020,
    scalesWith: "agi",
    weapon: { min: 1900, max: 3300, speed: 1.6 },
    stats: { agi: 189, sta: 255, crit: 2.6 },
    passive: { id: "the_last_dark", name: "The Last Dark",
      text: "Deals up to 50% more damage as the enemy's Health falls \u2014 a killing edge that grows sharper the closer death comes." },
  },
];


function uniqueById(id) { return UNIQUES.find(u => u.id === id) || null; }
function uniquesForBoss(bossId) { return UNIQUES.filter(u => u.boss === bossId); }
