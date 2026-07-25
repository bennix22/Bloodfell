/* ===========================================================================
   COMBAT — the tick-based fight simulation.
   ---------------------------------------------------------------------------
   Fights resolve on a fixed 0.1s game-time step. The main loop feeds real
   elapsed time in, multiplied by the speed setting, so 4x speed is genuinely
   four times the fight, not a faster animation.

   There is no death penalty. Losing simply ends the fight, restores you, and
   (if auto-grind is on) starts the next one.
   =========================================================================== */

const TICK = 0.1;
const ELITE_CHANCE = 0.08;

/* Realm depth. Each kill in an unbroken run adds this much to the inhabitants'
   health and damage, and this much to what they carry. The user-facing promise
   is simple: the deeper you go the worse it gets and the better it pays. */
const DEPTH_POWER_PER_KILL = 0.05;
const DEPTH_XP_PER_KILL = 0.035;
const DEPTH_GOLD_PER_KILL = 0.05;
const DEPTH_FIND_PER_KILL = 4;     // percentage points of magic find per depth
/* Boss escalation. Every kill makes that boss permanently tougher, so farming a
   unique eventually forces you to go and get better gear elsewhere.

   Health and damage are separate on purpose. Applied at the same rate they
   compound badly — a tougher boss lives longer AND hits harder, so +40% on both
   is closer to double difficulty, and a boss you had comfortably beaten became
   impossible after ten kills. Weighting health means the pressure arrives as a
   longer, grindier fight rather than a sudden wall.

   With these numbers a boss you can comfortably kill stays winnable for roughly
   forty kills, which is about what the drop tables assume for a full set, then
   falls away steadily. */
const ESCALATION_HP_PER_KILL = 0.008;
const ESCALATION_DMG_PER_KILL = 0.003;
const LOSS_XP_SHARE = 0.08;
const LOG_LIMIT = 90;
/* Spells share a global cooldown, so a full spellbook cannot be dumped in one
   second. Haste shortens it, down to the floor. */
const GCD_BASE = 1.5;
const GCD_FLOOR = 0.75;
/* Ramping damage talents cap here so a long fight cannot spiral. */
const RAMP_MAX_STACKS = 12;
/* Mana returned per kill, as a fraction of the pool. Build-agnostic sustain. */
const MANA_ON_KILL = 0.12;

/* Blood Price: a spell's mana weight becomes this share of maximum health. 1.0
   would mean a 5%-mana spell costs 5% of your health; below 1 softens the toll.
   Tuned so a high-health martial can cast steadily but not endlessly — casting
   drains you, and you stop when a cast would drop you too low. */
const BLOOD_CAST_RATE = 0.7;

/* Seconds between auto-drunk potions. This is a cooldown in COMBAT time that
   persists across fights (see storeVitals/start), so in a fast auto-grind you
   cannot drink one every fight — a potion is an occasional emergency heal, not a
   per-fight top-up. */
const POTION_COOLDOWN = 12;

/* Role archetypes. Everything a realm enemy is comes from here plus its level.
   `dmg` is a DAMAGE PER SECOND multiplier, not per swing. The engine multiplies
   it by the role's swing interval, so a slow Brute and a fast Stalker with the
   same number are equally dangerous overall — the Brute just does it in fewer,
   bigger hits. Casters are tuned lower because magic ignores armour entirely. */
const ROLES = {
  swarm:   { hp: 0.55, dmg: 0.85, armor: 0.5, speed: 0.62, xp: 0.7,  label: "Swarm" },
  grunt:   { hp: 1.00, dmg: 1.00, armor: 1.0, speed: 1.00, xp: 1.0,  label: "Grunt" },
  brute:   { hp: 1.70, dmg: 1.20, armor: 0.9, speed: 1.35, xp: 1.45, label: "Brute" },
  stalker: { hp: 0.78, dmg: 1.15, armor: 0.7, speed: 0.70, xp: 1.05, label: "Stalker" },
  caster:  { hp: 0.82, dmg: 0.62, armor: 0.5, speed: 1.05, xp: 1.15, label: "Caster" },
  warden:  { hp: 1.45, dmg: 0.80, armor: 2.2, speed: 1.10, xp: 1.30, label: "Warden" },
};

/* Enemy scaling is fitted against the gear curves in loot.js. The exponents
   deliberately match itemBudget()/weaponDps() so a character in level-
   appropriate gear kills a level-appropriate mob in roughly ten seconds at
   every point in the game. Raise ENEMY_HP_K to make everything tankier. */
const ENEMY_HP_K = 26;
const ENEMY_DMG_K = 4.90;

/* ---------------------------------------------------------------------------
   LEVEL DIFFERENCE
   Gear supplies well over 90% of a character's raw power, so without this a
   level 30 character wearing level 50 gear would clear the entire game — twenty
   levels are otherwise worth about 1% damage. Each level of difference shifts
   damage in both directions, which is what stops you rushing deep on borrowed
   gear and gives levelling a reason to exist.

   At 5 levels above you that is -20% dealt and +20% taken: a real push, still
   survivable. At 17 above it is close to hopeless, which is the point.
   --------------------------------------------------------------------------- */
/* How much a magic-damage attacker is scaled down to account for armour doing
   nothing against it. Mirrors ROLES.caster.dmg. */
const MAGIC_SCHOOL_COMP = 0.62;

const LEVEL_GAP_PER = 0.04;
const LEVEL_GAP_CAP = 0.70;

function levelGapFactor(playerLvl, enemyLvl) {
  return clamp((enemyLvl - playerLvl) * LEVEL_GAP_PER, -LEVEL_GAP_CAP, LEVEL_GAP_CAP);
}

