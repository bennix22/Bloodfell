/* ===========================================================================
   CHARACTER PANELS — the paperdoll, the stat sheet, and the inventory.
   =========================================================================== */

/* ------------------------------------------------------------- character */
function renderCharacter() {
  const st = computeStats();

  const row = (label, value, hi, help) =>
    `<div class="statrow ${hi ? "hi" : ""}"${help ? ` data-tip="stat:${help}"` : ""}>
       <span class="${help ? statClass(help) : ""}">${label}</span>
       <b class="${help ? statClass(help) : ""}">${value}</b></div>`;

  const offence = [
    row("Strength", fmt(st.str), false, "str"),
    row("Agility", fmt(st.agi), false, "agi"),
    row("Intellect", fmt(st.int), false, "int"),
    row("Spirit", fmt(st.spi), false, "spi"),
    row("Stamina", fmt(st.sta), false, "sta"),
    row("Weapon damage", `${fmt(st.swingMin)} \u2013 ${fmt(st.swingMax)}`, false, "swing"),
    row("Swing time", `${st.swingTime.toFixed(2)}s`, false, "swingTime"),
    row("Damage per second", fmt(st.dps), true, "dps"),
    row("Critical strike", `${st.crit.toFixed(1)}%`, false, "crit"),
    row("Critical damage", `${Math.round(st.critMult * 100)}%`, false, "critMult"),
    row("Haste", `${st.haste.toFixed(1)}%`, false, "haste"),
  ].join("");

  const defence = [
    row("Health", fmt(st.maxHp), true, "maxHp"),
    row("Mana", fmt(st.maxMana), false, "maxMana"),
    row("Mana regeneration", `${st.manaRegen.toFixed(1)}/s`, false, "manaRegen"),
    row("Armor", fmt(st.armor), false, "armor"),
    row("Physical mitigation", `${(armorReduction(st.armor, S.level) * 100).toFixed(1)}%`, false, "armorMit"),
    row("Damage reduction", `${st.dr.toFixed(1)}%`, false, "dr"),
    row("Dodge", `${st.dodge.toFixed(1)}%`, false, "dodge"),
    row("Block", `${st.block.toFixed(1)}%`, false, "block"),
    row("Lifesteal", `${st.lifesteal.toFixed(1)}%`, false, "lifesteal"),
    row("Thorns", `${st.thorns.toFixed(1)}%`, false, "thorns"),
  ].join("");

  const bonus = [];
  if (st.physDmg) bonus.push(row("Physical damage", `+${st.physDmg.toFixed(1)}%`, false, "physDmg"));
  if (st.magicDmg) bonus.push(row("Magic damage", `+${st.magicDmg.toFixed(1)}%`, false, "magicDmg"));
  if (st.allDmg) bonus.push(row("All damage", `+${st.allDmg.toFixed(1)}%`, false, "allDmg"));
  if (st.healPct) bonus.push(row("Healing done", `+${st.healPct.toFixed(1)}%`, false, "healPct"));
  if (st.execDmg) bonus.push(row("Execute damage", `+${st.execDmg.toFixed(1)}%`, false, "execDmg"));
  if (st.cdr) bonus.push(row("Cooldown reduction", `${st.cdr.toFixed(1)}%`, false, "cdr"));
  if (st.goldFind) bonus.push(row("Gold found", `+${st.goldFind.toFixed(1)}%`, false, "goldFind"));
  if (st.magicFind) bonus.push(row("Magic find", `+${st.magicFind.toFixed(1)}%`, false, "magicFind"));
  if (st.mods.lowHpDmg) bonus.push(row("Damage while cornered", `+${st.mods.lowHpDmg.toFixed(1)}%`));
  if (st.mods.highHpDmg) bonus.push(row("Damage while healthy", `+${st.mods.highHpDmg.toFixed(1)}%`));
  if (st.mods.rampDmg) bonus.push(row("Damage per swing", `+${st.mods.rampDmg.toFixed(1)}%`));

  const t = S.tally;
  const record = [
    row("Enemies slain", fmt(t.kills)),
    row("Bosses slain", fmt(t.bossKills)),
    row("Items found", fmt(t.items)),
    row("Gold earned", fmt(t.goldEarned)),
    row("Defeats", fmt(t.deaths)),
  ].join("");

  return `<div class="phead">
      <h2>Character</h2>
      <p>Fifteen slots, no class restrictions. Wear whatever the numbers favour.</p>
    </div>

    <div class="panel">
      <h3>Equipped</h3>
      ${paperdollHtml()}
    </div>

    <div class="grid g2">
      <div class="panel"><h3>Offence</h3><div class="statsheet">${offence}</div></div>
      <div class="panel"><h3>Defence</h3><div class="statsheet">${defence}</div></div>
    </div>

    ${bonus.length ? `<div class="panel"><h3>Bonuses</h3><div class="statsheet">${bonus.join("")}</div></div>` : ""}

    ${st.sets.length ? `<div class="panel"><h3>Set bonuses</h3>
      ${st.sets.map(s => `<div class="setblock">
        <div class="setname">${s.set.name} <span>${s.worn} of 5</span></div>
        ${s.tiers.map(t => `<div class="setbonus ${t.on ? "on" : ""}">
          <b>(${t.need})</b><span>${t.text}</span></div>`).join("")}
      </div>`).join("")}
    </div>` : ""}

    ${st.effects.length ? `<div class="panel"><h3>Special effects</h3>
      ${effectGroupsHtml(st.effects)}
    </div>` : ""}

    <div class="panel"><h3>Record</h3><div class="statsheet">${record}</div></div>`;
}

