/* ===========================================================================
   THEMES — swappable colour palettes.
   ---------------------------------------------------------------------------
   Every colour in the stylesheet comes from a CSS custom property on :root, so
   changing the look is a matter of rewriting a handful of variables rather than
   touching any markup. A theme is just a map of variable name to colour.

   A custom theme supplies only four anchors — background, panel, accent and
   text. Everything else is derived, because asking someone to pick twenty
   related colours by hand produces something unreadable nine times in ten.
   =========================================================================== */

/* Mixes two hex colours. Used to derive the in-between shades of a palette. */
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

/* Rough perceived brightness, 0 to 1. Decides whether a palette needs dark text. */
function luminance(hex) {
  const p = parseInt(hex.slice(1), 16);
  return (((p >> 16) & 255) * 0.299 + ((p >> 8) & 255) * 0.587 + (p & 255) * 0.114) / 255;
}

/* Builds a complete palette from four anchors. */
function derivePalette(bg, panel, accent, text) {
  const light = luminance(bg) > 0.5;
  const toward = light ? "#000000" : "#ffffff";
  const away = light ? "#ffffff" : "#000000";

  return {
    "--void": bg,
    "--pitch": panel,
    "--slate": mixHex(panel, toward, 0.05),
    "--raise": mixHex(panel, toward, 0.11),
    "--edge": mixHex(panel, toward, 0.16),
    "--edge-hi": mixHex(panel, toward, 0.28),

    "--bone": text,
    "--ash": mixHex(text, away, 0.32),
    "--dim": mixHex(text, away, 0.55),

    "--brass": accent,
    "--brass-hi": mixHex(accent, toward, 0.25),
  };
}

const THEMES = {
  grimoire: {
    name: "Grimoire",
    blurb: "The default. Bruised purple, tarnished brass.",
    vars: {
      "--void": "#0e0a12", "--pitch": "#171120", "--slate": "#201830",
      "--raise": "#2a2038", "--edge": "#3a2b4e", "--edge-hi": "#55406f",
      "--bone": "#cec4b6", "--ash": "#8c8195", "--dim": "#675d73",
      "--brass": "#bd8c45", "--brass-hi": "#e0ad63",
      "--blood": "#ac3c3c", "--witch": "#7d6cb8", "--verdant": "#6d9c60",
    },
  },
  pitch: {
    name: "Pitch",
    blurb: "Near black, almost no colour. Easiest on a dark room.",
    vars: {
      "--void": "#08080a", "--pitch": "#101013", "--slate": "#17171b",
      "--raise": "#1f1f24", "--edge": "#2b2b31", "--edge-hi": "#3f3f47",
      "--bone": "#d0d0d4", "--ash": "#8a8a92", "--dim": "#5e5e66",
      "--brass": "#b08c50", "--brass-hi": "#d4ab6a",
      "--blood": "#a34040", "--witch": "#7a76a8", "--verdant": "#679a63",
    },
  },
  ember: {
    name: "Ember",
    blurb: "Banked coals. Warm browns and firelight.",
    vars: {
      "--void": "#120c09", "--pitch": "#1c1310", "--slate": "#261a15",
      "--raise": "#31221b", "--edge": "#432e23", "--edge-hi": "#614335",
      "--bone": "#e2d0bc", "--ash": "#a08874", "--dim": "#75604f",
      "--brass": "#d2762f", "--brass-hi": "#f09a4d",
      "--blood": "#bf3b2c", "--witch": "#a2704f", "--verdant": "#8a9b53",
    },
  },
  drowned: {
    name: "Drowned",
    blurb: "Deep water. Cold blues and a pale glow.",
    vars: {
      "--void": "#070d12", "--pitch": "#0d151d", "--slate": "#131f2a",
      "--raise": "#1a2937", "--edge": "#24394b", "--edge-hi": "#365468",
      "--bone": "#c6d6e0", "--ash": "#7d94a4", "--dim": "#566b7a",
      "--brass": "#4d9dbb", "--brass-hi": "#6fc0dc",
      "--blood": "#a8474f", "--witch": "#6b8fc4", "--verdant": "#4f9d8a",
    },
  },
  verdigris: {
    name: "Verdigris",
    blurb: "Oxidised copper and old growth.",
    vars: {
      "--void": "#080f0c", "--pitch": "#101915", "--slate": "#17241e",
      "--raise": "#1f2f27", "--edge": "#2b4136", "--edge-hi": "#3f5e4d",
      "--bone": "#cbd8ca", "--ash": "#84977f", "--dim": "#5c6d59",
      "--brass": "#8aa845", "--brass-hi": "#a9c962",
      "--blood": "#a44a3c", "--witch": "#6f9c86", "--verdant": "#7bb05e",
    },
  },
  bone: {
    name: "Bone",
    blurb: "A light palette, for a bright room.",
    vars: {
      "--void": "#e8e3d9", "--pitch": "#f2eee6", "--slate": "#e6e0d5",
      "--raise": "#dcd5c8", "--edge": "#c8bfae", "--edge-hi": "#a99e89",
      "--bone": "#2b2620", "--ash": "#5f574a", "--dim": "#877d6d",
      "--brass": "#8a6420", "--brass-hi": "#6d4e18",
      "--blood": "#9c3131", "--witch": "#5b4d8f", "--verdant": "#41703a",
    },
  },
};