function enemyBaseHp(lvl) { return 70 + ENEMY_HP_K * Math.pow(lvl, 1.62); }
function enemyBaseDmg(lvl) { return 8 + ENEMY_DMG_K * Math.pow(lvl, 1.42); }
function enemyBaseArmor(lvl) { return 30 + 5.0 * Math.pow(lvl, 1.30); }
function enemyXp(lvl) { return 15 + lvl * 7.6; }
function enemyGold(lvl) { return 4 + lvl * 2.3; }

/* --------------------------------------------------------------------------
   Building an opponent
   -------------------------------------------------------------------------- */
function makeRealmEnemy(realm, depth) {
  const def = pick(realm.enemies);
  const role = ROLES[def.r] || ROLES.grunt;
  const lvl = realm.lvl;

  /* Depth. Every kill without leaving or dying makes the next one harder and
     richer. This is what turns a realm from a flat grind into a run you push
     until it becomes unwise. */
  const d = depth || 0;
  const depthPower = 1 + d * DEPTH_POWER_PER_KILL;

  const isElite = Math.random() < ELITE_CHANCE;
  const eliteBonus = isElite ? rand(0.03, 0.15) : 0;
  // loot modifier per spec: twice the power increase, plus or minus 20%
  const lootMod = isElite ? 1 + (eliteBonus * 2) * rand(0.8, 1.2) : 1;

  const hp = enemyBaseHp(lvl) * role.hp * (1 + eliteBonus) * depthPower;
  const speed = 2.4 * role.speed;
  const dmg = enemyBaseDmg(lvl) * role.dmg * role.speed * (1 + eliteBonus) * depthPower;

  return {
    name: isElite ? def.n : def.n,
    rawName: def.n,
    role: def.r, roleLabel: role.label,
    level: lvl,
    elite: isElite, eliteBonus, lootMod,
    maxHp: Math.round(hp), hp: Math.round(hp),
    dmgMin: dmg * 0.85, dmgMax: dmg * 1.15,
    armor: enemyBaseArmor(lvl) * role.armor,
    speed,
    swingTimer: speed * 0.6,
    school: def.r === "caster" ? "magic" : "phys",
    xp: Math.round(enemyXp(lvl) * role.xp * (1 + eliteBonus) * (1 + d * DEPTH_XP_PER_KILL)),
    gold: Math.round(enemyGold(lvl) * role.xp * (1 + eliteBonus * 1.5) * (1 + d * DEPTH_GOLD_PER_KILL)),
    dots: [],
    isBoss: false,
    depth: d,
  };
}

function makeBossEnemy(boss) {
  const kills = S.bossKills[boss.id] || 0;
  const escHp = 1 + kills * ESCALATION_HP_PER_KILL;
  const escDmg = 1 + kills * ESCALATION_DMG_PER_KILL;
  const role = ROLES[boss.r] || ROLES.grunt;
  const lvl = boss.lvl;

  const hp = enemyBaseHp(lvl) * boss.hpMult * escHp;
  const speed = 2.4 * role.speed;
  // Magic ignores armour completely, so a caster boss carrying the same multiplier
  // as a brute lands roughly twice the damage. Realm casters already get this
  // through ROLES.caster.dmg; bosses use their own multiplier, so apply it here
  // rather than hiding a mysteriously small number in every caster's data entry.
  const schoolComp = boss.r === "caster" ? MAGIC_SCHOOL_COMP : 1;
  const dmg = enemyBaseDmg(lvl) * boss.dmgMult * role.speed * schoolComp * escDmg;

  return {
    name: boss.title ? `${boss.name}, ${boss.title}` : boss.name,
    rawName: boss.name,
    role: boss.r, roleLabel: "Boss",
    level: lvl,
    elite: false, eliteBonus: 0, lootMod: 1,
    maxHp: Math.round(hp), hp: Math.round(hp),
    dmgMin: dmg * 0.88, dmgMax: dmg * 1.12,
    armor: enemyBaseArmor(lvl) * role.armor * 1.3,
    speed,
    swingTimer: speed * 0.6,
    school: boss.r === "caster" ? "magic" : "phys",
    xp: Math.round(enemyXp(lvl) * 9),
    gold: Math.round(enemyGold(lvl) * 12),
    dots: [],
    isBoss: true, bossId: boss.id, escalation: escHp, escalationDmg: escDmg, kills,
  };
}

/* --------------------------------------------------------------------------
   The Combat singleton
   -------------------------------------------------------------------------- */
