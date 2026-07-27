/* ===========================================================================
   CRAFTING PANELS — blacksmith, alchemy, enchanting, materials.
   =========================================================================== */

/* ------------------------------------------------------------ the forge */
/* Approximate stat ranges for the preview. generateItem rolls magnitudes inside
   these bands, so we show ranges, not fixed numbers. */
function forgePreviewLines(tier, slot, primary, secondary, quality) {
  const ilvl = CRAFT_TIERS[tier].ilvl;
  const rarity = quality === "epic" ? "epic" : "rare";
  const R = RARITIES[rarity];
  const budget = itemBudget(ilvl) * R.budget;
  const rng = (lo, hi, dec) => {
    // percentage secondaries (crit, haste, lifesteal…) are small decimals; fmt()
    // rounds to a whole number and would collapse them to "0", so format directly
    if (dec) {
      const d = x => (Math.round(x * 10) / 10).toFixed(1);
      return `${d(lo)}\u2013${d(hi)}`;
    }
    return `${fmt(lo)}\u2013${fmt(hi)}`;
  };
  const lines = [];
  lines.push({ k: PRIMARY_LABEL[primary], v: rng(budget * 0.40, budget * 0.52) });
  lines.push({ k: "Stamina", v: rng(budget * 0.20, budget * 0.30) });
  if (ARMOR_SLOTS.includes(slot)) {
    const armor = Math.round(armorBase(ilvl) * (ARMOR_SLOT_WEIGHT[slot] || 0.5) * (ARMOR_CLASS_MULT[primary] || 1) * (0.9 + R.budget * 0.25));
    lines.push({ k: "Armor", v: fmt(armor) });
  }
  if (slot === "mainhand") {
    const dps = weaponDps(ilvl) * R.budget;
    lines.push({ k: "Weapon damage/sec", v: "~" + fmt(Math.round(dps)) });
  }
  // the chosen secondary is guaranteed; its size is roughly a third of the
  // secondary budget
  if (secondary && secondary !== "any") {
    const sec = SECONDARY_POOL.find(s => s.key === secondary);
    if (sec) {
      const dec = !(sec.key === "critDmg" || sec.key === "thorns");
      lines.push({ k: sec.label, v: rng((budget * 0.20 / 3) / sec.cost, (budget * 0.30 / 3) / sec.cost, dec) + "%", focus: true });
    }
  }
  return lines;
}

