/* ===========================================================================
   COMBAT PANELS — Realms, Raids, and the live fight view.
   ---------------------------------------------------------------------------
   The arena is the only part of the interface that updates every frame. It
   redraws two health bars, the buff row and the chronicle; everything else
   waits for a full render.
   =========================================================================== */

/* What auto-grind should re-engage when a fight ends. */
UI.grind = null;    // { mode: "realm" | "boss", id }

/* --------------------------------------------------------------- controls */
function combatControls() {
  const s = S.settings;
  const healOpts = POTIONS.filter(p => p.kind === "heal")
    .map(p => {
      const n = S.potions[p.id] || 0;
      const sel = s.healPotion === p.id ? " selected" : "";
      return `<option value="${p.id}"${sel}>${p.name} (${n})</option>`;
    }).join("");

  const buffOpts = POTIONS.filter(p => p.kind === "buff" || p.kind === "elixir")
    .map(p => {
      const n = S.potions[p.id] || 0;
      const on = (s.buffPotions || []).includes(p.id);
      return `<label class="switch" style="font-size:11.5px">
        <input type="checkbox" ${on ? "checked" : ""} onchange="toggleBuffPotion('${p.id}')">
        ${p.name} <span style="color:var(--dim);font-family:var(--mono)">(${n})</span>
      </label>`;
    }).join("");

  return `<div class="panel">
    <h3>Combat settings</h3>
    <div class="ctrlbar">
      <label class="switch">
        <input type="checkbox" ${s.autoGrind ? "checked" : ""} onchange="toggleAutoGrind(this.checked)">
        Auto-grind
      </label>
      <div class="speedgrp">
        ${[1, 2, 3].map(v => `<button class="${s.speed === v ? "on" : ""}" onclick="setSpeed(${v})">${v}x</button>`).join("")}
      </div>
      <label class="switch">
        <input type="checkbox" ${s.autoPotion ? "checked" : ""} onchange="toggleAutoPotion(this.checked)">
        Drink health potions below
      </label>
      <input type="number" min="5" max="95" step="5" value="${s.potionThreshold}"
             style="width:64px" onchange="setPotionThreshold(this.value)"> %
      <select onchange="setHealPotion(this.value)">
        <option value="">Strongest in bag</option>${healOpts}
      </select>
      <label class="switch">
        <input type="checkbox" ${s.autoRetreat > 0 ? "checked" : ""} onchange="toggleAutoRetreat(this.checked)">
        Retreat below
      </label>
      <input type="number" min="5" max="90" step="5" value="${s.autoRetreat || 25}"
             style="width:64px" onchange="setAutoRetreat(this.value)"
             ${s.autoRetreat > 0 ? "" : "disabled"}> %
    </div>
    ${buffOpts ? `<div style="margin-top:8px">
      <div class="barlabel" style="margin-bottom:6px">
        <span>Drink at the start of each fight</span><span></span></div>
      <div class="ctrlbar">${buffOpts}</div>
    </div>` : ""}
  </div>`;
}

function toggleAutoGrind(v) {
  S.settings.autoGrind = v;
  saveGame();
  if (!v) { UI.grind = null; }
  UI.render();
}
function setSpeed(v) { S.settings.speed = clamp(v, 1, 3); saveGame(); UI.render(); }
function toggleAutoPotion(v) { S.settings.autoPotion = v; saveGame(); }
function setPotionThreshold(v) { S.settings.potionThreshold = clamp(parseInt(v, 10) || 40, 5, 95); saveGame(); }
function setHealPotion(v) { S.settings.healPotion = v || null; saveGame(); }
function toggleAutoRetreat(on) { S.settings.autoRetreat = on ? 25 : 0; saveGame(); UI.render(); }
function setAutoRetreat(v) { S.settings.autoRetreat = clamp(parseInt(v, 10) || 25, 5, 90); saveGame(); }
function toggleBuffPotion(id) {
  const list = S.settings.buffPotions || (S.settings.buffPotions = []);
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  saveGame();
}

