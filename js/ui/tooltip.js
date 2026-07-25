/* ===========================================================================
   TOOLTIPS — hover an item to read it, hold Shift to compare.
   ---------------------------------------------------------------------------
   Everything is wired through event delegation on a single listener, so panels
   can re-render as often as they like without rebinding anything. An element
   opts in by carrying a data-tip attribute:

       data-tip="inv:<uid>"     an item sitting in the inventory
       data-tip="eq:<slotKey>"  an item currently worn
       data-tip="shop:<uid>"    an item on the merchant's table
       data-tip="stat:<key>"    a line on the character sheet
       data-tip="spell:<id>"    a spell, wherever it is listed

   Holding Shift while hovering an inventory item puts the equipped piece side
   by side and marks every stat with how much it would change.

   Touch devices have no hover, so a tap opens the tooltip and a tap anywhere
   else closes it.
   =========================================================================== */

const Tooltip = {
  el: null,
  shiftHeld: false,
  current: null,     // { item, compare }
  lastXY: { x: 0, y: 0 },

  init() {
    this.el = document.createElement("div");
    this.el.className = "tip";
    this.el.style.display = "none";
    document.body.appendChild(this.el);

    // delegation: one listener for the whole document, forever
    document.addEventListener("mouseover", e => {
      const host = e.target.closest && e.target.closest("[data-tip]");
      if (!host) return;
      this.openFrom(host, e.clientX, e.clientY);
    });
    document.addEventListener("mouseout", e => {
      const host = e.target.closest && e.target.closest("[data-tip]");
      if (!host) return;
      const to = e.relatedTarget;
      if (to && to.closest && to.closest("[data-tip]") === host) return;
      this.hide();
    });
    document.addEventListener("mousemove", e => {
      this.lastXY = { x: e.clientX, y: e.clientY };
      if (this.current) this.place(e.clientX, e.clientY);
    });

    // Shift redraws the open tooltip in comparison mode
    window.addEventListener("keydown", e => {
      if (e.key === "Shift" && !this.shiftHeld) { this.shiftHeld = true; this.redraw(); }
    });
    window.addEventListener("keyup", e => {
      if (e.key === "Shift") { this.shiftHeld = false; this.redraw(); }
    });
    // releasing shift outside the window would otherwise leave it stuck on
    window.addEventListener("blur", () => { this.shiftHeld = false; this.redraw(); });

    // touch: tap to open, tap elsewhere to dismiss
    document.addEventListener("touchstart", e => {
      const host = e.target.closest && e.target.closest("[data-tip]");
      if (!host) { this.hide(); return; }
      const t = e.touches[0];
      this.openFrom(host, t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener("scroll", () => this.hide(), true);
  },

  openFrom(host, x, y) {
    const spec = host.dataset.tip || "";
    const [kind, key] = spec.split(":");
    let item = null, compare = null;

    if (kind === "inv") {
      item = S.inventory.find(i => i.uid === key);
      if (item) compare = bestWornFor(item);
    } else if (kind === "eq") {
      item = S.equipment[key];
    } else if (kind === "shop") {
      item = (S.merchant.stock || []).find(i => i.uid === key);
      if (item) compare = bestWornFor(item);
    } else if (kind === "stat") {
      this.current = { plain: statExplainCard(key) };
      this.redraw(); this.place(x, y); return;
    } else if (kind === "spell") {
      this.current = { plain: spellCard(key) };
      this.redraw(); this.place(x, y); return;
    }
    if (!item) { this.hide(); return; }

    this.current = { item, compare };
    this.redraw();
    this.place(x, y);
  },

  redraw() {
    if (!this.current || !this.el) return;
    if (this.current.plain) {
      this.el.innerHTML = this.current.plain;
      this.el.style.display = "block";
      this.place(this.lastXY.x, this.lastXY.y);
      return;
    }
    const { item, compare } = this.current;
    const comparing = this.shiftHeld && compare;

    let html = tipCard(item, comparing ? compare : null);
    if (comparing) {
      html += `<div class="tip-vs">currently worn</div>` + tipCard(compare, null, true);
    } else if (compare) {
      html += `<div class="tip-hint">hold <b>Shift</b> to compare with what you are wearing</div>`;
    }
    this.el.innerHTML = html;
    this.el.style.display = "block";
    this.place(this.lastXY.x, this.lastXY.y);
  },

  place(x, y) {
    if (!this.el || this.el.style.display === "none") return;
    const pad = 14;
    const w = this.el.offsetWidth, h = this.el.offsetHeight;
    let left = x + pad, top = y + pad;
    if (left + w > window.innerWidth - 8) left = x - w - pad;
    if (left < 8) left = 8;
    if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;
    if (top < 8) top = 8;
    this.el.style.left = left + "px";
    this.el.style.top = top + "px";
  },

  hide() {
    this.current = null;
    if (this.el) this.el.style.display = "none";
  },
};

/* Which worn item an inventory piece would actually replace — for rings and
   trinkets that is whichever of the two is worse. */
function bestWornFor(item) {
  const targets = slotsForItem(item);
  let worst = null, worstScore = Infinity;
  for (const t of targets) {
    const cur = S.equipment[t];
    const sc = itemScore(cur);
    if (sc < worstScore) { worstScore = sc; worst = cur; }
  }
  return worst;
}

/* ---------------------------------------------------------------------------
   Card rendering. `against` turns on the green/red deltas.
   --------------------------------------------------------------------------- */
function tipCard(item, against, muted) {
  const R = RARITIES[item.rarity];
  const rows = [];

  // weapon block
  if (item.weapon) {
    const dps = ((item.weapon.min + item.weapon.max) / 2) / item.weapon.speed;
    let dpsDelta = "";
    if (against && against.weapon) {
      const other = ((against.weapon.min + against.weapon.max) / 2) / against.weapon.speed;
      dpsDelta = deltaSpan(dps - other, 1);
    }
    rows.push(`<div class="tip-weapon">
      <span>${fmt(item.weapon.min)} \u2013 ${fmt(item.weapon.max)} damage</span>
      <span class="tip-dim">speed ${item.weapon.speed.toFixed(2)}</span>
    </div>
    <div class="tip-weapon"><span class="tip-dim">${dps.toFixed(1)} damage per second</span>${dpsDelta}</div>`);
  }

  // every stat on the item, one per line
  const keys = Object.keys(item.stats).filter(k => item.stats[k]);
  keys.sort((a, b) => statSortRank(a) - statSortRank(b));
  const statRows = keys.map(k => {
    const v = item.stats[k];
    const pct = PERCENT_STATS.includes(k);
    let delta = "";
    if (against) {
      const other = (against.stats && against.stats[k]) || 0;
      delta = deltaSpan(v - other, pct ? 1 : 0, pct);
    }
    return `<div class="tip-stat">
      <span class="tip-val ${statClass(k)}">+${Math.round(v * 10) / 10}${pct ? "%" : ""}</span>
      <span class="tip-key ${statClass(k)}">${STAT_LABEL[k] || k}</span>
      ${delta}
    </div>`;
  }).join("");

  // stats the worn item has that this one does not
  let missing = "";
  if (against && against.stats) {
    const lost = Object.keys(against.stats).filter(k => against.stats[k] && !item.stats[k]);
    missing = lost.map(k => {
      const pct = PERCENT_STATS.includes(k);
      return `<div class="tip-stat">
        <span class="tip-val tip-none">\u2014</span>
        <span class="tip-key ${statClass(k)}">${STAT_LABEL[k] || k}</span>
        ${deltaSpan(-against.stats[k], pct ? 1 : 0, pct)}
      </div>`;
    }).join("");
  }

  const ench = item.enchant ? ENCHANTS.find(x => x.id === item.enchant) : null;
  // an applied aspect reads differently from an item's own property, and says so
  const procLine = item.aspect
    ? `<div class="tip-aspect">
         <span class="tip-aspecttag">Aspect</span>
         <b>${item.aspect.name}</b> \u2014 ${describeEffect({ id: item.aspect.id, chance: item.aspect.chance, potency: item.aspect.potency })}
         <div class="tip-aspectnote">etched on \u2014 replaces this item's own property</div>
       </div>`
    : item.proc
    ? `<div class="tip-proc"><b>${effectName(item.proc)}</b> \u2014 ${describeEffect(item.proc)}</div>` : "";
  const passiveLine = item.passive
    ? `<div class="tip-passive"><b>${item.passive.name}</b><span>${item.passive.text}</span></div>` : "";
  const flavourLine = item.flavour
    ? `<div class="tip-flavour">${item.flavour}</div>` : "";
  const setLine = item.setId ? setTooltipBlock(item.setId) : "";
  const handsLine = item.hands === 2
    ? `<div class="tip-hands">Two-handed \u2014 occupies the off-hand slot</div>` : "";

  return `<div class="tip-card ${muted ? "muted" : ""}">
    <div class="tip-name r-${item.rarity}">${item.name}</div>
    <div class="tip-meta">${slotLabel(item.slot)} \u00B7 item level ${item.ilvl} \u00B7
      <span style="color:${R.color}">${R.name}</span></div>
    ${rows.join("")}
    ${handsLine}
    ${statRows ? `<div class="tip-block">${statRows}${missing}</div>` : ""}
    ${procLine}
    ${passiveLine}
    ${ench ? `<div class="tip-ench">\u2727 ${ench.name}</div>` : ""}
    ${setLine}
    ${flavourLine}
    <div class="tip-foot">sells for ${fmt(item.value)} gold</div>
  </div>`;
}

function deltaSpan(diff, decimals, pct) {
  if (Math.abs(diff) < 0.05) return `<span class="tip-delta same">\u00B7</span>`;
  const v = decimals ? Math.abs(diff).toFixed(1) : Math.round(Math.abs(diff));
  const sign = diff > 0 ? "+" : "\u2212";
  return `<span class="tip-delta ${diff > 0 ? "up" : "down"}">${sign}${v}${pct ? "%" : ""}</span>`;
}

/* ---------------------------------------------------------------------------
   Explanations for the character sheet. Every stat says what it actually does,
   because "Spirit 240" means nothing on its own.
   --------------------------------------------------------------------------- */
const STAT_HELP = {
  str: ["Strength", "Raises the damage of Strength weapons and any spell that scales with it. The main stat for Warrior and Paladin builds."],
  agi: ["Agility", "Raises the damage of Agility weapons and adds a little critical strike and dodge. The main stat for Rogue builds."],
  int: ["Intellect", "Raises the damage of Intellect weapons and spells, and deepens your mana pool. The main stat for Mage builds."],
  spi: ["Spirit", "Raises healing done and mana regeneration, and powers most Priest and Paladin spells."],
  sta: ["Stamina", "The only source of Health worth speaking of. Every point is roughly eleven more Health."],
  maxHp: ["Health", "How much damage you can take before the fight ends. There is no death penalty, but losing wastes the attempt."],
  maxMana: ["Mana", "Spells cost mana. Run dry and you fall back to swinging your weapon until it recovers."],
  manaRegen: ["Mana regeneration", "Mana recovered per second of combat. Driven mostly by Spirit."],
  armor: ["Armor", "Reduces incoming physical damage only. Magic ignores it entirely, which is why caster enemies hurt so much."],
  dr: ["Damage reduction", "A flat percentage off everything, physical and magical alike. Rarer and stronger than Armor."],
  dodge: ["Dodge", "Chance to avoid an attack completely. Scales slightly with Agility."],
  block: ["Block", "Chance to take 45% less from a blow. Needs a shield or Strength off-hand to be worth stacking."],
  crit: ["Critical strike", "Chance for an attack or spell to land for extra damage."],
  critMult: ["Critical damage", "What a critical strike is multiplied by. 175% is the baseline."],
  haste: ["Haste", "Swing faster and shorten the global cooldown between spells. Does not reduce individual spell cooldowns."],
  lifesteal: ["Lifesteal", "Heals you for a share of all damage you deal. The most reliable sustain in the game."],
  thorns: ["Thorns", "Reflects a share of every hit you take back at the attacker."],
  physDmg: ["Physical damage", "Multiplies weapon attacks and physical spells."],
  magicDmg: ["Magic damage", "Multiplies magical spells. Does nothing for weapon swings."],
  allDmg: ["All damage", "Multiplies everything you deal, of any school."],
  healPct: ["Healing done", "Multiplies your heals, shields and healing over time."],
  execDmg: ["Execute damage", "Bonus damage against anything below 30% Health."],
  cdr: ["Cooldown reduction", "Shortens individual spell cooldowns, so they come round more often."],
  goldFind: ["Gold found", "More gold per kill."],
  magicFind: ["Magic find", "Better odds of a drop, and better odds it is a good one."],
  dps: ["Damage per second", "Your weapon swings alone, ignoring spells and procs. A rough yardstick, not the whole picture."],
  swing: ["Weapon damage", "The range a single swing lands in, including the contribution from your main stat."],
  swingTime: ["Swing time", "Seconds between weapon swings, after Haste. Slow weapons hit harder per swing for the same damage per second."],
  armorMit: ["Physical mitigation", "What your Armor actually removes from a physical hit at your level. Diminishing: each point is worth slightly less than the last."],
};

function statExplainCard(key) {
  const h = STAT_HELP[key];
  if (!h) return "";
  return `<div class="tip-card">
    <div class="tip-name" style="color:var(--bone)">${h[0]}</div>
    <div class="tip-help">${h[1]}</div>
  </div>`;
}

/* Spell cards, used on the Skills panel and the talent trees. */
function spellCard(id) {
  const sp = SPELLS.find(x => x.id === id);
  if (!sp) return "";
  const tree = TALENT_TREES.find(t => t.id === sp.tree);
  const have = pointsInTree(sp.tree);
  const unlocked = have >= sp.req;

  const kind = {
    damage: "Instant damage", dot: "Damage over time", heal: "Heal",
    hot: "Healing over time", shield: "Absorb shield", buff: "Self buff",
  }[sp.type] || sp.type;

  const scale = sp.scale === "weapon" ? "weapon damage"
    : sp.scale ? (STAT_LABEL[sp.scale] || sp.scale) : "";

  return `<div class="tip-card">
    <div class="tip-name" style="color:var(--witch)">${sp.name}</div>
    <div class="tip-meta">${tree.name} \u00B7 ${kind}${sp.school ? " \u00B7 " + (sp.school === "magic" ? "magical" : "physical") : ""}</div>
    <div class="tip-block">
      <div class="tip-stat"><span class="tip-val">${sp.cd}s</span><span class="tip-key">cooldown</span></div>
      <div class="tip-stat"><span class="tip-val">${sp.manaPct}%</span><span class="tip-key">of your mana</span></div>
      ${scale ? `<div class="tip-stat"><span class="tip-val">${Math.round((sp.coef || 0) * 100)}%</span><span class="tip-key">of ${scale}</span></div>` : ""}
      ${sp.duration ? `<div class="tip-stat"><span class="tip-val">${sp.duration}s</span><span class="tip-key">duration</span></div>` : ""}
    </div>
    <div class="tip-help">${sp.desc}</div>
    <div class="tip-foot">${unlocked
      ? `unlocked \u2014 ${have} points in ${tree.name}`
      : `needs ${sp.req} points in ${tree.name}, you have ${have}`}</div>
  </div>`;
}

/* The set block on an item tooltip. Lists every piece, marks the ones you are
   wearing, and lights the bonus tiers you have reached — the same shape an MMO
   uses, because it answers "what am I still missing" at a glance. */
function setTooltipBlock(setId) {
  const set = setById(setId);
  if (!set) return "";
  const worn = {};
  let count = 0;
  for (const slot of SLOTS) {
    const it = S.equipment[slot.key];
    if (it && it.setId === setId) { worn[it.setIndex] = true; count++; }
  }
  const owned = {};
  for (const it of S.inventory) if (it.setId === setId) owned[it.setIndex] = true;

  const pieces = SET_PIECE_NAMES[setId].map((n, i) =>
    `<div class="tip-setpiece ${worn[i] ? "on" : (owned[i] ? "held" : "")}">${n}</div>`).join("");

  const tiers = Object.keys(set.bonuses).map(Number).sort((a, b) => a - b).map(n =>
    `<div class="tip-setbonus ${count >= n ? "on" : ""}">(${n}) ${set.bonuses[n].text}</div>`).join("");

  return `<div class="tip-set">
    <div class="tip-setname">${set.name} <span>(${count}/5)</span></div>
    ${pieces}${tiers}
  </div>`;
}