function renderBlacksmith() {
  const tier = UI.tab.bsTier || 1;
  const slot = UI.tab.bsSlot || "helm";
  const primary = UI.tab.bsPrimary || "str";
  const secondary = UI.tab.bsSecondary || "any";
  const quality = UI.tab.bsQuality || "rare";
  const ct = CRAFT_TIERS[tier];

  const chip = (on, label, onclick, extra) =>
    `<button class="chip ${on ? "on" : ""} ${extra || ""}" onclick="${onclick}">${label}</button>`;

  const tierTabs = [1, 2, 3, 4, 5, 6].map(t => {
    const locked = S.level < CRAFT_TIERS[t].req;
    return `<button class="tab ${t === tier ? "on" : ""}" onclick="UI.tab.bsTier=${t};UI.render()">
      ${CRAFT_TIERS[t].label}${locked ? " \u00B7 lvl " + CRAFT_TIERS[t].req : ""}</button>`;
  }).join("");

  const slotChips = SLOT_TYPES.map(s =>
    chip(slot === s, slotLabel(s), `UI.tab.bsSlot='${s}';UI.render()`)).join("");

  const primaryChips = BS_PRIMARIES.map(p =>
    chip(primary === p, PRIMARY_LABEL[p], `UI.tab.bsPrimary='${p}';UI.render()`)).join("");

  const focusChips = chip(secondary === "any", "Any", `UI.tab.bsSecondary='any';UI.render()`) +
    SECONDARY_POOL.map(s =>
      chip(secondary === s.key, s.label, `UI.tab.bsSecondary='${s.key}';UI.render()`)).join("");

  const qualityChips =
    chip(quality === "rare", "Rare", `UI.tab.bsQuality='rare';UI.render()`, "q-rare") +
    chip(quality === "epic", "Epic", `UI.tab.bsQuality='epic';UI.render()`, "q-epic");

  const rarity = quality === "epic" ? "epic" : "rare";
  const cost = forgeCost(tier, slot, primary, quality);
  const chk = canForge(tier, slot, primary, quality);
  const lines = forgePreviewLines(tier, slot, primary, secondary, quality);
  const statHtml = lines.map(l =>
    `<div class="fp-stat ${l.focus ? "focus" : ""}"><span class="fp-v">${l.v}</span><span class="fp-k">${l.k}</span></div>`).join("");

  const otherCount = (RARITIES[rarity].stats >= 3 ? 3 : RARITIES[rarity].stats) - (secondary !== "any" ? 1 : 0);
  const secNote = secondary !== "any"
    ? `Guaranteed above, plus ${otherCount} more secondary ${otherCount === 1 ? "stat" : "stats"} rolled at random.`
    : `${Math.min(RARITIES[rarity].stats, 3)} secondary stats rolled at random.`;

  const preview = `<div class="forge-preview">
    <div class="fp-card b-${rarity} r-border-${rarity}">
      <div class="fp-name r-${rarity}">${PRIMARY_LABEL[primary]} ${slotLabel(slot)}</div>
      <div class="fp-sub">item level ${ct.ilvl} \u00B7 ${RARITIES[rarity].name}</div>
      <div class="fp-stats">${statHtml}</div>
      <div class="fp-note">${secNote} Magnitudes roll, so forging again can give a better one.</div>
    </div>
    <div class="fp-cost">${cost ? costText(cost.mats, cost.gold) : ""}</div>
    <button class="btn lg ${chk.ok ? "primary" : ""}" ${chk.ok ? "" : "disabled"} onclick="doForge()">
      ${chk.ok ? "Forge " + RARITIES[rarity].name : chk.msg}</button>
  </div>`;

  return `<div class="phead">
      <h2>The Forge</h2>
      <p>Compose a piece: pick its slot, its primary stat, one secondary you want guaranteed, and a quality.
         Rare is the baseline; Epic costs more but rolls a bigger budget. Stat sizes still roll, so forging the
         same piece again can give a better one \u2014 you choose the shape, luck decides the size.</p>
    </div>

    <div class="panel">
      <div class="tabs">${tierTabs}</div>
      ${S.level < ct.req
        ? `<div class="empty">${ct.label} needs level ${ct.req}. You are level ${S.level}.</div>`
        : `<div class="forge-grid">
            <div class="forge-compose">
              <div class="forge-field"><label>Slot</label><div class="chiprow">${slotChips}</div></div>
              <div class="forge-field"><label>Primary stat</label><div class="chiprow">${primaryChips}</div></div>
              <div class="forge-field"><label>Focus \u2014 guaranteed secondary</label><div class="chiprow">${focusChips}</div></div>
              <div class="forge-field"><label>Quality</label><div class="chiprow">${qualityChips}</div></div>
            </div>
            ${preview}
          </div>`}
    </div>

    ${renderSmithWorkshops()}

    ${materialsPanel("metal hide wood essence")}`;
}

function doForge() {
  const res = craftForge(UI.tab.bsTier || 1, UI.tab.bsSlot || "helm",
                         UI.tab.bsPrimary || "str", UI.tab.bsSecondary || "any",
                         UI.tab.bsQuality || "rare");
  if (res.ok && res.item) {
    Sound.play(res.item.rarity === "epic" ? "rare" : "craft", 0);
    UI.toast(`Forged <span class="r-${res.item.rarity}">${res.item.name}</span>`, "good");
    UI.render();
  } else UI.say(res);
}


/* ------------------------------------------------- tempering & socketing */
/* Both workshops act on one chosen item, so they share a picker. Uniques are
   left out of it: they cannot be tempered or socketed. */
