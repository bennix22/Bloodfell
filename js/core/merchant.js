/* ===========================================================================
   MERCHANT — the gold sink.
   ---------------------------------------------------------------------------
   Gold piles up with nothing to spend it on once enchanting is done, so this is
   somewhere to gamble it. Stock rotates on a real-world timer. Most of what
   appears is worse than what you can farm; occasionally it is not.

   You may force a rotation early for gold, at a price that doubles each time
   you do it and resets when the free rotation arrives. That is the gamble.
   =========================================================================== */

const MERCHANT_REFRESH_MS = 30 * 60 * 1000;   // half an hour of real time
const MERCHANT_STOCK_SIZE = 6;
const MERCHANT_FORCE_BASE = 2500;             // cost of the first paid rotation
const MERCHANT_PRICE_MULT = 7.5;              // markup over an item's sale value

/* Deliberately generous at the top end compared with a mob drop — that is the
   whole reason to look. Legendaries stay rare enough to feel like an event. */
const MERCHANT_RARITY = { uncommon: 34, rare: 42, epic: 20, legendary: 4 };

function merchantForceCost() {
  return Math.round(MERCHANT_FORCE_BASE * Math.pow(2, S.merchant.forcedCount || 0));
}

function merchantMsLeft() {
  return Math.max(0, (S.merchant.nextRefresh || 0) - Date.now());
}

function merchantPrice(item) {
  return Math.round(item.value * MERCHANT_PRICE_MULT);
}

/* Stock is built around your current level so it stays relevant, with a spread
   so there is usually something slightly ahead of you. */
function rollMerchantStock() {
  const stock = [];
  for (let i = 0; i < MERCHANT_STOCK_SIZE; i++) {
    // The rare thrill: a Unique on the table. Only ones you could actually use
    // at your level, so a level 12 character is not taunted with a level 46 item.
    const eligible = UNIQUES.filter(u => u.ilvl <= S.level + 6);
    if (eligible.length && Math.random() < MERCHANT_UNIQUE_CHANCE) {
      const item = makeUnique2(pick(eligible));
      item.price = Math.round(merchantPrice(item) * 2.5);
      stock.push(item);
      continue;
    }
    const ilvl = clamp(Math.round(S.level + rand(-3, 5)), 1, 52);
    const item = generateItem({
      ilvl,
      rarity: weightedPick(MERCHANT_RARITY),
      primary: pick(["str", "agi", "int"]),
    });
    item.price = merchantPrice(item);
    stock.push(item);
  }
  return stock;
}

/* Called on load and after every fight. Rotates the stock when the timer is up
   and seeds it the very first time the merchant is opened. */
function tickMerchant() {
  if (!S.merchant.nextRefresh || Date.now() >= S.merchant.nextRefresh) {
    S.merchant.stock = rollMerchantStock();
    S.merchant.nextRefresh = Date.now() + MERCHANT_REFRESH_MS;
    S.merchant.forcedCount = 0;   // the free rotation clears the escalating price
    return true;
  }
  return false;
}

function forceMerchantRefresh() {
  const cost = merchantForceCost();
  if (S.gold < cost) return { ok: false, msg: `That costs ${fmt(cost)} gold.` };
  S.gold -= cost;
  S.merchant.stock = rollMerchantStock();
  S.merchant.forcedCount = (S.merchant.forcedCount || 0) + 1;
  saveGame();
  return { ok: true, msg: `New stock laid out for ${fmt(cost)} gold.` };
}

function buyFromMerchant(uidStr) {
  const idx = S.merchant.stock.findIndex(i => i.uid === uidStr);
  if (idx < 0) return { ok: false, msg: "That one is already gone." };
  const item = S.merchant.stock[idx];
  if (S.gold < item.price) return { ok: false, msg: "Not enough gold." };
  S.gold -= item.price;
  S.merchant.stock.splice(idx, 1);
  delete item.price;
  S.inventory.push(item);
  S.tally.items++;
  saveGame();
  return { ok: true, msg: `Bought ${item.name}.`, item };
}
