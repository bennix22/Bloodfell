/* Rescales every hand-written item to the curves the generator actually uses.
   ---------------------------------------------------------------------------
   The numbers in raids.js and uniques.js were typed by hand early on, then the
   item budget formulas were replaced with power curves and rescaled twice. The
   generated items followed; the hand-written ones did not, leaving raid drops at
   5-90% of an equivalent random drop and boss weapons at roughly 7%.

   This does not invent new items. It reads each one's existing stat SHAPE — the
   proportion of primary to stamina to secondaries — and rescales the magnitudes
   so the total lands on budget. A crit dagger stays a crit dagger.
*/
const fs = require('fs');
const P = '/home/claude/opus-realms/js/';
const F = ['data/realms.js','data/raids.js','data/items.js','data/talents.js','data/spells.js',
           'data/crafting.js','data/effects.js','data/uniques.js','core/sound.js','core/state.js',
           'core/passives.js','core/character.js','core/loot.js','core/combat.js','core/actions.js'];
const src = 'var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};var window={},document={addEventListener:()=>{}},performance={now:()=>0};'
          + F.map(f => fs.readFileSync(P + f, 'utf8')).join('\n');
const G = new Function(src + `return {RAIDS,UNIQUES,RARITIES,SECONDARY_POOL,ARMOR_SLOTS,ARMOR_SLOT_WEIGHT,
  ARMOR_CLASS_MULT,itemBudget,weaponDps,armorBase,WEAPON_PROFILES};`)();

/* How much of the stat budget each point of a stat consumes. Mirrors the
   allocation inside generateItem: primaries and stamina cost 1, secondaries
   cost whatever SECONDARY_POOL says. */
const COST = { str: 1, agi: 1, int: 1, spi: 1, sta: 1 };
for (const s of G.SECONDARY_POOL) COST[s.key] = s.cost;

/* A boss drop is a targeted reward from something that gets harder every time
   you kill it, so it should beat a random roll of the same rarity. Uniques are
   the rarest things in the game and carry a passive on top. */
const BOSS_DROP_MULT = 1.15;
const UNIQUE_MULT = 1.0;

function effectiveBudget(stats) {
  let b = 0;
  for (const k in stats) {
    if (k === 'armor') continue;              // armour is budgeted separately
    b += (stats[k] || 0) * (COST[k] === undefined ? 1 : COST[k]);
  }
  return b;
}

function targetArmor(slot, ilvl, rarity, primary) {
  if (!G.ARMOR_SLOTS.includes(slot) && slot !== 'offhand') return null;
  const R = G.RARITIES[rarity];
  if (slot === 'offhand') return Math.round(G.armorBase(ilvl) * 1.15 * (0.9 + R.budget * 0.3));
  const w = G.ARMOR_SLOT_WEIGHT[slot] || 0.5;
  return Math.round(G.armorBase(ilvl) * w * (G.ARMOR_CLASS_MULT[primary] || 1) * (0.9 + R.budget * 0.25));
}

/* Rounds sensibly: whole numbers for stats, one decimal for percentages. */
function tidy(key, v) {
  if (['crit','haste','dodge','block','lifesteal'].includes(key)) return Math.round(v * 10) / 10;
  return Math.round(v);
}