function smithTargets() {
  const out = [];
  for (const sl of SLOTS) {
    const it = S.equipment[sl.key];
    if (it && !it.uniqueId) out.push({ item: it, worn: true });
  }
  for (const it of S.inventory) if (!it.uniqueId) out.push({ item: it, worn: false });
  return out;
}

function smithChosen() {
  const targets = smithTargets();
  const want = UI.tab.smithUid;
  return targets.find(t => t.item.uid === want) || targets[0] || null;
}

function socketStrip(item) {
  const sockets = socketsOn(item);
  if (!sockets.length) return `<span class="socket empty">no sockets</span>`;
  return sockets.map((key, i) => {
    const g = key ? gemById(key) : null;
    return g
      ? `<span class="socket"><i class="socketdot" style="background:${g.colour}"></i>${g.name}
           <button class="btn sm" onclick="doClearSocket('${item.uid}',${i})">prise out</button></span>`
      : `<span class="socket empty"><i class="socketdot" style="background:var(--edge-hi)"></i>empty</span>`;
  }).join("");
}

function renderSmithWorkshops() {
  const chosen = smithChosen();
  const targets = smithTargets();

  const picker = `<select onchange="UI.tab.smithUid=this.value;UI.render()">
    ${targets.map(t => `<option value="${t.item.uid}" ${chosen && t.item.uid === chosen.item.uid ? "selected" : ""}>
      ${t.item.name}${t.worn ? " (worn)" : ""} \u2014 ilvl ${t.item.ilvl}</option>`).join("")}
  </select>`;

  if (!chosen) {
    return `<div class="panel"><h3>Tempering and socketing</h3>
      <div class="empty" style="padding:20px">Nothing to work on. Uniques cannot be tempered or socketed.</div></div>`;
  }

  const item = chosen.item;
  const steps = temperSteps(item);
  const tCost = temperCost(item);
  const tCheck = canTemper(item.uid);
  const sCost = socketCost(item);
  const sCheck = canAddSocket(item.uid);
  const maxSock = maxSocketsFor(item);

  // gems owned, for filling a socket
  const owned = Object.keys(S.gems || {}).filter(k => S.gems[k] > 0);
  const emptyIdx = socketsOn(item).indexOf(null);
  const gemButtons = owned.length && emptyIdx >= 0
    ? owned.map(k => {
        const g = gemById(k);
        if (!g) return "";
        return `<button class="btn sm" onclick="doSetGem('${item.uid}',${emptyIdx},'${k}')">
          ${g.name} <span class="gemcount">\u00D7${S.gems[k]}</span></button>`;
      }).join("")
    : "";

  return `<div class="panel">
    <h3>Tempering</h3>
    <p>Raise a piece by ${TEMPER_STEP} item levels and rescale its stats to match. Up to
       ${TEMPER_MAX_STEPS} times per item, never past item level ${TEMPER_ILVL_CAP}. Uniques cannot be tempered.</p>
    <div class="invhead">${picker}</div>
    <div class="reciperow">
      <div class="rn"><span class="r-${item.rarity}">${item.name}</span>
        <div class="cost" style="margin-top:2px">
          item level ${item.ilvl} \u2192 ${item.ilvl + TEMPER_STEP} \u00B7 tempered ${steps}/${TEMPER_MAX_STEPS}
          \u00B7 ${costText(tCost.mats, tCost.gold)}</div>
      </div>
      <button class="btn sm ${tCheck.ok ? "primary" : ""}" ${tCheck.ok ? "" : "disabled"}
        onclick="doTemper('${item.uid}')">Temper</button>
    </div>
    ${tCheck.ok ? "" : `<div class="meta" style="color:var(--dim);margin-top:4px">${tCheck.msg}</div>`}
  </div>

  <div class="panel">
    <h3>Socketing</h3>
    <p>Cut a socket and set a gem in it. ${RARITIES[item.rarity].name} items hold up to ${maxSock}.
       Prising a gem out breaks it, so choose deliberately.</p>
    <div class="reciperow">
      <div class="rn"><span class="r-${item.rarity}">${item.name}</span>
        <div class="cost" style="margin-top:2px">
          ${socketsOn(item).length} of ${maxSock} sockets \u00B7 ${costText(sCost.mats, sCost.gold)}</div>
        <div class="socketrow">${socketStrip(item)}</div>
      </div>
      <button class="btn sm ${sCheck.ok ? "primary" : ""}" ${sCheck.ok ? "" : "disabled"}
        onclick="doAddSocket('${item.uid}')">Cut socket</button>
    </div>
    ${sCheck.ok ? "" : `<div class="meta" style="color:var(--dim);margin-top:4px">${sCheck.msg}</div>`}
    ${gemButtons ? `<div style="margin-top:10px">
      <div class="meta" style="margin-bottom:4px">Set a gem into the next empty socket</div>
      <div class="chiprow">${gemButtons}</div></div>` : ""}
  </div>

  <div class="panel">
    <h3>Gems held</h3>
    <p>Stones fall from raid bosses and Wardens. Jewelworking will one day cut them from rough gems;
       for now, what drops is what you have.</p>
    ${owned.length ? `<div class="gemgrid">${owned.map(k => {
      const g = gemById(k);
      if (!g) return "";
      const what = g.effect
        ? `${g.effect.chance}% chance of ${effectName ? effectName(g.effect) : g.stat}`
        : Object.keys(g.mods).map(x => statLine(x, g.mods[x])).join(", ");
      return `<div class="gemcard" style="border-left-color:${g.colour}">
        <div class="gn">${g.name} <span class="gemcount">\u00D7${S.gems[k]}</span></div>
        <div class="gd">${what}</div></div>`;
    }).join("")}</div>` : `<div class="empty" style="padding:18px">No gems yet. Raid bosses drop them.</div>`}
  </div>`;
}