/* ------------------------------------------------------------- the arena */
function arenaHtml() {
  return `<div class="panel" id="arenapanel">
    <h3>Engagement</h3>
    <div class="arena">
      <div class="fighter" id="f-player"></div>
      <div class="fighter enemy" id="f-enemy"></div>
    </div>
    <div class="spellbar" id="spellbar"></div>
    <div style="margin-top:12px" class="chronicle" id="chronicle"></div>
    <div class="ctrlbar" style="margin:12px 0 0">
      <button class="btn" onclick="stopFighting()">Stop</button>
      <button class="btn" id="pausebtn" onclick="togglePause()">${UI.paused ? "Resume" : "Pause"}</button>
      ${S.run.realmId ? `<button class="btn" onclick="doRetreat()">Retreat and recover</button>` : ""}
      <span id="fightstatus" style="color:var(--dim);font-family:var(--mono);font-size:11px"></span>
    </div>
  </div>`;
}

/* Called every animation frame while a fight is running. */
UI.tickCombat = function (force) {
  const pEl = document.getElementById("f-player");
  const eEl = document.getElementById("f-enemy");
  const cEl = document.getElementById("chronicle");
  if (!pEl || !eEl || !cEl) return;

  const st = Combat.stats || computeStats();
  /* Between fights within a run the bars must show the CARRIED health and mana,
     not full. Reading st.maxHp here made the bar jump to 100% the instant an
     enemy died (win() sets active=false) and snap back down when the next fight
     began. currentVitals() returns the persisted values, or full when there is
     no run in progress — correct in both cases. */
  const carried = Combat.active ? null : currentVitals();
  const php = Combat.active ? Combat.player.hp : carried.hp;
  const pmp = Combat.active ? Combat.player.mana : carried.mana;
  const maxHp = Combat.active ? st.maxHp : carried.maxHp;
  const maxMana = Combat.active ? st.maxMana : carried.maxMana;

  let buffs = "";
  if (Combat.active) {
    for (const b of Combat.player.buffs) {
      buffs += `<span class="buff">${b.name} ${b.remaining.toFixed(0)}s</span>`;
    }
    if (Combat.player.shield) {
      buffs += `<span class="buff shield">${Combat.player.shield.name} ${fmt(Combat.player.shield.amount)}</span>`;
    }
    for (const h of Combat.player.hots) {
      buffs += `<span class="buff">${h.name} x${h.ticksLeft}</span>`;
    }
  }

  pEl.innerHTML = `
    <div class="who"><b>${S.name === "Nameless" ? "You" : S.name}</b><span class="lv">level ${S.level}</span></div>
    <div class="roleline">${st.weapon.scalesWith === "int" ? "Caster" : st.weapon.scalesWith === "agi" ? "Duelist" : "Fighter"}</div>
    <div class="bar hp"><i style="width:${clamp(php / maxHp * 100, 0, 100)}%"></i></div>
    <div class="hpnum">${fmt(php)} / ${fmt(maxHp)}</div>
    <div class="bar mana" style="margin-top:6px"><i style="width:${clamp(pmp / maxMana * 100, 0, 100)}%"></i></div>
    <div class="hpnum">${fmt(pmp)} mana</div>
    <div class="buffrow">${buffs}</div>`;

  const e = Combat.enemy;
  if (e) {
    let dots = "";
    const depthLabel = e.depth
      ? ` <span class="depth-tag">depth ${e.depth} \u00B7 +${Math.round(e.depth * DEPTH_POWER_PER_KILL * 100)}%</span>` : "";
    for (const d of e.dots) dots += `<span class="buff dot">${d.name} x${d.ticksLeft}</span>`;
    const esc = e.isBoss && e.kills
      ? ` <span class="elite-tag">+${Math.round((e.escalation - 1) * 100)}% hp, +${Math.round((e.escalationDmg - 1) * 100)}% dmg from ${e.kills} kills</span>` : "";
    const elite = e.elite ? ` <span class="elite-tag">Elite +${Math.round(e.eliteBonus * 100)}%</span>` : "";
    eEl.innerHTML = `
      <div class="who"><b>${e.name}</b><span class="lv">level ${e.displayLevel || e.level}</span></div>
      <div class="roleline">${e.roleLabel}${elite}${esc}${depthLabel}</div>
      <div class="bar hp"><i style="width:${clamp(e.hp / e.maxHp * 100, 0, 100)}%"></i></div>
      <div class="hpnum">${fmt(e.hp)} / ${fmt(e.maxHp)}</div>
      <div class="buffrow">${dots}</div>`;
  } else {
    eEl.innerHTML = `<div class="who"><b style="color:var(--dim)">No target</b></div>
      <div class="roleline">waiting</div>`;
  }

  // spell bar: what is ready, what is on cooldown, what you cannot afford
  const sb = document.getElementById("spellbar");
  if (sb) {
    const spells = unlockedSpells();
    if (!spells.length) {
      sb.innerHTML = `<div class="spellbar-empty">No spells yet \u2014 spend 5 points in a talent tree.</div>`;
    } else {
      sb.innerHTML = spells.map(sp => {
        const cd = Combat.active ? (Combat.player.cds[sp.id] || 0) : 0;
        const affordable = !Combat.active || Combat.player.mana >= Combat.spellCost(sp);
        const onCd = cd > 0;
        const full = sp.cd * (1 - (st.cdr || 0) / 100);
        const pct = onCd ? clamp((1 - cd / full) * 100, 0, 100) : 100;
        const cls = onCd ? "cooling" : (affordable ? "ready" : "poor");
        return `<div class="spellchip ${cls}" data-tip="spell:${sp.id}">
          <i style="width:${pct}%"></i>
          <span class="sc-name">${sp.name}</span>
          <span class="sc-cd">${onCd ? cd.toFixed(1) + "s" : (affordable ? "ready" : "mana")}</span>
        </div>`;
      }).join("");
    }
  }

  // chronicle — only rewrite when there is something new
  if (force || cEl.dataset.seq !== String(Combat.logSeq)) {
    cEl.dataset.seq = String(Combat.logSeq);
    cEl.innerHTML = Combat.log.map(l => `<div class="line ${l.c}">${l.t}</div>`).join("");
    cEl.scrollTop = cEl.scrollHeight;
  }

  const status = document.getElementById("fightstatus");
  if (status) {
    status.textContent = Combat.active
      ? `${Combat.fightTime.toFixed(1)}s`
      : (S.settings.autoGrind && UI.grind ? "next fight incoming\u2026" : "idle");
  }
};