/* Effects listed under the moment they fire, so the panel reads as a sequence
   rather than an unsorted pile. */
const TRIGGER_LABEL = {
  open: "At the start of a fight",
  hit: "On a landed hit",
  crit: "On a critical strike",
  hurt: "When you are struck",
  kill: "On a kill",
};

function effectGroupsHtml(effects) {
  const groups = {};
  for (const e of effects) {
    const def = EFFECTS[e.id];
    const t = def ? def.trigger : "hit";
    (groups[t] = groups[t] || []).push(e);
  }
  let html = "";
  for (const t of ["open", "hit", "crit", "hurt", "kill"]) {
    if (!groups[t]) continue;
    html += `<div class="effectgroup">${TRIGGER_LABEL[t]}</div>`;
    html += groups[t].map(e => `<div class="effectrow">
      <b>${effectName(e)}</b>
      <span>${describeEffect(e)}${e.sources > 1
        ? ` <span class="srccount">${e.sources} sources combined</span>` : ""}</span>
    </div>`).join("");
  }
  return html;
}

function doUnequip(slotKey) { UI.say(unequipItem(slotKey)); }

/* ------------------------------------------------------------- inventory */
UI.invFilter = { slot: "", rarity: "", primary: "", special: "", sort: "score" };

function renderInventory() {
  const f = UI.invFilter;

  let items = S.inventory.slice();
  if (f.slot) items = items.filter(i => i.slot === f.slot);
  if (f.rarity) items = items.filter(i => i.rarity === f.rarity);
  if (f.primary) items = items.filter(i => i.primary === f.primary);
  if (f.special === "any") items = items.filter(i => i.proc || i.aspect || i.passive);
  else if (f.special === "aspect") items = items.filter(i => i.aspect);
  else if (f.special === "native") items = items.filter(i => i.proc && !i.aspect);

  items.sort((a, b) => {
    if (f.sort === "score") return itemScore(b) - itemScore(a);
    if (f.sort === "ilvl") return b.ilvl - a.ilvl;
    if (f.sort === "value") return b.value - a.value;
    if (f.sort === "upgrade") return upgradeDelta(b) - upgradeDelta(a);
    return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
  });

  const slotOpts = SLOT_TYPES.map(s =>
    `<option value="${s}" ${f.slot === s ? "selected" : ""}>${slotLabel(s)}</option>`).join("");
  const rarOpts = RARITY_ORDER.map(r =>
    `<option value="${r}" ${f.rarity === r ? "selected" : ""}>${RARITIES[r].name}</option>`).join("");

  const rows = items.map(item => {
    const targets = slotsForItem(item);
    const equipBtns = targets.length > 1
      ? targets.map((t, i) => `<button class="btn sm" onclick="doEquip('${item.uid}','${t}')">Wear ${i + 1}</button>`).join("")
      : `<button class="btn sm" onclick="doEquip('${item.uid}')">Wear</button>`;
    return itemRow(item, `${equipBtns}
      <button class="btn sm" onclick="doSell('${item.uid}')">Sell ${fmt(item.value)}g</button>
      <button class="btn sm" onclick="doSalvage('${item.uid}')">Salvage</button>`);
  }).join("");

  // potion stock
  const potionRows = POTIONS.filter(p => (S.potions[p.id] || 0) > 0).map(p => {
    const n = S.potions[p.id];
    const what = p.kind === "heal" ? `restores ${p.pct}% health`
      : p.kind === "mana" ? `restores ${p.pct}% mana`
      : Object.keys(p.mods).map(k => statLine(k, p.mods[k])).join(", ") + ` for ${p.duration}s`;
    return `<div class="itemrow" style="border-left-color:var(--verdant)">
      <div class="main">
        <div class="nm">${p.name} <span style="color:var(--brass-hi);font-family:var(--mono)">\u00D7${n}</span></div>
        <div class="potdesc">${what}</div>
      </div>
      <div class="acts">
        <button class="btn sm" onclick="doSalvagePotion('${p.id}',1)">Break 1</button>
        <button class="btn sm" onclick="doSalvagePotion('${p.id}',${n})">Break all</button>
      </div>
    </div>`;
  }).join("");

  return `<div class="phead">
      <h2>Inventory</h2>
      <p>No weight limit, no bag slots. ${fmt(S.inventory.length)} items held.
         Salvaging returns crafting materials and the Arcane Dust that enchanting runs on.</p>
    </div>

    <div class="panel">
      <h3>Automatic clean-up</h3>
      <div class="ctrlbar">
        <span style="color:var(--ash);font-size:12.5px">After every won fight,</span>
        <select onchange="setAutoSalvageMode(this.value)">
          <option value="salvage" ${S.settings.autoSalvageMode === "salvage" ? "selected" : ""}>salvage</option>
          <option value="sell" ${S.settings.autoSalvageMode === "sell" ? "selected" : ""}>sell</option>
        </select>
        <select onchange="setAutoSalvage(this.value)">
          <option value="off" ${S.settings.autoSalvage === "off" ? "selected" : ""}>nothing</option>
          <option value="common" ${S.settings.autoSalvage === "common" ? "selected" : ""}>commons</option>
          <option value="uncommon" ${S.settings.autoSalvage === "uncommon" ? "selected" : ""}>commons and uncommons</option>
          <option value="rare" ${S.settings.autoSalvage === "rare" ? "selected" : ""}>up to rares</option>
          <option value="epic" ${S.settings.autoSalvage === "epic" ? "selected" : ""}>up to epics</option>
          <option value="all" ${S.settings.autoSalvage === "all" ? "selected" : ""}>everything (keeps uniques & sets)</option>
        </select>
        <span style="color:var(--dim);font-family:var(--mono);font-size:11px">
          uniques and anything rarer are never touched</span>
      </div>
    </div>

    <div class="panel">
      <div class="invhead">
        <select onchange="setInvFilter('slot', this.value)">
          <option value="">Every slot</option>${slotOpts}
        </select>
        <select onchange="setInvFilter('rarity', this.value)">
          <option value="">Every rarity</option>${rarOpts}
        </select>
        <select onchange="setInvFilter('primary', this.value)">
          <option value="">Every stat</option>
          ${["str", "agi", "int"].map(k =>
            `<option value="${k}" ${f.primary === k ? "selected" : ""}>${PRIMARY_LABEL[k]}</option>`).join("")}
        </select>
        <select onchange="setInvFilter('special', this.value)">
          <option value="">Any property</option>
          <option value="any" ${f.special === "any" ? "selected" : ""}>Has a special property</option>
          <option value="native" ${f.special === "native" ? "selected" : ""}>Own property only</option>
          <option value="aspect" ${f.special === "aspect" ? "selected" : ""}>Carries an aspect</option>
        </select>
        <select onchange="setInvFilter('sort', this.value)">
          <option value="score" ${f.sort === "score" ? "selected" : ""}>Best first</option>
          <option value="upgrade" ${f.sort === "upgrade" ? "selected" : ""}>Biggest upgrade</option>
          <option value="ilvl" ${f.sort === "ilvl" ? "selected" : ""}>Item level</option>
          <option value="rarity" ${f.sort === "rarity" ? "selected" : ""}>Rarity</option>
          <option value="value" ${f.sort === "value" ? "selected" : ""}>Gold value</option>
        </select>
        <span style="flex:1"></span>
        <button class="btn sm" onclick="bulkSell(['common'])">Sell commons</button>
        <button class="btn sm" onclick="bulkSell(['common','uncommon'])">Sell commons + uncommons</button>
        <button class="btn sm" onclick="bulkSalvage(['common','uncommon'])">Salvage commons + uncommons</button>
      </div>
      <div class="itemlist">
        ${rows || `<div class="empty">Nothing here. Go and take something from someone.</div>`}
      </div>
    </div>

    ${potionRows ? `<div class="panel"><h3>Potions held</h3>
      <div class="itemlist">${potionRows}</div></div>` : ""}`;
}

function setInvFilter(k, v) { UI.invFilter[k] = v; UI.render(); }
function setAutoSalvage(v) { S.settings.autoSalvage = v; saveGame(); UI.render(); }
function setAutoSalvageMode(v) { S.settings.autoSalvageMode = v; saveGame(); UI.render(); }
function doEquip(uid, slot) { UI.say(equipItem(uid, slot)); }
function doSell(uid) { Sound.play("coin", 0); UI.say(sellItem(uid)); }
function doSalvage(uid) { Sound.play("salvage", 0); UI.say(salvageItem(uid)); }
function doSalvagePotion(id, n) { UI.say(salvagePotion(id, n)); }
function bulkSell(rar) { UI.say(sellAllOfRarity(rar)); }
function bulkSalvage(rar) { UI.say(salvageAllOfRarity(rar)); }
