/* ===========================================================================
   UI CORE — the shell, the router, and the bits every panel needs.
   ---------------------------------------------------------------------------
   Rendering is deliberately dumb: change state, call UI.render(), the whole
   active panel is rebuilt. At this scale that is instant, and it means no
   panel can ever show stale numbers.

   The one exception is the fight view, which updates its bars and log on every
   frame through UI.tickCombat() rather than a full rebuild.
   =========================================================================== */

const UI = {
  route: "realms",
  tab: {},          // per-panel sub-tab memory
  el: {},           // cached DOM references
  modal: null,

  /* -------------------------------------------------------------- boot -- */
  mount() {
    document.body.innerHTML = `
      <div class="app">
        <aside class="rail">
          <div class="brand">
            ${typeof BRAND_LOGO !== "undefined" ? BRAND_LOGO : `<h1>Bloodfell</h1><div class="sub">the ground drinks deep</div>`}
          </div>
          <div class="charcard" id="charcard"></div>
          <nav class="nav" id="nav"></nav>
          <div class="railfoot">
            <button class="btn sm" onclick="UI.openChangelog()" id="changelogbtn">What's new</button>
            <button class="btn sm" onclick="UI.openSave()">Save file</button>
            <button class="btn sm danger" onclick="UI.confirmWipe()">New game</button>
          </div>
          <div class="version" id="versiontag">v${typeof VERSION !== "undefined" ? VERSION : ""}</div>
        </aside>
        <main class="main" id="main"></main>
      </div>
      <div class="toasts" id="toasts"></div>
      <div id="modalhost"></div>`;

    this.el.charcard = document.getElementById("charcard");
    this.el.nav = document.getElementById("nav");
    this.el.main = document.getElementById("main");
    this.el.toasts = document.getElementById("toasts");
    this.el.modalhost = document.getElementById("modalhost");

    Tooltip.init();
    // one delegated listener gives every button a click without touching markup
    document.addEventListener("pointerdown", e => {
      if (e.target.closest && e.target.closest("button")) Sound.play("click", 40);
    });
    this.renderNav();
    this.render();
    this.refreshChangelogMark();
  },

  /* ------------------------------------------------------------- chrome -- */
  NAV: [
    { group: "Fight" },
    { id: "realms", label: "Realms", glyph: "\u2694" },
    { id: "raids", label: "Raids", glyph: "\u2620" },
    { id: "descent", label: "The Descent", glyph: "\u2193" },
    { group: "Character" },
    { id: "character", label: "Character", glyph: "\u25C8" },
    { id: "inventory", label: "Inventory", glyph: "\u2263" },
    { id: "bank", label: "Bank", glyph: "\u25A4" },
    { id: "talents", label: "Talents", glyph: "\u2733" },
    { id: "skills", label: "Skills", glyph: "\u25C9" },
    { group: "Craft" },
    { id: "blacksmith", label: "Blacksmith", glyph: "\u2692" },
    { id: "gemcrafting", label: "Gemcrafting", glyph: "\u25C7" },
    { id: "alchemy", label: "Alchemy", glyph: "\u2697" },
    { id: "enchanting", label: "Enchanting", glyph: "\u2721" },
    { id: "materials", label: "Materials", glyph: "\u26CF" },
    { id: "uniques", label: "Uniques", glyph: "❖" },
    { group: "Town" },
    { id: "settings", label: "Settings", glyph: "\u2699" },
  ],

  refreshChangelogMark() {
    const btn = document.getElementById("changelogbtn");
    if (btn) btn.classList.toggle("unread", changelogUnread());
  },

  renderNav() {
    let html = "";
    for (const n of this.NAV) {
      if (n.group) { html += `<div class="navgroup">${n.group}</div>`; continue; }
      html += `<button class="navbtn" data-nav="${n.id}" onclick="UI.go('${n.id}')">
        <span class="glyph">${n.glyph}</span><span>${n.label}</span>
        <span class="pip" data-pip="${n.id}" style="display:none"></span>
      </button>`;
    }
    this.el.nav.innerHTML = html;
  },

  go(route) {
    this.route = route;
    this.render();
    // a short one-time explainer the first time a major section is opened
    if (typeof maybeShowGuide === "function") maybeShowGuide(route);
  },

  toggleGuides(off) {
    if (!S.settings.seenGuides) S.settings.seenGuides = {};
    if (off) for (const k in GUIDES) S.settings.seenGuides[k] = true;
    else S.settings.seenGuides = {};
    saveGame();
  },

  renderCharCard() {
    if (!this.el.charcard) return;   // called before mount, or from a headless test
    const st = computeStats();
    const v = currentVitals();
    const hpNow = Combat.active ? Combat.player.hp : v.hp;
    const mpNow = Combat.active ? Combat.player.mana : v.mana;
    const need = xpToNext(S.level);
    const maxed = S.level >= MAX_LEVEL;

    this.el.charcard.innerHTML = `
      <div class="lvl"><b>Level ${S.level}</b><span>${maxed ? "MAX" : ""}</span></div>
      <div class="barlabel"><span>Health</span><span>${fmt(hpNow)} / ${fmt(st.maxHp)}</span></div>
      <div class="bar hp"><i style="width:${clamp(hpNow / st.maxHp * 100, 0, 100)}%"></i></div>
      <div class="barlabel"><span>Mana</span><span>${fmt(mpNow)} / ${fmt(st.maxMana)}</span></div>
      <div class="bar mana"><i style="width:${clamp(mpNow / st.maxMana * 100, 0, 100)}%"></i></div>
      <div class="barlabel"><span>Experience</span><span>${maxed ? "\u2014" : fmt(S.xp) + " / " + fmt(need)}</span></div>
      <div class="bar xp"><i style="width:${maxed ? 100 : clamp(S.xp / need * 100, 0, 100)}%"></i></div>
      <div class="purse">${fmt(S.gold)} gold</div>
      ${S.run.realmId ? `<div class="runline">
        <span>${realmById(S.run.realmId) ? realmById(S.run.realmId).name : ""}</span>
        <b>depth ${S.run.depth}</b></div>` : ""}`;

    // talent points waiting to be spent
    const pip = document.querySelector('[data-pip="talents"]');
    if (pip) {
      const avail = pointsAvailable();
      pip.style.display = avail > 0 ? "" : "none";
      pip.textContent = avail;
    }
  },

  /* -------------------------------------------------------------- render -- */
  render() {
    // the element being described may be about to vanish
    if (typeof Tooltip !== "undefined") Tooltip.hide();
    document.querySelectorAll("[data-nav]").forEach(b => {
      b.classList.toggle("on", b.dataset.nav === this.route);
    });
    this.renderCharCard();

    const map = {
      realms: renderRealms,
      raids: renderRaids,
      descent: renderDescent,
      character: renderCharacter,
      inventory: renderInventory,
      bank: renderBank,
      talents: renderTalents,
      skills: renderSkills,
      blacksmith: renderBlacksmith,
      gemcrafting: renderGemcrafting,
      alchemy: renderAlchemy,
      enchanting: renderEnchanting,
      materials: renderMaterials,
      uniques: renderUniques,
      settings: renderSettings,
    };
    const fn = map[this.route] || renderRealms;
    this.el.main.innerHTML = (STORAGE_OK ? "" : this.storageNotice()) + fn();

    if (this.route === "realms" || this.route === "raids") this.tickCombat(true);
  },

  storageNotice() {
    return `<div class="notice">
      This browser is blocking local storage, so progress will not survive a refresh.
      Open the game by double-clicking <b>index.html</b> from your own machine, or use
      <b>Save file &rarr; Export</b> to keep a copy of your character.
    </div>`;
  },

  /* ------------------------------------------------------------- helpers -- */
  toast(msg, kind) {
    if (!this.el.toasts) return;   // called before mount
    const d = document.createElement("div");
    d.className = "toast" + (kind ? " " + kind : "");
    d.innerHTML = msg;
    this.el.toasts.appendChild(d);
    setTimeout(() => d.remove(), 3400);
  },

  say(res) {
    if (!res) return;
    if (!res.ok) Sound.play("error", 0);
    this.toast(res.msg || "", res.ok ? "good" : "bad");
    if (res.ok) this.render();
  },

  openModal(html) {
    this.el.modalhost.innerHTML = `<div class="scrim" onclick="if(event.target===this)UI.closeModal()">
      <div class="modal">${html}</div></div>`;
  },
  closeModal() { this.el.modalhost.innerHTML = ""; },

  openChangelog() {
    markChangelogRead();
    this.refreshChangelogMark();
    const entries = CHANGELOG.map((e, i) => `
      <div class="clentry">
        <div class="clhead">
          <span class="clver">v${e.v}</span>
          <span class="cltitle">${e.title}</span>
          ${e.date === "current" ? `<span class="clcurrent">LIVE</span>` : ""}
        </div>
        <ul class="cllines">
          ${e.lines.map(l => `<li>${l}</li>`).join("")}
        </ul>
      </div>`).join("");
    this.openModal(`
      <div class="modalhead">
        <h2>Update log</h2>
        <div class="modalsub">Currently playing version ${VERSION}</div>
      </div>
      <div class="changelog">${entries}</div>
      <div class="modalfoot"><button class="btn" onclick="UI.closeModal()">Close</button></div>
    `);
  },

  openSave() {
    this.openModal(`
      <h3>Save file</h3>
      <p style="color:var(--ash);font-size:12.5px">
        Copy this text somewhere safe to back up your character, or paste one in and load it.
        The game also saves automatically after every fight.</p>
      <textarea id="savebox" spellcheck="false">${exportSave()}</textarea>
      <div class="modalfoot">
        <button class="btn" onclick="UI.doImport()">Load pasted save</button>
        <button class="btn primary" onclick="UI.closeModal()">Done</button>
      </div>`);
    setTimeout(() => { const b = document.getElementById("savebox"); if (b) b.select(); }, 40);
  },

  doImport() {
    const box = document.getElementById("savebox");
    try {
      importSave(box.value);
      this.closeModal();
      Combat.stop();
      S.settings.autoGrind = false;
      this.render();
      this.toast("Save loaded.", "good");
    } catch (e) {
      this.toast("That does not look like a valid save.", "bad");
    }
  },

  confirmWipe() {
    this.openModal(`
      <h3>Start over?</h3>
      <p style="color:var(--ash)">This erases your character, gear, materials and every unlock.
      There is no undo. Export your save first if you want to keep it.</p>
      <div class="modalfoot">
        <button class="btn" onclick="UI.closeModal()">Keep playing</button>
        <button class="btn danger" onclick="UI.doWipe()">Erase everything</button>
      </div>`);
  },

  doWipe() {
    Combat.stop();
    wipeSave();
    giveStarterKit();
    saveGame();
    this.closeModal();
    this.route = "realms";
    this.render();
    this.toast("A new character stirs.", "good");
  },
};