function doTemper(uid) { Sound.play("craft", 0); UI.say(temperItem(uid)); }
function doAddSocket(uid) { Sound.play("craft", 0); UI.say(addSocket(uid)); }
function doSetGem(uid, i, key) { Sound.play("craft", 0); UI.say(setGem(uid, i, key)); }
function doClearSocket(uid, i) { UI.say(clearSocket(uid, i)); }

/* --------------------------------------------------------------- alchemy */
function renderAlchemy() {
  const groups = [
    { label: "Health", kind: "heal" },
    { label: "Mana", kind: "mana" },
    { label: "Combat draughts", kind: "buff" },
    { label: "Combat elixirs \u2014 stronger, at a price", kind: "elixir" },
    { label: "Flasks \u2014 last the whole run", kind: "flask" },
  ];

  const blocks = groups.map(g => {
    const rows = POTIONS.filter(p => p.kind === g.kind).map(p => {
      const have = S.potions[p.id] || 0;
      const okLevel = S.level >= p.req;
      const modText = p.mods ? Object.keys(p.mods).map(k => statLine(k, p.mods[k])).join(", ") : "";
      const what = (p.kind === "buff" || p.kind === "elixir")
        ? modText + ` for ${p.duration}s`
        : p.kind === "flask"
          ? modText + " until you fall or withdraw"
          : `restores ${p.pct}% ${p.kind === "heal" ? "health" : "mana"}`;
      const canOne = okLevel && S.gold >= p.gold && hasMaterials(p.mats);
      const canFive = okLevel && S.gold >= p.gold * 5 &&
        Object.keys(p.mats).every(id => (S.materials[id] || 0) >= p.mats[id] * 5);

      return `<div class="reciperow">
        <div class="rn">
          ${p.name} <span style="color:var(--brass-hi);font-family:var(--mono);font-size:11px">\u00D7${have}</span>
          <div class="cost" style="margin-top:2px">${what} \u00B7 ${costText(p.mats, p.gold)}</div>
          ${p.note ? `<div class="potnote">${p.note}</div>` : ""}
        </div>
        ${okLevel
          ? `${p.kind === "flask" && have > 0
               ? `<button class="btn sm" onclick="doDrinkFlask('${p.id}')">Drink</button>` : ""}
             <button class="btn sm ${canOne ? "primary" : ""}" ${canOne ? "" : "disabled"} onclick="doBrew('${p.id}',1)">Brew</button>
             <button class="btn sm" ${canFive ? "" : "disabled"} onclick="doBrew('${p.id}',5)">\u00D75</button>`
          : `<span class="tag red">level ${p.req}</span>`}
      </div>`;
    }).join("");
    return `<div class="panel"><h3>${g.label}</h3>${rows}</div>`;
  }).join("");

  const flaskNow = S.flask
    ? `<div class="panel"><h3>Holding</h3>
        <div class="reciperow"><div class="rn">${S.flask.name}
          <div class="cost" style="margin-top:2px">${Object.keys(S.flask.mods).map(k => statLine(k, S.flask.mods[k])).join(", ")}
            \u00B7 lasts until you fall or withdraw</div></div></div></div>`
    : "";

  return `<div class="phead">
      <h2>Alchemy</h2>
      <p>Herbs into potions. Health potions drink themselves when you drop below the threshold set in
         Combat settings; draughts and elixirs fire at the opening of every fight, and are chosen on the
         Realms panel. A flask is drunk here and holds for a whole run.</p>
    </div>
    ${flaskNow}
    ${blocks}
    ${materialsPanel("herb essence")}`;
}

