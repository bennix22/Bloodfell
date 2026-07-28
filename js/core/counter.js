/* ===========================================================================
   GLOBAL COUNTER — how many are playing, and how deep anyone has been.
   ---------------------------------------------------------------------------
   Talks to a small Cloudflare Worker. Everything here is written so that the
   game is IDENTICAL when it cannot reach the network: no error, no empty box,
   no delay. The offline standalone build simply never shows the panel.

   It pings every five minutes and never per event. That cadence is what keeps
   the Worker inside Cloudflare's free write allowance \u2014 see the Worker source.

   What leaves this machine: a random id generated once and kept in the save,
   the character name you chose, and your deepest Descent floor. That is the
   whole payload. No account, no address, nothing but what you typed.
   =========================================================================== */

/* The deployed Worker. Empty string disables the whole feature. */
const COUNTER_URL = "https://bloodfell-counter.bennipatry.workers.dev";

const COUNTER_PING_MS = 5 * 60 * 1000;

/* When a check-in fails — no network, the Worker down, or its daily allowance
   spent — waiting a full five minutes to try again leaves the panel dead for
   no reason. Back off gently instead, then settle into the normal cadence. */
const COUNTER_RETRY_MS = [20 * 1000, 60 * 1000, 150 * 1000];

const Counter = {
  online: 0,
  deepest: { floor: 0, name: "" },
  live: false,          // true once a request has actually succeeded
  timer: null,
  retryTimer: null,
  failures: 0,

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

  /* Idempotent on purpose. If this is ever called from somewhere that repeats
     — a frame loop, a re-render — it must not open a second request. Ask for
     a restart explicitly with stop() first. */
  start() {
    if (this.timer) return;
    if (!this.enabled()) return;
    this.ping();
    this.timer = setInterval(() => this.ping(), COUNTER_PING_MS);
  },

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.timer = null;
    this.retryTimer = null;
  },

  /* Called whenever a check-in does not come back usable. */
  failed() {
    if (!this.enabled() || this.retryTimer) return;
    const wait = COUNTER_RETRY_MS[Math.min(this.failures, COUNTER_RETRY_MS.length - 1)];
    this.failures++;
    this.retryTimer = setTimeout(() => { this.retryTimer = null; this.ping(); }, wait);
  },

  async ping() {
    if (!this.enabled()) return;
    try {
      const res = await fetch(COUNTER_URL, {
        method: "POST",
        // text/plain keeps this a "simple" request, so the browser skips the
        // CORS preflight and one ping costs one request instead of two. The
        // Worker parses the body as JSON regardless of what this says.
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          id: this.id(),
          floor: (S.descent && S.descent.best) || 0,
          name: S.name && S.name !== "Nameless" ? S.name : "",
        }),
      });
      if (!res.ok) { this.failed(); return; }
      const data = await res.json();
      // `degraded` means the Worker answered but could not reach its storage,
      // so the numbers are meaningless. Showing a confident 0 is worse than
      // showing nothing: treat it as a failure and come back shortly.
      if (data.degraded) { this.failed(); return; }
      this.online = data.online || 0;
      if (data.deepest) this.deepest = data.deepest;
      this.live = true;
      this.failures = 0;
      this.paint();
    } catch (e) {
      this.failed();
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
    const d = this.deepest || { floor: 0, name: "" };
    return `
      <div class="gc-line"><span>Playing now</span><b>${fmt(this.online)}</b></div>
      ${d.floor ? `<div class="gc-line"><span>Deepest floor</span>
        <b>${fmt(d.floor)}${d.name ? ` <i>${d.name}</i>` : ""}</b></div>` : ""}`;
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