/* ---------------------------------------------------------------- realms */
function renderRealms() {
  const cards = REALMS.map(realm => {
    const open = realmUnlocked(realm);
    const kills = S.kills[realm.id] || 0;
    const active = UI.grind && UI.grind.mode === "realm" && UI.grind.id === realm.id;
    const running = S.run.realmId === realm.id && S.run.depth > 0;
    const t = TIER_MATS[realm.tier];
    const mats = [MATERIALS[t.metal].name, MATERIALS[t.herb].name].join(", ");

    return `<div class="card ${open ? "" : "locked"} ${active ? "active" : ""}">
      <div class="meta">Realm ${REALMS.indexOf(realm) + 1} \u00B7 level ${realm.lvl} \u00B7 ${realm.enemies.length} foes</div>
      <h4>${realm.name}</h4>
      <div class="desc">${realm.desc}</div>
      <div class="meta" style="color:var(--dim)">drops ${mats}</div>
      ${running ? `<div class="meta" style="color:var(--brass)">
        run in progress \u2014 depth ${S.run.depth}, +${Math.round(S.run.depth * DEPTH_POWER_PER_KILL * 100)}% enemy power,
        +${S.run.depth * DEPTH_FIND_PER_KILL}% magic find</div>` : ""}
      <div class="foot">
        ${open
          ? `<button class="btn ${active ? "" : "primary"}" onclick="startRealm('${realm.id}')">
               ${active && Combat.active ? "Fighting" : (running ? "Continue" : "Enter")}</button>
             ${kills ? `<span class="tag">${fmt(kills)} slain</span>` : ""}`
          : `<span class="tag red">${realmLockReason(realm)}</span>`}
      </div>
    </div>`;
  }).join("");

  return `<div class="phead">
      <h2>Realms</h2>
      <p>Every realm drops materials of its own tier and the experience to keep climbing.
         Later realms open only when the raid boss holding the way is dead.</p>
      <p>Health and mana <b>carry between fights</b>, and every kill drives you one step deeper: enemies gain
         ${Math.round(DEPTH_POWER_PER_KILL * 100)}% health and damage, and drop
         ${DEPTH_FIND_PER_KILL}% better, per step. Dying ends the run and costs you the depth.
         Retreating ends it too, but you choose the moment.</p>
    </div>
    ${combatControls()}
    ${(Combat.active || UI.grind) ? arenaHtml() : ""}
    <div class="grid g3">${cards}</div>`;
}

