# Bloodfell

A single-player browser RPG. No server, no build step, no monetisation, no timers
you wait out. Open the file and play.

---

## Running it

**On a computer:** double-click **`index.html`**. That is the whole install.

Hovering any item shows its full stats. In the inventory, **hold Shift while hovering**
to put the piece you are wearing beside it with every stat marked up or down.

**On a phone or tablet:** use **`bloodfell-standalone.html`** instead — one file with
everything inlined. Mobile browsers routinely refuse to let a local page load scripts
from a folder beside it, which shows up as a blank white screen. The standalone build
has nothing to load, so there is nothing to block.

Even then, tapping an HTML file in a file manager often opens a *preview* that does not
run scripts at all. If you get a blank page, use Share → Open in Browser, or host the
file: drag it onto [netlify.com/drop](https://app.netlify.com/drop) and you get a URL
that works everywhere, phone included.

Both builds are the same game and share save files. Regenerate the standalone after
editing anything:

```
node build-standalone.js
```

Progress saves to your browser's local storage automatically after every fight and
every 20 seconds. Use **Save file** in the bottom-left to copy your character out as
text, or paste one back in.

> One caveat: if you open the game inside a preview pane or sandboxed viewer, the
> browser may block local storage. The game still runs, but nothing is kept when you
> refresh. It will tell you if this happens. Opening `index.html` directly from your
> own machine avoids it entirely.

---

## The loop

```
     REALMS  ──── materials, gear, xp ────►  CRAFTING
        ▲                                       │
        │                                       ▼
   new realms                             better gear
        │                                       │
        └──────────  RAIDS  ◄───────────────────┘
                   boss kills open realms
```

Grind a realm for materials and levels. Forge what drops into gear. Take that gear
into a raid. The boss you kill opens the next realm. Repeat, twenty realms deep.

**There is no death penalty.** Losing a fight ends it, restores you, and hands back a
small share of the experience so a badly geared character can always climb back out.

---

## Where everything lives

```
index.html              load order, nothing else
css/style.css           the entire look

js/data/                ← CONTENT. Edit these, not the engine.
  realms.js               20 realms and their enemy rosters
  raids.js                3 raids, 5 bosses each, unique drop tables
  talents.js              5 trees x 30 talents
  spells.js               25 spells
  items.js                slots, rarities, base names, affixes, enchants
  crafting.js             materials, recipes, potions
  effects.js              procs shared by Epic+ items and talents
  uniques.js              the 20 Unique items and what their passives claim to do

js/core/                ← ENGINE. Rules, not content.
  state.js                the save file, xp curve, helpers
  character.js            gear + talents + buffs -> final stats
  loot.js                 item generation, drop rolls, salvage
  combat.js               the tick-based fight simulation
  actions.js              equip, craft, enchant, spend talents
  merchant.js             rotating stock, the gold sink
  passives.js             the machinery behind every Unique passive
  sound.js                synthesised audio, no files needed

js/ui/                  ← INTERFACE, one file per group of panels
  theme.js                palettes, and the four-colour custom builder
  paperdoll.js            the equipment panel and its SVG slot icons
js/main.js              boot and the game loop
```

---

## Adding content

**A new realm.** Copy a block in `realms.js`, change the names, set `lvl` and `tier`,
point `unlock` at a level or a boss id. Enemy stats are generated from the realm's
level and each enemy's `r` role, so you never write a stat block.

```js
{ id: "my_realm", name: "My Realm", lvl: 25, tier: 3,
  desc: "One line of flavour.",
  unlock: { type: "boss", value: "r1b4" },
  enemies: [ { n: "Some Ghoul", r: "grunt" }, { n: "Big Ghoul", r: "brute" } ] }
```

Roles: `swarm` `grunt` `brute` `stalker` `caster` `warden`.

**A new talent.** Copy a line in `talents.js`. It is just a bag of modifiers; the key
list is at the top of that file. Nothing in the engine needs to know it exists.

```js
{ id: "w26", name: "Skullsplitter", tier: 3, max: 3,
  mods: { physDmg: 4, crit: 1 }, desc: "+4% physical damage and +1% crit per rank." }
```

**A new spell.** Copy a block in `spells.js`. `req` is points spent in its tree.

**A new boss.** Copy a block in `raids.js`. `unlocks` is what dies with it.

**Placeholder art.** There is none yet, by design — the layout uses type and colour
only. When you have art, the natural hooks are `.card` for realms and bosses,
`.slot` for equipment, and `.itemrow` for inventory.

---

## Tuning knobs

Everything that decides difficulty sits in a handful of named constants:

| What | Where |
|---|---|
| **How long the game is** | `core/state.js` → `XP_PACE` (currently 2.5) |
| Shape of the level curve | `core/state.js` → `XP_EXPONENT` |
| Enemy health and damage curves | `core/combat.js` → `ENEMY_HP_K`, `ENEMY_DMG_K` |
| Gear power curve | `core/loot.js` → `itemBudget`, `weaponDps`, `armorBase` |
| Penalty for fighting above your level | `core/combat.js` → `LEVEL_GAP_PER`, `LEVEL_GAP_CAP` |
| How far above your level you may go | `core/combat.js` → `REALM_LEVEL_ALLOWANCE` |
| Boss escalation per kill | `core/combat.js` → `ESCALATION_HP_PER_KILL`, `ESCALATION_DMG_PER_KILL` |
| Experience kept on a loss | `core/combat.js` → `LOSS_XP_SHARE` (currently 8%) |
| Elite spawn rate | `core/combat.js` → `ELITE_CHANCE` (currently 8%) |
| Gear drop rate | `core/loot.js` → `gearChance` in `rollRealmLoot` |
| Rarity weights | `data/items.js` → `RARITIES[].weight` |
| Global cooldown | `core/combat.js` → `GCD_BASE` |
| Boss difficulty | `data/raids.js` → `hpMult` / `dmgMult`, or re-run `tune-bosses.js` |
| What crafting produces | `data/crafting.js` → `CRAFT_RARITY` |
| Merchant timer and prices | `core/merchant.js` → `MERCHANT_REFRESH_MS`, `MERCHANT_PRICE_MULT`, `MERCHANT_RARITY` |
| Two-handed compensation | `core/loot.js` → `TWO_HAND_DPS_BONUS`, `TWO_HAND_STAT_BONUS` |
| Proc strength on items | `data/effects.js` → `PROC_TIERS` |
| Ramping talent cap | `core/combat.js` → `RAMP_MAX_STACKS` |
| Realm depth scaling | `core/combat.js` → `DEPTH_POWER_PER_KILL`, `DEPTH_XP_PER_KILL`, `DEPTH_GOLD_PER_KILL`, `DEPTH_FIND_PER_KILL` |
| Mana regeneration | `core/character.js` → `MANA_REGEN_BASE`, `MANA_REGEN_SPIRIT_CAP` |
| Spell costs | `data/spells.js` → `manaPct` on each spell |
| Unique drop rates | `data/uniques.js` → `chance` per item, `MERCHANT_UNIQUE_CHANCE` |
| Colour palettes | `ui/theme.js` → `THEMES`, or the custom builder in Settings |
| Descent difficulty | `core/descent.js` → `DESCENT_POWER_RATE` (compounding, per floor) |
| Boon strength and pool | `core/descent.js` → `BOONS` |
| Warden frequency and power | `core/descent.js` → `DESCENT_WARDEN_EVERY`, `WARDEN_HP_MULT`, `WARDEN_DMG_MULT` |
| Set bonuses | `data/sets.js` → `SETS` |
| Set drop rate | `data/sets.js` → `SET_DROP_CHANCE` |
| Text size | Settings page, or `--fs` in `css/style.css` |
| Spell firing rules | `ui/panels-talents.js` → `SPELL_CONDITIONS`, evaluated in `core/combat.js` → `conditionMet` |
| Slot icons | `ui/paperdoll.js` → `SLOT_ICONS` |

The enemy curves and the gear curves are fitted to each other. Change one and check
the other, or fights at high level will resolve in one swing.

---

## How the systems work

**Stats.** Strength, Agility, Intellect and Spirit are the primaries; Stamina gives
health. Secondaries are crit, haste, dodge, block, crit damage, lifesteal and thorns.
Your character is classless and can wear anything — item names tell you what a piece
is for, so an Agility weapon is always a dagger and never a warhammer.

**Elites.** Roughly one mob in twelve is elite, rolling 3–15% extra health and damage.
Their loot multiplier is that bonus doubled, ±20%.

**Talents.** 1 point per level from 10, so 40 at level 50. Each tree has 5 tiers of 5;
tier N needs 5×(N−1) points already in that tree. Filling one tree costs about 57
points, so you can never have everything. Resetting is free, always.

**Spells.** Not chosen — unlocked at 5, 10, 15, 20 and 25 points spent in a tree. They
cast themselves, in the priority order you set on the Skills panel. The only built-in
logic is that heals and shields hold until you drop below 90% health.

**Mana is a percentage, not a number.** Spell costs are a share of your maximum mana
rather than a flat figure. Flat costs were why mana never mattered: the pool grows every
level while a fixed cost does not, so by level 40 regeneration covered 243% of the most
you could possibly spend and no build could run dry. As a percentage the pressure is
identical at level 1 and level 50, and regeneration now covers about half of full spend.

**Spells can be given conditions.** Each spell in the cast priority takes an optional
firing rule — below a health threshold on either side, only in the opening seconds, only
after a while, only against elites or bosses, only above a mana level. Setting one
replaces the built-in "don't waste heals at full health" default entirely, so what you
configure is exactly what happens.

**The equipment panel is drawn, not photographed.** Slot icons are inline SVG rather
than image files, because the game has to run from a local file with no server and
anything that needs fetching is a liability. Line art also recolours itself with the
theme for free.

**Duplicate procs are merged.** Two items with Windfury produce one combined entry
rather than two rolls: chances add, the strongest potency wins, and the total is capped
at certainty. The character sheet shows one line, says how many sources fed it, and
groups the list by when each effect fires so the order does not shuffle every time you
swap a piece of gear.

**Weapon speed does not change spell damage.** Spells that scale off "weapon damage"
use a *normalised* swing — what the weapon would hit for at a 2.4 second reference
speed. Without that, a slow weapon made every such spell hit proportionally harder for
free (a 3.5s weapon was landing 2.2x the spell damage of a 1.6s weapon of identical
DPS), which quietly made fast weapons a trap and punished Rogues for using daggers.
Spells scale with weapon DPS, not weapon speed.

**Combat draughts persist between fights.** Their duration only ticks down while you
are actually fighting, so browsing your bags never wastes one, and a new fight will not
open a second bottle while the first is still running.

**Boss escalation.** Every kill makes that boss permanently tougher: +0.8% health and
+0.3% damage. The two are deliberately different. Applied at the same rate they
compound — a boss that lives longer *and* hits harder — and a boss you had comfortably
beaten became unkillable after ten kills, long before you could assemble its drop set.
Weighting health means the pressure arrives as a longer, grindier fight. Around forty
kills is the point where it starts winning, which is roughly a full set of its uniques.

**Level still matters.** Gear supplies over 90% of a character's raw power, so on its
own, twenty levels are worth about 1% damage. Two things stop the game becoming purely
gear-driven: every level of difference between you and your target shifts damage 4% in
both directions, and realms and bosses will not open at all until you are within four
levels of them.

**Enchanting.** Gold plus Arcane Dust, which only comes from salvaging gear. That is
what stops junk drops from being worthless and gold from piling up unused.

---

## Realm runs

Entering a realm starts a run. Health and mana **carry between fights**, and every
kill drives you one step deeper:

| per step of depth | effect |
|---|---|
| enemy health and damage | +5% |
| magic find | +4% |
| experience | +3.5% |
| gold | +5% |

The run ends when you die — which costs the depth and nothing else — or when you
retreat, which also restores you but lets you choose the moment. Raids are separate:
you always arrive at a boss whole.

Without potions a run lasts about five kills. With them, thirty to forty. That gap is
deliberate: it is what gives alchemy a job and what makes mana worth watching.
`autoRetreat` in the combat settings pulls you out at a chosen health threshold, so
auto-grinding banks depth instead of running itself into the ground.

---

## The Descent

The endgame, unlocked by killing Opus. An endless dive where enemies compound
**6% stronger every floor** and every third floor offers a choice of three **Boons**
that last the run. Every tenth floor a Warden blocks the way — a raid boss scaled to
the depth, carrying its full drop table.

The design rule, and why this is not a treadmill: **the enemy side scales
automatically and the player side scales by choice.** A percentage ticking up in the
background feels like nothing. Picking Ruin, then Ruin again, then Cruelty, and
watching your damage go somewhere absurd feels like a run. Two descents with the same
character end in different places.

Every Boon is additive power that suits any build. Nothing takes an ability away,
forbids a damage type, or asks a Strength character to become a caster — a restriction
that invalidates a build is a wall, not a challenge.

Enemy scaling is **exponential**, and it has to be. Boons stack additively — twenty
Ruins is +280% damage, not 280x — so linear enemy growth never catches up and a run
simply never ends. Tested at several rates: 4% per floor reaches about floor 90, 8%
about 40. 6% lands a good run around fifty to sixty floors, which is five or six
Wardens and roughly eighteen Boons.

---

## Sets

Three five-piece raid sets, one per raid, one piece guarded by each boss, with bonuses
at two, three and five pieces. They sit in the tier-set armour slots: helm, shoulders,
chest, gloves, legs.

Two decisions worth knowing, both of which were corrections:

**Set bonuses are school-agnostic.** An earlier draft split them into a physical set
and a caster set, which meant half the endgame gear was dead weight depending on how
you had built. In a classless game that is exactly backwards.

**Set pieces follow the character, not the set.** The primary stat is chosen from
whatever you are actually wearing, so the caster-themed set still hands a Strength
build Strength gear. Hardcoding it made a full set *worse* than the gear it replaced.
A completed set is currently worth about +23% damage and +4% survivability over
mismatched Legendaries of the same item level.

---

## Uniques

A tier above Legendary. Twenty of them, each written by hand, each carrying a passive
that changes a **rule** rather than a number — damage spread across a second instead of
landing at once, a cap on how hard any single blow can hit, spells paid for in health,
a first strike that always crits. Several are double-edged on purpose; a Unique should
be a decision, not a strict upgrade.

They are never randomly generated (`weight: 0` keeps them out of every roll, even at
+200% magic find). Each is guarded by one raid boss at roughly a 2.5% drop, which is
about thirty attempts — deliberately close to the point where boss escalation starts
winning. The merchant also lays one out occasionally.

Adding one means an entry in `data/uniques.js` and a matching implementation in
`core/passives.js`. The hooks available are `fightStart`, `tick`, `damageTaken`,
`damageDealt`, `wouldDie`, `onKill`, `healTaken`, `manaCost`, `cooldown` and
`statMods`. Anything needing per-fight memory keeps it on `C.passiveState`.

---

## Procs and special effects

Epic and Legendary items carry a special property, and twenty of the talents grant
one too. Both come from the same place — `data/effects.js` — so adding one means
writing a single entry and it immediately works on items, on talents, or both.

```js
myEffect: {
  name: "Sunder", trigger: "hit", action: "dot", school: "phys",
  coef: 0.6, duration: 6, ticks: 3,
  text: p => `${p.chance}% chance on hit to sunder for ${Math.round(60 * p.potency)}% over 6s`,
},
```

Triggers are `hit`, `crit`, `kill`, `hurt` and `open`. Actions are `dot`, `strike`,
`heal`, `buff`, `swing`, `slow` and `mana`. Add it to `PROC_POOL` to let items roll
it, or give a talent `effect: { id, chance, potency }` to grant it.

---

## Two-handed weapons

A weapon profile with `hands: 2` takes the off-hand slot with it. Equipping one
unequips whatever was there, and an off-hand cannot be worn while one is. Because
they cost a whole equipment slot, they carry `TWO_HAND_DPS_BONUS` and
`TWO_HAND_STAT_BONUS` (in `core/loot.js`) to make up the difference.

---

## Regression tests

`itemaudit.js` exists because of a bug that made a raid Legendary roughly eight
times weaker than an ordinary Epic. The stats in `raids.js` and `uniques.js` were
typed by hand early on; the item budget formulas were later replaced with power
curves and rescaled twice. Generated items followed the curves. The hand-written
numbers did not, and nothing complained — boss weapons sat at about 7% of correct
damage while every test passed.

The audit compares every hand-written item against what the generator produces at
the same item level and rarity, and fails outside a 0.75–1.75x band. It also checks
that every Epic-or-better drop carries a special effect, since a random Epic always
does. `rescale-items.js` is the repair tool: it reads each item's existing stat
shape and rescales the magnitudes onto the curve, so a crit dagger stays a crit
dagger. Run the audit after touching any curve in `core/loot.js`.


`csstest.js` exists because of a specific mistake worth not repeating. Rewriting a block
of the stylesheet silently deleted the `.r-common` through `.r-unique` rules, and the
symptom was subtle: nothing errored, no test failed, every item name just quietly turned
white. A class with no rule behind it is invisible to every other kind of check.

So that test walks every panel, collects every class the markup actually emits, and fails
if any of them has no rule in the stylesheet. It also checks that every `var(--x)` used
in the CSS is declared somewhere, and that all six rarities reach the inventory and the
paperdoll. Run it after touching `style.css`.

---

## Balancing tools

Three scripts sit alongside the game, none of which it needs to run:

- `tune-bosses.js` — simulates every boss against a level-appropriate character and
  adjusts its multipliers until the win rate lands in band, then writes the numbers
  back into `data/raids.js`. Run it after changing any combat or gear curve.
- `build-standalone.js` — regenerates the single-file build.

Two methodological notes if you write your own. Roll fresh gear for **every** simulated
fight — rolling once and reusing it across a batch measures one lucky gear set rather
than the boss, and the numbers swing wildly between runs. And keep every harness on the
*same* model of a reference player: `gearMixed` in `simbody.js` and `gearFor` in
`tune-bosses.js` are deliberately identical, because when they drifted apart the two
reported win rates thirty points apart for the same boss and neither could be trusted.

---

## Not built yet

Deliberately left out, easy to add later: gathering nodes, set bonuses, a bestiary,
gem sockets, dual-wielding, offline progress.

## Themes

Six presets plus a custom builder. Every colour in the stylesheet is a CSS variable on
`:root`, so a theme is a map of variable to colour and nothing else needs to change. The
custom builder takes four anchors — background, panel, accent, text — and derives the
rest, because picking twenty related colours by hand produces something unreadable most
of the time. It detects light palettes and flips the derivation accordingly.
