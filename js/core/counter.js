/* ===========================================================================
   GLOBAL COUNTER — how many are playing, and how deep anyone has been.
   ---------------------------------------------------------------------------
   Talks to a small Cloudflare Worker. Everything here is written so that the
   game is IDENTICAL when it cannot reach the network: no error, no empty box,
   no delay. The offline standalone build simply never shows the panel.

   It pings every five minutes and never per event. That cadence is what keeps
   the Worker inside Cloudflare's free write allowance \u2014 see the Worker source.

   What leaves this machine: a random id generated once and kept in the save,
   and your deepest Descent floor. That is the whole payload. No name, no
   account, no address, nothing that identifies a person.
   =========================================================================== */

/* The deployed Worker. Empty string disables the whole feature. */
const COUNTER_URL = "https://bloodfell-counter.bennipatry.workers.dev";

const COUNTER_PING_MS = 5 * 60 * 1000;

const Counter = {
  online: 0,
  deepest: { floor: 0, name: "" },
  live: false,          // true once a request has actually succeeded
  timer: null,

  enabled() {
    return !!COUNTER_URL && S.settings.globalCounter !== false;
  },

  /* A random id, made once, kept with the save. Identifies a browser to the
     counter and nothing else. */
  id() {
    if (!S.counterId) {
      S.counterId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      saveGame();
    }
    return S.counterId;
  },

  start() {
    this.stop();
    if (!this.enabled()) return;
    this.ping();
    this.timer = setInterval(() => this.ping(), COUNTER_PING_MS);
  },

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },

  async ping() {
    if (!this.enabled()) return;
    try {
      const res = await fetch(COUNTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: this.id(),
          floor: (S.descent && S.descent.best) || 0,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      this.online = data.online || 0;
      if (data.deepest) this.deepest = data.deepest;
      this.live = true;
      this.paint();
    } catch (e) {
      /* No network, blocked request, or the Worker's daily allowance is spent.
         Stay quiet and try again in five minutes. Someone playing on a plane
         must never see an error from this. */
    }
  },

  /* The markup for the rail. Renders its current numbers directly so a full
     UI.render() does not blank the panel between pings. */
  html() {
    if (!this.enabled() || !this.live) return `<div id="globalcounter"></div>`;
    return `<div id="globalcounter">${this.body()}</div>`;
  },

  body() {
    const floor = (this.deepest && this.deepest.floor) || 0;
    return `
      <div class="gc-line"><span>Playing now</span><b>${fmt(this.online)}</b></div>
      ${floor ? `<div class="gc-line"><span>Deepest floor</span><b>${fmt(floor)}</b></div>` : ""}`;
  },

  /* Updates in place between renders. */
  paint() {
    const el = document.getElementById("globalcounter");
    if (el) el.innerHTML = this.live && this.enabled() ? this.body() : "";
  },

  setEnabled(on) {
    S.settings.globalCounter = !!on;
    saveGame();
    if (on) {
      this.start();
    } else {
      this.stop();
      this.live = false;
    }
    // the rail is built once at mount, so a full render does not rebuild this
    // block — update it directly or switching the setting off leaves the old
    // numbers sitting there
    this.paint();
    UI.render();
  },
};
