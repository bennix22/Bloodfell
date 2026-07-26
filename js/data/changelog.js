/* ===========================================================================
   VERSION AND CHANGELOG
   ---------------------------------------------------------------------------
   Bump VERSION whenever you hand a build to someone. The number is shown in the
   corner of the rail and at the top of the changelog, so when a friend says
   something is broken you can find out what they are actually running.

   `seenVersion` is stored in the save, so a build the player has not read about
   yet puts a mark on the button. Newest entry first.
   =========================================================================== */

const VERSION = "1.2.0";

const CHANGELOG = [
  {
    v: "1.2.0", date: "current",
    title: "1.2.0 — a face of its own",
    lines: [
      "Bloodfell has a proper logo now, up in the corner where the plain title used to be.",
      "Panels are framed with brass corner brackets, and every page header carries a small blood-drop emblem and a divider beneath it. First step of a larger art pass \u2014 item and monster art still to come.",
    ],
  },
  {
    v: "1.1.0", date: "",
    title: "1.1.0 — quality of life",
    lines: [
      "Pause button, next to Stop: freezes the fight in place so you can read the combat log, without ending your run.",
      "The deepest talent tiers are now sharper picks. Tier V lets you invest in 2 different talents, Tier VI and VII in 1 each — you can still max the ranks of the ones you choose. (A build made before this change is left alone until you reset.)",
      "Auto-salvage now goes all the way up: sweep commons, up to rares, up to epics, or everything. Uniques and set pieces are always kept, never swept.",
      "Set items now have their own rarity and colour — a distinct emerald green — instead of being shown as Legendary.",
      "Comparing an item now lays the tooltips out side by side: what you have equipped on the left, the new item on the right. For rings and trinkets, both worn pieces are shown, with the new one on the right.",
      "Auto-grind is now on by default for new characters.",
    ],
  },
  {
    v: "1.0.2", date: "",
    title: "1.0.2 — more fixes",
    lines: [
      "Aspects: you can now choose which aspect to etch — click one to select it, then etch it onto any item. Uniques no longer appear in the etch list (they can't be reshaped), and an item that already carries an aspect is now clearly marked.",
      "Two-handed weapons no longer show a false upgrade arrow on off-hand items you can't equip while wielding them.",
      "Cleaned up a loophole from an older build: any talent points placed past their tier requirement are refunded on load for you to re-spend. Placing them was already blocked going forward.",
    ],
  },
  {
    v: "1.0.1", date: "",
    title: "1.0.1 — bug fixes",
    lines: [
      "Fixed a crash that could happen when equipping a trinket (the Levelling Weight) in the middle of a fight.",
      "Chain of the Drowned reworked. Together with the Levelling Weight it was making characters effectively immortal \u2014 capping every blow at 12% of your health, no matter how enormous. It now simply reduces all damage by 30%: still very tanky, and it still pairs with the Levelling Weight, but a big enough hit will kill you again.",
      "The Descent now shows enemy levels climbing with depth, and the floor / next-boon / next-warden counter updates after every floor instead of freezing.",
      "Weapon skill tooltips now state their true weapon-damage percentage \u2014 several read almost double their real value (Ruinous Cleave said 440%, actually 240%).",
      "The Forge preview no longer shows \u201C0% to 0%\u201D for Critical Strike and other percentage stats; it shows the real rolled range.",
    ],
  },
  {
    v: "1.0.0", date: "",
    title: "1.0 — the world doubles in size",
    lines: [
      "The level cap is now 75. Every level from 10 onward still grants a talent point, so a level-75 character has far more to spend.",
      "Nine new realms, from Sunless Reach down to The Last Dark (levels 52\u201375), each with its own enemies and a new tier of crafting materials.",
      "Two new raids and ten new bosses, ending with Erebus, the Last Dark \u2014 the thing at the bottom of everything, and the new hardest fight in the game.",
      "Two new talent rows (tiers 6 and 7) on every tree, reached by spending 25 and 30 points in a tree \u2014 deep specialization now pays off with true capstones.",
      "Ten new spells, one pair per tree, unlocked at 30 and 35 points spent. Ultimates like Supernova, Apotheosis and Cataclysmic Slam.",
      "Dozens of new handcrafted drops across the new bosses, all on the item curve, plus realm gear that now climbs to item level 75.",
      "The blacksmith is now the Forge: instead of a wall of fixed recipes, you compose a piece \u2014 choose its slot, primary stat, a guaranteed secondary, and Rare or Epic quality \u2014 with a live preview of what you'll get. Now forges through tier VI.",
      "Your save carries over: same character, same gear, same progress, with a lot more world past where you were standing.",
    ],
  },
  {
    v: "0.9.5", date: "",
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
