/* ===========================================================================
   TALENTS AND SKILLS
   ---------------------------------------------------------------------------
   Left click a talent to add a point, right click to take one back.
   Spells are not chosen: they unlock at 5 / 10 / 15 / 20 / 25 points spent in
   their tree. The Skills panel only lets you reorder the cast priority.
   =========================================================================== */

function renderTalents() {
  if (S.level < TALENT_START_LEVEL) {
    return `<div class="phead"><h2>Talents</h2></div>
      <div class="empty">Talents open at level ${TALENT_START_LEVEL}. You are level ${S.level}.</div>`;
  }

  const treeId = UI.tab.talents || TALENT_TREES[0].id;
  const tree = TALENT_TREES.find(t => t.id === treeId);
  const avail = pointsAvailable();

  const treeBar = TALENT_TREES.map(t => {
    const pts = pointsInTree(t.id);
    return `<button class="treebtn ${t.id === treeId ? "on" : ""}" onclick="UI.tab.talents='${t.id}';UI.render()">
      ${t.name} <b>${pts}</b>
    </button>`;
  }).join("");

  let tiers = "";
  for (let tier = 1; tier <= 7; tier++) {
    const need = (tier - 1) * 5;
    const open = pointsInTree(tree.id) >= need;
    const talents = tree.talents.filter(t => t.tier === tier).map(t => {
      const rank = S.talents[t.id] || 0;
      const maxed = rank >= t.max;
      const can = canSpendTalent(t.id).ok;
      const cls = maxed ? "maxed" : (rank > 0 ? "invested" : (can ? "" : "blocked"));
      const mods = Object.keys(t.mods).map(k => statLine(k, t.mods[k] * Math.max(1, rank))).join(", ");
      const isProc = !!t.effect;
      const current = rank && t.effect
        ? `<div class="tcur">at ${rank} rank${rank > 1 ? "s" : ""}: ${describeEffect({ id: t.effect.id, chance: t.effect.chance * rank, potency: t.effect.potency || 1 })}</div>`
        : (rank && mods ? `<div class="tcur">at ${rank} rank${rank > 1 ? "s" : ""}: ${mods}</div>` : "");
      return `<div class="talent ${cls} ${isProc ? "proc" : ""}"
           onclick="clickTalent('${t.id}')"
           oncontextmenu="event.preventDefault();unclickTalent('${t.id}')">
        <div class="th">
          <span class="tn">${t.name}${isProc ? ` <span class="procmark">proc</span>` : ""}</span>
          <span class="rank">${rank}/${t.max}</span>
        </div>
        <div class="td">${t.desc}</div>
        ${current}
      </div>`;
    }).join("");

    tiers += `<div class="tier ${open ? "open" : ""}">
      <div class="tierhead">Tier ${tier} ${need ? `\u2014 needs ${need} points in ${tree.name}` : ""}</div>
      <div class="talentgrid">${talents}</div>
    </div>`;
  }

  // what spells this tree's current investment has bought
  const pts = pointsInTree(tree.id);
  const spellNote = SPELLS.filter(s => s.tree === tree.id).map(s =>
    `<span class="tag ${pts >= s.req ? "done" : ""}" data-tip="spell:${s.id}">${s.req}: ${s.name}</span>`).join(" ");

  return `<div class="phead">
      <h2>Talents</h2>
      <p>One point per level from ${TALENT_START_LEVEL} onward, ${totalTalentPoints(MAX_LEVEL)} at level ${MAX_LEVEL}.
         Left click to spend, right click to refund. Resetting is always free.</p>
    </div>

    <div class="panel">
      <div class="ctrlbar">
        <span style="font-size:15px">Points available:
          <b style="color:${avail > 0 ? "var(--brass-hi)" : "var(--dim)"};font-family:var(--mono)">${avail}</b>
        </span>
        <span style="color:var(--dim);font-family:var(--mono);font-size:11px">
          ${pointsSpent()} spent of ${totalTalentPoints(S.level)}</span>
        <span style="flex:1"></span>
        <button class="btn danger sm" onclick="doResetTalents()">Reset all points</button>
      </div>
    </div>

    <div class="treebar">${treeBar}</div>

    <div class="panel">
      <h3>${tree.name} \u2014 ${pointsInTree(tree.id)} points</h3>
      <p style="color:var(--ash);font-size:12.5px;margin:-4px 0 12px">${tree.blurb}</p>
      <div style="margin-bottom:14px">${spellNote}</div>
      <div class="tiers">${tiers}</div>
    </div>`;
}

function clickTalent(id) {
  const res = spendTalent(id);
  if (!res.ok) { UI.toast(res.msg, "bad"); return; }
  UI.render();
}
function unclickTalent(id) {
  const res = refundTalent(id);
  if (!res.ok) { UI.toast(res.msg, "bad"); return; }
  UI.render();
}
function doResetTalents() { UI.say(resetTalents()); }