function startRealm(id) {
  const realm = realmById(id);
  if (!realm || !realmUnlocked(realm)) return;
  UI.grind = { mode: "realm", id };
  Combat.log = [];
  Combat.start("realm", realm);
  UI.render();
}

function stopFighting() {
  Combat.stop();
  UI.grind = null;
  UI.paused = false;
  S.settings.autoGrind = false;
  saveGame();
  UI.render();
}

/* Freezes the fight in place so the combat log can be read, without ending the run.
   The frame loop stops advancing while paused; we only flip the button label and
   repaint the current state rather than re-rendering (which would blank the arena). */
function togglePause() {
  UI.paused = !UI.paused;
  const btn = document.getElementById("pausebtn");
  if (btn) btn.textContent = UI.paused ? "Resume" : "Pause";
  if (Combat.active) UI.tickCombat(true);
}

/* Walking out restores you but abandons the depth you had built. */
function doRetreat() {
  const depth = retreatFromRun();
  Combat.stop();
  UI.grind = null;
  S.settings.autoGrind = false;
  Sound.play("potion", 0);
  UI.toast(depth ? `Withdrew from depth ${depth}, rested and whole.` : "Rested.", "good");
  UI.render();
}

/* ----------------------------------------------------------------- raids */
function renderRaids() {
  const blocks = RAIDS.map(raid => {
    const open = raidUnlocked(raid);
    const bosses = raid.bosses.map((boss, i) => {
      const avail = bossUnlocked(raid, i);
      const kills = S.bossKills[boss.id] || 0;
      const escHp = Math.round(kills * ESCALATION_HP_PER_KILL * 100);
      const escDmg = Math.round(kills * ESCALATION_DMG_PER_KILL * 100);
      const active = UI.grind && UI.grind.mode === "boss" && UI.grind.id === boss.id;

      const unlocks = [];
      if (boss.unlocks.realms) for (const r of boss.unlocks.realms) { const x = realmById(r); if (x) unlocks.push(x.name); }
      if (boss.unlocks.raids) for (const r of boss.unlocks.raids) { const x = raidById(r); if (x) unlocks.push(x.name); }

      const drops = boss.drops.map(d =>
        `<div style="font-size:11.5px;padding:1px 0">
           <span class="r-${d.rarity}">${d.name}</span>
           <span style="color:var(--dim);font-family:var(--mono);font-size:10px"> ${(d.chance * 100).toFixed(1)}%</span>
         </div>`).join("");

      const bossUniques = (typeof uniquesForBoss === "function" ? uniquesForBoss(boss.id) : [])
        .map(u => `<div style="font-size:11.5px;padding:1px 0">
           <span class="r-unique">${u.name}</span>
           <span style="color:var(--dim);font-family:var(--mono);font-size:10px"> ${(u.chance * 100).toFixed(1)}%</span>
         </div>`).join("");

      return `<div class="card ${avail ? "" : "locked"} ${active ? "active" : ""}">
        <div class="meta">Boss ${i + 1} \u00B7 level ${boss.lvl}${kills ? ` \u00B7 slain ${kills}\u00D7` : ""}</div>
        <h4>${boss.name}${boss.title ? `<span style="color:var(--ash);font-size:13px">, ${boss.title}</span>` : ""}</h4>
        <div class="desc">${boss.blurb}</div>
        ${kills ? `<div class="meta" style="color:var(--brass)">+${escHp}% health, +${escDmg}% damage from ${kills} repeat kills</div>` : ""}
        ${unlocks.length ? `<div class="meta">opens ${unlocks.join(", ")}</div>` : ""}
        ${bossUniques ? `<div style="border-top:1px solid var(--edge);padding-top:7px;margin-top:2px">
          <div class="meta" style="margin-bottom:3px;color:var(--r-unique)">Unique drop</div>${bossUniques}
        </div>` : ""}
        <div style="border-top:1px solid var(--edge);padding-top:7px;margin-top:2px">
          <div class="meta" style="margin-bottom:3px">Notable drops</div>${drops}
        </div>
        <div class="foot">
          ${avail
            ? `<button class="btn ${active ? "" : "primary"}" onclick="startBoss('${boss.id}')">
                 ${active && Combat.active ? "Fighting" : "Challenge"}</button>`
            : `<span class="tag red">${bossLockReason(raid, i)}</span>`}
        </div>
      </div>`;
    }).join("");

    return `<div class="panel">
      <h3>${raid.name}${open ? "" : " \u2014 locked"}</h3>
      <p style="color:var(--ash);font-size:12.5px;margin:-4px 0 14px">${raid.desc}</p>
      ${open ? `<div class="grid g3">${bosses}</div>`
             : `<div class="empty">${raidLockReason(raid)}</div>`}
    </div>`;
  }).join("");

  return `<div class="phead">
      <h2>Raids</h2>
      <p>Bosses hold the keys to the deeper realms. Each one you kill gets permanently stronger &mdash;
         ${(ESCALATION_HP_PER_KILL * 100).toFixed(1)}% health and ${(ESCALATION_DMG_PER_KILL * 100).toFixed(1)}% damage
         per victory &mdash; so farming a unique drop eventually pushes you elsewhere for better gear.</p>
    </div>
    ${combatControls()}
    ${(Combat.active || UI.grind) ? arenaHtml() : ""}
    ${blocks}`;
}