const Combat = {
  active: false,
  mode: null,          // "realm" | "boss"
  realm: null,
  boss: null,
  enemy: null,
  player: null,
  stats: null,
  log: [],
  logSeq: 0,
  effectDepth: 0,
  rampStacks: 0,
  passiveState: {},
  accumulator: 0,
  fightTime: 0,
  lastResult: null,
  onUpdate: null,      // set by the UI

  /* ---- lifecycle ---- */
  start(mode, target) {
    this.mode = mode;

    if (mode === "descent") {
      this.realm = null; this.boss = null;
      this.enemy = makeDescentEnemy();
    } else if (mode === "realm") {
      // walking into a different realm abandons whatever run was in progress
      if (S.run.realmId !== target.id) beginRun(target.id);
      this.realm = target; this.boss = null;
      this.enemy = makeRealmEnemy(target, S.run.depth);
    } else {
      // a raid is a prepared encounter, so you arrive whole
      beginRun(null);
      this.boss = target; this.realm = null;
      this.enemy = makeBossEnemy(target);
    }

    this.player = {
      hp: 0, mana: 0,
      swingTimer: 0.4,
      cds: {},
      buffs: [],
      hots: [],
      shield: null,
      potionCd: 0,
      gcd: 0,
    };
    this.refreshStats();
    // health and mana carry across fights within a run; null means untouched
    this.player.hp = S.vitals.hp === null ? this.stats.maxHp : clamp(S.vitals.hp, 1, this.stats.maxHp);
    this.player.mana = S.vitals.mana === null ? this.stats.maxMana : clamp(S.vitals.mana, 0, this.stats.maxMana);
    // the potion cooldown carries too, so a fast auto-grind cannot reset it to
    // zero every fight and drink one each time
    this.player.potionCd = Math.max(0, S.vitals.potionCd || 0);

    this.applyOpeningPotions();
    this.fightTime = 0;
    this.accumulator = 0;
    this.active = true;
    this.effectDepth = 0;
    this.rampStacks = 0;
    this.passiveState = {};
    this.lastResult = null;
    this.enemy.baseSpeed = this.enemy.speed;

    const tag = this.enemy.elite
      ? ` <span class="elite-tag">Elite +${Math.round(this.enemy.eliteBonus * 100)}%</span>` : "";
    const depthTag = (this.enemy.depth)
      ? ` <span class="depth-tag">depth ${this.enemy.depth}</span>` : "";
    this.pushLog(`— ${this.enemy.name}${tag}${depthTag} —`, "header");
    this.passiveNotify("fightStart");
    this.fireEffects("open", {});
  },

  stop() {
    this.active = false;
    this.enemy = null;
  },

  refreshStats() {
    const extra = {};
    for (const b of this.player.buffs) addMods(extra, b.mods);
    for (const b of S.potionBuffs) addMods(extra, b.mods);
    this.stats = computeStats(extra);
    if (this.player.hp > this.stats.maxHp) this.player.hp = this.stats.maxHp;
    if (this.player.mana > this.stats.maxMana) this.player.mana = this.stats.maxMana;
  },

  /* logSeq only ever increases. The UI used to redraw when log.length changed,
     which stopped working the moment the log hit its cap and length froze at
     LOG_LIMIT forever — the chronicle appeared to update only when something
     died. Comparing a counter instead fixes that permanently. */
  pushLog(text, cls) {
    this.log.push({ t: text, c: cls || "" });
    this.logSeq++;
    if (this.log.length > LOG_LIMIT) this.log.shift();
  },

  /* ---- the step ---- */
  advance(realSeconds) {
    if (!this.active) return;
    const speed = S.settings.speed || 1;
    this.accumulator += realSeconds * speed;
    let guard = 0;
    while (this.accumulator >= TICK && this.active && guard < 4000) {
      this.accumulator -= TICK;
      this.step();
      guard++;
    }
  },

  step() {
    const p = this.player, e = this.enemy, st = this.stats;
    this.fightTime += TICK;

    // passives that run every step, such as the queued damage from Even Keel
    this.passiveNotify("tick");
    if (!this.active) return;

    // mana regen
    p.mana = Math.min(st.maxMana, p.mana + st.manaRegen * TICK);

    // buffs and shields tick down
    let buffsChanged = false;
    for (let i = p.buffs.length - 1; i >= 0; i--) {
      p.buffs[i].remaining -= TICK;
      if (p.buffs[i].remaining <= 0) { p.buffs.splice(i, 1); buffsChanged = true; }
    }
    // draughts burn only while fighting, so browsing your bags never wastes one
    for (let i = S.potionBuffs.length - 1; i >= 0; i--) {
      S.potionBuffs[i].remaining -= TICK;
      if (S.potionBuffs[i].remaining <= 0) { S.potionBuffs.splice(i, 1); buffsChanged = true; }
    }
    if (buffsChanged) this.refreshStats();
    if (p.shield) {
      p.shield.remaining -= TICK;
      if (p.shield.remaining <= 0 || p.shield.amount <= 0) p.shield = null;
    }

    // healing over time
    for (let i = p.hots.length - 1; i >= 0; i--) {
      const h = p.hots[i];
      h.timer -= TICK;
      if (h.timer <= 0) {
        h.timer += h.interval;
        this.healPlayer(h.perTick, h.name);
        h.ticksLeft--;
        if (h.ticksLeft <= 0) p.hots.splice(i, 1);
      }
    }

    // damage over time on the enemy
    for (let i = e.dots.length - 1; i >= 0; i--) {
      const d = e.dots[i];
      d.timer -= TICK;
      if (d.timer <= 0) {
        d.timer += d.interval;
        this.damageEnemy(d.perTick, d.name, false, d.school);
        d.ticksLeft--;
        if (d.ticksLeft <= 0) e.dots.splice(i, 1);
        if (!this.active) return;
      }
    }

    // global cooldown, then individual spell cooldowns
    if (p.gcd > 0) p.gcd -= TICK;
    for (const id in p.cds) {
      p.cds[id] -= TICK;
      if (p.cds[id] <= 0) delete p.cds[id];
    }

    // auto potion
    if (p.potionCd > 0) p.potionCd -= TICK;
    this.maybeDrinkPotion();

    // auto cast
    this.autoCast();
    if (!this.active) return;

    // player swing
    p.swingTimer -= TICK;
    if (p.swingTimer <= 0) {
      p.swingTimer += st.swingTime;
      this.playerAutoAttack();
      if (!this.active) return;
    }

    // a slow wears off
    if (e.slowUntil && this.fightTime >= e.slowUntil) {
      e.speed = e.baseSpeed; e.slowUntil = 0;
    }

    // enemy swing
    e.swingTimer -= TICK;
    if (e.swingTimer <= 0) {
      e.swingTimer += e.speed;
      this.enemyAttack();
    }
  },

  /* ---- unique passives ----
     Chained transforms: each passive receives what the previous one returned,
     so two of them stack predictably instead of fighting over the same number. */
  passiveTransform(hook, value, ctx) {
    const ps = this.stats.passives;
    if (!ps || !ps.length) return value;
    let v = value;
    for (const p of ps) {
      if (p.def[hook]) v = p.def[hook](this, v, ctx);
    }
    return v;
  },

  passiveNotify(hook) {
    const ps = this.stats.passives;
    if (!ps || !ps.length) return false;
    let any = false;
    for (const p of ps) {
      if (p.def[hook] && p.def[hook](this)) any = true;
    }
    return any;
  },

  /* ---- effects ----
     Fires every proc matching a trigger. `ctx` carries whatever the action needs:
     dmg for the ones that scale off the blow that caused them. Guarded against
     recursion so an extra swing that procs another extra swing cannot loop. */
  fireEffects(trigger, ctx) {
    const st = this.stats;
    if (!st.effects || !st.effects.length) return;
    if (this.effectDepth > 2) return;
    this.effectDepth++;
    for (const inst of st.effects) {
      const def = EFFECTS[inst.id];
      if (!def || def.trigger !== trigger) continue;
      if (def.hpBelow && this.player.hp / st.maxHp > def.hpBelow) continue;
      if (def.chance !== undefined || inst.chance !== undefined) {
        if (Math.random() * 100 >= (inst.chance || 0)) continue;
      }
      this.applyEffect(def, inst, ctx || {});
      if (!this.active) break;
    }
    this.effectDepth--;
  },

  applyEffect(def, inst, ctx) {
    const st = this.stats, p = this.player, e = this.enemy;
    const pot = inst.potency || 1;

    if (def.action === "dot") {
      const total = rand(st.normMin, st.normMax) * def.coef * pot;
      e.dots = e.dots.filter(d => d.id !== "proc_" + inst.id);
      e.dots.push({
        id: "proc_" + inst.id, name: def.name, school: def.school,
        perTick: total / def.ticks, interval: def.duration / def.ticks,
        timer: def.duration / def.ticks, ticksLeft: def.ticks,
      });
      this.pushLog(`${def.name} takes hold.`, "proc");
      Sound.play("proc", 150);

    } else if (def.action === "strike") {
      const dmg = rand(st.normMin, st.normMax) * def.coef * pot;
      this.damageEnemy(dmg, def.name, false, def.school || "phys");

    } else if (def.action === "heal") {
      const amount = def.coef * pot * (ctx.dmg || rand(st.normMin, st.normMax) * 0.5);
      this.healPlayer(amount, def.name);

    } else if (def.action === "buff") {
      const mods = {};
      for (const k in def.mods) mods[k] = def.mods[k] * pot;
      p.buffs = p.buffs.filter(b => b.id !== "proc_" + inst.id);
      p.buffs.push({ id: "proc_" + inst.id, name: def.name, mods, remaining: def.duration });
      this.refreshStats();
      this.pushLog(`${def.name} flares.`, "proc");

    } else if (def.action === "swing") {
      this.pushLog(`${def.name}!`, "proc");
      this.playerAutoAttack(true);

    } else if (def.action === "slow") {
      e.speed = e.baseSpeed * (1 + def.amount * pot);
      e.slowUntil = this.fightTime + def.duration;
      this.pushLog(`${def.name} slows ${e.rawName}.`, "proc");

    } else if (def.action === "mana") {
      const gain = st.maxMana * def.amount * pot;
      p.mana = Math.min(st.maxMana, p.mana + gain);
    }
  },

  /* ---- offence ---- */
  playerAutoAttack(isExtra) {
    const st = this.stats;
    let dmg = rand(st.swingMin, st.swingMax);
    dmg *= 1 + (st.physDmg + st.allDmg) / 100;
    const crit = Math.random() * 100 < st.crit;
    if (crit) dmg *= st.critMult;
    this.rampStacks++;
    this.damageEnemy(dmg, isExtra ? "Extra strike" : "Attack", crit, "phys");
    if (!this.active) return;
    // Second Wind / Adrenaline: mana back on a landed hit
    if (st.mods.manaOnHit) this.player.mana = Math.min(st.maxMana, this.player.mana + st.maxMana * st.mods.manaOnHit / 100);
    this.fireEffects("hit", { dmg });
    if (crit) this.fireEffects("crit", { dmg });
  },

  /* Bonuses that depend on the state of the fight rather than the character
     sheet, so they cannot live in computeStats. */
  situationalMultiplier() {
    const st = this.stats, p = this.player;
    let m = 1;
    const hpFrac = p.hp / st.maxHp;
    if (st.mods.lowHpDmg && hpFrac < 0.35) m *= 1 + st.mods.lowHpDmg / 100;
    if (st.mods.highHpDmg && hpFrac > 0.70) m *= 1 + st.mods.highHpDmg / 100;
    if (st.mods.rampDmg) {
      const stacks = Math.min(this.rampStacks, RAMP_MAX_STACKS);
      m *= 1 + (st.mods.rampDmg * stacks) / 100;
    }
    return m;
  },

  damageEnemy(raw, source, crit, school) {
    const e = this.enemy, st = this.stats;
    let dmg = raw;

    // execute bonus
    if (st.execDmg && e.hp / e.maxHp < 0.30) dmg *= 1 + st.execDmg / 100;

    // situational talents: cornered, steadfast, ramping momentum
    dmg *= this.situationalMultiplier();

    // unique passives may rewrite the blow entirely
    dmg = this.passiveTransform("damageDealt", dmg, { source: source === "Attack" ? "auto" : "spell", crit });
    if (dmg <= 0) {
      this.pushLog(`${source} fails to connect.`, "miss");
      return;
    }

    // fighting above your level hurts your output
    dmg *= 1 - levelGapFactor(S.level, e.level);

    // armour only mitigates physical
    if (school !== "magic") dmg *= 1 - armorReduction(e.armor, S.level);

    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;

    if (st.lifesteal > 0) this.healPlayer(dmg * st.lifesteal / 100, null, true);

    this.pushLog(
      `${source} hits ${e.rawName} for <b>${fmt(dmg)}</b>${crit ? " <span class='crit'>crit</span>" : ""}`,
      crit ? "dmg crit-line" : "dmg"
    );
    Sound.play(crit ? "crit" : "hit", 90);

    if (e.hp <= 0) {
      e.hp = 0;
      this.fireEffects("kill", {});
      this.win();
    }
  },

  enemyAttack() {
    const st = this.stats, p = this.player, e = this.enemy;

    if (Math.random() * 100 < st.dodge) {
      this.pushLog(`You dodge ${e.rawName}.`, "miss");
      return;
    }

    let dmg = rand(e.dmgMin, e.dmgMax);
    dmg *= 1 + levelGapFactor(S.level, e.level);
    let blocked = false;
    if (Math.random() * 100 < st.block) { dmg *= 0.55; blocked = true; }
    if (e.school !== "magic") dmg *= 1 - armorReduction(st.armor, e.level);
    dmg *= 1 - st.dr / 100;
    dmg = Math.max(1, Math.round(dmg));

    // shields soak first
    if (p.shield && p.shield.amount > 0) {
      const soak = Math.min(p.shield.amount, dmg);
      p.shield.amount -= soak;
      dmg -= soak;
      if (soak > 0) this.pushLog(`${p.shield.name} absorbs ${fmt(soak)}.`, "shield");
      if (p.shield.amount <= 0) p.shield = null;
    }

    if (dmg > 0) {
      const raw = dmg;
      // Unique passives get the blow before your health does. One of them may
      // return 0 and pay it out over the following second instead.
      const applied = this.passiveTransform("damageTaken", dmg, { blocked });

      if (applied > 0) {
        this.applyRawDamage(applied, `${e.rawName} hits you for <b>${fmt(Math.round(applied))}</b>${blocked ? " (blocked)" : ""}`);
      } else {
        this.pushLog(`${e.rawName} strikes for ${fmt(raw)}, spread thin.`, "taken");
      }
      if (!this.active) return;

      if (st.thorns > 0) {
        const reflect = Math.max(1, Math.round(raw * st.thorns / 100));
        e.hp -= reflect;
        if (e.hp <= 0) { e.hp = 0; this.fireEffects("kill", {}); this.win(); return; }
      }
      this.fireEffects("hurt", { dmg: raw });
    }
  },

  /* The single place health is actually removed, so every route — a normal hit,
     a queued slice from Even Keel, anything added later — gets the same death
     check and the same chance for a passive to refuse it. */
  applyRawDamage(amount, logLine) {
    const p = this.player;
    const dmg = Math.max(0, amount);
    if (dmg <= 0) return;
    p.hp -= dmg;
    if (logLine) { this.pushLog(logLine, "taken"); Sound.play("hurt", 140); }

    if (p.hp <= 0) {
      if (this.passiveNotify("wouldDie")) return;
      p.hp = 0;
      this.lose();
    }
  },

  healPlayer(amount, source, silent) {
    const st = this.stats, p = this.player;
    let heal = amount * (1 + st.healPct / 100);
    heal = this.passiveTransform("healTaken", heal);
    heal = Math.min(heal, st.maxHp - p.hp);
    if (heal <= 0) return;
    p.hp += heal;
    if (!silent) this.pushLog(`${source || "Heal"} restores <b>${fmt(heal)}</b>.`, "heal");
  },

  /* ---- spells ---- */
  autoCast() {
    const p = this.player, st = this.stats;
    if (p.gcd > 0) return;
    const spells = unlockedSpells();
    for (const sp of spells) {
      if (p.cds[sp.id]) continue;
      if (!this.canAfford(sp)) continue;
      if (!this.conditionMet(sp)) continue;
      // sensible default: do not waste heals or shields at full health
      if (!S.spellConditions[sp.id]
          && (sp.type === "heal" || sp.type === "hot" || sp.type === "shield")
          && p.hp > st.maxHp * 0.90) continue;
      if (sp.type === "buff" && p.buffs.some(b => b.id === sp.id)) continue;
      this.cast(sp);
      return;   // one cast per tick keeps the log readable
    }
  },

  /* A spell with no condition set fires whenever it can. Setting one replaces
     the built-in default entirely, including the "do not waste heals" rule, so
     what you configure is exactly what happens. */
  conditionMet(sp) {
    const c = S.spellConditions[sp.id];
    if (!c || c.type === "always") return true;
    const st = this.stats, p = this.player, e = this.enemy;
    const v = c.value;

    switch (c.type) {
      case "enemyBelow":  return (e.hp / e.maxHp) * 100 < v;
      case "enemyAbove":  return (e.hp / e.maxHp) * 100 > v;
      case "selfBelow":   return (p.hp / st.maxHp) * 100 < v;
      case "selfAbove":   return (p.hp / st.maxHp) * 100 > v;
      case "manaAbove":   return (p.mana / st.maxMana) * 100 > v;
      case "opener":      return this.fightTime <= v;
      case "afterSecs":   return this.fightTime >= v;
      case "bossOnly":    return !!e.isBoss;
      case "eliteOrBoss": return !!e.isBoss || !!e.elite;
      default:            return true;
    }
  },

  cast(sp) {
    const p = this.player, st = this.stats, e = this.enemy;
    /* Blood Price pays the cost in health rather than mana. The affordability
       check in canAfford() guarantees the hit leaves the caster alive, so no
       spell can be self-lethal — it simply will not fire when it would be. */
    if (this.spellsCostHealth()) {
      const hpCost = this.castHealthCost(sp);
      p.hp = Math.max(1, p.hp - hpCost);
      if (hpCost > 0) this.pushLog(`${sp.name} \u2014 paid ${fmt(Math.round(hpCost))} in blood.`, "cast");
    } else {
      p.mana -= this.spellCost(sp);
    }
    p.cds[sp.id] = this.passiveTransform("cooldown", sp.cd * (1 - st.cdr / 100));
    p.gcd = Math.max(GCD_FLOOR, GCD_BASE / (1 + st.haste / 100));
    Sound.play("spell", 120);

    const power = this.spellPower(sp);

    if (sp.type === "damage") {
      let dmg = power;
      if (sp.execBonus && e.hp / e.maxHp < 0.30) dmg *= sp.execBonus;
      dmg *= 1 + ((sp.school === "magic" ? st.magicDmg : st.physDmg) + st.allDmg) / 100;
      const crit = Math.random() * 100 < st.crit;
      if (crit) dmg *= st.critMult;
      this.damageEnemy(dmg, sp.name, crit, sp.school);
      if (sp.buff) this.applyBuff(sp);

    } else if (sp.type === "dot") {
      const total = power * (1 + ((sp.school === "magic" ? st.magicDmg : st.physDmg) + st.allDmg) / 100);
      e.dots = e.dots.filter(d => d.id !== sp.id);
      e.dots.push({
        id: sp.id, name: sp.name, school: sp.school,
        perTick: total / sp.ticks, interval: sp.duration / sp.ticks,
        timer: sp.duration / sp.ticks, ticksLeft: sp.ticks,
      });
      this.pushLog(`${sp.name} takes hold.`, "cast");

    } else if (sp.type === "heal") {
      this.healPlayer(power, sp.name);
      if (sp.buff) this.applyBuff(sp);

    } else if (sp.type === "hot") {
      p.hots = p.hots.filter(h => h.id !== sp.id);
      p.hots.push({
        id: sp.id, name: sp.name,
        perTick: power / sp.ticks, interval: sp.duration / sp.ticks,
        timer: sp.duration / sp.ticks, ticksLeft: sp.ticks,
      });
      this.pushLog(`${sp.name} begins mending.`, "cast");

    } else if (sp.type === "shield") {
      p.shield = { name: sp.name, amount: power, remaining: sp.duration };
      this.pushLog(`${sp.name} absorbs up to ${fmt(power)}.`, "shield");

    } else if (sp.type === "buff") {
      this.applyBuff(sp);
    }
  },

  /* Percentage of the pool, after any passive that alters it. */
  spellCost(sp) {
    const base = this.stats.manaCostPool * (sp.manaPct || 0) / 100;
    return this.passiveTransform("manaCost", base);
  },

  /* Is a Blood Price passive making spells cost health? */
  spellsCostHealth() {
    const ps = this.stats.passives;
    return !!(ps && ps.some(p => p.def.castsCostHealth));
  },

  /* The health a spell costs under Blood Price. A spell's mana weight (its
     manaPct) becomes the same share of maximum HEALTH, so heavier spells bleed
     you harder, and a deep health pool is what lets you cast more. Independent
     of Intellect and the mana pool entirely. */
  castHealthCost(sp) {
    return this.stats.maxHp * (sp.manaPct || 0) / 100 * BLOOD_CAST_RATE;
  },

  /* Whether the next cast can be paid for at all. Under Blood Price the cost is
     health and the hit must leave the caster alive; otherwise it is mana. */
  canAfford(sp) {
    if (this.spellsCostHealth()) {
      return this.player.hp > this.castHealthCost(sp) + 1;
    }
    return this.player.mana >= this.spellCost(sp);
  },

  spellPower(sp) {
    const st = this.stats;
    if (sp.scale === "weapon") {
      // normalised, so weapon speed does not silently scale every spell
      return rand(st.normMin, st.normMax) * sp.coef;
    }
    if (!sp.scale) return 0;
    return st[sp.scale] * sp.coef;
  },

  applyBuff(sp) {
    const b = sp.buff;
    this.player.buffs = this.player.buffs.filter(x => x.id !== sp.id);
    this.player.buffs.push({ id: sp.id, name: sp.name, mods: b.mods, remaining: b.duration });
    this.refreshStats();
    this.pushLog(`${sp.name} takes effect.`, "cast");
  },

  /* ---- potions ---- */
  /* Draughts last 30 seconds and a fight lasts about six, so re-drinking at every
     engagement threw away most of every potion. Now one is only opened when its
     effect is not already running. */
  applyOpeningPotions() {
    for (const id of S.settings.buffPotions || []) {
      const po = potionById(id);
      if (!po || po.kind !== "buff") continue;
      if (S.potionBuffs.some(b => b.id === po.id)) continue;   // already active
      if (!takePotion(id, 1)) continue;
      S.potionBuffs.push({ id: po.id, name: po.name, mods: po.mods, remaining: po.duration });
      this.pushLog(`${po.name} consumed.`, "potion");
    }
    this.refreshStats();
  },

  maybeDrinkPotion() {
    if (!S.settings.autoPotion) return;
    const p = this.player, st = this.stats;
    if (p.potionCd > 0) return;
    const pctHp = p.hp / st.maxHp * 100;
    if (pctHp >= (S.settings.potionThreshold || 40)) return;

    let po = null;
    if (S.settings.healPotion && (S.potions[S.settings.healPotion] || 0) > 0) {
      po = potionById(S.settings.healPotion);
    } else {
      // fall back to the strongest health potion in the bag
      const owned = POTIONS.filter(x => x.kind === "heal" && (S.potions[x.id] || 0) > 0);
      owned.sort((a, b) => b.pct - a.pct);
      po = owned[0] || null;
    }
    if (!po) return;
    if (!takePotion(po.id, 1)) return;
    p.potionCd = POTION_COOLDOWN;
    Sound.play("potion", 200);
    this.healPlayer(st.maxHp * po.pct / 100, po.name);
  },

  /* ---- resolution ---- */
  win() {
    this.active = false;
    const e = this.enemy;
    const st = this.stats;

    const xpGain = Math.round(e.xp * (1 + st.xpBonus / 100));
    const goldGain = Math.round(e.gold * (1 + st.goldFind / 100) * (e.lootMod || 1));
    // deeper runs find better things
    const depthFind = (e.depth || 0) * DEPTH_FIND_PER_KILL;

    S.xp += xpGain;
    S.gold += goldGain;
    S.tally.goldEarned += goldGain;

    const result = {
      won: true, name: e.name, xp: xpGain, gold: goldGain,
      items: [], materials: {}, leveled: false, unlocked: [],
      elite: e.elite, eliteBonus: e.eliteBonus,
    };

    S.killStreak = (S.killStreak || 0) + 1;
    // every kill returns a little mana, no matter how you fight. Short fights in
    // sequence mean this is the sustain a martial build actually leans on.
    this.player.mana = Math.min(st.maxMana, this.player.mana + st.maxMana * MANA_ON_KILL);
    this.passiveNotify("onKill");

    if (this.mode === "descent") {
      S.tally.kills++;
      const dropLvl = e.descentILvl || 52;
      const loot = rollRealmLoot(pick(REALMS), dropLvl, e.isWarden ? 3 : 1, st.magicFind + descentMagicFind());
      for (const id in loot.materials) addMaterial(id, loot.materials[id]);
      result.materials = loot.materials;
      for (const it of loot.items) { S.inventory.push(it); S.tally.items++; }
      result.items = loot.items;
      // a Warden also yields a proper boss table
      if (e.isWarden) {
        const all = [];
        for (const raid of RAIDS) for (const b of raid.bosses) all.push(b);
        const boss = all[Math.floor((S.descent.floor / DESCENT_WARDEN_EVERY - 1) % all.length)];
        const bl = rollBossLoot(boss, st.magicFind + descentMagicFind());
        for (const it of bl.items) { S.inventory.push(it); S.tally.items++; }
        result.items = result.items.concat(bl.items);
      }
      result.floor = S.descent.floor;
      result.boonReady = advanceDescent();
      result.descentBest = S.descent.best;

    } else if (this.mode === "realm") {
      S.tally.kills++;
      S.run.depth++;               // the realm closes in a little
      result.depth = S.run.depth;
      S.kills[this.realm.id] = (S.kills[this.realm.id] || 0) + 1;
      const key = this.realm.id + "::" + e.rawName;
      S.enemyKills[key] = (S.enemyKills[key] || 0) + 1;

      const loot = rollRealmLoot(this.realm, e.level, e.lootMod, st.magicFind + depthFind);
      for (const id in loot.materials) { addMaterial(id, loot.materials[id]); }
      result.materials = loot.materials;
      for (const it of loot.items) { S.inventory.push(it); S.tally.items++; }
      result.items = loot.items;

    } else {
      S.tally.bossKills++;
      const first = !(S.bossKills[this.boss.id] > 0);
      S.bossKills[this.boss.id] = (S.bossKills[this.boss.id] || 0) + 1;

      const loot = rollBossLoot(this.boss, st.magicFind);
      for (const it of loot.items) { S.inventory.push(it); S.tally.items++; }
      result.items = loot.items;

      if (first) result.unlocked = applyBossUnlocks(this.boss);
      result.escalation = this.boss ? (S.bossKills[this.boss.id] * ESCALATION_HP_PER_KILL * 100) : 0;
    }

    result.leveled = levelUpIfReady();
    result.autoCleared = runAutoSalvage();
    storeVitals(this);

    this.pushLog(`${e.rawName} falls. +${fmt(xpGain)} xp, +${fmt(goldGain)} gold.`, "win");
    Sound.play("victory", 200);
    for (const it of result.items) {
      this.pushLog(`Found <span class="r-${it.rarity}">${it.name}</span>`, "loot");
      Sound.play(it.rarity === "epic" || it.rarity === "legendary" ? "rare" : "loot", 120);
    }
    if (result.leveled) this.pushLog(`You reach level ${S.level}.`, "level");
    if (result.leveled) Sound.play("levelup", 0);
    for (const u of result.unlocked) this.pushLog(`Unlocked: ${u}`, "level");

    this.lastResult = result;
    saveGame();
    if (this.onUpdate) this.onUpdate("win", result);
  },

  lose() {
    this.active = false;
    S.tally.deaths++;
    S.killStreak = 0;
    const lostDepth = S.run.depth;
    let descentEnd = null;
    if (this.mode === "descent" && S.descent.active) descentEnd = endDescent("defeat");
    beginRun(null);              // the run is over; you wake up whole

    // There is no death penalty, and losing still teaches you something. Without
    // this a badly geared character in a realm it cannot beat would earn nothing
    // at all and could never climb back out.
    const consolation = Math.round(this.enemy.xp * LOSS_XP_SHARE);
    S.xp += consolation;
    const leveled = levelUpIfReady();

    const result = { won: false, name: this.enemy.name, xp: consolation, gold: 0,
                     items: [], materials: {}, unlocked: [], leveled, lostDepth, descentEnd };
    this.pushLog(`${this.enemy.rawName} defeats you. No penalty \u2014 you salvage ${fmt(consolation)} xp` +
      (descentEnd ? `. The Descent ends at floor ${descentEnd.floor}.`
        : lostDepth ? `, but the run ends at depth ${lostDepth}.` : "."), "lose");
    Sound.play("defeat", 0);
    if (leveled) this.pushLog(`You reach level ${S.level}.`, "level");
    this.lastResult = result;
    saveGame();
    if (this.onUpdate) this.onUpdate("lose", result);
  },
};