/* ===========================================================================
   Shared rendering helpers used by more than one panel.
   =========================================================================== */

const STAT_LABEL = {
  str: "Strength", agi: "Agility", int: "Intellect", spi: "Spirit", sta: "Stamina",
  armor: "Armor", crit: "Crit", haste: "Haste", dodge: "Dodge", block: "Block",
  critDmg: "Crit Damage", lifesteal: "Lifesteal", thorns: "Thorns",
  physDmg: "Physical Damage", magicDmg: "Magic Damage", allDmg: "Damage",
  hpPct: "Max Health", dr: "Damage Reduction", healPct: "Healing",
  manaPct: "Max Mana", manaRegen: "Mana Regen", goldFind: "Gold Found",
  magicFind: "Magic Find", cdr: "Cooldown Reduction", execDmg: "Execute Damage",
  strPct: "Strength", agiPct: "Agility", intPct: "Intellect", spiPct: "Spirit", staPct: "Stamina",
  armorPct: "Armor", xpBonus: "Experience",
};
const PERCENT_STATS = ["crit", "haste", "dodge", "block", "critDmg", "lifesteal", "thorns",
  "physDmg", "magicDmg", "allDmg", "hpPct", "dr", "healPct", "manaPct", "manaRegen",
  "goldFind", "magicFind", "cdr", "execDmg", "strPct", "agiPct", "intPct", "spiPct",
  "staPct", "armorPct", "xpBonus"];

