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
     kills the rest of the drop tables assume. The merchant also has a small
     chance of laying one out, which is what makes checking his table worth
     doing at all.

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
    stats: { str: 52, agi: 52, sta: 251 },
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
    stats: { str: 108, sta: 248 },
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
    stats: { str: 92, spi: 77, sta: 208 },
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
    stats: { agi: 74, crit: 11.1, haste: 7.4 },
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
    stats: { agi: 84, sta: 99, armor: 115, dodge: 12.4 },
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
    stats: { str: 232, sta: 134 },
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
    stats: { str: 137, agi: 137, sta: 93, armor: 359 },
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
    stats: { int: 126, spi: 68, haste: 13.1 },
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
    stats: { int: 133, spi: 58, crit: 13.3 },
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
    stats: { agi: 67, sta: 49, armor: 210, haste: 9.4, dodge: 7.5 },
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
    stats: { int: 100, spi: 52, sta: 61, armor: 169, crit: 10.9 },
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
    stats: { str: 78, sta: 145, armor: 284, block: 12.1 },
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
    stats: { str: 83, agi: 83, int: 83, spi: 83, sta: 111 },
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
    stats: { int: 150, spi: 111, sta: 95 },
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
    stats: { str: 211, sta: 156 },
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
    stats: { int: 75, spi: 149, sta: 142, armor: 223 },
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
    stats: { agi: 91, sta: 86, armor: 196, crit: 12.7 },
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
    stats: { str: 60, agi: 60, int: 60, armor: 174, crit: 14.1 },
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
    stats: { str: 119, spi: 119, sta: 127 },
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
    stats: { agi: 89, crit: 12, haste: 8.6 },
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
    stats: { str: 104, sta: 130, armor: 353, thorns: 16 },
    passive: {
      id: "weight_of_years",
      name: "Accumulated",
      text: "Every step of realm depth grants 2% damage reduction and 3% damage, without limit. Worthless at the surface, formidable far down.",
    },
  },
];

/* Small chance that a merchant stock slot is a Unique instead of ordinary gear.
   Low enough that seeing one is an event, high enough to justify restocking. */
const MERCHANT_UNIQUE_CHANCE = 0.018;

function uniqueById(id) { return UNIQUES.find(u => u.id === id) || null; }
function uniquesForBoss(bossId) { return UNIQUES.filter(u => u.boss === bossId); }
