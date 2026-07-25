/* ===========================================================================
   CRAFTING PANELS — blacksmith, alchemy, enchanting, materials.
   =========================================================================== */

/* ------------------------------------------------------------ blacksmith */
function renderBlacksmith() {
  const tier = UI.tab.bsTier || 1;
  const slotFilter = UI.tab.bsSlot || "";
  const ct = CRAFT_TIERS[tier];

  const tierTabs = [1, 2, 3, 4, 5].map(t => {
    const locked = S.level < CRAFT_TIERS[t].req;
    return `<button class="tab ${t === tier ? "on" : ""}" onclick="UI.tab.bsTier=${t};UI.render()">
      ${CRAFT_TIERS[t].label}${locked ? " \u2014 lvl " + CRAFT_TIERS[t].req : ""}
    </button>`;
  }).join("");

  const slotTabs = `<button class="tab ${!slotFilter ? "on" : ""}" onclick="UI.tab.bsSlot='';UI.render()">All slots</button>` +
    SLOT_TYPES.map(s =>
      `<button class="tab ${slotFilter === s ? "on" : ""}" onclick="UI.tab.bsSlot='${s}';UI.render()">${slotLabel(s)}</button>`
    ).join("");

  let recipes = BS_RECIPES.filter(r => r.tier === tier);
  if (slotFilter) recipes = recipes.filter(r => r.slot === slotFilter);

  const rows = recipes.map(r => {
    const chk = canCraft(r);
    return `<div class="reciperow">
      <div class="rn">
        <span class="r-rare">${PRIMARY_LABEL[r.primary]} ${slotLabel(r.slot)}</span>
        <div class="cost" style="margin-top:2px">item level ${r.ilvl} \u00B7 Rare \u00B7 ${costText(r.mats, r.gold)}</div>
      </div>
      <button class="btn sm ${chk.ok ? "primary" : ""}" ${chk.ok ? "" : "disabled"}
              onclick="doCraft('${r.id}')">${chk.ok ? "Forge" : chk.msg}</button>
    </div>`;
  }).join("");

  return `<div class="phead">
      <h2>Blacksmith</h2>
      <p>Turns ore, hide and wood into gear. Every piece comes out Rare with rolled stats, so forging
         the same recipe twice can give you a better one. Materials come from the realms and from salvaging.</p>
    </div>

    <div class="panel">
      <div class="tabs">${tierTabs}</div>
      <div class="tabs">${slotTabs}</div>
      ${S.level < ct.req
        ? `<div class="empty">${ct.label} recipes need level ${ct.req}. You are level ${S.level}.</div>`
        : rows}
    </div>

    ${materialsPanel("metal hide wood essence")}`;
}

function doCraft(id) {
  const res = craftBlacksmith(id);
  if (res.ok && res.item) {
    Sound.play(res.item.rarity === "epic" ? "rare" : "craft", 0);
    UI.toast(`Forged <span class="r-${res.item.rarity}">${res.item.name}</span>`, "good");
    UI.render();
  } else UI.say(res);
}

/* --------------------------------------------------------------- alchemy */
function renderAlchemy() {
  const groups = [
    { label: "Health", kind: "heal" },
    { label: "Mana", kind: "mana" },
    { label: "Combat draughts", kind: "buff" },
  ];

  const blocks = groups.map(g => {
    const rows = POTIONS.filter(p => p.kind === g.kind).map(p => {
      const have = S.potions[p.id] || 0;
      const okLevel = S.level >= p.req;
      const what = p.kind === "buff"
        ? Object.keys(p.mods).map(k => statLine(k, p.mods[k])).join(", ") + ` for ${p.duration}s`
        : `restores ${p.pct}% ${p.kind === "heal" ? "health" : "mana"}`;
      const canOne = okLevel && S.gold >= p.gold && hasMaterials(p.mats);
      const canFive = okLevel && S.gold >= p.gold * 5 &&
        Object.keys(p.mats).every(id => (S.materials[id] || 0) >= p.mats[id] * 5);

      return `<div class="reciperow">
        <div class="rn">
          ${p.name} <span style="color:var(--brass-hi);font-family:var(--mono);font-size:11px">\u00D7${have}</span>
          <div class="cost" style="margin-top:2px">${what} \u00B7 ${costText(p.mats, p.gold)}</div>
        </div>
        ${okLevel
          ? `<button class="btn sm ${canOne ? "primary" : ""}" ${canOne ? "" : "disabled"} onclick="doBrew('${p.id}',1)">Brew</button>
             <button class="btn sm" ${canFive ? "" : "disabled"} onclick="doBrew('${p.id}',5)">\u00D75</button>`
          : `<span class="tag red">level ${p.req}</span>`}
      </div>`;
    }).join("");
    return `<div class="panel"><h3>${g.label}</h3>${rows}</div>`;
  }).join("");

  return `<div class="phead">
      <h2>Alchemy</h2>
      <p>Herbs into potions. Health potions drink themselves when you drop below the threshold set in
         Combat settings; draughts fire at the opening of every fight. Both are configured on the Realms panel.</p>
    </div>
    ${blocks}
    ${materialsPanel("herb essence")}`;
}

function doBrew(id, n) { UI.say(brewPotion(id, n)); }

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
    return `<button class="btn sm ${on ? "primary" : ""}" onclick="UI.tab.aspectSlot='${t}';UI.render()">
      ${slotTypeLabel(t)}${count ? ` <span class="aspcount">${count}</span>` : ""}</button>`;
  }).join("");

  const aspectCards = pool.length ? pool.map((a, i) => `
    <div class="aspectcard">
      <div class="aspname">${a.name}</div>
      <div class="asptext">${aspectLabel(a)}</div>
      <div class="aspslot">fits any ${slotTypeLabel(slotType).toLowerCase()}</div>
    </div>`).join("") : `<div class="empty" style="padding:20px">
      No ${slotTypeLabel(slotType).toLowerCase()} aspects yet. Salvage a ${slotTypeLabel(slotType).toLowerCase()}
      that carries a special property to draw one out.</div>`;

  const targetRows = targets.length ? targets.map(({ item, worn }) => {
    const has = item.aspect;
    return `<div class="itemrow b-${item.rarity}" data-tip="${worn ? "eq:" + slotKeyOf(item) : "inv:" + item.uid}">
      <div class="main">
        <div class="nm r-${item.rarity}">${item.name}${worn ? ` <span class="worntag">worn</span>` : ""}</div>
        <div class="sub">item level ${item.ilvl} · ${has ? "carries the " + item.aspect.name + " aspect"
          : item.proc ? "has its own property" : "no special property"}</div>
      </div>
      <div class="acts">
        ${pool.length ? `<button class="btn sm primary" onclick="doApplyAspect('${item.uid}', ${0})">Etch ${pool[0].name}</button>` : ""}
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
        you need better gear. The merchant also lays one out now and then.</p>
    </div>
    <div class="grid g2">${cards}</div>`;
}