function doBrew(id, n) { UI.say(brewPotion(id, n)); }
function doDrinkFlask(id) { Sound.play("potion", 0); UI.say(drinkFlask(id)); }

/* ------------------------------------------------------------ enchanting */
function renderEnchanting() {
  const slots = SLOTS;
  const selected = UI.tab.aspectSlot || "helm";
  const slotType = SLOTS.find(s => s.key === selected) ? (SLOTS.find(s => s.key === selected).type || selected) : selected;

  // aspects filed under the selected slot type
  const pool = S.aspects[slotType] || [];

  // items you could stamp onto, in the selected slot
  const targets = itemsForSlot(slotType);

  const slotButtons = SLOT_TYPES.map(t => {
    const count = (S.aspects[t] || []).length;
    const on = slotType === t;
    return `<button class="btn sm ${on ? "primary" : ""}" onclick="UI.tab.aspectSlot='${t}';UI.tab.aspectPick=0;UI.render()">
      ${slotTypeLabel(t)}${count ? ` <span class="aspcount">${count}</span>` : ""}</button>`;
  }).join("");

  // which aspect in the pool is selected to etch (clamped to the pool)
  let pick = UI.tab.aspectPick || 0;
  if (pick >= pool.length) pick = 0;

  const aspectCards = pool.length ? pool.map((a, i) => `
    <div class="aspectcard ${i === pick ? "sel" : ""}" onclick="UI.tab.aspectPick=${i};UI.render()">
      <div class="aspname">${a.name}${i === pick ? ` <span class="aspchosen">chosen</span>` : ""}</div>
      <div class="asptext">${aspectLabel(a)}</div>
      <div class="aspslot">fits any ${slotTypeLabel(slotType).toLowerCase()}</div>
    </div>`).join("") : `<div class="empty" style="padding:20px">
      No ${slotTypeLabel(slotType).toLowerCase()} aspects yet. Salvage a ${slotTypeLabel(slotType).toLowerCase()}
      that carries a special property to draw one out.</div>`;

  const targetRows = targets.length ? targets.map(({ item, worn }) => {
    const has = item.aspect;
    return `<div class="itemrow b-${item.rarity}" data-tip="${worn ? "eq:" + slotKeyOf(item) : "inv:" + item.uid}">
      <div class="main">
        <div class="nm r-${item.rarity}">${item.name}${worn ? ` <span class="worntag">worn</span>` : ""}${has ? ` <span class="hasaspect">${item.aspect.name}</span>` : ""}</div>
        <div class="sub">item level ${item.ilvl} \u00B7 ${has ? "carries the " + item.aspect.name + " aspect"
          : item.proc ? "has its own property" : "no special property"}</div>
      </div>
      <div class="acts">
        ${pool.length ? `<button class="btn sm primary" onclick="doApplyAspect('${item.uid}', ${pick})">Etch ${pool[pick].name}</button>` : ""}
        ${has ? `<button class="btn sm" onclick="doRemoveAspect('${item.uid}')">Remove</button>` : ""}
      </div>
    </div>`;
  }).join("") : `<div class="empty" style="padding:16px">Nothing in this slot to etch.</div>`;

  return `<div class="phead">
      <h2>Aspects</h2>
      <p>Salvaging an item that carries a special property draws that property out as an <b>aspect</b>. An
         aspect can then be etched onto another item &mdash; but only one of the <b>same slot</b>, so a helm aspect
         only ever goes on a helm. This keeps a single strong effect from being stamped across every piece.</p>
      <p style="color:var(--dim);font-size:calc(12.5px * var(--fs))">
        Etching an aspect <b>replaces</b> whatever property the item already had. It is a way to shape a build,
        not to pile effects on top of one another. Special properties, and the aspects drawn from them, appear
        on gear from item level ${typeof ASPECT_MIN_ILVL !== "undefined" ? 40 : 40}.</p>
    </div>

    <div class="panel">
      <h3>Slot</h3>
      <div class="ctrlbar" style="flex-wrap:wrap;gap:6px">${slotButtons}</div>
    </div>

    <div class="grid g2">
      <div class="panel">
        <h3>${slotTypeLabel(slotType)} aspects &mdash; ${pool.length} held</h3>
        ${aspectCards}
      </div>
      <div class="panel">
        <h3>Etch onto a ${slotTypeLabel(slotType).toLowerCase()}</h3>
        <div class="itemlist">${targetRows}</div>
      </div>
    </div>`;
}