/* ---------------------------------------------------------------- skills */
function renderSkills() {
  const unlocked = unlockedSpells();
  const unlockedIds = unlocked.map(s => s.id);

  const rows = unlocked.map((sp, i) => {
    const tree = TALENT_TREES.find(t => t.id === sp.tree);
    const c = S.spellConditions[sp.id] || { type: "always", value: 30 };
    const needsValue = SPELL_CONDITIONS[c.type] && SPELL_CONDITIONS[c.type].value;

    return `<div class="spellrow">
      <div class="order">
        <button onclick="moveSpell('${sp.id}',-1)" ${i === 0 ? "disabled" : ""}>\u25B2</button>
        <button onclick="moveSpell('${sp.id}',1)" ${i === unlocked.length - 1 ? "disabled" : ""}>\u25BC</button>
      </div>
      <div style="flex:1">
        <div class="sn" data-tip="spell:${sp.id}">${sp.name}
          <span style="color:var(--dim);font-family:var(--mono);font-size:10px"> ${tree.name}</span>
        </div>
        <div class="sd">${sp.desc}</div>
        <div class="spellcond">
          <span class="cw">cast</span>
          <select onchange="setSpellCondition('${sp.id}', this.value)">
            ${Object.keys(SPELL_CONDITIONS).map(k =>
              `<option value="${k}" ${c.type === k ? "selected" : ""}>${SPELL_CONDITIONS[k].label}</option>`).join("")}
          </select>
          ${needsValue ? `<input type="number" min="0" max="100" step="5" value="${c.value}"
             onchange="setSpellConditionValue('${sp.id}', this.value)">
             <span class="cw">${SPELL_CONDITIONS[c.type].unit}</span>` : ""}
        </div>
      </div>
      <div class="sm">${sp.cd}s cooldown<br>${fmt(Math.round(computeStats().manaCostPool * (sp.manaPct || 0) / 100))} mana</div>
    </div>`;
  }).join("");

  const lockedRows = SPELLS.filter(s => !unlockedIds.includes(s.id)).map(sp => {
    const tree = TALENT_TREES.find(t => t.id === sp.tree);
    const have = pointsInTree(sp.tree);
    return `<div class="spellrow locked" data-tip="spell:${sp.id}">
      <div style="flex:1">
        <div class="sn">${sp.name}
          <span style="color:var(--dim);font-family:var(--mono);font-size:10px"> ${tree.name}</span>
        </div>
        <div class="sd">${sp.desc}</div>
      </div>
      <div class="sm">${have}/${sp.req} points<br>in ${tree.name}</div>
    </div>`;
  }).join("");

  return `<div class="phead">
      <h2>Skills</h2>
      <p>Spells unlock at 5, 10, 15, 20 and 25 points spent in a tree and cast themselves.
         The order below is the priority: the first spell that is ready, affordable and whose condition
         is met goes off.</p>
      <p>By default heals and shields hold until you are below 90% health. Setting a condition on a
         spell replaces that default entirely, so what you configure is exactly what happens.</p>
    </div>

    <div class="panel">
      <h3>Cast priority</h3>
      ${rows || `<div class="empty">No spells yet. Spend 5 points in any talent tree.</div>`}
    </div>

    ${lockedRows ? `<div class="panel"><h3>Not yet unlocked</h3>${lockedRows}</div>` : ""}`;
}

/* The conditions a spell can be given. `value` marks the ones that need a
   number alongside them. */
const SPELL_CONDITIONS = {
  always:      { label: "whenever it is ready", value: false },
  enemyBelow:  { label: "when the enemy is below", value: true, unit: "% health" },
  enemyAbove:  { label: "when the enemy is above", value: true, unit: "% health" },
  selfBelow:   { label: "when I am below", value: true, unit: "% health" },
  selfAbove:   { label: "when I am above", value: true, unit: "% health" },
  manaAbove:   { label: "when I have more than", value: true, unit: "% mana" },
  opener:      { label: "only in the first", value: true, unit: "seconds" },
  afterSecs:   { label: "only after", value: true, unit: "seconds" },
  eliteOrBoss: { label: "only against elites and bosses", value: false },
  bossOnly:    { label: "only against bosses", value: false },
};

function setSpellCondition(id, type) {
  if (type === "always") delete S.spellConditions[id];
  else {
    const cur = S.spellConditions[id] || {};
    S.spellConditions[id] = { type, value: cur.value === undefined ? 30 : cur.value };
  }
  saveGame();
  UI.render();
}

function setSpellConditionValue(id, v) {
  const c = S.spellConditions[id];
  if (!c) return;
  c.value = clamp(parseFloat(v) || 0, 0, 100);
  saveGame();
}

function moveSpell(id, dir) {
  const list = unlockedSpells().map(s => s.id);
  const i = list.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  list.splice(j, 0, list.splice(i, 1)[0]);
  S.spellOrder = list;
  saveGame();
  UI.render();
}