/* Primary stats first, then stamina, then the secondaries — the order people
   expect to read them in. */
const STAT_ORDER = ["str", "agi", "int", "spi", "sta", "armor", "crit", "haste",
  "critDmg", "dodge", "block", "lifesteal", "thorns"];
function statSortRank(k) {
  const i = STAT_ORDER.indexOf(k);
  return i < 0 ? 99 : i;
}

/* Stat names are deliberately uncoloured. Colouring every primary turned the
   character sheet and every item into a rainbow that was harder to read, not
   easier — rarity colour on the item name already carries the useful signal.
   statClass is kept as a no-op so nothing has to be rewired if you want to try
   a different scheme later. */
function statClass() { return ""; }

function statLine(key, value) {
  const label = STAT_LABEL[key] || key;
  const pct = PERCENT_STATS.includes(key);
  const v = Math.round(value * 10) / 10;
  return `+${v}${pct ? "%" : ""} ${label}`;
}

/* Stats as a grid, one per line — far easier to scan than a run-on line. */
function itemStatGrid(item) {
  const cells = [];

  if (item.weapon) {
    const dps = ((item.weapon.min + item.weapon.max) / 2) / item.weapon.speed;
    cells.push(`<div class="s wpn"><span class="v">${fmt(item.weapon.min)}\u2013${fmt(item.weapon.max)}</span><span class="k">damage</span></div>`);
    cells.push(`<div class="s wpn"><span class="v">${item.weapon.speed.toFixed(2)}s</span><span class="k">speed (${dps.toFixed(1)} dps)</span></div>`);
  }

  const keys = Object.keys(item.stats).filter(k => item.stats[k]);
  keys.sort((a, b) => statSortRank(a) - statSortRank(b));
  for (const k of keys) {
    const pct = PERCENT_STATS.includes(k);
    const v = Math.round(item.stats[k] * 10) / 10;
    cells.push(`<div class="s"><span class="v ${statClass(k)}">+${v}${pct ? "%" : ""}</span><span class="k ${statClass(k)}">${STAT_LABEL[k] || k}</span></div>`);
  }

  if (item.enchant) {
    const e = ENCHANTS.find(x => x.id === item.enchant);
    if (e) cells.push(`<div class="s ench"><span class="v">\u2727</span><span class="k">${e.name}</span></div>`);
  }

  return `<div class="statgrid">${cells.join("")}</div>`;
}

