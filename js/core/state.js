/* ===========================================================================
   STATE — the save file, and everything that reads or writes it.
   ---------------------------------------------------------------------------
   One global object, `S`. Anything not in `S` does not survive a refresh.

   Saving uses localStorage. If the browser blocks it (some sandboxed previews
   do), the game still runs perfectly for the session and tells you once, at
   the top of the screen, that you should use Export Save instead.
   =========================================================================== */

const SAVE_KEY = "opus_realms_save_v1";
const MAX_LEVEL = 75;
// Talents unlock immediately and a point is earned every level, so the first
// spell (5 points in a tree) lands around level 6 instead of 15 — the old start
// of 10 left casters with nothing to press for far too long.
const TALENT_START_LEVEL = 1;

/* ---------------------------------------------------------------------------
   LEVELLING PACE — the single dial for how long the game is.

   XP_PACE multiplies the whole curve. The cap is level 75 and auto-grind speed
   tops out at 3x, so rough time to reach 75 with auto-grind running (including
   the gap between fights):

       XP_PACE      1x speed     2x        3x
         1.0           ~14h      ~8h       ~6h
         1.5           ~21h     ~12h       ~9h
         2.5           ~34h     ~20h      ~15h     <- default
         4.0           ~55h     ~32h      ~24h

   The exponent controls the shape rather than the length: raise it and the last
   handful of levels become the bulk of the game, lower it and the climb is more
   even.
   --------------------------------------------------------------------------- */
const XP_PACE = 2.5;
const XP_EXPONENT = 1.85;

function xpToNext(lvl) {
  return Math.round(XP_PACE * (55 * Math.pow(lvl, XP_EXPONENT) + 55 * lvl));
}

function totalTalentPoints(lvl) {
  return Math.max(0, lvl - TALENT_START_LEVEL);
}

function freshSave() {
  const eq = {};
  for (const s of SLOTS) eq[s.key] = null;
  return {
    version: 1,
    created: Date.now(),
    name: "Nameless",
    level: 1,
    xp: 0,
    gold: 0,

    equipment: eq,
    inventory: [],
    /* Loose gems, counted by "type:grade" the way materials are counted. */
    gems: {},

    /* The flask currently holding, if any: { id, name, mods }. A flask lasts a
       whole run rather than a fight, and is lost when you die or withdraw. */
    flask: null,

    /* The bank: items set aside on purpose. Nothing here is ever touched by
       auto-salvage, and it is not searched when equipping or selling, so it is
       safe long-term storage rather than a second bag. */
    bank: [],
    materials: {},
    potions: {},

    talents: {},
    spellOrder: [],

    /* Per-spell firing conditions, keyed by spell id:
         { type: "enemyBelow", value: 30 }
       Anything without an entry casts whenever it is off cooldown. */
    spellConditions: {},

    /* Combat draughts last far longer than a single fight, so they persist here
       rather than inside a fight. Each entry is { id, name, mods, remaining },
       and `remaining` only ticks down while you are actually fighting. */
    potionBuffs: [],

    killStreak: 0,        // consecutive wins; some Uniques feed on it

    /* A realm run. Depth rises with every kill and makes the realm's inhabitants
       stronger and their loot better. Health and mana carry over between fights
       within a run, so a run ends when you die or when you walk out. */
    run: { realmId: null, depth: 0 },

    /* The Descent: the endgame dive. `boons` maps boon id to how many times it
       has been taken; `best` survives between runs as a personal record. */
    descent: { active: false, floor: 0, boons: {}, pendingChoices: null, best: 0 },
    lastDescent: null,    // stats of the most recent finished run, for the recap

    /* Aspects: special properties extracted from salvaged items. Each is stored
       under the SLOT it came from, because an aspect can only be re-applied to
       the same slot — a helm aspect goes on helms and nowhere else. This is what
       stops one strong effect being stamped onto all fifteen pieces at once.
       Shape: { helm: [ {kind, ...} ], chest: [ ... ], ... } */
    aspects: {},
    vitals: { hp: null, mana: null, potionCd: 0 },   // null means "full"

    kills: {},            // realmId -> total kills
    enemyKills: {},       // "realmId::Enemy Name" -> kills
    bossKills: {},        // bossId -> kills (drives escalation)
    unlockedRaids: [],

    settings: {
      autoGrind: true,
      speed: 2,           // 1 = real time, 2 = double, 4 = quadruple
      autoPotion: true,
      potionThreshold: 40,   // use a health potion below this % HP
      healPotion: null,      // potion id, or null for "highest tier owned"
      buffPotions: [],       // potion ids fired at the start of a fight
      compactLog: false,
      autoRetreat: 0,         // retreat below this % health; 0 disables it
      autoSalvage: "off",     // off | common | uncommon — handled after each fight
      autoSalvageMode: "salvage",   // salvage | sell
      sound: true,
      volume: 0.5,
      theme: "grimoire",
      customTheme: null,
      textScale: 1,
      seenVersion: null,     // for the changelog unread mark
      seenGuides: {},        // which first-visit guides have been shown
    },

    tally: { kills: 0, bossKills: 0, items: 0, goldEarned: 0, deaths: 0 },

    storageWarned: false,
  };
}

let S = freshSave();
let STORAGE_OK = true;

/* A new character gets a weapon and a few scraps. Starting with bare fists and
   fifteen empty slots makes the first hour miserable and teaches nothing. */
function giveStarterKit() {
  const kit = [
    { slot: "mainhand", primary: "str" },
    { slot: "chest", primary: "str" },
    { slot: "legs", primary: "str" },
    { slot: "boots", primary: "str" },
  ];
  for (const k of kit) {
    const item = generateItem({ ilvl: 1, rarity: "common", slot: k.slot, primary: k.primary });
    S.equipment[k.slot] = item;
  }
  S.potions.po_h1 = 5;
}

