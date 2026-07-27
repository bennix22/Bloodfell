/* ===========================================================================
   MAIN — boot, the game loop, and auto-grind chaining.
   =========================================================================== */

/* Pause between auto-grind fights, long enough to read what happened. It shrinks
   as the speed setting rises, otherwise a fixed gap would dominate at 8x and the
   game would stop feeling any faster. */
const NEXT_FIGHT_DELAY = 0.9;
function nextFightDelay() {
  return NEXT_FIGHT_DELAY / Math.sqrt(S.settings.speed || 1);
}
let pendingNext = 0;
let lastFrame = 0;
let sinceSave = 0;

/* Fired by the combat engine whenever a fight resolves. */
Combat.onUpdate = function (kind, result) {
  // level ups and unlocks change what the whole interface should show
  if (!result) return;
  const unlocked = result.unlocked || [];
  if (result.leveled || unlocked.length) {
    if (result.leveled) UI.toast(`Level ${S.level}. One talent point earned.`, "good");
    for (const u of unlocked) UI.toast(`Unlocked: ${u}`, "good");
    UI.renderCharCard();
  }

  // notable drops deserve a toast, ordinary ones stay in the chronicle
  if (result.items) {
    for (const it of result.items) {
      if (it.rarity === "epic" || it.rarity === "legendary") {
        UI.toast(`<span class="r-${it.rarity}">${it.name}</span>`, "good");
      }
    }
  }

  // report what the automatic clean-up swept up, so it never happens silently
  if (result.autoCleared) {
    const a = result.autoCleared;
    if (a.sell) UI.toast(`Sold ${a.n} item${a.n > 1 ? "s" : ""} for ${fmt(a.gold)} gold.`);
    else UI.toast(`Salvaged ${a.n} item${a.n > 1 ? "s" : ""}.`);
  }

  /* Auto-grind would happily walk a run into the ground, so this is the way to
     bank depth while unattended: pull out when health gets low, take the free
     restore, and start a fresh run. */
  if (result.won && S.settings.autoRetreat > 0 && S.run.realmId) {
    const v = currentVitals();
    if (v.hp / v.maxHp * 100 < S.settings.autoRetreat) {
      const depth = retreatFromRun();
      UI.toast(`Withdrew at depth ${depth} to recover.`, "good");
      Sound.play("potion", 0);
    }
  }

  // a boon offer stops the dive until it is answered
  if (result.boonReady) {
    Sound.play("rare", 0);
    UI.toast("Something offers you power. Choose.", "good");
    if (UI.route === "descent") UI.render();
    return;
  }
  if (result.descentEnd) {
    UI.toast(`The Descent ends at floor ${result.descentEnd.floor}. Best: ${result.descentEnd.best}.`, "bad");
    UI.grind = null;
    if (UI.route === "descent") UI.render();
    return;
  }

  // keep the descent status panel (floor, boon/warden countdown, power) current
  // after every floor — it isn't part of the arena that ticks each frame
  if (UI.route === "descent" && S.descent.active) {
    const el = document.getElementById("descent-status");
    if (el) el.outerHTML = descentStatusPanel();
  }

  if (S.settings.autoGrind && UI.grind) {
    pendingNext = nextFightDelay();
  } else {
    UI.grind = S.settings.autoGrind ? UI.grind : null;
    // refresh so the panel shows the fight is over and the loot has landed
    if (UI.route === "realms" || UI.route === "raids") UI.renderCharCard();
  }
};

function startNextFight() {
  if (!UI.grind) return;
  if (UI.grind.mode === "descent") {
    if (!S.descent.active) { UI.grind = null; return; }
    if (S.descent.pendingChoices) return;   // waiting on a choice
    Combat.start("descent", null);
    return;
  }
  if (UI.grind.mode === "realm") {
    const realm = realmById(UI.grind.id);
    if (realm && realmUnlocked(realm)) Combat.start("realm", realm);
  } else {
    const boss = bossById(UI.grind.id);
    if (boss) Combat.start("boss", boss);
  }
}

function frame(now) {
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.25) : 0;
  lastFrame = now;

  if (Combat.active && !UI.paused) {
    Combat.advance(dt);
    UI.tickCombat(false);
    UI.renderCharCard();
  } else if (pendingNext > 0 && !UI.paused) {
    pendingNext -= dt;
    // the potion cooldown keeps recovering between fights, not only during them
    if (S.vitals.potionCd > 0) S.vitals.potionCd = Math.max(0, S.vitals.potionCd - dt);
    if (pendingNext <= 0) {
      pendingNext = 0;
      startNextFight();
      UI.tickCombat(true);
    }
  }

  // autosave on a timer as well as after each fight
  sinceSave += dt;
  if (sinceSave > 20) {
    sinceSave = 0;
    saveGame();
  }

  requestAnimationFrame(frame);
}

function boot() {
  const had = loadGame();
  Sound.init();
  Theme.apply(S.settings.theme || "grimoire");
  Theme.applyTextScale(S.settings.textScale);
  UI.mount();
  if (!STORAGE_OK) {
    UI.toast("Local storage is blocked here. Use Save file to keep a copy.", "bad");
  } else if (had) {
    UI.toast(`Welcome back. Level ${S.level}.`, "good");
  } else {
    giveStarterKit();
    saveGame();
    UI.toast("A new character, armed and pointed at Ashen Hollow.", "good");
  }
  requestAnimationFrame(frame);
}

/* Keep the current fight when the tab is hidden, but do not simulate hours of
   combat in one frame when it comes back — dt is already clamped in frame(). */
document.addEventListener("visibilitychange", () => { lastFrame = 0; });

window.addEventListener("beforeunload", () => { saveGame(); });

document.addEventListener("DOMContentLoaded", boot);