/* --------------------------------------------------------------- descent -- */
function renderDescent() {
  if (!descentUnlocked()) {
    return `<div class="phead"><h2>The Descent</h2></div>
      <div class="empty">Opus still stands. The way down opens once the great work is finished.</div>`;
  }

  const d = S.descent;
  const active = d.active;

  // a pending boon choice takes over the panel — it is the decision of the run
  if (active && d.pendingChoices) {
    const cards = d.pendingChoices.map(id => {
      const b = boonById(id);
      const have = d.boons[id] || 0;
      return `<div class="booncard" onclick="chooseBoon('${id}')">
        <h4>${b.name}${have ? ` <span class="boonstack">already ${have}\u00D7</span>` : ""}</h4>
        <div class="boontext">${b.text}</div>
        <div class="boonpick">take this</div>
      </div>`;
    }).join("");
    return `<div class="phead">
        <h2>Floor ${d.floor}</h2>
        <p>Something down here is willing to make you stronger. Choose one.</p>
      </div>
      <div class="boongrid">${cards}</div>
      ${descentStatusPanel()}`;
  }

  const boonList = Object.keys(d.boons || {}).length
    ? Object.keys(d.boons).map(id => {
        const b = boonById(id);
        const n = d.boons[id];
        return `<div class="effectrow"><b>${b.name}${n > 1 ? ` \u00D7${n}` : ""}</b><span>${b.text}</span></div>`;
      }).join("")
    : `<div class="empty" style="padding:16px">No boons yet.</div>`;

  return `<div class="phead">
      <h2>The Descent</h2>
      <p>There is no bottom. Everything down here grows ${Math.round((DESCENT_POWER_RATE - 1) * 100)}% stronger with every floor &mdash;
         compounding, so it doubles roughly every twelve &mdash;
         and every ${DESCENT_BOON_EVERY} floors something offers to make you stronger too &mdash; you choose which,
         and the choices stack for the rest of the run.</p>
      <p>Every ${DESCENT_WARDEN_EVERY}th floor a Warden blocks the way: a raid boss, scaled to the depth,
         carrying its full drop table. Health and mana carry the whole way down. Dying ends the run
         and costs nothing but the floors.</p>
    </div>

    ${active ? descentStatusPanel() : `
      ${S.lastDescent ? descentRecap() : ""}
      <div class="panel">
      <div class="ctrlbar">
        <span style="font-size:15px">Deepest floor reached:
          <b style="color:var(--brass-hi);font-family:var(--mono)">${d.best || 0}</b></span>
        <span style="flex:1"></span>
        <button class="btn primary" onclick="startDescent()">Begin a Descent</button>
      </div>
    </div>`}

    ${combatControls()}
    ${(Combat.active || UI.grind) ? arenaHtml() : ""}

    <div class="panel">
      <h3>Boons taken this run</h3>
      ${active ? boonList : `<div class="empty" style="padding:16px">Not currently descending.</div>`}
    </div>`;
}