function slotKeyOf(item) {
  for (const s of SLOTS) if (S.equipment[s.key] === item) return s.key;
  return item.slot;
}

function doApplyAspect(uid, idx) {
  const res = applyAspect(uid, idx);
  if (res.ok) Sound.play("craft", 0);
  UI.say(res);
}
function doRemoveAspect(uid) {
  const res = removeAspect(uid);
  if (res.ok) Sound.play("salvage", 0);
  UI.say(res);
}

function doEnchant(slot, id) { UI.say(applyEnchant(slot, id)); }
function doRemoveEnchant(slot) { UI.say(removeEnchant(slot)); }

/* ------------------------------------------------------------- materials */
function materialsPanel(classes) {
  const want = classes ? classes.split(" ") : null;
  const ids = Object.keys(MATERIALS).filter(id => !want || want.includes(MATERIALS[id].cls));
  const rows = ids.map(id => {
    const m = MATERIALS[id];
    const n = S.materials[id] || 0;
    return `<div class="mat ${n ? "" : "zero"}">
      <span>${m.name}</span><b>${fmt(n)}</b>
    </div>`;
  }).join("");
  return `<div class="panel"><h3>Materials on hand</h3><div class="matgrid">${rows}</div></div>`;
}

function renderMaterials() {
  const byTier = [1, 2, 3, 4, 5].map(t => {
    const ids = Object.keys(MATERIALS).filter(id => MATERIALS[id].tier === t);
    const rows = ids.map(id => {
      const m = MATERIALS[id];
      const n = S.materials[id] || 0;
      return `<div class="mat ${n ? "" : "zero"}"><span>${m.name}</span><b>${fmt(n)}</b></div>`;
    }).join("");

    const realms = REALMS.filter(r => r.tier === t).map(r => r.name).join(", ");
    return `<div class="panel">
      <h3>${MAT_TIER_NAMES[t]}</h3>
      <p style="color:var(--dim);font-size:11.5px;margin:-6px 0 10px;font-family:var(--mono)">
        drops in ${realms}</p>
      <div class="matgrid">${rows}</div>
    </div>`;
  }).join("");

  const dust = S.materials.m_dust || 0;

  return `<div class="phead">
      <h2>Materials</h2>
      <p>Every realm drops the materials of its own tier. Higher realms, better gear.</p>
    </div>
    <div class="panel">
      <h3>Universal</h3>
      <div class="matgrid">
        <div class="mat ${dust ? "" : "zero"}"><span>Arcane Dust</span><b>${fmt(dust)}</b></div>
      </div>
      <p style="color:var(--dim);font-size:11.5px;margin:10px 0 0;font-family:var(--mono)">
        only from salvaging gear \u00B7 spent on enchanting</p>
    </div>
    ${byTier}`;
}