/* The rarity colours travel with the theme so a light palette stays readable. */
const THEME_RARITY = {
  bone: {
    "--r-common": "#6f6a5e", "--r-uncommon": "#3f7a3b", "--r-rare": "#2f5f96",
    "--r-epic": "#6b3f92", "--r-legendary": "#9a6416", "--r-unique": "#b02a4a",
  },
};

const Theme = {
  apply(id) {
    const root = document.documentElement;
    let vars;

    if (id === "custom") {
      const c = S.settings.customTheme || DEFAULT_CUSTOM;
      vars = Object.assign(
        {},
        THEMES.grimoire.vars,                       // accents fall back to sane values
        derivePalette(c.bg, c.panel, c.accent, c.text),
        { "--blood": c.blood || "#ac3c3c", "--witch": c.witch || "#7d6cb8", "--verdant": c.verdant || "#6d9c60" }
      );
    } else {
      const t = THEMES[id] || THEMES.grimoire;
      vars = t.vars;
    }

    for (const k in vars) root.style.setProperty(k, vars[k]);

    // rarity colours: theme-specific if provided, otherwise the defaults
    const rar = THEME_RARITY[id] || {
      "--r-common": "#8e8778", "--r-uncommon": "#5f9b5b", "--r-rare": "#4a7fb5",
      "--r-epic": "#8a5fb0", "--r-legendary": "#c8873a", "--r-unique": "#d2536b",
    };
    for (const k in rar) root.style.setProperty(k, rar[k]);

  },

  /* Text size is independent of palette, but it lives here because both are
     just custom properties on :root. Only font sizes scale — padding and gaps
     stay put, so the layout does not reflow when someone wants larger text. */
  applyTextScale(v) {
    const scale = clamp(v || 1, 0.8, 1.6);
    document.documentElement.style.setProperty("--fs", scale);
  },

  setTextScale(v) {
    S.settings.textScale = clamp(parseFloat(v) || 1, 0.8, 1.6);
    saveGame();
    this.applyTextScale(S.settings.textScale);
  },

  set(id) {
    S.settings.theme = id;
    saveGame();
    this.apply(id);
  },

  setCustom(part, value) {
    if (!S.settings.customTheme) S.settings.customTheme = Object.assign({}, DEFAULT_CUSTOM);
    S.settings.customTheme[part] = value;
    S.settings.theme = "custom";
    saveGame();
    this.apply("custom");
  },
};

const DEFAULT_CUSTOM = {
  bg: "#0e0a12", panel: "#171120", accent: "#bd8c45", text: "#cec4b6",
  blood: "#ac3c3c", witch: "#7d6cb8", verdant: "#6d9c60",
};