/* Shown when you come back to the Descent after a run ends: how the last one
   went, so a death has something to show for it. */
function descentRecap() {
  const r = S.lastDescent;
  const boons = Object.keys(r.boons || {});
  const boonList = boons.length
    ? boons.map(id => { const b = boonById(id); const n = r.boons[id];
        return `<span class="recapboon">${b ? b.name : id}${n > 1 ? ` \u00D7${n}` : ""}</span>`; }).join("")
    : `<span style="color:var(--dim)">none taken</span>`;
  return `<div class="panel recap">
    <div class="recaphead">Last descent \u2014 ${r.reason === "abandoned" ? "withdrawn" : "fell"} at floor ${r.floor}</div>
    <div class="recapstats">
      <div><span>Floor reached</span><b>${r.floor}</b></div>
      <div><span>Wardens felled</span><b>${r.wardens}</b></div>
      <div><span>Boons taken</span><b>${r.boonCount}</b></div>
    </div>
    <div class="recapboons"><span class="recaplabel">Boons</span> ${boonList}</div>
  </div>`;
}

function descentStatusPanel() {
  const d = S.descent;
  const nextBoon = DESCENT_BOON_EVERY - ((d.floor - 1) % DESCENT_BOON_EVERY);
  const nextWarden = DESCENT_WARDEN_EVERY - ((d.floor - 1) % DESCENT_WARDEN_EVERY);
  const power = Math.round((Math.pow(DESCENT_POWER_RATE, d.floor - 1) - 1) * 100);
  return `<div class="panel" id="descent-status">
    <div class="ctrlbar">
      <span style="font-size:17px;font-family:var(--serif)">Floor <b style="color:var(--brass-hi)">${d.floor}</b></span>
      <span class="tag">enemies +${power}%</span>
      <span class="tag">magic find +${(d.floor - 1) * DESCENT_FIND_PER_FLOOR}%</span>
      <span class="tag">boon in ${nextBoon}</span>
      <span class="tag ${nextWarden <= 2 ? "red" : ""}">warden in ${nextWarden}</span>
      <span style="flex:1"></span>
      <span style="color:var(--dim);font-family:var(--mono);font-size:11px">best ${d.best || 0}</span>
      <button class="btn danger sm" onclick="abandonDescent()">Abandon run</button>
    </div>
  </div>`;
}

function startDescent() {
  beginDescent();
  UI.grind = { mode: "descent", id: "descent" };
  Combat.log = [];
  Combat.start("descent", null);
  Sound.play("levelup", 0);
  UI.render();
}

function chooseBoon(id) {
  const res = takeBoon(id);
  Sound.play("rare", 0);
  UI.toast(res.msg, "good");
  // resume the dive straight away
  if (S.settings.autoGrind && UI.grind) {
    Combat.start("descent", null);
  }
  UI.render();
}

function abandonDescent() {
  const r = endDescent("abandoned");
  Combat.stop();
  UI.grind = null;
  S.settings.autoGrind = false;
  UI.toast(`Descent abandoned at floor ${r.floor}. Best: ${r.best}.`, "good");
  UI.render();
}