/* -------------------------------------------------------------- settings -- */
function renderSettings() {
  const v = Math.round((S.settings.volume || 0) * 100);
  return `<div class="phead">
      <h2>Settings</h2>
      <p>Sound is synthesised in the browser rather than loaded from files, which is what keeps
         the whole game a single folder with nothing to download.</p>
    </div>

    <div class="panel">
      <h3>Sound</h3>
      <div class="ctrlbar">
        <label class="switch">
          <input type="checkbox" ${S.settings.sound ? "checked" : ""} onchange="Sound.setEnabled(this.checked); UI.render()">
          Sound effects
        </label>
        <input type="range" min="0" max="100" step="5" value="${v}"
               style="width:180px" oninput="Sound.setVolume(this.value/100)">
        <span style="font-family:var(--mono);color:var(--ash);font-size:12px">${v}%</span>
        <button class="btn sm" onclick="Sound.play('levelup', 0)">Test</button>
      </div>
      <div class="matgrid" style="margin-top:12px">
        ${["click", "hit", "crit", "spell", "proc", "potion", "loot", "rare", "victory", "defeat", "craft", "coin"]
          .map(n => `<div class="mat" style="cursor:pointer" onclick="Sound.play('${n}',0)">
            <span>${n}</span><b>\u25B6</b></div>`).join("")}
      </div>
    </div>

    <div class="panel">
      <h3>Text size</h3>
      <div class="ctrlbar">
        ${[["0.85", "Small"], ["1", "Normal"], ["1.15", "Large"], ["1.3", "Larger"], ["1.5", "Largest"]].map(([v, label]) => {
          const on = Math.abs((S.settings.textScale || 1) - parseFloat(v)) < 0.02;
          return `<button class="btn sm ${on ? "primary" : ""}" onclick="Theme.setTextScale(${v}); UI.render()">${label}</button>`;
        }).join("")}
        <span style="flex:1"></span>
        <input type="range" min="0.8" max="1.6" step="0.05" value="${S.settings.textScale || 1}"
               style="width:200px" oninput="Theme.setTextScale(this.value); document.getElementById('fsnum').textContent=Math.round(this.value*100)+'%'">
        <span id="fsnum" style="font-family:var(--mono);color:var(--ash);font-size:12px">${Math.round((S.settings.textScale || 1) * 100)}%</span>
      </div>
      <p style="color:var(--dim);font-size:12px;margin:10px 0 0">
        Only text scales. Spacing and panel sizes stay where they are, so nothing reflows.</p>
    </div>

    <div class="panel">
      <h3>Appearance</h3>
      <div class="themegrid">
        ${Object.keys(THEMES).map(id => {
          const t = THEMES[id];
          const on = (S.settings.theme || "grimoire") === id;
          return `<div class="themecard ${on ? "on" : ""}" onclick="Theme.set('${id}'); UI.render()">
            <h4>${t.name}</h4>
            <div class="tb">${t.blurb}</div>
            <div class="swatches">
              ${["--void", "--pitch", "--edge", "--brass", "--bone"].map(k =>
                `<i style="background:${t.vars[k]}"></i>`).join("")}
            </div>
          </div>`;
        }).join("")}
        <div class="themecard ${S.settings.theme === "custom" ? "on" : ""}" onclick="Theme.set('custom'); UI.render()">
          <h4>Custom</h4>
          <div class="tb">Pick four colours below and the rest is worked out from them.</div>
          <div class="swatches">
            ${["bg", "panel", "accent", "text"].map(k =>
              `<i style="background:${(S.settings.customTheme || DEFAULT_CUSTOM)[k]}"></i>`).join("")}
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>Custom palette</h3>
      <p style="color:var(--ash);font-size:12.5px;margin:-4px 0 10px">
        Four anchors are enough. Panels, borders and muted text are derived from them, which is
        what keeps a hand-picked palette readable instead of a mess of unrelated colours.</p>
      ${[["bg", "Background"], ["panel", "Panels"], ["accent", "Accent and headings"], ["text", "Text"],
         ["blood", "Damage taken"], ["witch", "Spells"], ["verdant", "Healing"]].map(([k, label]) =>
        `<div class="colorrow">
          <label>${label}</label>
          <input type="color" value="${(S.settings.customTheme || DEFAULT_CUSTOM)[k]}"
                 oninput="Theme.setCustom('${k}', this.value)">
        </div>`).join("")}
      <div class="ctrlbar" style="margin-top:10px">
        <button class="btn sm" onclick="Theme.set('custom'); UI.render()">Use custom palette</button>
        <button class="btn sm" onclick="S.settings.customTheme=Object.assign({},DEFAULT_CUSTOM);saveGame();Theme.apply('custom');UI.render()">Reset</button>
      </div>
    </div>

    <div class="panel">
      <h3>Save file</h3>
      <div class="ctrlbar">
        <button class="btn" onclick="UI.openSave()">Export or import a save</button>
        <button class="btn danger" onclick="UI.confirmWipe()">Start a new character</button>
      </div>
      <p style="color:var(--dim);font-size:12px;margin:10px 0 0">
        ${STORAGE_OK
          ? "Progress saves automatically after every fight and every twenty seconds."
          : "This browser is blocking local storage, so export a save if you want to keep this character."}
      </p>
    </div>`;
}

