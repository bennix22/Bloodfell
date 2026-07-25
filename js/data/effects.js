/* ===========================================================================
   EFFECTS — procs and conditional bonuses.
   ---------------------------------------------------------------------------
   One system serves two purposes: the special property on an Epic or Legendary
   item, and the talents that do something more interesting than adding a
   percentage. Both produce the same kind of entry:

       { id: "rend", chance: 15, potency: 1 }

   TRIGGERS
     hit    a landed attack, auto or spell
     crit   a critical strike specifically
     kill   the enemy dies
     hurt   you take damage
     open   the first swing of a fight

   ACTIONS
     dot     bleeding or burning on the target
     strike  immediate extra damage
     heal    heal yourself
     buff    a temporary bag of modifiers, same keys talents use
     swing   an immediate extra auto-attack
     slow    the enemy attacks more slowly for a while
     mana    restore mana

   `potency` scales the numbers, so the same effect can appear as a modest roll
   on an Epic and a serious one on a Legendary without a second definition.
   =========================================================================== */

const EFFECTS = {
  /* ---- offensive procs ---------------------------------------------------- */
  rend: {
    name: "Rend", trigger: "hit", action: "dot", school: "phys",
    coef: 0.55, duration: 6, ticks: 3,
    text: p => `${p.chance}% chance on hit to tear a wound for ${Math.round(55 * p.potency)}% weapon damage over 6s`,
  },
  ignite: {
    name: "Ignite", trigger: "hit", action: "dot", school: "magic",
    coef: 0.70, duration: 5, ticks: 5,
    text: p => `${p.chance}% chance on hit to set the target alight for ${Math.round(70 * p.potency)}% damage over 5s`,
  },
  shatter: {
    name: "Shatter", trigger: "crit", action: "strike", school: "phys",
    coef: 0.85,
    text: p => `critical strikes have a ${p.chance}% chance to shatter for ${Math.round(85 * p.potency)}% extra damage`,
  },
  windfury: {
    name: "Windfury", trigger: "hit", action: "swing",
    text: p => `${p.chance}% chance on hit to strike again immediately`,
  },
  execute_proc: {
    name: "Bloodscent", trigger: "hit", action: "buff",
    mods: { allDmg: 18 }, duration: 6,
    text: p => `${p.chance}% chance on hit to gain ${Math.round(18 * p.potency)}% damage for 6s`,
  },
  frostbite: {
    name: "Frostbite", trigger: "hit", action: "slow",
    amount: 0.25, duration: 5,
    text: p => `${p.chance}% chance on hit to slow the target's attacks by ${Math.round(25 * p.potency)}% for 5s`,
  },

  /* ---- sustain ------------------------------------------------------------ */
  leech: {
    name: "Leech", trigger: "hit", action: "heal", coef: 0.55,
    text: p => `${p.chance}% chance on hit to drain ${Math.round(55 * p.potency)}% of the damage as health`,
  },
  soulsiphon: {
    name: "Soul Siphon", trigger: "kill", action: "mana", amount: 0.20,
    text: p => `restore ${Math.round(20 * p.potency)}% mana whenever you kill something`,
  },
  lastbreath: {
    name: "Last Breath", trigger: "hurt", action: "heal", coef: 2.2, hpBelow: 0.30,
    text: p => `${p.chance}% chance when struck below 30% health to recover ${Math.round(220 * p.potency)}% of the blow`,
  },

  /* ---- defensive ---------------------------------------------------------- */
  vengeance: {
    name: "Vengeance", trigger: "hurt", action: "buff",
    mods: { physDmg: 12, magicDmg: 12 }, duration: 8,
    text: p => `${p.chance}% chance when struck to gain ${Math.round(12 * p.potency)}% damage for 8s`,
  },
  bulwark: {
    name: "Bulwark", trigger: "hurt", action: "buff",
    mods: { dr: 10, armorPct: 15 }, duration: 6,
    text: p => `${p.chance}% chance when struck to harden for ${Math.round(10 * p.potency)}% reduction for 6s`,
  },
  retort: {
    name: "Retort", trigger: "hurt", action: "strike", school: "phys", coef: 0.65,
    text: p => `${p.chance}% chance when struck to hit back for ${Math.round(65 * p.potency)}% weapon damage`,
  },

  /* ---- openers and finishers ---------------------------------------------- */
  ambush: {
    name: "Ambush", trigger: "open", action: "buff",
    mods: { crit: 25, allDmg: 15 }, duration: 8,
    text: p => `open each fight with ${Math.round(25 * p.potency)}% critical strike and ${Math.round(15 * p.potency)}% damage for 8s`,
  },
  momentum: {
    name: "Momentum", trigger: "kill", action: "buff",
    mods: { haste: 20, allDmg: 10 }, duration: 12,
    text: p => `killing something grants ${Math.round(20 * p.potency)}% haste and ${Math.round(10 * p.potency)}% damage for 12s`,
  },
};

/* Which procs suit which archetype, so a plate chest does not roll a rogue proc. */
const PROC_POOL = {
  str: ["rend", "shatter", "vengeance", "bulwark", "retort", "windfury", "execute_proc", "leech", "momentum"],
  agi: ["rend", "shatter", "windfury", "ambush", "leech", "momentum", "execute_proc", "frostbite"],
  int: ["ignite", "frostbite", "leech", "soulsiphon", "execute_proc", "vengeance", "ambush", "momentum"],
};

/* Epics get a modest roll, legendaries a stronger one. */
const PROC_TIERS = {
  epic:      { chance: [8, 14], potency: [0.8, 1.0] },
  legendary: { chance: [12, 20], potency: [1.0, 1.35] },
};

function describeEffect(inst) {
  const def = EFFECTS[inst.id];
  if (!def) return "";
  return def.text({ chance: inst.chance, potency: inst.potency });
}

function effectName(inst) {
  const def = EFFECTS[inst.id];
  return def ? def.name : inst.id;
}
