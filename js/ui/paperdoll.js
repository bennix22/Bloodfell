/* ===========================================================================
   PAPERDOLL — the equipment panel.
   ---------------------------------------------------------------------------
   Laid out the way an MMO character sheet is: a column of slots down each side
   with the character between them, and the weapons across the bottom. Hovering
   any slot raises the same tooltip the inventory uses.

   The icons are inline SVG rather than image files. That is not a compromise —
   the whole game has to run from a local file with no server, so anything that
   would need fetching is a liability. Line art also recolours itself with the
   theme for free, which a PNG would not.
   =========================================================================== */

const SLOT_ICONS = {
  helm: `<path d="M8 20 Q8 6 16 6 Q24 6 24 20 L24 24 Q16 27 8 24 Z"/>
         <path d="M12 15 h3 M17 15 h3" stroke-width="1.6"/>
         <path d="M8 20 Q16 22 24 20"/>`,

  shoulders: `<path d="M4 22 Q4 11 11 11 Q15 11 15 17 L15 23 Q9 25 4 22 Z"/>
              <path d="M28 22 Q28 11 21 11 Q17 11 17 17 L17 23 Q23 25 28 22 Z"/>`,

  cape: `<path d="M11 6 L21 6 L26 26 Q16 30 6 26 Z"/>
         <path d="M16 7 L16 27" stroke-width="1.2"/>
         <path d="M11 6 Q16 10 21 6"/>`,

  chest: `<path d="M9 8 L13 6 L16 9 L19 6 L23 8 L25 26 Q16 29 7 26 Z"/>
          <path d="M16 9 L16 27" stroke-width="1.2"/>
          <path d="M9 16 Q16 18 23 16"/>`,

  wrist: `<path d="M8 12 L24 12 L23 21 L9 21 Z"/>
          <path d="M8 15 L24 15 M8 18 L24 18" stroke-width="1.2"/>`,

  gloves: `<path d="M10 26 L10 14 Q10 9 13 9 Q15 9 15 13 L15 9 Q15 6 17 6 Q19 6 19 9
                    L19 11 Q19 8 21 8 Q23 8 23 12 L23 22 Q22 27 16 27 Z"/>`,

  waist: `<path d="M5 14 L27 14 L27 20 L5 20 Z"/>
          <rect x="13" y="12" width="6" height="10" rx="1"/>
          <path d="M9 17 h2 M21 17 h2" stroke-width="1.4"/>`,

  legs: `<path d="M10 5 L22 5 L21 27 L17 27 L16 15 L15 27 L11 27 Z"/>
         <path d="M10 11 L22 11" stroke-width="1.2"/>`,

  boots: `<path d="M11 5 L18 5 L18 19 Q18 23 24 23 L26 23 L26 27 L11 27 Z"/>
          <path d="M11 21 L26 21" stroke-width="1.2"/>`,

  ring: `<circle cx="16" cy="19" r="7"/>
         <path d="M13 11 L16 5 L19 11 Z"/>`,

  trinket: `<path d="M16 5 L20 12 L28 13 L22 19 L24 27 L16 23 L8 27 L10 19 L4 13 L12 12 Z"/>`,

  mainhand: `<path d="M16 3 L19 9 L19 19 L16 23 L13 19 L13 9 Z"/>
             <path d="M9 20 L23 20" stroke-width="2"/>
             <path d="M16 20 L16 29" stroke-width="2"/>
             <circle cx="16" cy="29" r="1.6"/>`,

  offhand: `<path d="M16 4 Q25 7 25 15 Q25 24 16 28 Q7 24 7 15 Q7 7 16 4 Z"/>
            <path d="M16 8 Q21 10 21 15 Q21 21 16 24 Q11 21 11 15 Q11 10 16 8 Z"/>`,
};

function slotIcon(slotType) {
  const d = SLOT_ICONS[slotType] || SLOT_ICONS.trinket;
  return `<svg viewBox="0 0 32 32" class="slotsvg" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="1.7"
       stroke-linejoin="round" stroke-linecap="round">${d}</g>
  </svg>`;
}

/* One square. Empty slots show the icon dimmed; filled ones colour it by rarity
   and put the item's name underneath. */
function doll(slotKey) {
  const slot = SLOTS.find(s => s.key === slotKey);
  const type = slot.type || slot.key;
  const item = S.equipment[slotKey];

  if (!item) {
    return `<div class="dollslot empty" title="${slot.name}">
      <div class="dollicon">${slotIcon(type)}</div>
      <div class="dolllabel">${slot.name}</div>
    </div>`;
  }

  return `<div class="dollslot filled r-border-${item.rarity}"
       data-tip="eq:${slotKey}"
       onclick="doUnequip('${slotKey}')"
       title="Click to remove">
    <div class="dollicon r-${item.rarity}">${slotIcon(type)}</div>
    <div class="dolllabel r-${item.rarity}">${item.name}</div>
    <div class="dollilvl">${item.ilvl}</div>
    ${item.passive ? `<span class="dollmark uq">\u2756</span>`
      : item.proc ? `<span class="dollmark pr">\u25C6</span>` : ""}
  </div>`;
}

/* The whole panel: two columns of armour with the character between them, and
   the weapons across the bottom. */
function paperdollHtml() {
  const st = computeStats();
  const v = currentVitals();

  const left = ["helm", "shoulders", "cape", "chest", "wrist", "gloves"];
  const right = ["waist", "legs", "boots", "ring1", "ring2", "trinket1", "trinket2"];
  const bottom = ["mainhand", "offhand"];   // weapons sit apart, as they should

  const worn = SLOTS.filter(s => S.equipment[s.key]).length;
  const avgIlvl = worn
    ? Math.round(SLOTS.reduce((a, s) => a + (S.equipment[s.key] ? S.equipment[s.key].ilvl : 0), 0) / worn)
    : 0;

  return `<div class="paperdoll-wrap">
    <div class="dollcol">${left.map(doll).join("")}</div>

    <div class="dollcentre">
      <div class="dollname">${S.name === "Nameless" ? "Unnamed" : S.name}</div>
      <div class="dolllvl">Level ${S.level}</div>
      <div class="dollbars">
        <div class="barlabel"><span>Health</span><span>${fmt(v.hp)} / ${fmt(v.maxHp)}</span></div>
        <div class="bar hp"><i style="width:${clamp(v.hp / v.maxHp * 100, 0, 100)}%"></i></div>
        <div class="barlabel"><span>Mana</span><span>${fmt(v.mana)} / ${fmt(v.maxMana)}</span></div>
        <div class="bar mana"><i style="width:${clamp(v.mana / v.maxMana * 100, 0, 100)}%"></i></div>
      </div>
      <div class="dollsummary">
        <div><span>Damage</span><b>${fmt(st.swingMin)}\u2013${fmt(st.swingMax)}</b></div>
        <div><span>Speed</span><b>${st.swingTime.toFixed(2)}s</b></div>
        <div><span>Damage / sec</span><b>${fmt(st.dps)}</b></div>
        <div><span>Armor</span><b>${fmt(st.armor)}</b></div>
        <div><span>Crit</span><b>${st.crit.toFixed(1)}%</b></div>
        <div><span>Haste</span><b>${st.haste.toFixed(1)}%</b></div>
      </div>
      <div class="dollfoot">${worn} of ${SLOTS.length} slots \u00B7 average item level ${avgIlvl}</div>
    </div>

    <div class="dollcol">${right.map(doll).join("")}</div>

    <div class="dollbottom">${bottom.map(doll).join("")}</div>
  </div>`;
}