function saveGame() {
  if (!STORAGE_OK) return false;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    return true;
  } catch (e) {
    STORAGE_OK = false;
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    S = migrate(parsed);
    return true;
  } catch (e) {
    STORAGE_OK = false;
    return false;
  }
}

/* Fills in anything a newer version added, so old saves keep working. */
/* An older build let players bypass tier requirements (spend low, spend high,
   refund low). The bypass is fixed going forward, but a save from back then may
   still hold points in tiers it never legitimately reached. This walks each tree
   and refunds any talent whose tier requirement isn't met by the tree's total,
   highest tier first, until the allocation is legal again. Refunded points return
   to the pool automatically (available = earned - spent). Only ever removes points
   that are genuinely unreachable, so a legitimate build is left untouched. */
function sanitizeTalents(save) {
  if (!save || !save.talents || typeof TALENT_TREES === "undefined") return;
  const treePoints = tree => tree.talents.reduce((n, t) => n + (save.talents[t.id] || 0), 0);
  for (const tree of TALENT_TREES) {
    let guard = 0;
    while (guard++ < 999) {
      const pts = treePoints(tree);
      let violator = null;
      for (const t of tree.talents) {
        if ((save.talents[t.id] || 0) > 0 && pts < (t.tier - 1) * 5) {
          if (!violator || t.tier > violator.tier) violator = t;
        }
      }
      if (!violator) break;
      save.talents[violator.id]--;
      if (!save.talents[violator.id]) delete save.talents[violator.id];
    }
  }
}

/* Set pieces generated before 1.1.0 were stamped Legendary; give them the Set
   rarity so they show in their own colour. Stats are identical (same budget), so
   this only changes how they read. */
function retagSetPieces(save) {
  const fix = it => { if (it && it.setId) it.rarity = "set"; };
  if (save.inventory) save.inventory.forEach(fix);
  if (save.equipment) for (const k in save.equipment) fix(save.equipment[k]);
}

function migrate(save) {
  const base = freshSave();
  const out = Object.assign(base, save);
  out.settings = Object.assign(base.settings, save.settings || {});
  out.tally = Object.assign(base.tally, save.tally || {});
  for (const s of SLOTS) if (!(s.key in out.equipment)) out.equipment[s.key] = null;
  // the top auto-battle speed used to be 8x; clamp any old save into the new range
  if (out.settings.speed > 3) out.settings.speed = 3;
  // fields added in later versions that an older save will not have
  if (!out.aspects) out.aspects = {};
  if (!out.descent) out.descent = { active: false, floor: 0, boons: {}, pendingChoices: null, best: 0 };
  if (!out.run) out.run = { realmId: null, depth: 0 };
  if (!out.vitals) out.vitals = { hp: null, mana: null };
  sanitizeTalents(out);
  retagSetPieces(out);
  if (!Array.isArray(out.bank)) out.bank = [];   // saves from before the bank existed
  if (!out.gems || typeof out.gems !== "object") out.gems = {};   // before gems existed
  if (out.flask === undefined) out.flask = null;
  return out;
}

function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing to do */ }
  S = freshSave();
}

function exportSave() {
  return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
}

function importSave(text) {
  const parsed = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
  S = migrate(parsed);
  saveGame();
}

/* --------------------------------------------------------------------------
   Small shared helpers used all over the codebase.
   -------------------------------------------------------------------------- */
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

function fmt(n) {
  n = Math.round(n);
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 10000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString("en-US");
}

/* Weighted pick from an object of { key: weight }. */
function weightedPick(weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let roll = Math.random() * total;
  for (const k in weights) {
    roll -= weights[k];
    if (roll <= 0) return k;
  }
  return Object.keys(weights)[0];
}

function addMaterial(id, qty) {
  S.materials[id] = (S.materials[id] || 0) + qty;
}
function takeMaterial(id, qty) {
  if ((S.materials[id] || 0) < qty) return false;
  S.materials[id] -= qty;
  if (S.materials[id] <= 0) delete S.materials[id];
  return true;
}
function hasMaterials(mats) {
  for (const id in mats) if ((S.materials[id] || 0) < mats[id]) return false;
  return true;
}
function addPotion(id, qty) {
  S.potions[id] = (S.potions[id] || 0) + qty;
}
function takePotion(id, qty) {
  if ((S.potions[id] || 0) < qty) return false;
  S.potions[id] -= qty;
  if (S.potions[id] <= 0) delete S.potions[id];
  return true;
}
function potionById(id) { return POTIONS.find(p => p.id === id) || null; }
function realmById(id) { return REALMS.find(r => r.id === id) || null; }
function raidById(id) { return RAIDS.find(r => r.id === id) || null; }
function bossById(id) {
  for (const raid of RAIDS) {
    const b = raid.bosses.find(x => x.id === id);
    if (b) return b;
  }
  return null;
}
function talentById(id) {
  for (const tree of TALENT_TREES) {
    const t = tree.talents.find(x => x.id === id);
    if (t) return t;
  }
  return null;
}
function treeOfTalent(id) {
  for (const tree of TALENT_TREES) if (tree.talents.some(t => t.id === id)) return tree;
  return null;
}

/* Gems are counted the way materials are: a bag of "type:grade" keys. */
function addGem(key, qty) {
  S.gems[key] = (S.gems[key] || 0) + (qty || 1);
}
function takeGem(key, qty) {
  const n = qty || 1;
  if ((S.gems[key] || 0) < n) return false;
  S.gems[key] -= n;
  if (S.gems[key] <= 0) delete S.gems[key];
  return true;
}
function gemCount() {
  let n = 0;
  for (const k in S.gems) n += S.gems[k];
  return n;
}
