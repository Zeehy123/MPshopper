import test from "node:test";
import assert from "node:assert/strict";
import { isLow, itemsToStock, onePerProduct } from "./pantryLogic.js";

test("isLow is true at or below the chosen level", () => {
  assert.equal(isLow(1, 2), true);
  assert.equal(isLow(2, 2), true);
  assert.equal(isLow(3, 2), false);
  assert.equal(isLow(0, 0), true);
});

test("itemsToStock uses only ticked items when some are ticked", () => {
  const items = [
    { id: "a", checked: true },
    { id: "b", checked: false },
  ];
  assert.deepEqual(itemsToStock(items).map((i) => i.id), ["a"]);
});

test("itemsToStock uses everything when nothing is ticked", () => {
  const items = [{ id: "a" }, { id: "b", checked: false }];
  assert.equal(itemsToStock(items).length, 2);
});

test("onePerProduct keeps the most recently changed entry", () => {
  const rows = [
    { id: "1", productId: "rice", quantity: 1, updatedAt: "2026-11-01T10:00:00Z" },
    { id: "2", productId: "rice", quantity: 4, updatedAt: "2026-11-05T10:00:00Z" },
    { id: "3", productId: "oil", quantity: 2, updatedAt: "2026-11-02T10:00:00Z" },
  ];
  const out = onePerProduct(rows);
  assert.equal(out.length, 2);
  assert.equal(out.find((r) => r.productId === "rice").quantity, 4);
});