/* Human label for a slot TYPE (helm, ring, weapon, ...), used by the aspect
   workbench where slots are grouped by type rather than by specific slot. */
function slotTypeLabel(t) {
  const map = { helm: "Helm", shoulders: "Shoulders", cape: "Cape", chest: "Chest",
    wrist: "Wrist", gloves: "Gloves", waist: "Waist", legs: "Legs", boots: "Boots",
    ring: "Ring", trinket: "Trinket", mainhand: "Weapon", offhand: "Off-hand" };
  return map[t] || (t.charAt(0).toUpperCase() + t.slice(1));
}

function slotLabel(slotType) {
  const s = SLOTS.find(x => (x.type || x.key) === slotType);
  return s ? s.name : slotType;
}

/* Compares an inventory item against whatever is currently worn. */
function upgradeDelta(item) {
  // an offhand can't be worn while a two-handed weapon is equipped, so it's never
  // an upgrade in that state — don't tempt the player with an arrow they can't use
  if (item.slot === "offhand" && typeof isTwoHanded === "function" && isTwoHanded(S.equipment.mainhand)) return 0;
  const targets = slotsForItem(item);
  let best = Infinity;
  for (const t of targets) best = Math.min(best, itemScore(S.equipment[t]));
  return itemScore(item) - best;
}

function itemRow(item, actions, tipKind) {
  const delta = upgradeDelta(item);
  const up = delta > 0 ? `<span class="upgrade">\u25B2 +${delta}</span>` : "";
  return `<div class="itemrow b-${item.rarity}" data-tip="${tipKind || "inv"}:${item.uid}">
    <div class="main">
      <div class="nm r-${item.rarity}">${item.name} ${up}</div>
      <div class="sub">${slotLabel(item.slot)} \u00B7 item level ${item.ilvl} \u00B7 ${RARITIES[item.rarity].name}</div>
      ${itemStatGrid(item)}
    </div>
    <div class="acts">${actions}</div>
  </div>`;
}

function costText(mats, gold) {
  const parts = [];
  if (gold) {
    const lack = S.gold < gold ? " class='lack'" : "";
    parts.push(`<span${lack}>${fmt(gold)}g</span>`);
  }
  for (const id in mats) {
    const have = S.materials[id] || 0;
    const need = mats[id];
    const lack = have < need ? " class='lack'" : "";
    parts.push(`<span${lack}>${need} ${MATERIALS[id].name}</span>`);
  }
  return parts.join(" \u00B7 ");
}

