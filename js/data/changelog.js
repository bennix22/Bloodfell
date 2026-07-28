/* ===========================================================================
   VERSION AND CHANGELOG
   ---------------------------------------------------------------------------
   Bump VERSION whenever you hand a build to someone. The number is shown in the
   corner of the rail and at the top of the changelog, so when a friend says
   something is broken you can find out what they are actually running.

   `seenVersion` is stored in the save, so a build the player has not read about
   yet puts a mark on the button. Newest entry first.
   =========================================================================== */

const VERSION = "1.14.0";

const CHANGELOG = [
  {
    v: "1.14.0", date: "current",
    title: "1.14.0 \u2014 every late Unique does something",
    lines: [
      "The rest of the late Uniques have been rebuilt. THE PALE HANDS turns every point of healing you receive into the same amount of magical damage to the enemy. GUTTER TREAD makes your first blow against an untouched enemy land as a critical strike \u2014 and if it fails to kill, you take that same blow yourself a moment later. THE HOLLOW CROWN removes spell cooldowns entirely and charges 3% of your maximum Health per cast, never the last of it. THE EMPRESS'S VEIL makes the blow after any dodge land for triple.",
      "The Oblivion Signet was too close to Second Heart, which already saves you from a killing blow. It now carries ERASURE instead: every 10 seconds, half of all the damage you have taken since the last reckoning is undone and given back.",
      "Nothing above item level 50 is a flat percentage any more \u2014 all eleven do something you can play around.",
    ],
  },
  {
    v: "1.13.0", date: "",
    title: "1.13.0 \u2014 rings worth wearing",
    lines: [
      "Four late Uniques were flat percentages. They are now rings, and they do something. GRAVETHIRST'S SIGNET marks the enemy as the fight opens and everything rotting in it \u2014 every poison, burn and bleed \u2014 ticks three times faster. THE RED WIDOW'S BAND lays a thread on every critical strike; the fifth closes the web and the enemy takes double damage for four seconds. THE DEVOURING CIRCLE banks every kill and spends them all on your opening blow in the next fight, 8% each, until you fall or leave. THE OBLIVION SIGNET refuses the first blow that would kill you, once per fight, and leaves you standing on almost nothing.",
      "Erebus now executes: nothing under a fifth of its Health is allowed to keep standing.",
      "Ring Uniques went from two to five, which was the other half of the problem with rings.",
      "Hovering a gem at the blacksmith or the gemcrafter now shows what it gives before you set it \u2014 useful, since prising one out later breaks it.",
      "Loot no longer goes dry when you out-level a realm. Gear never falls more than four levels behind you, though it still never runs more than six levels ahead of whatever dropped it, so a low realm is not an endgame farm.",
    ],
  },
  {
    v: "1.12.0", date: "",
    title: "1.12.0 \u2014 rings, trinkets, and a second property",
    lines: [
      "Rings and trinkets now drop twice as often. A drop used to pick evenly between the thirteen kinds of gear, but you wear FIFTEEN pieces \u2014 two rings and two trinkets \u2014 so each of those slots was quietly getting half the supply of every other one, and took twice as long to fill. Drops now follow the slots you actually wear.",
      "Trinkets now carry a second property, worked into the metal. It cannot be etched over, removed, or drawn out as an aspect, so a trinket is always partly what it was found as \u2014 and it is now the one slot where an older piece might still be the right one.",
    ],
  },
  {
    v: "1.11.1", date: "",
    title: "1.11.1 \u2014 items stop lying about themselves",
    lines: [
      "Fixed: a Unique you already owned kept the description it was created with, so a reworked Pact Iron still claimed to pay for spells with health while actually taking its tithe in mana. Unique descriptions are now refreshed from the game's own definitions every time you load, wherever the item is \u2014 worn, in your bags, or in the bank. Only the words change: rolls, tempering and socketed gems are untouched.",
    ],
  },
  {
    v: "1.11.0", date: "",
    title: "1.11.0 \u2014 Pact Iron finds its own bargain",
    lines: [
      "Pact Iron and The Blood Pact were the same item twice \u2014 both made spells cost health, from bosses one apart in the same raid, with Pact Iron simply cheaper. The Blood Pact keeps that bargain. Pact Iron now has its own, and the opposite one: every swing takes 6% of your maximum Mana and strikes 35% harder for it. Run the pool dry and it is only iron until you recover. A Strength weapon that suddenly cares what your Mana is doing.",
      "The global counter now retries shortly after a failed check-in instead of waiting the full five minutes, and it will not show numbers when the counter admits it could not read them \u2014 an empty panel is more honest than a confident zero.",
    ],
  },
  {
    v: "1.10.2", date: "",
    title: "1.10.2 \u2014 Pact Iron no longer kills you",
    lines: [
      "Fixed: equipping Pact Iron killed you within a second of a fight starting. It charged its health cost from the code that answers \u201Chow much would this spell cost?\u201D \u2014 a question the engine asks several times a second for every spell in your rotation \u2014 so the bill piled up before you had cast anything at all.",
      "It now pays for spells the same way the game's other blood-price item does, at its own cheaper rate: a spell that would cost a tenth of your Mana takes a twentieth of your Health. A cast can never be the thing that kills you \u2014 if you cannot afford it, it does not fire.",
    ],
  },
  {
    v: "1.10.1", date: "",
    title: "1.10.1 \u2014 the name box works",
    lines: [
      "Fixed: you could not type into the naming prompt. It was being rebuilt sixty times a second, so every keystroke landed in a box that had already been thrown away.",
      "The same mistake also had the global counter checking in about sixty times a SECOND instead of once every five minutes, since 1.9.0. That is fixed too, and one check-in now costs a single request rather than two.",
    ],
  },
  {
    v: "1.10.0", date: "",
    title: "1.10.0 \u2014 name yourself",
    lines: [
      "Characters have names now. If yours does not, the game asks for one the next time you open it \u2014 that prompt only writes a name. Your level, gear, gold, materials, talents, boss kills and Descent record are all untouched by answering it, and you can change the name later in Settings.",
      "The deepest Descent floor on the global counter now carries the name of whoever reached it.",
      "The counter has moved to the top of the sidebar, directly under the logo.",
    ],
  },
  {
    v: "1.9.0", date: "",
    title: "1.9.0 \u2014 you are not alone down here",
    lines: [
      "The sidebar now shows how many people are playing Bloodfell right now, and the deepest Descent floor anyone has reached.",
      "It checks in once every five minutes and sends exactly two things: a random id made up on this machine, and your deepest floor. No name, no account, no address, nothing that identifies a person. You can turn the whole thing off in Settings, and with it off nothing leaves your machine at all.",
      "If you are offline, or the counter is unreachable, the game behaves exactly as it always has \u2014 the panel simply does not appear. The downloadable single-file version is unaffected.",
    ],
  },
  {
    v: "1.8.5", date: "",
    title: "1.8.5 — the bank counts",
    lines: [
      "Uniques kept in the bank now show as found on the Uniques page, and each entry says where it is \u2014 worn, in your bags, or in your bank.",
      "Set pieces kept in the bank now count as held on set tooltips too, so the piece list no longer looks incomplete when the missing piece is sitting in storage.",
    ],
  },
  {
    v: "1.8.4", date: "",
    title: "1.8.4 — raid bosses fight again",
    lines: [
      "Fixed: challenging a raid boss did nothing and threw an error. Closing the merchant in 1.7.0 removed the code that starts a boss fight along with it. Raids were unplayable in 1.7.0 through 1.8.3; they work again now.",
    ],
  },
  {
    v: "1.8.3", date: "",
    title: "1.8.3 — pick what you socket",
    lines: [
      "Socketing has its own item picker now. It was quietly borrowing the tempering one, which meant it always landed on whatever came first \u2014 usually the helm \u2014 with no way to change it. You can now temper one piece and socket another, and the socketing list shows each piece's socket count so you can see at a glance which has room.",
    ],
  },
  {
    v: "1.8.2", date: "",
    title: "1.8.2 — the smith works on what you wear",
    lines: [
      "The blacksmith's item picker now lists only equipped gear. Tempering and socketing are for the kit you are actually fighting in, and a full inventory made that dropdown unusable.",
    ],
  },
  {
    v: "1.8.1", date: "",
    title: "1.8.1 — cutting costs more",
    lines: [
      "Cutting a gem costs 75% more gold at every grade. Cutting stones is meant to be the thing gold is FOR, and it was too cheap to matter: a Chipped cut is now 700 gold, a Cut 4,550, and a Flawless 24,500. The two proc stones still cost two and a half times that.",
    ],
  },
  {
    v: "1.8.0", date: "",
    title: "1.8.0 — the gemcrafter",
    lines: [
      "Gemcrafting has its own bench, moved off the blacksmith's page. Sockets are still cut at the blacksmith; the stones that go in them are cut here.",
      "Rough gems now drop from realms and raids in three colours \u2014 RED for Strength, GREEN for Agility, YELLOW for Intellect. Ordinary kills give a trickle; raid bosses give a handful. Nothing arrives already cut.",
      "Cut one colour on its own and you get that primary's stone. Mix colours and you get a secondary colour with a secondary stat, where the ratio matters as much as the colours: equal red and yellow makes an ORANGE carnelian for critical strike, while two reds to one yellow deepens it to SCARLET garnet for critical damage. Two greens to one yellow makes deep green jade for armour, two yellows to one green a seafoam aquamarine for dodge, and so on \u2014 seventeen stones in all.",
      "All three colours together make the strangest stones: BLACK obsidian for damage reduction, PALE pearl for Spirit, opalescent opal for damage of every school, and the two blooded and moonlit stones that carry a proc instead of a stat.",
      "Grade passes through the cut \u2014 Coarse rough gems make Chipped stones, Clear make Cut, Pure make Flawless \u2014 so grade decides how much a stone gives, never which stat it gives.",
      "Gems you already owned have been carried across to the reorganised stones by the stat you collected them for, in the bag and in every socket, so nothing is lost.",
    ],
  },
  {
    v: "1.7.0", date: "",
    title: "1.7.0 — the forge grows teeth",
    lines: [
      "TEMPERING. The blacksmith will raise a piece by two item levels and rescale its stats to match, up to five times per item and never past item level 75. Costs climb steeply with each step, so a favourite piece can keep pace instead of being retired. Uniques cannot be tempered \u2014 their stats are written by hand and rescaling them would undo that.",
      "SOCKETING AND GEMS. Sockets are cut at the blacksmith and hold gems: twelve stones in three grades, from Chipped to Flawless. Most give a stat line, two carry a proc. Gems drop from raid bosses and Wardens. Prising a gem out of a socket breaks it, so choose deliberately. Jewelworking, which will cut stones from rough gems, comes later.",
      "COMBAT ELIXIRS. Five new elixirs that give more than a draught of the same tier and take something back \u2014 more damage for weaker healing, murderous crits for a glass jaw, and so on. They fire at the opening of a fight like any draught.",
      "FLASKS. Four flasks that last a whole RUN rather than a fight, through as many fights as you can string together. They are lost when you fall or withdraw, which makes a Descent something to prepare for. One at a time.",
      "The merchant is gone. Gold now goes into tempering, socketing and the still house instead of a rotating table of gear you mostly did not want.",
    ],
  },
  {
    v: "1.6.0", date: "",
    title: "1.6.0 — set tiers levelled out",
    lines: [
      "Every set now sits on one of three clean tiers \u2014 item level 25, 45 or 70 \u2014 and every primary stat has one of each. No more lopsided lines where one stat's middle set was thirteen levels ahead of another's.",
      "Each tier drops from the raid whose difficulty matches it: the Sunken Cathedral hands out the item level 25 sets, the Obsidian Throne the 45s, and the Last Dark the 70s. All four stats are represented in each of those three raids.",
      "Bonuses on the sets that moved were rescaled to suit their new item level.",
    ],
  },
  {
    v: "1.5.0", date: "",
    title: "1.5.0 — sets worth changing your mind over",
    lines: [
      "Every primary stat now has an endgame set at item level 70. The Intellect line no longer stops at 58 \u2014 the Sigil of the Last Dark finishes it.",
      "Set pieces now carry the stat their set is built around instead of quietly matching whatever you are already wearing, and any of a raid's sets can drop regardless of how you have built. Finding four fifths of a Strength set on a caster is now a real temptation to change how you fight, which was the whole idea.",
      "Because a raid now hands out several sets, the odds of a set piece dropping scale with how many it hosts \u2014 so spreading a raid across four sets does not make each one take four times as long to finish.",
    ],
  },
  {
    v: "1.4.0", date: "",
    title: "1.4.0 — the bank, and a set for every build",
    lines: [
      "There is a bank now, on its own page under Character. Store anything from your inventory and it is out of play until you withdraw it \u2014 auto-salvage, bulk selling and bulk salvaging never reach inside.",
      "Twelve armour sets, three built around each of Strength, Agility, Intellect and Spirit, so every build has an early, a middle and a late set aimed at it. Each raid hosts two or three of them, and the one that drops follows how you actually fight.",
      "Mage spells now scale with Intellect plus half your Spirit \u2014 the mirror of the change priests got \u2014 so the Spirit that piles up on caster gear is no longer wasted on them. Intellect still counts in full, so no mage gets weaker.",
    ],
  },
  {
    v: "1.3.0", date: "",
    title: "1.3.0 — sets, uniques, and a kinder early game",
    lines: [
      "Set pieces from older saves now show their proper Set rarity and emerald colour instead of appearing Legendary.",
      "Talents unlock at level 1 and you earn a point every level, so a caster's first spell arrives around level 6 instead of 15.",
      "Priest spells now scale with Spirit plus half your Intellect. Spirit still counts in full, so no priest gets weaker \u2014 but Intellect gear finally helps them.",
      "Every raid boss now guards a Unique (11 new ones). Unique stats have been cut 15% across the board \u2014 they were doing too much \u2014 and the Strength / Agility / Intellect line-ups are now even, nine apiece.",
      "You can equip at most two Uniques at once. Stacking three or four was where the immortal, 200k-crit spirals came from.",
      "Two new armour sets for the deepest raids \u2014 the Weeping Raiment and the Vestments of the Last Dark. As with every set, the raw stats follow your build, so they suit any character.",
      "Boss cards now show the Unique that boss drops.",
      "The character page no longer repeats the Health and Mana bars (they live in the sidebar). That space now lists the aspect etched on each equipped item.",
    ],
  },
  {
    v: "1.2.0", date: "",
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
