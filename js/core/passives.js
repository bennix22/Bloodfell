/* ===========================================================================
   PASSIVES — the machinery behind Unique items.
   ---------------------------------------------------------------------------
   A proc (js/data/effects.js) rolls a chance and then does something. A passive
   is different: it sits inside the combat loop and changes how a rule works.
   That needs real hooks rather than a trigger list, so each passive is an object
   with whichever of these it needs:

     fightStart(C)              once, as the fight opens
     tick(C)                    every 0.1s step
     damageTaken(C, dmg)        return the damage to actually apply, or 0 to
                                swallow it entirely (see smooth_damage)
     damageDealt(C, dmg, ctx)   return the damage to actually deal
     wouldDie(C)                return true to prevent death this instant
     onKill(C)                  after the enemy falls
     healTaken(C, amount)       return the healing to actually apply
     manaCost(C, cost)          return the mana a spell actually costs
     cooldown(C, cd)            return the cooldown a spell actually gets

   `C` is the Combat object, so a passive can read the whole fight state.
   Anything needing per-fight memory keeps it on C.passiveState, which is wiped
   at the start of every engagement.
   =========================================================================== */

const SMOOTH_WINDOW = 1.0;      // seconds that Even Keel spreads a blow across
// Chain of the Drowned reduces all incoming damage by a flat fraction. Unlike a
// hard cap, this stays killable: a big enough blow always lands for enough to
// matter (e.g. against 20k health, a 150k hit still deals ~105k). Very tanky,
// never immortal.
const DROWNED_DR = 0.30;

