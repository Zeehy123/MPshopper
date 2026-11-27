// The pantry's rules, kept free of the database so they are easy to test.

// running low means at or below the level the person chose
export const isLow = (quantity, lowAt) => Number(quantity) <= Number(lowAt);

// Which items of a finished trip went into the cupboard. If any were ticked off as
// bought, only those count; if nothing was ticked, everything in the cart counts.
export function itemsToStock(items) {
  const ticked = items.filter((i) => i.checked);
  return ticked.length ? ticked : items;
}

// Two devices can both start tracking the same product while offline, which leaves two
// entries. Show one per product (the most recently changed one).
export function onePerProduct(entries) {
  const best = new Map();
  for (const e of entries) {
    const seen = best.get(e.productId);
    if (!seen || (e.updatedAt ?? "") > (seen.updatedAt ?? "")) best.set(e.productId, e);
  }
  return [...best.values()];
}