/* --------------------------------------------------------------- uniques -- */
/* A reference page. It lists what exists and where it comes from, because a
   passive that changes a combat rule is only interesting if you know it is
   there to chase. Nothing here is a spoiler you could not read off a tooltip. */
function renderUniques() {
  const owned = new Set();
  for (const slot of SLOTS) {
    const it = S.equipment[slot.key];
    if (it && it.uniqueId) owned.add(it.uniqueId);
  }
  for (const it of S.inventory) if (it.uniqueId) owned.add(it.uniqueId);

  const cards = UNIQUES.map(u => {
    const has = owned.has(u.id);
    const boss = bossById(u.boss);
    const dead = boss ? (S.bossKills[boss.id] || 0) : 0;
    return `<div class="uniquecard ${has ? "owned" : ""}">
      <h4 class="r-unique">${u.name}</h4>
      <div class="src">${slotLabel(u.slot)} \u00B7 item level ${u.ilvl} \u00B7
        ${boss ? `${boss.name} \u00B7 ${(u.chance * 100).toFixed(1)}%` : "unknown source"}</div>
      <div class="pname">${u.passive.name}</div>
      <div class="ptext">${u.passive.text}</div>
      <div class="flav">${u.flavour}</div>
      <div style="margin-top:9px">
        ${has ? `<span class="have">in your possession</span>`
              : `<span class="tag">${dead ? `${boss.name} slain ${dead}\u00D7` : "boss not yet defeated"}</span>`}
      </div>
    </div>`;
  }).join("");

  return `<div class="phead">
      <h2>Uniques</h2>
      <p>Above Legendary, and not measured in numbers. Each of these carries a passive that changes
         how a fight works rather than how large it is, and several of them cost you something in
         return. ${owned.size} of ${UNIQUES.length} found.</p>
    </div>
    <div class="panel">
      <p style="color:var(--ash);font-size:12.5px;margin:0 0 4px">
        Each is guarded by one raid boss. Bosses grow stronger every time you kill them, so a low
        drop rate and a hardening boss are the same problem &mdash; you get a few dozen attempts before
        you need better gear.</p>
    </div>
    <div class="grid g2">${cards}</div>`;
}