function rescale(def, rarityOverride, mult) {
  const rarity = rarityOverride || def.rarity;
  const R = G.RARITIES[rarity];
  const primary = def.stats.int ? 'int' : (def.stats.agi ? 'agi' : 'str');
  const slot = def.slot;

  const out = { stats: {}, weapon: null };

  // --- stats, scaled to hit the budget while keeping their proportions
  const wanted = G.itemBudget(def.ilvl) * R.budget * mult;
  const have = effectiveBudget(def.stats);
  const k = have > 0 ? wanted / have : 1;
  for (const key in def.stats) {
    if (key === 'armor') continue;
    out.stats[key] = Math.max(1, tidy(key, def.stats[key] * k));
  }

  // --- armour, recomputed rather than scaled, since it has its own curve
  const arm = targetArmor(slot, def.ilvl, rarity, primary);
  if (arm !== null && def.stats.armor !== undefined) out.stats.armor = arm;
  else if (arm !== null && slot !== 'offhand' && G.ARMOR_SLOTS.includes(slot)) out.stats.armor = arm;

  // --- weapon damage, from the same dps curve generateItem uses
  if (def.weapon) {
    const prof = G.WEAPON_PROFILES[def.name] || null;
    const speed = def.weapon.speed;
    const twoHand = def.hands === 2;
    const dps = G.weaponDps(def.ilvl) * R.budget * mult * (twoHand ? 1.55 : 1);
    const avg = dps * speed;
    const spread = prof ? prof.spread : 0.30;
    out.weapon = {
      min: Math.round(avg * (1 - spread)),
      max: Math.round(avg * (1 + spread)),
      speed,
    };
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Thematic special effects for the hand-written raid drops. A random Epic from
   a mob always has one; these had none, which is most of why a boss legendary
   felt worse than ordinary loot. Chosen to suit each item rather than rolled.
   --------------------------------------------------------------------------- */
const DROP_PROCS = {
  u_malgrith_shield: ['bulwark', 14, 1.0],   u_malgrith_helm: ['retort', 12, 1.0],
  u_vess_staff: ['ignite', 14, 1.0],         u_vess_cape: ['vengeance', 12, 1.0],
  u_vess_trinket: ['ignite', 12, 1.1],
  u_bell_chest: ['retort', 13, 1.1],         u_bell_mace: ['shatter', 14, 1.0],
  u_ilyra_dagger: ['rend', 15, 1.0],         u_ilyra_gloves: ['windfury', 11, 1.0],
  u_vorlanth_crown: ['soulsiphon', 100, 1.0],u_vorlanth_trinket: ['leech', 16, 1.2],
  u_vorlanth_chest: ['bulwark', 14, 1.1],
  u_harrow_shield: ['bulwark', 16, 1.1],     u_harrow_legs: ['retort', 13, 1.0],
  u_harrow_ring: ['vengeance', 13, 1.0],
  u_twins_axe: ['shatter', 16, 1.1],         u_twins_shoulders: ['retort', 14, 1.1],
  u_twins_trinket: ['execute_proc', 14, 1.1],
  u_balgor_blade: ['shatter', 18, 1.2],      u_balgor_hood: ['ambush', 100, 0.8],
  u_balgor_gloves: ['windfury', 13, 1.1],
  u_nyx_staff: ['ignite', 17, 1.2],          u_nyx_cape: ['frostbite', 14, 1.1],
  u_nyx_ring: ['ignite', 13, 1.0],
  u_kressen_chest: ['vengeance', 17, 1.2],   u_kressen_blade: ['execute_proc', 16, 1.2],
  u_kressen_trinket: ['bulwark', 15, 1.2],
  u_herald_shoulders: ['ignite', 15, 1.1],   u_herald_wand: ['ignite', 16, 1.1],
  u_herald_trinket: ['execute_proc', 14, 1.1],
  u_threnn_helm: ['frostbite', 18, 1.2],     u_threnn_cape: ['vengeance', 14, 1.1],
  u_threnn_ring: ['soulsiphon', 100, 1.2],
  u_marrow_shield: ['bulwark', 18, 1.3],     u_marrow_legs: ['retort', 15, 1.1],
  u_marrow_waist: ['bulwark', 14, 1.1],
  u_effigy_dagger: ['shatter', 20, 1.3],     u_effigy_gloves: ['windfury', 15, 1.2],
  u_effigy_boots: ['ambush', 100, 1.0],
  u_opus_blade: ['execute_proc', 20, 1.35],  u_opus_staff: ['ignite', 20, 1.35],
  u_opus_chest: ['vengeance', 18, 1.3],      u_opus_trinket: ['momentum', 100, 1.3],
};

/* ---------------------------------------------------------------------------
   Rewriting. Each item is located by its id and its stats / weapon / proc lines
   are replaced in place, so the surrounding prose and structure survive intact.
   --------------------------------------------------------------------------- */
function fmtStats(stats) {
  const order = ['str','agi','int','spi','sta','armor','crit','haste','dodge','block','critDmg','lifesteal','thorns'];
  const keys = Object.keys(stats).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return '{ ' + keys.map(k => `${k}: ${stats[k]}`).join(', ') + ' }';
}
function fmtWeapon(w) { return `{ min: ${w.min}, max: ${w.max}, speed: ${w.speed} }`; }

let raids = fs.readFileSync(P + 'data/raids.js', 'utf8');
let changed = 0;

for (const raid of G.RAIDS) {
  for (const boss of raid.bosses) {
    for (const def of boss.drops) {
      const r = rescale(def, null, BOSS_DROP_MULT);
      const at = raids.indexOf(`id: "${def.id}"`);
      if (at < 0) { console.log('  ! could not find ' + def.id); continue; }
      const lineEnd = raids.indexOf('\n', at);
      let line = raids.slice(at, lineEnd);

      line = line.replace(/stats: \{[^}]*\}/, 'stats: ' + fmtStats(r.stats));
      if (r.weapon) line = line.replace(/weapon: \{[^}]*\}/, 'weapon: ' + fmtWeapon(r.weapon));

      // a special effect, if this rarity should have one and it has none yet
      const proc = DROP_PROCS[def.id];
      if (proc && def.rarity !== 'rare' && !/proc: \{/.test(line)) {
        line = line.replace(/(stats: \{[^}]*\})/,
          `$1, proc: { id: "${proc[0]}", chance: ${proc[1]}, potency: ${proc[2]} }`);
      }

      raids = raids.slice(0, at) + line + raids.slice(lineEnd);
      changed++;
    }
  }
}
fs.writeFileSync(P + 'data/raids.js', raids);
console.log(`rewrote ${changed} raid drops`);

let uniques = fs.readFileSync(P + 'data/uniques.js', 'utf8');
let uchanged = 0;
for (const u of G.UNIQUES) {
  const r = rescale(u, 'unique', UNIQUE_MULT);
  const at = uniques.indexOf(`id: "${u.id}"`);
  if (at < 0) { console.log('  ! could not find ' + u.id); continue; }
  // uniques span several lines; work within this entry only
  const next = uniques.indexOf('  {\n    id: "uq_', at + 10);
  const end = next < 0 ? uniques.length : next;
  let block = uniques.slice(at, end);

  block = block.replace(/stats: \{[^}]*\}/, 'stats: ' + fmtStats(r.stats));
  if (r.weapon) block = block.replace(/weapon: \{[^}]*\}/, 'weapon: ' + fmtWeapon(r.weapon));

  uniques = uniques.slice(0, at) + block + uniques.slice(end);
  uchanged++;
}
fs.writeFileSync(P + 'data/uniques.js', uniques);
console.log(`rewrote ${uchanged} uniques`);
