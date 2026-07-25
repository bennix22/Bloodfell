/* ===========================================================================
   VERSION AND CHANGELOG
   ---------------------------------------------------------------------------
   Bump VERSION whenever you hand a build to someone. The number is shown in the
   corner of the rail and at the top of the changelog, so when a friend says
   something is broken you can find out what they are actually running.

   `seenVersion` is stored in the save, so a build the player has not read about
   yet puts a mark on the button. Newest entry first.
   =========================================================================== */

const VERSION = "0.9.5";

const CHANGELOG = [
  {
    v: "0.9.5", date: "current",
    title: "Potion cooldown fix",
    lines: [
      "Fixed auto-drunk health potions having no effective cooldown: the timer was reset at the start of every fight, so in a fast auto-grind you drank one each fight and your health leapt back toward full every time. The cooldown now carries across fights, so a potion is an occasional emergency heal instead of a per-fight top-up.",
      "Moved the potion-choice dropdown next to the \"Drink health potions below\" control it belongs with, instead of off at the end of the row.",
    ],
  },
  {
    v: "0.9.4", date: "",
    title: "The Blood Pact, and mana shown as numbers",
    lines: [
      "New Unique for martial builds: The Blood Pact (a trinket, dropped by Executioner Balgor). Its Blood Price passive makes your spells cost health instead of mana \u2014 so a Strength or Agility build can cast freely without any Intellect or mana at all, paying in life instead. Heavier spells bleed you harder, and a cast that would drop you too low simply will not fire, so it can never kill you.",
      "Spell costs are now shown as an actual mana number everywhere \u2014 on the Skills page and in the spell tooltip \u2014 instead of a percentage.",
    ],
  },
  {
    v: "0.9.3", date: "",
    title: "Intellect now improves casting",
    lines: [
      "Fixed spell costs scaling with your whole mana pool, which meant stacking Intellect raised the pool and the costs together and never changed how many spells you could afford.",
      "Spell costs now scale with your level and only partly with Intellect, so investing in it raises your pool faster than your costs \u2014 a caster affords more spells as well as hitting harder, with diminishing returns so mana stays a real resource.",
      "The Skills page now shows each spell's cost as an actual mana number instead of a percentage.",
    ],
  },
  {
    v: "0.9.2", date: "",
    title: "Combat health bar fix",
    lines: [
      "Fixed the player health and mana bars flashing to full for a moment each time an enemy died during a run. The bars now hold the carried value across the kill, matching what actually happens \u2014 nothing about the underlying health was ever wrong, only the display between fights.",
    ],
  },
  {
    v: "0.9.1", date: "",
    title: "The game has a name",
    lines: [
      "Opus Realms is now Bloodfell. Same world, less generic name \u2014 blood-forward and dark, and it fits the texture of the realms (Duskmire, Gravemoor, Voidscar).",
      "Nothing else changed: your save, your gear, and your progress all carry over untouched.",
    ],
  },
  {
    v: "0.9.0", date: "",
    title: "Aspects and the update log",
    lines: [
      "Enchanting is now Aspects. Salvaging an item with a special property extracts that property, and you can stamp it onto another item of the same slot.",
      "Aspects are locked to the slot they came from. A helm aspect only ever goes on a helm, so no single effect can be stacked across the whole character.",
      "An applied aspect replaces an item's own special property rather than adding to it, so this is a way to shape a build rather than a way to inflate one.",
      "Inventory gained a filter for items that carry a special property.",
      "Item tooltips now show an applied aspect clearly, and say where it came from.",
      "This update log, with the version shown in the corner.",
    ],
  },
  {
    v: "0.8.0", date: "",
    title: "The Descent, sets, and a large item repair",
    lines: [
      "The Descent: an endless endgame dive unlocked by killing Opus. Enemies compound 6% stronger every floor, every third floor offers a choice of three Boons that last the run, and every tenth floor a Warden blocks the way.",
      "Boons are purely additive power chosen by you, never restrictions. Enemy scaling is exponential because additive boons outrun linear scaling forever.",
      "Three five-piece raid sets, one piece guarded by each boss, with bonuses at two, three and five pieces.",
      "Set pieces take their primary stat from whatever you are already wearing, so no set is unwearable because of how you built.",
      "Fixed: every hand-written raid drop was badly undertuned after the item curves were rewritten. Boss weapons were at roughly 7% of correct damage. All 46 drops and all 20 Uniques rescaled.",
      "Fixed: no hand-written boss drop carried a special effect, while every random Epic did. All 43 Epic-or-better drops now have one.",
      "Text size setting, five presets and a slider.",
    ],
  },
  {
    v: "0.7.0", date: "",
    title: "Unique items",
    lines: [
      "Twenty Uniques, a tier above Legendary, each with a passive that changes a rule of combat rather than a number.",
      "Damage spread across a second instead of landing at once, a cap on how hard any single blow can hit, spells paid for in health, a first strike that always crits.",
      "Each is guarded by one raid boss. The merchant occasionally lays one out.",
      "Equipment panel rebuilt as a proper paperdoll with drawn slot icons.",
      "Spells can be given firing conditions: below a health threshold on either side, only in the opening seconds, only against bosses.",
      "Stat name colouring removed after testing; rarity colour already carries the signal.",
    ],
  },
  {
    v: "0.6.0", date: "",
    title: "Depth runs and a real mana economy",
    lines: [
      "Realm runs: health and mana carry between fights, and every kill drives you a step deeper. Enemies gain 5% health and damage per step and drop better loot.",
      "Dying ends a run and costs the depth. Retreating ends it too but lets you choose the moment.",
      "Spell costs are a percentage of your mana pool rather than a flat number. Regeneration used to cover 243% of the most you could possibly spend, so no build could ever run dry.",
      "Duplicate procs merge into one entry instead of listing three times.",
      "Six colour themes plus a custom palette builder.",
      "A merchant with rotating stock, and a paid restock whose price doubles each time.",
    ],
  },
  {
    v: "0.5.0", date: "",
    title: "Procs, two-handers, sound",
    lines: [
      "Epic and Legendary items carry a special effect. Twenty talents grant one too, from the same system.",
      "Two-handed weapons, which take the off-hand slot and carry extra damage and stats to pay for it.",
      "Synthesised sound with a volume setting, generated in the browser so the game still needs no files.",
      "Fixed: spells scaling off weapon damage were 2.2x stronger with a slow weapon than a fast one of identical dps, which quietly made fast weapons a trap.",
      "Fixed: the combat log stopped updating once it reached its length cap.",
      "Fixed: combat draughts were re-drunk every fight, wasting most of every potion.",
    ],
  },
  {
    v: "0.4.0", date: "",
    title: "Tooltips and pacing",
    lines: [
      "Item tooltips everywhere, with Shift to compare against what you are wearing.",
      "Levelling slowed roughly fourfold.",
      "Fighting above your level now shifts damage in both directions, and realms and bosses will not open until you are within reach of them. Gear supplied over 90% of a character's power, so twenty levels were worth about 1% damage.",
    ],
  },
  {
    v: "0.3.0", date: "",
    title: "First playable",
    lines: [
      "Twenty realms, three raids, fifteen bosses, five talent trees, twenty-five spells, blacksmithing, alchemy, enchanting.",
      "Auto-grind, auto-potions, save export and import.",
    ],
  },
];

function changelogUnread() {
  return S.settings.seenVersion !== VERSION;
}
function markChangelogRead() {
  S.settings.seenVersion = VERSION;
  saveGame();
}