/* Marks whatever a boss opens as available. Returns readable names for the log. */
function applyBossUnlocks(boss) {
  const names = [];
  const u = boss.unlocks || {};
  if (u.raids) {
    for (const rid of u.raids) {
      if (!S.unlockedRaids.includes(rid)) {
        S.unlockedRaids.push(rid);
        const raid = raidById(rid);
        if (raid) names.push(raid.name + " (raid)");
      }
    }
  }
  if (u.realms) {
    for (const rid of u.realms) {
      const realm = realmById(rid);
      if (realm) names.push(realm.name);
    }
  }
  return names;
}

/* --------------------------------------------------------------------------
   Access checks
   -------------------------------------------------------------------------- */

/* However a realm is unlocked, you also have to be within striking distance of
   the things living in it. Boss gates alone are not enough: because gear supplies
   most of a character's power, a level 30 character could kill its way into a
   level 47 realm on borrowed gear, finish the entire game, and leave the last
   dozen levels with nothing in them. Realm levels step by at most 3, so an
   allowance of 4 can never strand you — there is always somewhere to grind. */
const REALM_LEVEL_ALLOWANCE = 4;

function realmLevelMet(realm) {
  return S.level >= realm.lvl - REALM_LEVEL_ALLOWANCE;
}

function realmUnlocked(realm) {
  if (!realmLevelMet(realm)) return false;
  const u = realm.unlock;
  if (u.type === "level") return S.level >= u.value;
  if (u.type === "boss") return (S.bossKills[u.value] || 0) > 0;
  return true;
}

