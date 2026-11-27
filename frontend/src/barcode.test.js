import test from "node:test";
import assert from "node:assert/strict";
import { isValidGtin, normalizeBarcode, lookupBarcode } from "./barcode.js";

test("normalizeBarcode keeps digits only", () => {
  assert.equal(normalizeBarcode(" 5 449000 000996 "), "5449000000996");
  assert.equal(normalizeBarcode(null), "");
});

test("real EAN-13, UPC-A and EAN-8 codes pass the check digit", () => {
  assert.equal(isValidGtin("5449000000996"), true); // Coca-Cola 330 ml
  assert.equal(isValidGtin("036000291452"), true); // UPC-A
  assert.equal(isValidGtin("96385074"), true); // EAN-8
});

test("a mistyped digit fails", () => {
  assert.equal(isValidGtin("5449000000997"), false);
  assert.equal(isValidGtin("036000291453"), false);
});

test("wrong length or letters fail", () => {
  assert.equal(isValidGtin("12345"), false);
  assert.equal(isValidGtin("54490000009AB"), false);
  assert.equal(isValidGtin(""), false);
});

const reply = (body, ok = true) => async () => ({ ok, json: async () => body });

test("lookupBarcode returns the product name when it is found", async () => {
  const found = await lookupBarcode(
    "5449000000996",
    reply({
      status: 1,
      product: { product_name: " Coca-Cola ", brands: "Coca-Cola, Other", quantity: "330 ml" },
    }),
  );
  assert.deepEqual(found, { name: "Coca-Cola", brand: "Coca-Cola", quantity: "330 ml" });
});

test("lookupBarcode returns null for an unknown code", async () => {
  assert.equal(await lookupBarcode("1", reply({ status: 0 })), null);
});

test("lookupBarcode returns null when the server fails", async () => {
  assert.equal(await lookupBarcode("1", reply({}, false)), null);
});

test("lookupBarcode returns null when the network is down", async () => {
  const down = async () => {
    throw new Error("offline");
  };
  assert.equal(await lookupBarcode("1", down), null);
});