/* ===========================================================================
   FIRST-VISIT GUIDES
   ---------------------------------------------------------------------------
   The first time a player opens a major section, a short panel explains how it
   works. It appears once, is dismissed with a click, and is remembered in the
   save so it never nags. Tips are general and never push a particular build —
   they explain the system and leave the choices open.
   =========================================================================== */

const GUIDES = {
  realms: {
    title: "Realms",
    body: [
      "Realms are where you grind experience, gold and materials. Each one drops materials of its own tier, and later realms open only when the raid boss guarding the way is dead.",
      "Entering a realm starts a <b>run</b>: your health and mana carry from one fight to the next, and every kill takes you a step deeper, making enemies tougher and their loot better. Dying ends the run and costs the depth; retreating ends it too, but you pick the moment.",
      "There is no penalty for losing beyond ending the run, so pushing one fight further is always yours to gamble.",
    ],
  },
  raids: {
    title: "Raids",
    body: [
      "Raids are fixed encounters against powerful bosses. Unlike realms, you always arrive at full health, and each boss holds the key to deeper content.",
      "Every boss you kill gets permanently a little stronger, so farming one for its drops eventually pushes you to gear up elsewhere. Each boss also guards one piece of that raid's armour set and, rarely, a Unique.",
      "Bosses have a lot of health — bring your best gear and a full stock of potions.",
    ],
  },
  character: {
    title: "Gear",
    body: [
      "Fifteen slots, no class restrictions — wear whatever suits how you want to fight. An item's colour is its rarity; hover any item to read it, and hold <b>Shift</b> while hovering to compare it against what you have on.",
      "Item level roughly tracks power, but the stats matter more: match them to your build. Epic and better items carry a special property, and from item level 40 those can be extracted as <b>aspects</b> and moved between pieces.",
      "Nothing here forces a direction. Strength, Agility and Intellect each anchor a different style, and mixing is fine.",
    ],
  },
  talents: {
    title: "Talents",
    body: [
      "You earn a talent point every level from ten onward. Trees unlock spells at 5, 10, 15, 20 and 25 points spent in them, so going deep into one tree is rewarded — but spreading across two is entirely viable.",
      "Resetting is free and instant, so experiment. Left click adds a point, right click removes one.",
      "Some talents grant a proc that behaves exactly like the ones on gear. There is no single correct build; the trees are there to be mixed.",
    ],
  },
  skills: {
    title: "Skills",
    body: [
      "Spells cast themselves in combat. The list here is the priority order — the first spell that is ready, affordable and whose condition is met goes off — and you can reorder it.",
      "Each spell can be given a <b>condition</b>: only below a health threshold, only in the opening seconds, only against bosses, and so on. By default heals hold until you drop below 90% health.",
      "Spell costs scale with your level, not with your whole mana pool \u2014 so investing in Intellect (or Spirit) raises your pool faster than it raises costs, letting a caster afford more spells as well as hit harder. Every kill also returns some mana, which is how a martial build stays topped up.",
    ],
  },
  descent: {
    title: "The Descent",
    body: [
      "An endless dive, and the true endgame. Everything grows stronger every floor, and there is no bottom — the goal is simply to get as deep as you can.",
      "Every few floors you choose one of three <b>Boons</b> that last the run and stack. They are all pure power, and how you combine them is what makes each descent different. Every tenth floor a Warden — a raid boss scaled to the depth — blocks the way.",
      "Dying ends the descent and costs nothing but the floors. The deeper you reach, the better the gear that drops, including the only items in the game above item level 52.",
    ],
  },
};

function maybeShowGuide(route) {
  if (!GUIDES[route]) return;
  if (!S.settings.seenGuides) S.settings.seenGuides = {};
  if (S.settings.seenGuides[route]) return;
  S.settings.seenGuides[route] = true;
  saveGame();
  const g = GUIDES[route];
  UI.openModal(`
    <div class="modalhead">
      <span class="guidekicker">A quick guide</span>
      <h2>${g.title}</h2>
    </div>
    <div class="guidebody">
      ${g.body.map(p => `<p>${p}</p>`).join("")}
    </div>
    <div class="modalfoot">
      <label class="switch" style="margin-right:auto">
        <input type="checkbox" onchange="UI.toggleGuides(this.checked)"> Don't show these guides
      </label>
      <button class="btn primary" onclick="UI.closeModal()">Got it</button>
    </div>
  `);
}