function realmLockReason(realm) {
  const u = realm.unlock;
  if (u.type === "boss" && !((S.bossKills[u.value] || 0) > 0)) {
    const b = bossById(u.value);
    return b ? `Defeat ${b.name}` : "Locked";
  }
  if (u.type === "level" && S.level < u.value) return `Requires level ${u.value}`;
  if (!realmLevelMet(realm)) return `Requires level ${realm.lvl - REALM_LEVEL_ALLOWANCE}`;
  return "Locked";
}

function raidUnlocked(raid) {
  const u = raid.unlock;
  if (u.type === "level") return S.level >= u.value;
  if (u.type === "boss") return (S.bossKills[u.value] || 0) > 0;
  return true;
}

function raidLockReason(raid) {
  const u = raid.unlock;
  if (u.type === "level") return `Requires level ${u.value}`;
  if (u.type === "boss") {
    const b = bossById(u.value);
    return b ? `Defeat ${b.name}` : "Locked";
  }
  return "Locked";
}

/* A boss is available once every boss before it in the raid has died once, and
   once you are within reach of its level. The sequence alone does not pace the
   endgame: gear carries hard enough that Opus, a level 50 fight, was falling to
   level 38 characters and leaving the last dozen levels empty. */
function bossLevelMet(boss) {
  return S.level >= boss.lvl - REALM_LEVEL_ALLOWANCE;
}