const PASSIVES = {

  /* ------------------------------------------------------------------------
     Blood Price — spells are paid for in health, not mana. A flag rather than
     a hook: the combat loop reads `castsCostHealth` when a spell is cast and
     when it decides what is affordable, drawing the cost from health instead of
     mana. See BLOOD_CAST_RATE and spellsCostHealth() in combat.js. This is what
     lets a Strength or Agility build cast freely without ever touching Intellect
     or a mana pool — a berserker's answer to the resource, at the obvious cost.
     ------------------------------------------------------------------------ */
  blood_price: {
    castsCostHealth: true,
  },

  /* ------------------------------------------------------------------------
     Even Keel — the incoming blow is queued and paid out in slices. Burst
     becomes a bleed, which a heal or a potion actually has time to answer.
     ------------------------------------------------------------------------ */
  smooth_damage: {
    fightStart(C) { C.passiveState.smoothQueue = []; },

    damageTaken(C, dmg) {
      const slices = Math.max(1, Math.round(SMOOTH_WINDOW / TICK));
      // the queue is normally created at fightStart, but a Levelling Weight can be
      // equipped mid-fight (after fightStart ran), so create it on demand
      if (!C.passiveState.smoothQueue) C.passiveState.smoothQueue = [];
      C.passiveState.smoothQueue.push({ perTick: dmg / slices, left: slices });
      return 0;   // nothing lands right now; the queue pays it out
    },

    tick(C) {
      const q = C.passiveState.smoothQueue;
      if (!q || !q.length) return;
      let total = 0;
      for (let i = q.length - 1; i >= 0; i--) {
        total += q[i].perTick;
        if (--q[i].left <= 0) q.splice(i, 1);
      }
      if (total > 0) C.applyRawDamage(total);
    },
  },

  /* One free death per fight. */
  second_heart: {
    fightStart(C) { C.passiveState.heartUsed = false; },
    wouldDie(C) {
      if (C.passiveState.heartUsed) return false;
      C.passiveState.heartUsed = true;
      C.player.hp = 1;
      C.healPlayer(C.stats.maxHp * 0.25, "Second Heart");
      C.pushLog("Second Heart takes the blow for you.", "proc");
      return true;
    },
  },

  /* Four times the damage, or none at all. */
  gamble: {
    damageDealt(C, dmg, ctx) {
      if (!ctx || ctx.source !== "auto") return dmg;
      const roll = Math.random();
      if (roll < 0.14) { C.pushLog("The coin comes up well.", "proc"); return dmg * 4; }
      if (roll < 0.28) { C.pushLog("The coin comes up badly.", "miss"); return 0; }
      return dmg;
    },
  },

  /* Excellent while ahead, punishing once behind. */
  cowards_bargain: {
    damageTaken(C, dmg) {
      const frac = C.player.hp / C.stats.maxHp;
      return frac > 0.60 ? dmg * 0.65 : dmg * 1.25;
    },
  },

  /* Grows without limit for as long as the fight runs. */
  long_grudge: {
    damageDealt(C, dmg) { return dmg * (1 + 0.05 * C.fightTime); },
  },

  /* Healing halved, but the weapon feeds you. */
  ashglass: {
    healTaken(C, amount) { return amount * 0.5; },
    damageDealt(C, dmg) {
      C.healPlayer(dmg * 0.14, null, true);
      return dmg;
    },
  },

  /* Half the cooldown, nearly double the cost. */
  widows_clock: {
    cooldown(C, cd) { return cd * 0.5; },
    manaCost(C, cost) { return cost * 1.8; },
  },

  /* Every fourth swing lands enormously. */
  fourth_strike: {
    fightStart(C) { C.passiveState.swingCount = 0; },
    damageDealt(C, dmg, ctx) {
      if (!ctx || ctx.source !== "auto") return dmg;
      C.passiveState.swingCount = (C.passiveState.swingCount || 0) + 1;
      if (C.passiveState.swingCount % 4 === 0) {
        C.pushLog("The ember catches.", "proc");
        return dmg * 3;
      }
      return dmg;
    },
  },

  /* A streak that survives between fights but not a defeat. */
  thief_of_hours: {
    statMods(C) {
      const stacks = Math.min(S.killStreak || 0, 10);
      return { haste: stacks * 3 };
    },
  },

  /* Rewards opening hard rather than grinding down. */
  unspoken: {
    damageDealt(C, dmg) {
      return C.enemy && C.enemy.hp >= C.enemy.maxHp ? dmg * 1.30 : dmg;
    },
  },

  /* Reduces all incoming damage by a flat fraction. Tanky but always killable:
     bigger hits always land for more, so no special-casing and no immortality. */
  damage_cap: {
    damageTaken(C, dmg) {
      return dmg * (1 - DROWNED_DR);
    },
  },

  /* Free spells while badly hurt. */
  hollow_lantern: {
    manaCost(C, cost) {
      return C.player.hp / C.stats.maxHp < 0.25 ? 0 : cost;
    },
  },

  /* Health as the casting resource. Cheaper, but it comes out of you. */
  pact_iron: {
    manaCost(C, cost) {
      const hp = cost * 0.5 * (C.stats.maxHp / Math.max(1, C.stats.maxMana));
      C.passiveState.pendingHealthCost = (C.passiveState.pendingHealthCost || 0) + hp;
      return 0;
    },
    tick(C) {
      const owed = C.passiveState.pendingHealthCost || 0;
      if (owed <= 0) return;
      C.passiveState.pendingHealthCost = 0;
      C.applyRawDamage(owed);
    },
  },

  /* Slower and heavier. Net damage is a clear gain; the rhythm changes entirely. */
  slow_hours: {
    statMods() { return { haste: -25 }; },
    damageDealt(C, dmg, ctx) {
      return (ctx && ctx.source === "auto") ? dmg * 1.55 : dmg;
    },
  },

  /* Banks a tenth of your output and pays it back as one blow. */
  tithe: {
    fightStart(C) { C.passiveState.tithe = 0; C.passiveState.tithePaid = false; },
    damageDealt(C, dmg) {
      C.passiveState.tithe = (C.passiveState.tithe || 0) + dmg * 0.10;
      return dmg * 0.90;
    },
    tick(C) {
      if (C.passiveState.tithePaid || C.fightTime < 12) return;
      const stored = C.passiveState.tithe || 0;
      if (stored <= 0) return;
      C.passiveState.tithePaid = true;
      C.pushLog("The Tithe comes due.", "proc");
      C.damageEnemy(stored, "The Tithe", true, "phys");
    },
  },

  /* Enormous damage, and a third less health to survive the answer. */
  glass_crown: {
    statMods() { return { hpPct: -33, allDmg: 55 }; },
  },

  /* Overhealing is banked as a shield instead of being thrown away. */
  kept_promise: {
    fightStart(C) { C.passiveState.promise = 0; },
    healTaken(C, amount) {
      const room = C.stats.maxHp - C.player.hp;
      const waste = Math.max(0, amount - room);
      if (waste > 0) {
        const cap = C.stats.maxHp / 3;
        C.passiveState.promise = Math.min(cap, (C.passiveState.promise || 0) + waste);
      }
      return amount;
    },
    damageTaken(C, dmg) {
      const banked = C.passiveState.promise || 0;
      if (banked <= 0) return dmg;
      C.passiveState.promise = 0;
      C.player.shield = { name: "The Kept Promise", amount: banked, remaining: 12 };
      C.pushLog(`The Kept Promise repays ${fmt(banked)}.`, "shield");
      return dmg;
    },
  },

  /* The opener is guaranteed and enormous; nothing else changes. */
  quiet_knife: {
    fightStart(C) { C.passiveState.knifeUsed = false; },
    damageDealt(C, dmg, ctx) {
      if (!ctx || ctx.source !== "auto" || C.passiveState.knifeUsed) return dmg;
      C.passiveState.knifeUsed = true;
      C.pushLog("One clean cut.", "proc");
      return dmg * 3;
    },
  },

  /* Grows with realm depth, so it is worthless on a fresh run and formidable deep. */
  weight_of_years: {
    statMods() {
      const d = (S.run && S.run.depth) || 0;
      return { dr: Math.min(40, d * 2), allDmg: d * 3 };
    },
  },

  /* One of five large blessings, rolled fresh every fight. */
  opus_fragment: {
    fightStart(C) {
      const rolls = [
        { name: "Unwritten Fury", mods: { allDmg: 35 } },
        { name: "Unwritten Precision", mods: { crit: 25, critDmg: 30 } },
        { name: "Unwritten Speed", mods: { haste: 35 } },
        { name: "Unwritten Hunger", mods: { lifesteal: 12 } },
        { name: "Unwritten Ward", mods: { dr: 18, armorPct: 30 } },
      ];
      const r = pick(rolls);
      C.player.buffs.push({ id: "opus_roll", name: r.name, mods: r.mods, remaining: 9999 });
      C.refreshStats();
      C.pushLog(`The page reads: ${r.name}.`, "proc");
    },
  },

  /* ---- boss uniques, one per raid boss (added 1.3.0) ---------------------- */

  /* Vorlanth — cheaper casting. */
  deepvoice: {
    manaCost(C, cost) { return cost * 0.80; },
  },

  /* Gravethirst — the first blow of each fight is mostly turned aside. */
  first_wound: {
    fightStart(C) { C.passiveState.firstWound = true; },
    damageTaken(C, dmg) {
      if (C.passiveState.firstWound) { C.passiveState.firstWound = false; return dmg * 0.40; }
      return dmg;
    },
  },

  /* The Pale Physician — stronger healing, gentler blows. */
  palliative: {
    healTaken(C, amt) { return amt * 1.35; },
    damageDealt(C, dmg) { return dmg * 0.90; },
  },

  /* Gutterlord Vhask — finishes the wounded. */
  opportunist: {
    damageDealt(C, dmg) {
      return C.enemy && C.enemy.hp < C.enemy.maxHp * 0.35 ? dmg * 1.35 : dmg;
    },
  },

  /* The Red Widow — lethal, and fragile. */
  black_widow: {
    statMods() { return { crit: 25 }; },
    damageTaken(C, dmg) { return dmg * 1.12; },
  },

  /* Carrionmaw — the weapon feeds you. */
  the_feast: {
    damageDealt(C, dmg) { C.healPlayer(dmg * 0.10, null, true); return dmg; },
  },

  /* The Devourer Below — crits bite deeper. */
  devour: {
    damageDealt(C, dmg, ctx) { return ctx && ctx.crit ? dmg * 1.30 : dmg; },
  },

  /* Nihiloth — a caster's bargain: spells hit harder, swings weaker. */
  voidcall: {
    damageDealt(C, dmg, ctx) {
      if (!ctx) return dmg;
      if (ctx.source === "spell") return dmg * 1.25;
      if (ctx.source === "auto") return dmg * 0.80;
      return dmg;
    },
  },

  /* The Blind Empress — unseen and untouched. */
  unseen: {
    statMods() { return { dodge: 18, crit: 12 }; },
  },

  /* Warden of Oblivion — a wall while whole, paper once hurt. */
  oblivion_ward: {
    damageTaken(C, dmg) {
      return C.player.hp > C.stats.maxHp * 0.60 ? dmg * 0.65 : dmg;
    },
  },

  /* Erebus — the killing edge grows as the enemy fails. */
  the_last_dark: {
    damageDealt(C, dmg) {
      if (!C.enemy || !C.enemy.maxHp) return dmg;
      const missing = 1 - C.enemy.hp / C.enemy.maxHp;
      return dmg * (1 + 0.50 * missing);
    },
  },
};

/* ---------------------------------------------------------------------------
   Collecting what is currently equipped. Cached onto the stat block so the
   combat loop never walks the equipment list mid-fight.
   --------------------------------------------------------------------------- */
function collectPassives() {
  const out = [];
  for (const slot of SLOTS) {
    const item = S.equipment[slot.key];
    if (item && item.passive && PASSIVES[item.passive.id]) {
      out.push({ id: item.passive.id, def: PASSIVES[item.passive.id], name: item.passive.name });
    }
  }
  return out;
}

/* Passives that alter the character sheet rather than the fight. Kept separate
   because computeStats runs constantly and must stay cheap. */
function passiveStatMods() {
  const mods = {};
  for (const slot of SLOTS) {
    const item = S.equipment[slot.key];
    if (!item || !item.passive) continue;
    const def = PASSIVES[item.passive.id];
    if (def && def.statMods) addMods(mods, def.statMods(Combat));
  }
  return mods;
}