function bossUnlocked(raid, index) {
  if (!raidUnlocked(raid)) return false;
  if (!bossLevelMet(raid.bosses[index])) return false;
  for (let i = 0; i < index; i++) {
    if (!(S.bossKills[raid.bosses[i].id] > 0)) return false;
  }
  return true;
}

function bossLockReason(raid, index) {
  const boss = raid.bosses[index];
  for (let i = 0; i < index; i++) {
    if (!(S.bossKills[raid.bosses[i].id] > 0)) return "Defeat the boss before it";
  }
  if (!bossLevelMet(boss)) return `Requires level ${boss.lvl - REALM_LEVEL_ALLOWANCE}`;
  return "Locked";
}

/* ---------------------------------------------------------------------------
   Run lifecycle. A run is an unbroken sequence of fights in one realm: health
   and mana carry between them and the inhabitants harden with every kill.
   Passing null starts you fresh and whole, which is what happens when you die,
   when you walk out, and when you step into a raid.
   --------------------------------------------------------------------------- */
function beginRun(realmId) {
  S.run.realmId = realmId;
  S.run.depth = 0;
  S.vitals.hp = null;
  S.vitals.mana = null;
  S.vitals.potionCd = 0;
}

function storeVitals(C) {
  S.vitals.hp = Math.max(1, Math.round(C.player.hp));
  S.vitals.mana = Math.max(0, Math.round(C.player.mana));
  S.vitals.potionCd = Math.max(0, C.player.potionCd || 0);
}

/* What the player currently has, for the interface to show outside a fight. */
function currentVitals() {
  const st = computeStats();
  return {
    hp: S.vitals.hp === null ? st.maxHp : clamp(S.vitals.hp, 0, st.maxHp),
    mana: S.vitals.mana === null ? st.maxMana : clamp(S.vitals.mana, 0, st.maxMana),
    maxHp: st.maxHp,
    maxMana: st.maxMana,
  };
}

/* Walking away. Costs the run, restores the character. */
function retreatFromRun() {
  const depth = S.run.depth;
  beginRun(null);
  saveGame();
  return depth;
}
